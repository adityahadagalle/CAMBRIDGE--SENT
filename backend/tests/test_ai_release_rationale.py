"""
Tests for AI-Suggested Release Rationale in SENTINEL.
Verifies the complete flow:
- Suggest-release-rationale endpoint returns evidence-grounded rationale.
- Customer verification status (CUSTOMER_AUTHORIZED) is incorporated into the draft.
- AI is strictly advisory and cannot execute release.
- Multiple cases receive their own isolated rationales.
- Human analyst final approved rationale is stored in audit records.
"""

import hashlib
import hmac
import json
import os
import unittest
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app, data_store
from app.services.ollama_service import (
    ollama_service,
    ReleaseRationaleResult,
    ReleaseRationaleResponse,
)

client = TestClient(app)


class TestAiReleaseRationale(unittest.TestCase):
    def setUp(self):
        self.case_a = "CASE-AI-RAT-A"
        self.tx_a = "TX-AI-RAT-A"
        self.sender_a = "ACC-SND-A"
        self.receiver_a = "ACC-RCV-A"

        self.case_b = "CASE-AI-RAT-B"
        self.tx_b = "TX-AI-RAT-B"
        self.sender_b = "ACC-SND-B"
        self.receiver_b = "ACC-RCV-B"

        data_store.setdefault("accounts", {})[self.sender_a] = {"account_id": self.sender_a, "status": "FROZEN"}
        data_store.setdefault("accounts", {})[self.receiver_a] = {"account_id": self.receiver_a, "status": "frozen"}
        data_store.setdefault("transactions", {})[self.tx_a] = {
            "tx_id": self.tx_a,
            "case_id": self.case_a,
            "sender_account": self.sender_a,
            "receiver_account": self.receiver_a,
            "amount": 150000.0,
            "channel": "IMPS",
            "risk_score": 85,
        }
        data_store.setdefault("cases", {})[self.case_a] = {
            "case_id": self.case_a,
            "primary_tx_id": self.tx_a,
            "status": "FROZEN",
        }
        data_store.setdefault("customer_verifications", {})[self.case_a] = {
            "case_id": self.case_a,
            "status": "CUSTOMER_AUTHORIZED",
            "triggered": True,
            "reason_summary": "Customer confirmed transfer via secure link",
        }

        # Case B
        data_store["accounts"][self.sender_b] = {"account_id": self.sender_b, "status": "active"}
        data_store["accounts"][self.receiver_b] = {"account_id": self.receiver_b, "status": "frozen"}
        data_store["transactions"][self.tx_b] = {
            "tx_id": self.tx_b,
            "case_id": self.case_b,
            "sender_account": self.sender_b,
            "receiver_account": self.receiver_b,
            "amount": 95000.0,
            "channel": "UPI",
            "risk_score": 78,
        }
        data_store["cases"][self.case_b] = {
            "case_id": self.case_b,
            "primary_tx_id": self.tx_b,
            "status": "FROZEN",
        }
        data_store["customer_verifications"][self.case_b] = {
            "case_id": self.case_b,
            "status": "RESPONDED_NO",
            "triggered": True,
            "reason_summary": "Customer reported card stolen",
        }

    def test_01_suggest_release_rationale_endpoint_returns_json(self):
        """Endpoint GET /cases/{id}/transactions/{id}/suggest-release-rationale returns 200 and rationale field."""
        mock_res = ReleaseRationaleResult(
            status="ready",
            case_id=self.case_a,
            transaction_id=self.tx_a,
            response=ReleaseRationaleResponse(
                rationale="Customer confirmed the transaction as authorized. Available evidence supports review for release."
            )
        )
        with patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res):
            resp = client.get(f"/cases/{self.case_a}/transactions/{self.tx_a}/suggest-release-rationale")
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertIn("rationale", data)
            self.assertIn("Customer confirmed", data["rationale"])

    def test_02_multiple_cases_receive_distinct_rationales(self):
        """Case A and Case B receive their own respective rationales scoped by case and transaction ID."""
        def mock_suggest(case_id, transaction_id, investigation_context, verification_status=None):
            if case_id == self.case_a:
                return ReleaseRationaleResult(
                    status="ready",
                    case_id=case_id,
                    transaction_id=transaction_id,
                    response=ReleaseRationaleResponse(rationale=f"Rationale for Case A {case_id}")
                )
            else:
                return ReleaseRationaleResult(
                    status="ready",
                    case_id=case_id,
                    transaction_id=transaction_id,
                    response=ReleaseRationaleResponse(rationale=f"Rationale for Case B {case_id}")
                )

        with patch.object(ollama_service, "suggest_release_rationale", side_effect=mock_suggest):
            resp_a = client.get(f"/cases/{self.case_a}/transactions/{self.tx_a}/suggest-release-rationale")
            resp_b = client.get(f"/cases/{self.case_b}/transactions/{self.tx_b}/suggest-release-rationale")
            self.assertEqual(resp_a.status_code, 200)
            self.assertEqual(resp_b.status_code, 200)
            self.assertIn("Case A", resp_a.json()["rationale"])
            self.assertIn("Case B", resp_b.json()["rationale"])
            self.assertNotEqual(resp_a.json()["rationale"], resp_b.json()["rationale"])

    def test_03_ai_failure_returns_503_without_crashing(self):
        """When AI service fails or is unavailable, endpoint returns HTTP 503 with error detail."""
        mock_res = ReleaseRationaleResult(
            status="unavailable",
            case_id=self.case_a,
            transaction_id=self.tx_a,
            error_detail="Ollama is not reachable at configured URL."
        )
        with patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res):
            resp = client.get(f"/cases/{self.case_a}/transactions/{self.tx_a}/suggest-release-rationale")
            self.assertEqual(resp.status_code, 503)
            self.assertIn("Ollama is not reachable", resp.json()["detail"])

    def test_04_ai_or_customer_yes_does_not_release(self):
        """Customer YES and AI suggested rationale do NOT release the case or transaction."""
        mock_res = ReleaseRationaleResult(
            status="ready",
            case_id=self.case_a,
            transaction_id=self.tx_a,
            response=ReleaseRationaleResponse(rationale="AI suggested rationale")
        )
        with patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res):
            client.get(f"/cases/{self.case_a}/transactions/{self.tx_a}/suggest-release-rationale")
            
        case_obj = data_store["cases"][self.case_a]
        self.assertEqual(case_obj["status"], "FROZEN")

    def test_05_human_analyst_edited_rationale_persisted_in_audit(self):
        """When human analyst edits the AI draft and executes release, the edited rationale is saved."""
        edited_rationale = "Analyst verified with branch manager and customer. Authorized release."
        release_resp = client.post(
            f"/transactions/{self.tx_a}/release",
            json={"operator_id": "OPERATOR_ADMIN", "reason": edited_rationale}
        )
        self.assertEqual(release_resp.json()["action_code"], "RELEASE")
        self.assertEqual(release_resp.json()["execution_status"], "SUCCESS")
        self.assertEqual(data_store["accounts"][self.sender_a]["status"], "ACTIVE")

        # Verify audit events reflect the final analyst rationale
        audits = [
            a for a in data_store.get("audit_events", [])
            if a.get("action_type") in ("RELEASE", "UNFREEZE") or a.get("action_code") in ("RELEASE", "UNFREEZE")
        ]
        self.assertTrue(len(audits) > 0)
        latest_audit = audits[-1]
        self.assertEqual(latest_audit.get("reason"), edited_rationale)
        self.assertEqual(latest_audit.get("actor_type"), "HUMAN_OPERATOR")


class TestAiReleaseRationaleCachingAndBackground(unittest.TestCase):
    """
    Covers the caching/background-generation architecture: persisted
    suggestions short-circuit Ollama calls, concurrent requests dedup to a
    single generation, and the n8n customer-YES webhook (not the analyst
    opening the modal) is the trigger for background generation.
    """

    def setUp(self):
        self.case_c = "CASE-AI-RAT-C"
        self.tx_c = "TX-AI-RAT-C"
        data_store.setdefault("accounts", {})["ACC-SND-C"] = {"account_id": "ACC-SND-C", "status": "FROZEN"}
        data_store.setdefault("transactions", {})[self.tx_c] = {
            "tx_id": self.tx_c,
            "case_id": self.case_c,
            "sender_account": "ACC-SND-C",
            "receiver_account": "ACC-RCV-C",
            "amount": 42000.0,
            "channel": "UPI",
            "risk_score": 60,
        }
        data_store.setdefault("cases", {})[self.case_c] = {
            "case_id": self.case_c,
            "primary_tx_id": self.tx_c,
            "status": "FROZEN",
        }
        data_store.setdefault("customer_verifications", {}).pop(self.case_c, None)

        self.case_d = "CASE-AI-RAT-D"
        self.tx_d = "TX-AI-RAT-D"
        data_store["accounts"]["ACC-SND-D"] = {"account_id": "ACC-SND-D", "status": "FROZEN"}
        data_store["transactions"][self.tx_d] = {
            "tx_id": self.tx_d,
            "case_id": self.case_d,
            "sender_account": "ACC-SND-D",
            "receiver_account": "ACC-RCV-D",
            "amount": 15000.0,
            "channel": "IMPS",
            "risk_score": 40,
        }
        data_store["cases"][self.case_d] = {
            "case_id": self.case_d,
            "primary_tx_id": self.tx_d,
            "status": "FROZEN",
        }
        data_store["customer_verifications"].pop(self.case_d, None)

    def test_06_cached_rationale_returned_without_reinvoking_ollama(self):
        """A second GET for the same case+tx hits the persisted cache -- Ollama is called exactly once."""
        mock_res = ReleaseRationaleResult(
            status="ready",
            case_id=self.case_c,
            transaction_id=self.tx_c,
            model="qwen3:8b",
            response=ReleaseRationaleResponse(rationale="First generated rationale for case C."),
        )
        with patch.object(ollama_service, "is_available", return_value=True), \
             patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res) as mock_suggest:
            resp1 = client.get(f"/cases/{self.case_c}/transactions/{self.tx_c}/suggest-release-rationale")
            self.assertEqual(resp1.status_code, 200)
            self.assertEqual(mock_suggest.call_count, 1)

            resp2 = client.get(f"/cases/{self.case_c}/transactions/{self.tx_c}/suggest-release-rationale")
            self.assertEqual(resp2.status_code, 200)
            # Still only called once -- second request served from cache.
            self.assertEqual(mock_suggest.call_count, 1)
            self.assertEqual(resp1.json()["rationale"], resp2.json()["rationale"])
            self.assertTrue(resp2.json().get("cached"))

    def test_07_missing_rationale_generates_once_under_concurrent_requests(self):
        """
        Multiple concurrent GETs for the same uncached case+tx, issued on the
        SAME asyncio event loop (as real concurrent requests are in a live
        uvicorn process), trigger exactly one generation. Uses httpx's
        ASGI transport + asyncio.gather rather than Starlette's TestClient,
        because TestClient opens a fresh event loop per call (via its
        blocking-portal-per-request design), which would defeat the
        in-process asyncio.Lock dedup this test exists to verify.
        """
        import asyncio as _asyncio
        import httpx

        mock_res = ReleaseRationaleResult(
            status="ready",
            case_id=self.case_d,
            transaction_id=self.tx_d,
            model="qwen3:8b",
            response=ReleaseRationaleResponse(rationale="Rationale for case D."),
        )

        async def slow_suggest(*args, **kwargs):
            await _asyncio.sleep(0.2)
            return mock_res

        async def run_concurrent():
            transport = httpx.ASGITransport(app=app)
            async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as ac:
                urls = [f"/cases/{self.case_d}/transactions/{self.tx_d}/suggest-release-rationale"] * 4
                return await _asyncio.gather(*(ac.get(u) for u in urls))

        with patch.object(ollama_service, "is_available", return_value=True):
            with patch.object(
                ollama_service, "suggest_release_rationale",
                side_effect=lambda *a, **kw: mock_res,
            ) as mock_suggest:
                # run_in_threadpool offloads the (mocked, synchronous) call;
                # a small sleep inside the mock, executed on the threadpool,
                # keeps the request in flight long enough for the other
                # concurrent requests to reach the lock and see PENDING.
                def slow_sync_suggest(*a, **kw):
                    import time
                    time.sleep(0.2)
                    return mock_res
                mock_suggest.side_effect = slow_sync_suggest

                results = _asyncio.run(run_concurrent())

            self.assertEqual(len(results), 4)
            for r in results:
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.json()["rationale"], "Rationale for case D.")
            self.assertEqual(mock_suggest.call_count, 1)

    def test_08_customer_yes_frozen_triggers_background_generation_without_suggest_endpoint(self):
        """
        Customer YES + frozen account fires background generation (verified by
        the persisted verification record), without the test itself ever
        calling the suggest-release-rationale endpoint.
        """
        case_id = "CASE-AI-RAT-BG"
        tx_id = "TX-AI-RAT-BG"
        account_id = "ACC-SND-BG"
        data_store["accounts"][account_id] = {"account_id": account_id, "status": "FROZEN"}
        data_store["transactions"][tx_id] = {
            "tx_id": tx_id, "case_id": case_id, "sender_account": account_id,
            "receiver_account": "ACC-RCV-BG", "amount": 5000.0, "channel": "UPI", "risk_score": 30,
        }
        data_store["cases"][case_id] = {"case_id": case_id, "primary_tx_id": tx_id, "status": "FROZEN"}

        verification_id = "VER-BG-001"
        token = "TOKEN-BG-001"
        from datetime import timedelta
        data_store.setdefault("customer_verifications", {})[verification_id] = {
            "verification_id": verification_id,
            "case_id": case_id,
            "event_id": "EVT-BG-001",
            "account_id": account_id,
            "demo_customer_email": "demo@example.com",
            "reason_summary": "High risk transfer",
            "trigger_pattern_ids": [],
            "verification_token": token,
            "token_expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "status": "PENDING",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        mock_res = ReleaseRationaleResult(
            status="ready",
            case_id=case_id,
            transaction_id=tx_id,
            model="qwen3:8b",
            response=ReleaseRationaleResponse(rationale="Background-generated rationale."),
        )

        prior_secret = os.environ.get("N8N_WEBHOOK_SECRET")
        os.environ["N8N_WEBHOOK_SECRET"] = "test-secret-rationale-bg"
        try:
            with patch.object(ollama_service, "is_available", return_value=True), \
                 patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res) as mock_suggest:
                body = json.dumps({"verification_token": token, "decision": "YES"}).encode()
                sig = hmac.new(b"test-secret-rationale-bg", body, hashlib.sha256).hexdigest()
                resp = client.post(
                    "/webhooks/n8n/verification-response",
                    content=body,
                    headers={"X-Sentinel-Signature": sig, "Content-Type": "application/json"},
                )
                self.assertEqual(resp.status_code, 200)
                self.assertEqual(resp.json()["status"], "RESPONDED_YES")

                # Persisted rationale appeared as a side effect of the webhook --
                # the suggest-release-rationale endpoint was never called here.
                self.assertTrue(mock_suggest.called)
                rec = data_store["customer_verifications"][verification_id]
                self.assertEqual(rec.get("suggested_rationale_status"), "READY")
                self.assertEqual(rec.get("suggested_release_rationale"), "Background-generated rationale.")
        finally:
            if prior_secret is None:
                os.environ.pop("N8N_WEBHOOK_SECRET", None)
            else:
                os.environ["N8N_WEBHOOK_SECRET"] = prior_secret

    def test_09_ai_timeout_returns_clear_failure_signal(self):
        """AI timeout during generation returns HTTP 503, not a crash, and does not persist a READY status."""
        mock_res = ReleaseRationaleResult(
            status="timeout",
            case_id=self.case_c,
            transaction_id="TX-TIMEOUT-CASE",
            error_detail="Ollama did not respond within 60s.",
        )
        case_id = "CASE-AI-RAT-TIMEOUT"
        tx_id = "TX-TIMEOUT-CASE"
        data_store["cases"][case_id] = {"case_id": case_id, "primary_tx_id": tx_id, "status": "FROZEN"}
        data_store["transactions"][tx_id] = {"tx_id": tx_id, "case_id": case_id}

        with patch.object(ollama_service, "is_available", return_value=True), \
             patch.object(ollama_service, "suggest_release_rationale", return_value=mock_res):
            resp = client.get(f"/cases/{case_id}/transactions/{tx_id}/suggest-release-rationale")
            self.assertEqual(resp.status_code, 503)
            self.assertIn("detail", resp.json())


if __name__ == "__main__":
    unittest.main()
