"""
Explicit negative safety tests: n8n (and the customer's YES/NO response) must
NEVER be able to autonomously freeze, dismiss, approve, or escalate a case.
Only a human analyst via POST /cases/{case_id}/disposition can do that.

These tests actively try to smuggle disposition-like fields through the
n8n callback and assert they are silently ignored.
"""

import asyncio
import hashlib
import hmac
import json
import os
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from main import app
from app.core.data_store import data_store
from app.repositories.verification_repository import InMemoryVerificationRepository
from app.repositories.in_memory import InMemoryCaseRepository

client = TestClient(app)
WEBHOOK_SECRET = "test-shared-secret"


def _async_run(coro):
    return asyncio.run(coro)


def _sign(body_bytes: bytes) -> str:
    return hmac.new(WEBHOOK_SECRET.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()


def _post_signed(payload: dict):
    body_bytes = json.dumps(payload).encode("utf-8")
    sig = _sign(body_bytes)
    return client.post(
        "/webhooks/n8n/verification-response",
        content=body_bytes,
        headers={"X-Sentinel-Signature": sig, "Content-Type": "application/json"},
    )


class TestNoAutonomousDispositionFromN8n(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = WEBHOOK_SECRET
        self.case_id = f"CASE-NOAUTO-{self._testMethodName}"
        self.token = f"tok-noauto-{self._testMethodName}"

        data_store.setdefault("cases", {})[self.case_id] = {
            "case_id": self.case_id,
            "primary_tx_id": "TX-NOAUTO-1",
            "status": "UNDER_REVIEW",
            "risk_level": "HIGH",
        }

        verification_repo = InMemoryVerificationRepository(data_store)
        now = datetime.now(timezone.utc)
        _async_run(verification_repo.create_verification({
            "verification_id": f"CV-{self._testMethodName}",
            "case_id": self.case_id,
            "event_id": f"VF-{self.case_id}",
            "account_id": "ACC-USR-1004",
            "demo_customer_email": "adityaningappa@gmail.com",
            "reason_summary": "reason",
            "trigger_pattern_ids": ["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"],
            "verification_token": self.token,
            "token_expires_at": now + timedelta(hours=72),
            "status": "PENDING",
            "created_at": now.isoformat().replace("+00:00", "Z"),
            "updated_at": now.isoformat().replace("+00:00", "Z"),
        }))

    def test_forged_action_code_field_is_ignored(self):
        response = _post_signed({
            "verification_token": self.token,
            "decision": "NO",
            "action_code": "APPROVE_TRANSACTION",  # forged -- route never reads this field
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data_store["cases"][self.case_id]["status"], "UNDER_REVIEW")

    def test_forged_disposition_status_field_is_ignored(self):
        response = _post_signed({
            "verification_token": self.token,
            "decision": "YES",
            "status": "RESOLVED_APPROVED",  # forged
            "new_case_status": "RESOLVED_DISMISSED",  # forged
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data_store["cases"][self.case_id]["status"], "UNDER_REVIEW")

    def test_no_response_never_freezes_account(self):
        response = _post_signed({"verification_token": self.token, "decision": "NO"})
        self.assertEqual(response.status_code, 200)
        # No account/case field indicating a freeze/block ever gets set.
        case = data_store["cases"][self.case_id]
        self.assertNotIn("frozen", case)
        self.assertNotEqual(case["status"], "FROZEN")

    def test_case_lifecycle_service_never_invoked_from_this_route(self):
        """
        Structural proof: the customer-response callback path must never call
        into CaseLifecycleService.submit_case_disposition -- that is reachable
        ONLY from POST /cases/{case_id}/disposition, submitted by a human analyst.
        """
        with patch(
            "app.services.case_lifecycle_agent.CaseLifecycleService.submit_case_disposition"
        ) as mock_submit:
            response = _post_signed({"verification_token": self.token, "decision": "YES"})
            self.assertEqual(response.status_code, 200)
            mock_submit.assert_not_called()

    def test_no_disposition_record_created(self):
        _post_signed({"verification_token": self.token, "decision": "YES"})
        dispositions = data_store.get("dispositions", {}).get(self.case_id, [])
        self.assertEqual(dispositions, [])

    def test_forbidden_action_codes_remain_unreachable_via_this_route(self):
        """FORBIDDEN_ACTIONS (FREEZE/BLOCK/FILE_STR/CLOSE_ACCOUNT/REJECT_TRANSACTION)
        cannot even be attempted through this route -- it has no action_code parameter
        at all, unlike POST /cases/{case_id}/disposition."""
        for forged_action in ("FREEZE", "BLOCK", "FILE_STR", "CLOSE_ACCOUNT", "REJECT_TRANSACTION"):
            response = _post_signed({
                "verification_token": self.token,
                "decision": "NO",
                "action_code": forged_action,
            })
            self.assertEqual(response.status_code, 200)
            self.assertEqual(data_store["cases"][self.case_id]["status"], "UNDER_REVIEW")
            # Reset token to PENDING for the next iteration of this loop.
            data_store["customer_verifications"][f"CV-{self._testMethodName}"]["status"] = "PENDING"


if __name__ == "__main__":
    unittest.main()
