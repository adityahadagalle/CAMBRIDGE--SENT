"""
Unit tests for InMemoryVerificationRepository (dev/test mode backing store
for CustomerVerification records, n8n VerifyFlow integration).
"""

import asyncio
import unittest
from datetime import datetime, timedelta, timezone

from app.repositories.verification_repository import InMemoryVerificationRepository


def _async_run(coro):
    return asyncio.run(coro)


def _make_record(**overrides):
    now = datetime.now(timezone.utc)
    record = {
        "verification_id": "CV-test-001",
        "case_id": "CASE-TEST-VF-1",
        "event_id": "VF-CASE-TEST-VF-1",
        "account_id": "ACC-USR-1004",
        "demo_customer_email": "adityaningappa@gmail.com",
        "reason_summary": "This payment is much higher than your recent activity.",
        "trigger_pattern_ids": ["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"],
        "verification_token": "tok-abc-123",
        "token_expires_at": now + timedelta(hours=72),
        "status": "PENDING",
        "created_at": now.isoformat().replace("+00:00", "Z"),
        "updated_at": now.isoformat().replace("+00:00", "Z"),
    }
    record.update(overrides)
    return record


class TestInMemoryVerificationRepository(unittest.TestCase):
    def setUp(self):
        self.store = {}
        self.repo = InMemoryVerificationRepository(self.store)

    def test_create_and_get_by_token(self):
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        found = _async_run(self.repo.get_by_token("tok-abc-123"))
        self.assertIsNotNone(found)
        self.assertEqual(found["case_id"], "CASE-TEST-VF-1")

    def test_get_by_token_unknown_returns_none(self):
        found = _async_run(self.repo.get_by_token("does-not-exist"))
        self.assertIsNone(found)

    def test_get_by_event_id_idempotency_lookup(self):
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        found = _async_run(self.repo.get_by_event_id("CASE-TEST-VF-1", "VF-CASE-TEST-VF-1"))
        self.assertIsNotNone(found)
        # Different case_id must not match, even with the same event_id string.
        not_found = _async_run(self.repo.get_by_event_id("CASE-OTHER", "VF-CASE-TEST-VF-1"))
        self.assertIsNone(not_found)

    def test_mark_responded_yes(self):
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        updated = _async_run(self.repo.mark_responded(
            verification_token="tok-abc-123",
            decision="RESPONDED_YES",
            responded_at=datetime.now(timezone.utc),
            source_ip="1.2.3.4",
        ))
        self.assertEqual(updated["status"], "RESPONDED_YES")
        self.assertIsNotNone(updated["response_received_at"])
        self.assertEqual(updated["response_source_ip"], "1.2.3.4")

    def test_mark_responded_no(self):
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        updated = _async_run(self.repo.mark_responded(
            verification_token="tok-abc-123",
            decision="RESPONDED_NO",
            responded_at=datetime.now(timezone.utc),
        ))
        self.assertEqual(updated["status"], "RESPONDED_NO")

    def test_mark_responded_is_idempotent_on_repeat(self):
        """A second mark_responded on an already-responded token is a no-op (status unchanged)."""
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        first = _async_run(self.repo.mark_responded(
            verification_token="tok-abc-123", decision="RESPONDED_YES",
            responded_at=datetime.now(timezone.utc),
        ))
        second = _async_run(self.repo.mark_responded(
            verification_token="tok-abc-123", decision="RESPONDED_NO",
            responded_at=datetime.now(timezone.utc),
        ))
        self.assertEqual(first["status"], "RESPONDED_YES")
        # Second call must NOT flip it to RESPONDED_NO -- already-PENDING guard.
        self.assertEqual(second["status"], "RESPONDED_YES")

    def test_mark_responded_unknown_token_returns_none(self):
        result = _async_run(self.repo.mark_responded(
            verification_token="ghost-token", decision="RESPONDED_YES",
            responded_at=datetime.now(timezone.utc),
        ))
        self.assertIsNone(result)

    def test_get_for_case_returns_most_recent_first(self):
        older = _make_record(verification_id="CV-old", verification_token="tok-old", created_at="2026-01-01T00:00:00Z")
        newer = _make_record(verification_id="CV-new", verification_token="tok-new", created_at="2026-02-01T00:00:00Z")
        _async_run(self.repo.create_verification(older))
        _async_run(self.repo.create_verification(newer))
        results = _async_run(self.repo.get_for_case("CASE-TEST-VF-1"))
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["verification_id"], "CV-new")

    def test_get_for_case_empty_when_none_exist(self):
        results = _async_run(self.repo.get_for_case("CASE-NOTHING-HERE"))
        self.assertEqual(results, [])

    def test_records_isolated_by_deepcopy(self):
        """Returned dicts must be copies -- mutating them must not corrupt the store."""
        record = _make_record()
        _async_run(self.repo.create_verification(record))
        found = _async_run(self.repo.get_by_token("tok-abc-123"))
        found["status"] = "TAMPERED"
        found_again = _async_run(self.repo.get_by_token("tok-abc-123"))
        self.assertEqual(found_again["status"], "PENDING")


if __name__ == "__main__":
    unittest.main()
