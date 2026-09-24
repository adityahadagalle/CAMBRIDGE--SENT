"""
Tests for CustomerVerificationService.evaluate_trigger() -- the deterministic,
evidence-driven gate that decides whether SENTINEL automatically contacts the
customer (n8n VerifyFlow). Built on real app/services/contextual_agent.py
pattern ids, not invented ones.
"""

import unittest

from app.services.customer_verification_service import evaluate_trigger


def _contextual_rpt(patterns, severity):
    return {
        "found": True,
        "status": "SUCCESS",
        "summary": {"contextual_severity": severity, "confidence": 0.9, "pattern_count": len(patterns)},
        "patterns": [{"pattern_id": p, "matched": True} for p in patterns],
    }


class TestEvaluateTrigger(unittest.TestCase):
    def test_high_value_new_beneficiary_triggers(self):
        rpt = _contextual_rpt(["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"], "HIGH")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertTrue(should_trigger)
        self.assertIn("FIRST_TIME_HIGH_VALUE_COUNTERPARTY", matched)

    def test_unusual_activity_rapid_structuring_triggers(self):
        """Brief Scenario B: multiple transactions in a short period."""
        rpt = _contextual_rpt(["RAPID_STRUCTURING"], "HIGH")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertTrue(should_trigger)
        self.assertIn("RAPID_STRUCTURING", matched)

    def test_cross_border_high_risk_activity_triggers(self):
        """Brief Scenario C: unusual access/device + high-value."""
        rpt = _contextual_rpt(["CROSS_BORDER_HIGH_RISK_ACTIVITY"], "CRITICAL")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertTrue(should_trigger)
        self.assertIn("CROSS_BORDER_HIGH_RISK_ACTIVITY", matched)

    def test_irrelevant_pattern_at_high_severity_does_not_trigger(self):
        """MULE_ACCOUNT_DRAINAGE alone is not in the trigger gate, even at HIGH severity."""
        rpt = _contextual_rpt(["MULE_ACCOUNT_DRAINAGE"], "HIGH")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertFalse(should_trigger)
        self.assertEqual(matched, [])

    def test_relevant_pattern_at_low_severity_does_not_trigger(self):
        rpt = _contextual_rpt(["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"], "MEDIUM")
        should_trigger, _ = evaluate_trigger(rpt)
        self.assertFalse(should_trigger)

    def test_no_patterns_does_not_trigger(self):
        rpt = _contextual_rpt([], "LOW")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertFalse(should_trigger)
        self.assertEqual(matched, [])

    def test_missing_contextual_report_does_not_trigger(self):
        should_trigger, matched = evaluate_trigger(None)
        self.assertFalse(should_trigger)
        self.assertEqual(matched, [])

    def test_not_found_contextual_report_does_not_trigger(self):
        should_trigger, _ = evaluate_trigger({"found": False, "summary": {}, "patterns": []})
        self.assertFalse(should_trigger)

    def test_both_relevant_patterns_matched(self):
        rpt = _contextual_rpt(["FIRST_TIME_HIGH_VALUE_COUNTERPARTY", "RAPID_STRUCTURING"], "CRITICAL")
        should_trigger, matched = evaluate_trigger(rpt)
        self.assertTrue(should_trigger)
        self.assertEqual(set(matched), {"FIRST_TIME_HIGH_VALUE_COUNTERPARTY", "RAPID_STRUCTURING"})


class TestTriggerAgainstRealCaseFraud600(unittest.TestCase):
    """
    Empirical verification: runs the REAL evidence + contextual agents against
    the REAL CASE-FRAUD-600 seed data and confirms evaluate_trigger() actually
    fires. This is the canonical judge-demo case -- if this test fails, the
    demo's VerifyFlow step will silently never trigger.
    """

    def test_case_fraud_600_triggers_verifyflow(self):
        from app.core.seed_data import seed_initial_demonstration_data
        from app.services.evidence_agent import collect_evidence_for_case
        from app.services.contextual_agent import investigate_context

        store = {"transactions": {}, "cases": {}, "graphs": {}, "accounts": {}, "actions": []}
        seed_initial_demonstration_data(store)

        evidence_pkg = collect_evidence_for_case("CASE-FRAUD-600", store)
        self.assertTrue(evidence_pkg.get("found"))

        contextual_rpt = investigate_context(evidence_pkg)
        self.assertTrue(contextual_rpt.get("found"))

        should_trigger, matched = evaluate_trigger(contextual_rpt)
        self.assertTrue(
            should_trigger,
            f"CASE-FRAUD-600 must trigger VerifyFlow for the canonical demo; "
            f"contextual_severity={contextual_rpt.get('summary', {}).get('contextual_severity')}, "
            f"patterns={[p.get('pattern_id') for p in contextual_rpt.get('patterns', [])]}",
        )
        self.assertTrue(len(matched) >= 1)


if __name__ == "__main__":
    unittest.main()
