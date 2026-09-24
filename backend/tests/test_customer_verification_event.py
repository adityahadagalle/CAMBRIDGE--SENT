"""
Tests for event envelope construction and event_id idempotency in
CustomerVerificationService.evaluate_and_dispatch(). A case must trigger at
most one customer verification request in its lifetime, regardless of how
many times its investigation is (re-)run.
"""

import asyncio
import os
import unittest

from app.repositories.verification_repository import InMemoryVerificationRepository
from app.services.customer_verification_service import (
    build_event_envelope,
    evaluate_and_dispatch,
)


def _async_run(coro):
    return asyncio.run(coro)


def _contextual_rpt_triggering():
    return {
        "found": True,
        "status": "SUCCESS",
        "summary": {"contextual_severity": "HIGH", "confidence": 0.9, "pattern_count": 1},
        "patterns": [{"pattern_id": "FIRST_TIME_HIGH_VALUE_COUNTERPARTY", "matched": True}],
    }


def _evidence_pkg():
    return {
        "found": True,
        "evidence": [
            {
                "id": "EV-001",
                "type": "transaction",
                "data": {
                    "amount": 280000.0,
                    "currency": "INR",
                    "channel": "NEFT",
                    "sender_account": "ACC-USR-1004",
                    "receiver_account": "ACC-MULE-6001",
                    "timestamp": "2026-09-24T10:00:00Z",
                },
            }
        ],
    }


class TestBuildEventEnvelope(unittest.TestCase):
    def test_envelope_shape(self):
        env = build_event_envelope("CASE-FRAUD-600", "TX-FRAUD-6001")
        self.assertEqual(env["event"], "CUSTOMER_VERIFICATION_REQUIRED")
        self.assertEqual(env["case_id"], "CASE-FRAUD-600")
        self.assertEqual(env["transaction_id"], "TX-FRAUD-6001")
        self.assertEqual(env["schema_version"], "1.0")
        self.assertEqual(env["source"], "sentinel")
        self.assertIn("event_id", env)
        self.assertIn("timestamp", env)

    def test_event_id_is_deterministic_per_case(self):
        env1 = build_event_envelope("CASE-X", "TX-1")
        env2 = build_event_envelope("CASE-X", "TX-2")
        self.assertEqual(env1["event_id"], env2["event_id"])

    def test_event_id_differs_across_cases(self):
        env1 = build_event_envelope("CASE-A", "TX-1")
        env2 = build_event_envelope("CASE-B", "TX-1")
        self.assertNotEqual(env1["event_id"], env2["event_id"])


class TestEvaluateAndDispatchIdempotency(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_ENABLED"] = "false"  # no real network calls in this test
        os.environ["DEMO_MODE"] = "true"
        self.store = {}
        self.repo = InMemoryVerificationRepository(self.store)

    def test_first_dispatch_creates_pending_record(self):
        record = _async_run(evaluate_and_dispatch(
            case_id="CASE-EVT-1",
            evidence_pkg=_evidence_pkg(),
            contextual_rpt=_contextual_rpt_triggering(),
            case_record={"primary_tx_id": "TX-FRAUD-6001"},
            verification_repo=self.repo,
        ))
        self.assertIsNotNone(record)
        self.assertEqual(record["status"], "PENDING")
        self.assertEqual(record["case_id"], "CASE-EVT-1")

    def test_second_dispatch_for_same_case_is_idempotent_no_duplicate(self):
        first = _async_run(evaluate_and_dispatch(
            case_id="CASE-EVT-2",
            evidence_pkg=_evidence_pkg(),
            contextual_rpt=_contextual_rpt_triggering(),
            case_record={"primary_tx_id": "TX-FRAUD-6001"},
            verification_repo=self.repo,
        ))
        second = _async_run(evaluate_and_dispatch(
            case_id="CASE-EVT-2",
            evidence_pkg=_evidence_pkg(),
            contextual_rpt=_contextual_rpt_triggering(),
            case_record={"primary_tx_id": "TX-FRAUD-6001"},
            verification_repo=self.repo,
        ))
        self.assertEqual(first["verification_id"], second["verification_id"])
        all_records = _async_run(self.repo.get_for_case("CASE-EVT-2"))
        self.assertEqual(len(all_records), 1)

    def test_non_triggering_contextual_report_creates_nothing(self):
        non_triggering = {
            "found": True,
            "summary": {"contextual_severity": "LOW"},
            "patterns": [],
        }
        record = _async_run(evaluate_and_dispatch(
            case_id="CASE-EVT-3",
            evidence_pkg=_evidence_pkg(),
            contextual_rpt=non_triggering,
            case_record={"primary_tx_id": "TX-FRAUD-6001"},
            verification_repo=self.repo,
        ))
        self.assertIsNone(record)
        self.assertEqual(_async_run(self.repo.get_for_case("CASE-EVT-3")), [])

    def test_never_raises_on_malformed_input(self):
        """A hostile/malformed investigation payload must not crash the orchestrator hook."""
        try:
            result = _async_run(evaluate_and_dispatch(
                case_id="CASE-EVT-4",
                evidence_pkg=None,
                contextual_rpt={"garbage": True},
                case_record=None,
                verification_repo=self.repo,
            ))
        except Exception as e:
            self.fail(f"evaluate_and_dispatch raised unexpectedly: {e}")
        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
