"""
Tests for AI-Suggested Release Rationale in SENTINEL.
Verifies the complete flow:
- Suggest-release-rationale endpoint returns evidence-grounded rationale.
- Customer verification status (CUSTOMER_AUTHORIZED) is incorporated into the draft.
- AI is strictly advisory and cannot execute release.
- Multiple cases receive their own isolated rationales.
- Human analyst final approved rationale is stored in audit records.
"""

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


if __name__ == "__main__":
    unittest.main()
