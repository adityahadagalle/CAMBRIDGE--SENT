"""
SENTINEL Freeze / Unfreeze / Complete Case Report Module.

Strictly READ-ONLY. This module never mutates case, account, transaction,
audit, or investigation state, and never calls n8n or the fraud-scoring
pipeline. It only reads what the existing SENTINEL system has already
stored (data_store + the existing read-only investigation agents) and
formats it into a PDF.

Data provenance:
- Freeze / release attribution is sourced from the existing immutable
  audit_events log (app.services.simulated_action_executor), not from the
  live account object, because the account object's frozen_* fields are
  cleared the moment RELEASE executes. The audit log is the durable
  record of "when was this account frozen" and "when was it released".
- Everything else (case, transactions, evidence, regulatory assessment,
  decision support) is read via the existing agent functions already used
  by GET /cases/{case_id} and friends -- no fraud/investigation logic is
  reimplemented here.

Any field that cannot be found in existing stored data is rendered as the
literal string "Not available" rather than being fabricated.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.core.data_store import data_store
from app.services.evidence_agent import collect_evidence_for_case
from app.services.regulatory_agent import assess_case_regulatory_risk
from app.services.analyst_agent import generate_case_analyst_decision_support
from app.engines.graph_engine import build_investigation_graph

NOT_AVAILABLE = "Not available"


class ReportDataError(Exception):
    """Raised when there is not enough existing data to produce the requested report."""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _na(value: Any) -> Any:
    if value is None or value == "":
        return NOT_AVAILABLE
    return value


def _get_case(case_id: str) -> Optional[Dict[str, Any]]:
    return data_store.get("cases", {}).get(case_id)


def _get_account(account_id: Optional[str]) -> Optional[Dict[str, Any]]:
    if not account_id:
        return None
    return data_store.get("accounts", {}).get(account_id)


def _resolve_account_id(case: Dict[str, Any], account_id: Optional[str], tx_id: Optional[str]) -> Optional[str]:
    """Read-only resolution mirroring how the existing freeze endpoint picks
    the target account when the caller doesn't specify one explicitly."""
    if account_id:
        return account_id
    tx_store = data_store.get("transactions", {})
    if tx_id and tx_id in tx_store:
        return tx_store[tx_id].get("sender_account")
    primary_tx_id = case.get("primary_tx_id")
    if primary_tx_id and primary_tx_id in tx_store:
        return tx_store[primary_tx_id].get("sender_account")
    return None


def _case_transactions(case: Dict[str, Any]) -> List[Dict[str, Any]]:
    tx_store = data_store.get("transactions", {})
    tx_ids = case.get("transactions") or []
    txs = [tx_store[t] for t in tx_ids if t in tx_store]
    if not txs and case.get("primary_tx_id") in tx_store:
        txs = [tx_store[case["primary_tx_id"]]]
    if not txs:
        case_id = case.get("case_id")
        txs = [t for t in tx_store.values() if t.get("case_id") == case_id]
    return txs


def _audit_events_for_case(case_id: str) -> List[Dict[str, Any]]:
    events = list(data_store.get("audit_events", []))
    return [a for a in events if a.get("case_id") == case_id]


def _find_audit_events(case_id: str, account_id: Optional[str], action_code: str) -> List[Dict[str, Any]]:
    matches = []
    for a in _audit_events_for_case(case_id):
        if a.get("action_code") != action_code:
            continue
        tc = a.get("traceability_chain", {}) or {}
        if account_id and tc.get("account_id") != account_id:
            continue
        matches.append(a)
    matches.sort(key=lambda a: a.get("timestamp") or "", reverse=True)
    return matches


def _latest(events: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    return events[0] if events else None


def _duration_str(start_iso: Optional[str], end_iso: Optional[str]) -> str:
    if not start_iso or not end_iso:
        return NOT_AVAILABLE
    try:
        start = datetime.fromisoformat(str(start_iso).replace("Z", "+00:00"))
        end = datetime.fromisoformat(str(end_iso).replace("Z", "+00:00"))
        delta = end - start
        total_seconds = int(delta.total_seconds())
        if total_seconds < 0:
            return NOT_AVAILABLE
        days, rem = divmod(total_seconds, 86400)
        hours, rem = divmod(rem, 3600)
        minutes, _ = divmod(rem, 60)
        parts = []
        if days:
            parts.append(f"{days}d")
        if hours:
            parts.append(f"{hours}h")
        parts.append(f"{minutes}m")
        return " ".join(parts)
    except Exception:
        return NOT_AVAILABLE


def _evidence_findings(evidence: Optional[Dict[str, Any]]) -> List[str]:
    """collect_evidence_for_case() returns evidence['evidence'] as a list of
    finding dicts (each with a 'finding' text field), not a dict."""
    if not evidence:
        return []
    findings = evidence.get("evidence")
    if not isinstance(findings, list):
        return []
    return [f.get("finding") for f in findings if isinstance(f, dict) and f.get("finding")]


def _safe(fn, *args, **kwargs) -> Optional[Dict[str, Any]]:
    """Investigation/agent reads must never break report generation; on any
    failure the corresponding section is simply marked unavailable."""
    try:
        return fn(*args, **kwargs)
    except Exception:
        return None


def _related_accounts(case_id: str, account_id: Optional[str]) -> List[Dict[str, Any]]:
    graph = _safe(build_investigation_graph, case_id, data_store)
    if not graph:
        return []
    nodes = graph.get("nodes", []) or []
    related = []
    for n in nodes:
        nid = n.get("account_id") or n.get("accountId") or n.get("id")
        if not nid or nid == account_id:
            continue
        related.append({
            "account_id": nid,
            "account_type": n.get("account_type", NOT_AVAILABLE),
            "status": n.get("status", NOT_AVAILABLE),
        })
    return related


def _transactions_summary(txs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    out = []
    for tx in txs:
        out.append({
            "tx_id": _na(tx.get("tx_id")),
            "amount": _na(tx.get("amount")),
            "channel": _na(tx.get("channel")),
            "risk_score": _na(tx.get("risk_score")),
            "sender_account": _na(tx.get("sender_account")),
            "receiver_account": _na(tx.get("receiver_account")),
            "timestamp": _na(tx.get("timestamp")),
        })
    return out


def build_freeze_report_data(case_id: str, account_id: Optional[str] = None, tx_id: Optional[str] = None) -> Dict[str, Any]:
    case = _get_case(case_id)
    if not case:
        raise ReportDataError(f"Case '{case_id}' not found.")

    account_id = _resolve_account_id(case, account_id, tx_id)
    freeze_events = _find_audit_events(case_id, account_id, "FREEZE")
    freeze_event = _latest(freeze_events)
    if not freeze_event:
        raise ReportDataError(f"No FREEZE event found for account '{account_id or 'UNKNOWN'}' on case '{case_id}'.")

    tc = freeze_event.get("traceability_chain", {}) or {}
    account = _get_account(account_id)
    txs = _case_transactions(case)
    evidence = _safe(collect_evidence_for_case, case_id, data_store)
    regulatory = _safe(assess_case_regulatory_risk, case_id, data_store)
    decision_support = _safe(generate_case_analyst_decision_support, case_id, data_store)

    return {
        "report_title": "SENTINEL — Account Freeze Report",
        "generated_at": _now_iso(),
        "case_id": case_id,
        "account_id": _na(account_id),
        "transaction_ids": [t.get("tx_id") for t in txs] or [_na(tc.get("transaction_id"))],
        "freeze_datetime": _na(freeze_event.get("timestamp")),
        "risk_score": _na(tc.get("risk_score")),
        "risk_level": _na(tc.get("risk_level")),
        "reason_for_freeze": _na(freeze_event.get("reason")),
        "policy_rule_id": _na(tc.get("policy_rule_id")),
        "analyst_id": _na(freeze_event.get("analyst_id")),
        "analyst_role": _na(freeze_event.get("analyst_role")),
        "current_account_status": _na((account or {}).get("status") or tc.get("resulting_account_state")),
        "action_taken": _na(freeze_event.get("action_code")),
        "audit_id": _na(freeze_event.get("audit_id")),
        "transactions": _transactions_summary(txs),
        "related_accounts": _related_accounts(case_id, account_id),
        "regulatory_severity": _na((regulatory or {}).get("summary", {}).get("regulatory_severity") if regulatory else None),
        "review_priority": _na((decision_support or {}).get("review_priority") if decision_support else None),
        "investigation_summary": _na((decision_support or {}).get("analyst_executive_brief") if decision_support else None),
        "evidence_signals": _evidence_findings(evidence),
    }


def build_unfreeze_report_data(case_id: str, account_id: Optional[str] = None, tx_id: Optional[str] = None) -> Dict[str, Any]:
    case = _get_case(case_id)
    if not case:
        raise ReportDataError(f"Case '{case_id}' not found.")

    account_id = _resolve_account_id(case, account_id, tx_id)
    release_events = _find_audit_events(case_id, account_id, "RELEASE")
    release_event = _latest(release_events)
    if not release_event:
        raise ReportDataError(f"No RELEASE (unfreeze) event found for account '{account_id or 'UNKNOWN'}' on case '{case_id}'.")

    # Pair with the freeze event that immediately preceded this release.
    freeze_events = [
        e for e in _find_audit_events(case_id, account_id, "FREEZE")
        if (e.get("timestamp") or "") <= (release_event.get("timestamp") or "")
    ]
    freeze_event = _latest(freeze_events)

    tc = release_event.get("traceability_chain", {}) or {}
    account = _get_account(account_id)
    txs = _case_transactions(case)
    decision_support = _safe(generate_case_analyst_decision_support, case_id, data_store)

    all_actions = [
        {
            "action_code": a.get("action_code"),
            "actor": a.get("analyst_id"),
            "timestamp": a.get("timestamp"),
            "reason": a.get("reason"),
        }
        for a in sorted(_audit_events_for_case(case_id), key=lambda a: a.get("timestamp") or "")
        if account_id is None or (a.get("traceability_chain", {}) or {}).get("account_id") == account_id
    ]

    return {
        "report_title": "SENTINEL — Account Unfreeze Report",
        "generated_at": _now_iso(),
        "case_id": case_id,
        "account_id": _na(account_id),
        "original_freeze_datetime": _na(freeze_event.get("timestamp")) if freeze_event else NOT_AVAILABLE,
        "unfreeze_datetime": _na(release_event.get("timestamp")),
        "duration_frozen": _duration_str(
            freeze_event.get("timestamp") if freeze_event else None,
            release_event.get("timestamp"),
        ),
        "reason_for_unfreezing": _na(release_event.get("reason")),
        "analyst_id": _na(release_event.get("analyst_id")),
        "analyst_role": _na(release_event.get("analyst_role")),
        "original_risk_score": _na((freeze_event.get("traceability_chain", {}) or {}).get("risk_score")) if freeze_event else NOT_AVAILABLE,
        "transaction_ids": [t.get("tx_id") for t in txs] or [_na(tc.get("transaction_id"))],
        "current_account_status": _na((account or {}).get("status") or tc.get("resulting_account_state")),
        "action_history": all_actions,
        "audit_id": _na(release_event.get("audit_id")),
        "investigation_summary": _na((decision_support or {}).get("analyst_executive_brief") if decision_support else None),
    }


def build_complete_case_report_data(case_id: str, account_id: Optional[str] = None) -> Dict[str, Any]:
    case = _get_case(case_id)
    if not case:
        raise ReportDataError(f"Case '{case_id}' not found.")

    txs = _case_transactions(case)
    evidence = _safe(collect_evidence_for_case, case_id, data_store)
    regulatory = _safe(assess_case_regulatory_risk, case_id, data_store)
    decision_support = _safe(generate_case_analyst_decision_support, case_id, data_store)

    freeze_events = sorted(_find_audit_events(case_id, account_id, "FREEZE"), key=lambda a: a.get("timestamp") or "")
    release_events = sorted(_find_audit_events(case_id, account_id, "RELEASE"), key=lambda a: a.get("timestamp") or "")
    all_events = sorted(_audit_events_for_case(case_id), key=lambda a: a.get("timestamp") or "")

    return {
        "report_title": "SENTINEL — Complete Case Report",
        "generated_at": _now_iso(),
        "case_id": case_id,
        "final_case_status": _na(case.get("status")),
        "risk_level": _na(case.get("risk_level")),
        "total_fraud_amount": _na(case.get("total_fraud_amount")),
        "recoverable_amount": _na(case.get("recoverable_amount")),
        "primary_tx_id": _na(case.get("primary_tx_id")),
        "transactions": _transactions_summary(txs),
        "freeze_events": [
            {
                "account_id": (e.get("traceability_chain", {}) or {}).get("account_id"),
                "timestamp": e.get("timestamp"),
                "reason": e.get("reason"),
                "analyst_id": e.get("analyst_id"),
            } for e in freeze_events
        ],
        "release_events": [
            {
                "account_id": (e.get("traceability_chain", {}) or {}).get("account_id"),
                "timestamp": e.get("timestamp"),
                "reason": e.get("reason"),
                "analyst_id": e.get("analyst_id"),
            } for e in release_events
        ],
        "audit_history": [
            {
                "audit_id": e.get("audit_id"),
                "action_code": e.get("action_code"),
                "actor": e.get("analyst_id"),
                "timestamp": e.get("timestamp"),
                "reason": e.get("reason"),
            } for e in all_events
        ],
        "regulatory_severity": _na((regulatory or {}).get("summary", {}).get("regulatory_severity") if regulatory else None),
        "review_priority": _na((decision_support or {}).get("review_priority") if decision_support else None),
        "recommended_action": _na((decision_support or {}).get("disposition_options", [{}])[0].get("action_code")) if decision_support and decision_support.get("disposition_options") else NOT_AVAILABLE,
        "investigation_summary": _na((decision_support or {}).get("analyst_executive_brief") if decision_support else None),
        "evidence_signals": _evidence_findings(evidence),
    }
