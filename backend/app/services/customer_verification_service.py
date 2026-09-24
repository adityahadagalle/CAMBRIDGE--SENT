"""
Customer Verification Service for SENTINEL (n8n VerifyFlow Integration).

Responsibility:
- Evaluate, from real Agent 2 (Contextual Investigation) output, whether the
  evidence warrants automatically contacting the customer for verification.
- Generate a customer-safe, plain-language reason string (never internal
  risk scores, ML confidence, EV-/CTX-/REG- ids, pattern-id strings, analyst
  notes, or account identifiers).
- Persist a CustomerVerification record and dispatch the trigger event to
  n8n's "SENTINEL -- VerifyFlow" webhook.

This service NEVER makes or executes a fraud decision. It only decides
whether to ask the customer a yes/no question; the customer's answer is
recorded as additional case evidence for the human analyst -- it never
mutates Case.status or creates a Disposition record.
"""

import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple
from uuid import uuid4

# Pattern IDs (from app/services/contextual_agent.py) that gate the VerifyFlow
# trigger. Maps directly onto the three example scenarios in the brief:
#   A. High-value + new beneficiary            -> FIRST_TIME_HIGH_VALUE_COUNTERPARTY
#   B. Multiple transactions in a short period  -> RAPID_STRUCTURING
#   C. Unusual access/device + high-value       -> CROSS_BORDER_HIGH_RISK_ACTIVITY
TRIGGER_PATTERNS = {
    "FIRST_TIME_HIGH_VALUE_COUNTERPARTY",
    "RAPID_STRUCTURING",
    "CROSS_BORDER_HIGH_RISK_ACTIVITY",
}
TRIGGER_SEVERITIES = {"HIGH", "CRITICAL"}

# Customer-safe, plain-language reason templates. Never reference internal
# risk scores, confidence values, pattern-id strings, EV-/CTX-/REG- ids,
# mule/laundering terminology, or account identifiers.
REASON_TEMPLATES: Dict[str, str] = {
    "FIRST_TIME_HIGH_VALUE_COUNTERPARTY": (
        "This payment is much higher than your recent activity and was sent to a "
        "recipient you have not paid before."
    ),
    "BEHAVIORAL_ESCALATION": (
        "This payment is unusually large compared with your recent account activity."
    ),
    "RAPID_STRUCTURING": (
        "Several payments were made from your account within a short period, which "
        "is unusual compared with your recent activity."
    ),
    "CROSS_BORDER_HIGH_RISK_ACTIVITY": (
        "This payment followed account activity that differs from how you normally "
        "access your account."
    ),
    "MULE_ACCOUNT_DRAINAGE": (
        "This payment matches an activity pattern that our system flags for extra "
        "confirmation."
    ),
    "PASS_THROUGH_ACTIVITY": (
        "This payment matches an activity pattern that our system flags for extra "
        "confirmation."
    ),
    "MULTI_HOP_PROPAGATION": (
        "This payment matches an activity pattern that our system flags for extra "
        "confirmation."
    ),
}
DEFAULT_REASON = "This payment was flagged by our system for extra confirmation."

# Static demo account -> email map (DEMO_MODE only; no real customer contact
# data exists in seed_data.py accounts). Falls back to DEMO_VERIFICATION_FALLBACK_EMAIL
# for any account_id not explicitly listed.
DEMO_ACCOUNT_EMAIL_MAP: Dict[str, str] = {
    "ACC-USR-1004": "adityaningappa@gmail.com",
}


def evaluate_trigger(contextual_rpt: Optional[Dict[str, Any]]) -> Tuple[bool, List[str]]:
    """
    Deterministic trigger gate built on real contextual_agent.py pattern ids:
    (FIRST_TIME_HIGH_VALUE_COUNTERPARTY or BEHAVIORAL_ESCALATION matched)
    AND contextual_severity in {HIGH, CRITICAL}.
    Returns (should_trigger, matched_pattern_ids_from_TRIGGER_PATTERNS).
    """
    if not contextual_rpt or not isinstance(contextual_rpt, dict) or not contextual_rpt.get("found"):
        return False, []

    patterns = contextual_rpt.get("patterns", [])
    matched_ids = {p.get("pattern_id") for p in patterns if isinstance(p, dict)}
    relevant = sorted(matched_ids.intersection(TRIGGER_PATTERNS))

    severity = contextual_rpt.get("summary", {}).get("contextual_severity")
    should_trigger = bool(relevant) and severity in TRIGGER_SEVERITIES
    return should_trigger, relevant


def extract_transaction_facts(evidence_pkg: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Pulls amount/currency/channel/timestamp from the real evidence_agent.py 'transaction' item."""
    facts = {"amount": 0.0, "currency": "INR", "channel": "UNKNOWN", "timestamp": None}
    if not evidence_pkg or not isinstance(evidence_pkg, dict):
        return facts
    for ev in evidence_pkg.get("evidence", []):
        if isinstance(ev, dict) and ev.get("type") == "transaction":
            data = ev.get("data", {})
            facts["amount"] = float(data.get("amount", 0.0))
            facts["currency"] = data.get("currency", "INR")
            facts["channel"] = data.get("channel", "UNKNOWN")
            facts["timestamp"] = data.get("timestamp")
            break
    return facts


def generate_customer_safe_reason(matched_pattern_ids: List[str]) -> str:
    """
    Builds the customer-facing reason string. Deliberately does not accept or
    reference account identifiers, risk scores, confidence, or internal ids --
    only the pattern-id -> plain-language template lookup.
    """
    for pid in matched_pattern_ids:
        if pid in REASON_TEMPLATES:
            return REASON_TEMPLATES[pid]
    return DEFAULT_REASON


def resolve_demo_customer_email(account_id: Optional[str]) -> Optional[str]:
    """Resolves the DEMO_MODE synthetic customer email for an account_id, with a fallback."""
    if os.getenv("DEMO_MODE", "true").lower() != "true":
        return None
    if account_id and account_id in DEMO_ACCOUNT_EMAIL_MAP:
        return DEMO_ACCOUNT_EMAIL_MAP[account_id]
    return os.getenv("DEMO_VERIFICATION_FALLBACK_EMAIL", "adityaningappa@gmail.com")


def build_event_envelope(case_id: str, primary_tx_id: Optional[str]) -> Dict[str, Any]:
    """
    event_id is deterministic per case (not per investigation run), so a case
    triggers at most one customer verification in its lifetime regardless of
    how many times the investigation is re-run.
    """
    return {
        "event": "CUSTOMER_VERIFICATION_REQUIRED",
        "event_id": f"VF-{case_id}",
        "schema_version": "1.0",
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": "sentinel",
        "case_id": case_id,
        "transaction_id": primary_tx_id,
    }


async def evaluate_and_dispatch(
    case_id: str,
    evidence_pkg: Optional[Dict[str, Any]],
    contextual_rpt: Optional[Dict[str, Any]],
    case_record: Optional[Dict[str, Any]],
    verification_repo: Any,
    broadcast_manager: Any = None,
) -> Optional[Dict[str, Any]]:
    """
    Orchestrator entry point. Evaluates the trigger, and if warranted, persists
    a PENDING CustomerVerification row and dispatches to n8n VerifyFlow.
    Never raises -- all failures are logged and swallowed so a hung or broken
    dispatch can never block the investigation pipeline.
    Returns the persisted verification record dict, or None if not triggered/skipped.
    """
    try:
        should_trigger, matched = evaluate_trigger(contextual_rpt)
        if not should_trigger:
            return None

        primary_tx_id = (case_record or {}).get("primary_tx_id")
        envelope = build_event_envelope(case_id, primary_tx_id)

        existing = await verification_repo.get_by_event_id(case_id, envelope["event_id"])
        if existing:
            # Idempotent: a verification for this case was already requested.
            return existing

        facts = extract_transaction_facts(evidence_pkg)
        reason = generate_customer_safe_reason(matched)

        account_id = None
        if isinstance(evidence_pkg, dict):
            for ev in evidence_pkg.get("evidence", []):
                if isinstance(ev, dict) and ev.get("type") == "transaction":
                    account_id = ev.get("data", {}).get("sender_account")
                    break

        demo_email = resolve_demo_customer_email(account_id)
        if not demo_email:
            return None

        ttl_hours = int(os.getenv("VERIFICATION_TOKEN_TTL_HOURS", "72"))
        now = datetime.now(timezone.utc)

        record = {
            "verification_id": f"CV-{uuid4().hex}",
            "case_id": case_id,
            "event_id": envelope["event_id"],
            "account_id": account_id,
            "demo_customer_email": demo_email,
            "reason_summary": reason,
            "trigger_pattern_ids": matched,
            "verification_token": secrets.token_urlsafe(32),
            "token_expires_at": now + timedelta(hours=ttl_hours),
            "status": "PENDING",
            "created_at": now.isoformat().replace("+00:00", "Z"),
            "updated_at": now.isoformat().replace("+00:00", "Z"),
        }
        await verification_repo.create_verification(record)
        await verification_repo.commit_transaction()

        if broadcast_manager:
            try:
                await broadcast_manager.broadcast({
                    "event": "customer.verification.requested",
                    "case_id": case_id,
                    "verification_id": record["verification_id"],
                    "reason_summary": reason,
                    "status": "PENDING",
                })
            except Exception as e:
                print(f"[CustomerVerificationService] WS broadcast warning: {e}")

        from app.services.n8n_dispatcher import post_to_n8n

        await post_to_n8n(
            url=os.getenv("N8N_VERIFYFLOW_TRIGGER_URL"),
            json_payload={
                **envelope,
                "customer_ref": account_id or "UNKNOWN",
                "customer_email": demo_email,
                "reason_code": matched[0] if matched else "GENERAL_REVIEW",
                "customer_reason": reason,
                "amount": facts["amount"],
                "currency": facts["currency"],
                "channel": facts["channel"],
                "verification_token": record["verification_token"],
                "demo_mode": os.getenv("DEMO_MODE", "true").lower() == "true",
            },
            headers={"X-Sentinel-Auth": os.getenv("N8N_TRIGGER_AUTH_TOKEN", "")},
        )
        return record
    except Exception as e:
        print(f"[CustomerVerificationService] evaluate_and_dispatch warning: {e}")
        return None
