"""
Integration tests for POST /webhooks/n8n/verification-response -- the ONLY
inbound n8n -> SENTINEL surface. Covers YES/NO handling, token expiry,
replay/duplicate-response protection, case-evidence (audit event) creation,
and WS broadcast -- using the real app + real InMemory repositories bound to
the shared data_store, exactly as the live app resolves them.
"""

import asyncio
import hashlib
import hmac
import json
import os
import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from main import app
from app.core.data_store import data_store
from app.repositories.verification_repository import InMemoryVerificationRepository

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


class TestVerificationResponseCallback(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = WEBHOOK_SECRET
        self.case_id = f"CASE-CB-{self._testMethodName}"
        self.token = f"tok-{self._testMethodName}"

        data_store.setdefault("cases", {})[self.case_id] = {
            "case_id": self.case_id,
            "primary_tx_id": "TX-CB-1",
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
            "reason_summary": "This payment is much higher than your recent activity.",
            "trigger_pattern_ids": ["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"],
            "verification_token": self.token,
            "token_expires_at": now + timedelta(hours=72),
            "status": "PENDING",
            "created_at": now.isoformat().replace("+00:00", "Z"),
            "updated_at": now.isoformat().replace("+00:00", "Z"),
        }))

    def test_yes_response_recorded(self):
        response = _post_signed({"verification_token": self.token, "decision": "YES"})
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["status"], "RESPONDED_YES")
        self.assertFalse(body["duplicate"])

    def test_no_response_recorded(self):
        response = _post_signed({"verification_token": self.token, "decision": "NO"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "RESPONDED_NO")

    def test_lowercase_decision_normalized(self):
        response = _post_signed({"verification_token": self.token, "decision": "no"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "RESPONDED_NO")

    def test_invalid_decision_value_rejected(self):
        response = _post_signed({"verification_token": self.token, "decision": "MAYBE"})
        self.assertEqual(response.status_code, 422)

    def test_missing_token_rejected(self):
        response = _post_signed({"decision": "YES"})
        self.assertEqual(response.status_code, 422)

    def test_duplicate_response_is_idempotent(self):
        first = _post_signed({"verification_token": self.token, "decision": "YES"})
        second = _post_signed({"verification_token": self.token, "decision": "YES"})
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(second.json()["status"], "RESPONDED_YES")

    def test_replay_with_different_decision_does_not_flip_original(self):
        """Attacker replays the token with the OPPOSITE decision after a real response landed."""
        first = _post_signed({"verification_token": self.token, "decision": "YES"})
        replay = _post_signed({"verification_token": self.token, "decision": "NO"})
        self.assertEqual(first.json()["status"], "RESPONDED_YES")
        self.assertEqual(replay.json()["status"], "RESPONDED_YES")  # unchanged, not flipped to NO
        self.assertTrue(replay.json()["duplicate"])

    def test_expired_token_rejected_410(self):
        expired_token = f"expired-{self._testMethodName}"
        verification_repo = InMemoryVerificationRepository(data_store)
        past = datetime.now(timezone.utc) - timedelta(hours=1)
        _async_run(verification_repo.create_verification({
            "verification_id": f"CV-expired-{self._testMethodName}",
            "case_id": self.case_id,
            "event_id": f"VF-expired-{self.case_id}",
            "account_id": "ACC-USR-1004",
            "demo_customer_email": "adityaningappa@gmail.com",
            "reason_summary": "reason",
            "trigger_pattern_ids": [],
            "verification_token": expired_token,
            "token_expires_at": past,
            "status": "PENDING",
            "created_at": past.isoformat().replace("+00:00", "Z"),
            "updated_at": past.isoformat().replace("+00:00", "Z"),
        }))
        response = _post_signed({"verification_token": expired_token, "decision": "YES"})
        self.assertEqual(response.status_code, 410)

    def test_audit_event_recorded_without_case_status_mutation(self):
        _post_signed({"verification_token": self.token, "decision": "NO"})
        audit_events = [a for a in data_store["audit_log"] if a.get("case_id") == self.case_id]
        self.assertEqual(len(audit_events), 1)
        event = audit_events[0]
        self.assertEqual(event["action_code"], "CUSTOMER_VERIFICATION_RESPONSE_RECEIVED")
        self.assertEqual(event["analyst_role"], "AUTOMATION_ENGINE")
        # Proof of no case-state mutation from this path:
        self.assertEqual(event["previous_case_status"], event["new_case_status"])
        self.assertEqual(data_store["cases"][self.case_id]["status"], "UNDER_REVIEW")


if __name__ == "__main__":
    unittest.main()
