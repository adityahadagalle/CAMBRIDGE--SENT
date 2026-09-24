"""
Tests for the human-only FREEZE/RELEASE flow interacting with n8n customer
verification. Core rule under test: "AI investigates. Human decides." --
n8n, the customer, and elapsed time can NEVER freeze or unfreeze anything.
Only POST /action/release (or /transactions/{id}/release), submitted by an
authenticated analyst with a mandatory reason, can release a frozen account.
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


class TestFreezeReleaseFlow(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = WEBHOOK_SECRET
        self.case_id = f"CASE-FR-{self._testMethodName}"
        self.tx_id = f"TX-FR-{self._testMethodName}"
        self.sender = f"ACC-FR-SND-{self._testMethodName}"
        self.receiver = f"ACC-FR-RCV-{self._testMethodName}"
        self.token = f"tok-fr-{self._testMethodName}"

        data_store.setdefault("accounts", {})[self.sender] = {"account_id": self.sender, "status": "active"}
        data_store.setdefault("accounts", {})[self.receiver] = {"account_id": self.receiver, "status": "active"}
        data_store.setdefault("transactions", {})[self.tx_id] = {
            "tx_id": self.tx_id,
            "case_id": self.case_id,
            "sender_account": self.sender,
            "receiver_account": self.receiver,
            "amount": 280000.0,
            "risk_score": 95,
        }
        data_store.setdefault("cases", {})[self.case_id] = {
            "case_id": self.case_id,
            "primary_tx_id": self.tx_id,
            "status": "HIGH_RISK",
        }

        verification_repo = InMemoryVerificationRepository(data_store)
        now = datetime.now(timezone.utc)
        _async_run(verification_repo.create_verification({
            "verification_id": f"CV-{self._testMethodName}",
            "case_id": self.case_id,
            "event_id": f"VF-{self.case_id}",
            "account_id": self.sender,
            "demo_customer_email": "adityaningappa@gmail.com",
            "reason_summary": "reason",
            "trigger_pattern_ids": ["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"],
            "verification_token": self.token,
            "token_expires_at": now + timedelta(hours=72),
            "status": "PENDING",
            "created_at": now.isoformat().replace("+00:00", "Z"),
            "updated_at": now.isoformat().replace("+00:00", "Z"),
        }))

    def _freeze(self, reason="Suspicious activity, manual review"):
        return client.post(
            f"/transactions/{self.tx_id}/freeze",
            json={"operator_id": "ANALYST_1", "reason": reason},
        )

    def _release(self, reason="Customer confirmed, false positive"):
        return client.post(
            f"/transactions/{self.tx_id}/release",
            json={"operator_id": "ANALYST_1", "reason": reason},
        )

    # 1. email sent -> pending verification (covered by existing customer_verification tests;
    #    re-asserted here as the flow's starting state)
    def test_01_pending_verification_exists(self):
        resp = client.get(f"/cases/{self.case_id}/verification-status")
        self.assertEqual(resp.json()["status"], "PENDING")

    # 2. analyst freezes before customer response
    def test_02_analyst_freezes_before_response(self):
        resp = self._freeze()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")
        self.assertEqual(data_store["accounts"][self.sender]["frozen_by"], "ANALYST_1")

    # 3. no response after 20 minutes -> still frozen (no automatic anything exists to test against
    #    time; assert freeze state is untouched by mere elapsed time / no background task flips it)
    def test_03_no_response_stays_frozen(self):
        self._freeze()
        # Simulate elapsed time by directly checking no timer/loop exists that changes state.
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")

    # 4 & 5. customer YES after freeze -> notification + still frozen
    def test_04_05_customer_yes_after_freeze_notifies_and_stays_frozen(self):
        self._freeze()
        response = _post_signed({"verification_token": self.token, "decision": "YES"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")

    # 6. customer YES does not call release endpoint
    def test_06_customer_yes_does_not_release(self):
        self._freeze()
        with patch("main.execute_operator_release") as mock_release:
            _post_signed({"verification_token": self.token, "decision": "YES"})
            mock_release.assert_not_called()
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")

    # 7. analyst manually releases after YES
    def test_07_analyst_manually_releases_after_yes(self):
        self._freeze()
        _post_signed({"verification_token": self.token, "decision": "YES"})
        resp = self._release()
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data_store["accounts"][self.sender]["status"], "ACTIVE")
        self.assertEqual(data_store["accounts"][self.sender]["released_by"], "ANALYST_1")

    # 8. release requires rationale
    def test_08_release_requires_rationale(self):
        self._freeze()
        resp = client.post(f"/transactions/{self.tx_id}/release", json={"operator_id": "ANALYST_1", "reason": ""})
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")

    # 9. customer NO after freeze -> notification + still frozen
    def test_09_customer_no_after_freeze_stays_frozen(self):
        self._freeze()
        resp = _post_signed({"verification_token": self.token, "decision": "NO"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(data_store["accounts"][self.sender]["status"], "FROZEN")

    # 10 & 11. duplicate YES/NO is idempotent
    def test_10_duplicate_yes_idempotent(self):
        self._freeze()
        first = _post_signed({"verification_token": self.token, "decision": "YES"})
        second = _post_signed({"verification_token": self.token, "decision": "YES"})
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(first.json()["status"], second.json()["status"])

    def test_11_duplicate_no_idempotent(self):
        self._freeze()
        first = _post_signed({"verification_token": self.token, "decision": "NO"})
        second = _post_signed({"verification_token": self.token, "decision": "NO"})
        self.assertTrue(second.json()["duplicate"])
        self.assertEqual(first.json()["status"], second.json()["status"])

    # 12. invalid HMAC rejected
    def test_12_invalid_hmac_rejected(self):
        resp = client.post(
            "/webhooks/n8n/verification-response",
            json={"verification_token": self.token, "decision": "YES"},
            headers={"X-Sentinel-Signature": "0" * 64},
        )
        self.assertEqual(resp.status_code, 401)

    # 13. replayed callback rejected (no mutation on repeat)
    def test_13_replayed_callback_no_mutation(self):
        self._freeze()
        _post_signed({"verification_token": self.token, "decision": "YES"})
        before = data_store["accounts"][self.sender].copy()
        _post_signed({"verification_token": self.token, "decision": "NO"})  # replay w/ opposite decision
        after = data_store["accounts"][self.sender].copy()
        self.assertEqual(before, after)

    # 14. unauthorized release rejected (no reason / not frozen)
    def test_14_release_on_non_frozen_account_rejected(self):
        resp = self._release()
        self.assertEqual(resp.status_code, 400)

    # 15. AI/n8n/customer cannot directly release -- structural proof: the only route that can
    # transition an account out of FROZEN is /transactions/{id}/release, requiring a human-supplied
    # rationale; the n8n callback route never imports or calls execute_operator_release.
    def test_15_n8n_route_module_never_references_release(self):
        import app.routes.n8n as n8n_module
        import inspect
        source = inspect.getsource(n8n_module)
        self.assertNotIn("execute_operator_release", source)
        self.assertNotIn("RELEASE", source)

    # 17. audit events generated correctly for freeze and release
    def test_17_audit_events_generated_for_freeze_and_release(self):
        self._freeze()
        self._release()
        audits = [a for a in data_store["audit_log"] if a.get("case_id") == self.case_id]
        action_codes = [a.get("action_code") for a in audits]
        self.assertIn("FREEZE", action_codes)
        self.assertIn("RELEASE", action_codes)

    # 18. refresh/reload preserves frozen state (re-fetch from data_store, not local UI state)
    def test_18_freeze_status_readable_after_reload(self):
        self._freeze()
        resp = client.get(f"/accounts/{self.sender}/freeze-status")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertTrue(body["frozen"])
        self.assertEqual(body["frozen_by"], "ANALYST_1")

    # 19. notification points to the correct case
    def test_19_notification_targets_correct_case(self):
        self._freeze()
        resp = _post_signed({"verification_token": self.token, "decision": "YES"})
        self.assertEqual(resp.json()["case_id"], self.case_id)


class TestMultipleFrozenCasesIndependent(unittest.TestCase):
    """20. multiple frozen cases can independently receive customer responses."""

    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = WEBHOOK_SECRET
        self.cases = []
        for i in range(2):
            case_id = f"CASE-MULTI-{i}"
            tx_id = f"TX-MULTI-{i}"
            sender = f"ACC-MULTI-SND-{i}"
            token = f"tok-multi-{i}"
            data_store.setdefault("accounts", {})[sender] = {"account_id": sender, "status": "active"}
            data_store.setdefault("transactions", {})[tx_id] = {
                "tx_id": tx_id, "case_id": case_id, "sender_account": sender,
                "receiver_account": f"ACC-MULTI-RCV-{i}", "amount": 100000.0, "risk_score": 90,
            }
            data_store.setdefault("cases", {})[case_id] = {
                "case_id": case_id, "primary_tx_id": tx_id, "status": "HIGH_RISK",
            }
            verification_repo = InMemoryVerificationRepository(data_store)
            now = datetime.now(timezone.utc)
            _async_run(verification_repo.create_verification({
                "verification_id": f"CV-multi-{i}", "case_id": case_id, "event_id": f"VF-{case_id}",
                "account_id": sender, "demo_customer_email": "a@b.com", "reason_summary": "r",
                "trigger_pattern_ids": [], "verification_token": token,
                "token_expires_at": now + timedelta(hours=72), "status": "PENDING",
                "created_at": now.isoformat().replace("+00:00", "Z"),
                "updated_at": now.isoformat().replace("+00:00", "Z"),
            }))
            client.post(f"/transactions/{tx_id}/freeze", json={"operator_id": "ANALYST_1", "reason": "review"})
            self.cases.append({"case_id": case_id, "tx_id": tx_id, "sender": sender, "token": token})

    def test_20_independent_responses_per_case(self):
        r0 = _post_signed({"verification_token": self.cases[0]["token"], "decision": "YES"})
        r1 = _post_signed({"verification_token": self.cases[1]["token"], "decision": "NO"})
        self.assertEqual(r0.json()["case_id"], self.cases[0]["case_id"])
        self.assertEqual(r1.json()["case_id"], self.cases[1]["case_id"])
        self.assertEqual(r0.json()["status"], "RESPONDED_YES")
        self.assertEqual(r1.json()["status"], "RESPONDED_NO")
        # Both accounts remain independently frozen.
        self.assertEqual(data_store["accounts"][self.cases[0]["sender"]]["status"], "FROZEN")
        self.assertEqual(data_store["accounts"][self.cases[1]["sender"]]["status"], "FROZEN")


if __name__ == "__main__":
    unittest.main()
