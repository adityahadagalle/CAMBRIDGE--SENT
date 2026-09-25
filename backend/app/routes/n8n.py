"""
SENTINEL n8n Integration Routes.

Receives the customer's YES/NO response relayed by the "SENTINEL -- VerifyFlow"
n8n workflow. This is the ONLY inbound surface n8n has into SENTINEL.

Hard invariant: this route NEVER mutates Case.status and NEVER creates a
Disposition record. The customer's response is recorded purely as additional
case evidence (an audit event) for the human analyst to weigh -- only
POST /cases/{case_id}/disposition, submitted by an authenticated analyst,
can change a case's disposition.
"""

import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from starlette.concurrency import run_in_threadpool

from app.core.data_store import data_store
from app.repositories.base import AbstractCaseRepository
from app.repositories.dependencies import get_repository, get_verification_repository
from app.repositories.verification_repository import (
    AbstractVerificationRepository,
    InMemoryVerificationRepository,
)

router = APIRouter(prefix="/webhooks/n8n", tags=["n8n Integration"])

VALID_DECISIONS = {"YES": "RESPONDED_YES", "NO": "RESPONDED_NO"}


class _N8nRouteState:
    """Settable holder for the WS broadcast manager, mirroring the
    `investigation_orchestrator.broadcast_manager = manager` pattern in main.py
    (avoids a circular import back into main)."""

    def __init__(self) -> None:
        self.broadcast_manager: Optional[Any] = None


n8n_route_state = _N8nRouteState()


def _verify_signature(raw_body: bytes, signature: Optional[str]) -> bool:
    secret = os.getenv("N8N_WEBHOOK_SECRET", "")
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


async def _get_background_verification_repo():
    """
    Resolves a fresh AbstractVerificationRepository for use from a
    BackgroundTask -- NOT the request-scoped one injected via Depends(),
    whose underlying DB session may already be torn down by the time the
    background task runs (FastAPI closes yield-based dependencies once the
    response is sent, which can race a background task). Mirrors the same
    dev/postgres branching as get_verification_repository().
    """
    db_url = os.getenv("DATABASE_URL")
    is_postgres_env = bool(db_url and db_url.startswith("postgresql"))
    if not is_postgres_env:
        return InMemoryVerificationRepository(data_store), None

    from app.db.session import get_async_session_factory
    from app.repositories.verification_repository import PostgreSQLVerificationRepository

    session_factory = get_async_session_factory()
    session = session_factory()
    return PostgreSQLVerificationRepository(session), session


async def _generate_and_persist_release_rationale_background(
    case_id: str,
    transaction_id: Optional[str],
) -> None:
    """
    Background rationale generation, fired from the customer-YES + frozen
    webhook path -- NOT from the analyst opening the release modal. Builds a
    lightweight prompt input (no full investigation-context rebuild), calls
    Ollama off the event loop, and persists the result so the modal's GET
    endpoint can return it instantly. Errors are fully contained here: a
    failure must never crash the webhook or leave the process in a bad
    state, since this task runs detached from the request/response cycle.
    """
    if not transaction_id:
        return
    from app.services.ollama_service import ollama_service

    repo, session = await _get_background_verification_repo()
    try:
        try:
            await repo.set_rationale(case_id, transaction_id, status="PENDING")
            await repo.commit_transaction()
        except Exception as e:
            print(f"[n8n routes] rationale background: could not mark PENDING: {e}")

        try:
            is_available = await run_in_threadpool(ollama_service.is_available)
        except Exception:
            is_available = False

        if not is_available:
            await repo.set_rationale(case_id, transaction_id, status="FAILED")
            await repo.commit_transaction()
            return

        tx = data_store.get("transactions", {}).get(transaction_id)
        verification_status = None
        try:
            records = await repo.get_for_case(case_id)
            if records:
                latest = records[0]
                verification_status = {
                    "case_id": case_id,
                    "triggered": True,
                    "verification_id": latest.get("verification_id"),
                    "status": latest.get("status"),
                    "reason_summary": latest.get("reason_summary"),
                }
        except Exception:
            pass

        lightweight_ctx = ollama_service._build_lightweight_rationale_input(
            case_id=case_id,
            transaction_id=transaction_id,
            transaction=tx,
            verification_status=verification_status,
        )

        try:
            res = await run_in_threadpool(
                ollama_service.suggest_release_rationale,
                case_id,
                transaction_id,
                lightweight_ctx,
                verification_status,
            )
        except Exception as e:
            print(f"[n8n routes] rationale background: generation error: {e}")
            await repo.set_rationale(case_id, transaction_id, status="FAILED")
            await repo.commit_transaction()
            return

        if res.status == "ready" and res.response:
            await repo.set_rationale(
                case_id, transaction_id,
                status="READY",
                rationale=res.response.rationale,
                model=res.model,
            )
        else:
            await repo.set_rationale(case_id, transaction_id, status="FAILED")
        await repo.commit_transaction()
    except Exception as e:
        print(f"[n8n routes] rationale background: unexpected error: {e}")
    finally:
        if session is not None:
            try:
                await session.close()
            except Exception:
                pass


def _parse_expiry(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str) and value:
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except Exception:
            return None
    return None


@router.post("/verification-response")
async def receive_verification_response(
    request: Request,
    background_tasks: BackgroundTasks,
    x_sentinel_signature: Optional[str] = Header(default=None),
    case_repo: AbstractCaseRepository = Depends(get_repository),
    verification_repo: AbstractVerificationRepository = Depends(get_verification_repository),
) -> Dict[str, Any]:
    """
    POST body (from n8n): {"verification_token": "...", "decision": "YES"|"NO",
    "n8n_execution_id": "..." (optional)}.
    Auth: X-Sentinel-Signature = HMAC-SHA256(N8N_WEBHOOK_SECRET, raw_body), hex digest.
    """
    raw_body = await request.body()
    if not _verify_signature(raw_body, x_sentinel_signature):
        raise HTTPException(status_code=401, detail="Invalid or missing X-Sentinel-Signature")

    try:
        payload = json.loads(raw_body or b"{}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    token = payload.get("verification_token")
    raw_decision = str(payload.get("decision", "")).strip().upper()
    if not token or raw_decision not in VALID_DECISIONS:
        raise HTTPException(status_code=422, detail="verification_token and decision ('YES'|'NO') are required")

    record = await verification_repo.get_by_token(token)
    if not record:
        raise HTTPException(status_code=404, detail="Unknown or invalid verification token")

    # Idempotent replay: a repeat of an already-answered token returns the
    # existing recorded outcome and makes no further mutation.
    if record.get("status") != "PENDING":
        return {
            "ok": True,
            "verification_id": record["verification_id"],
            "case_id": record["case_id"],
            "status": record["status"],
            "duplicate": True,
        }

    expires_at = _parse_expiry(record.get("token_expires_at"))
    if expires_at and datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=410, detail="Verification token has expired")

    decision_status = VALID_DECISIONS[raw_decision]
    source_ip = request.client.host if request.client else None

    updated = await verification_repo.mark_responded(
        verification_token=token,
        decision=decision_status,
        responded_at=datetime.now(timezone.utc),
        source_ip=source_ip,
        n8n_execution_id=payload.get("n8n_execution_id"),
    )
    await verification_repo.commit_transaction()

    if updated is None:
        raise HTTPException(status_code=404, detail="Verification record not found")

    # Record as additional case evidence via the existing append-only audit
    # log. Explicitly NOT a Disposition; previous_case_status == new_case_status
    # proves no case-state mutation happened here.
    case = await case_repo.get_case_by_id(record["case_id"])
    if case:
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        audit_event = {
            "audit_id": f"AUD-CV-{uuid4().hex}",
            "event_type": "CUSTOMER_VERIFICATION_RESPONSE_RECEIVED",
            "case_id": record["case_id"],
            "primary_tx_id": case.get("primary_tx_id"),
            "analyst_id": "SYSTEM_N8N_VERIFYFLOW",
            "analyst_role": "AUTOMATION_ENGINE",
            "action_code": "CUSTOMER_VERIFICATION_RESPONSE_RECEIVED",
            "previous_case_status": case.get("status"),
            "new_case_status": case.get("status"),
            "analyst_notes": (
                f"Customer responded {raw_decision} to the automated payment verification "
                "request (SENTINEL VerifyFlow). Recorded as additional case evidence only -- "
                "no case status change or disposition was made. A human analyst must still "
                "review and submit the final disposition."
            ),
            "risk_acknowledged": False,
            "decision_support_summary": {},
            "traceability_chain": {},
            "timestamp": now_iso,
        }
        await case_repo.save_audit_event(audit_event)
        await case_repo.commit_transaction()

    # Frozen-state check is READ-ONLY evidence for the notification below --
    # this response can NEVER itself freeze or release an account.
    account_id = record.get("account_id")
    account = data_store.get("accounts", {}).get(account_id) if account_id else None
    account_frozen = bool(account and account.get("status") == "FROZEN")

    # Fire-and-forget background rationale generation -- this is the ONLY
    # trigger point for AI release-rationale generation. It never blocks
    # this webhook's response, and it never calls the release endpoint or
    # touches case/account state itself (advisory text only).
    if decision_status == "RESPONDED_YES" and account_frozen:
        primary_tx_id = case.get("primary_tx_id") if case else None
        background_tasks.add_task(
            _generate_and_persist_release_rationale_background,
            record["case_id"],
            primary_tx_id,
        )

    if n8n_route_state.broadcast_manager:
        try:
            await n8n_route_state.broadcast_manager.broadcast({
                "event": "customer.verification.responded",
                "case_id": record["case_id"],
                "verification_id": record["verification_id"],
                "status": decision_status,
                "reason_summary": record.get("reason_summary"),
                "responded_at": updated.get("response_received_at"),
                "account_frozen": account_frozen,
            })
            if account_frozen:
                # Persistent, case-identifying in-app notification -- shown
                # regardless of which case the analyst currently has open.
                # This broadcast is informational only; it never triggers
                # any freeze/release action itself.
                await n8n_route_state.broadcast_manager.broadcast({
                    "event": "customer_response_notification",
                    "case_id": record["case_id"],
                    "verification_id": record["verification_id"],
                    "transaction_id": case.get("primary_tx_id") if case else None,
                    "account_id": account_id,
                    "decision": decision_status,
                    "account_frozen": True,
                    "frozen_by": account.get("frozen_by"),
                    "frozen_at": account.get("frozen_at"),
                    "timestamp": updated.get("response_received_at"),
                })
        except Exception as e:
            print(f"[n8n routes] WS broadcast warning: {e}")

    return {
        "ok": True,
        "verification_id": record["verification_id"],
        "case_id": record["case_id"],
        "status": decision_status,
        "duplicate": False,
    }
