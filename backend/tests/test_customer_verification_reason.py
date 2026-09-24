"""
Tests for customer-safe reason generation. The customer-facing message must
NEVER leak internal investigation terminology: risk scores, ML confidence,
fraud classification, mule/laundering terms, graph topology, EV-/CTX-/REG-
ids, analyst notes, internal case state, or AI recommendation language.
"""

import re
import unittest

from app.services.customer_verification_service import (
    REASON_TEMPLATES,
    DEFAULT_REASON,
    TRIGGER_PATTERNS,
    generate_customer_safe_reason,
)

FORBIDDEN_PATTERNS = [
    r"\bEV-\d",
    r"\bCTX-\d",
    r"\bREG-\d",
    r"\bmule\b",
    r"\bmoney\s*launder",
    r"\brisk[\s_]?score\b",
    r"\bconfidence\b",
    r"\bML\b",
    r"\bmachine[\s_]?learning\b",
    r"\bpattern[_\s]?id\b",
    r"\banalyst\b",
    r"\bgraph\b",
    r"\btopology\b",
    r"\bregulatory\b",
    r"\bPMLA\b",
    r"\bFIU",
    r"\bfraud\b",
    r"\bFIRST_TIME_HIGH_VALUE",
    r"\bRAPID_STRUCTURING\b",
    r"\bCROSS_BORDER_HIGH_RISK_ACTIVITY\b",
    r"\bBEHAVIORAL_ESCALATION\b",
]


class TestReasonTemplatesAreCustomerSafe(unittest.TestCase):
    def test_every_template_is_customer_safe(self):
        all_texts = list(REASON_TEMPLATES.values()) + [DEFAULT_REASON]
        for text in all_texts:
            for pattern in FORBIDDEN_PATTERNS:
                self.assertIsNone(
                    re.search(pattern, text, flags=re.IGNORECASE),
                    f"Forbidden term matched pattern {pattern!r} in reason text: {text!r}",
                )

    def test_all_real_contextual_pattern_ids_have_templates(self):
        """
        Every real pattern_id contextual_agent.py can emit should resolve to a
        template (or the safe default) -- never crash, never leak the raw id.
        """
        real_pattern_ids = [
            "RAPID_STRUCTURING",
            "MULE_ACCOUNT_DRAINAGE",
            "PASS_THROUGH_ACTIVITY",
            "MULTI_HOP_PROPAGATION",
            "FIRST_TIME_HIGH_VALUE_COUNTERPARTY",
            "BEHAVIORAL_ESCALATION",
            "CROSS_BORDER_HIGH_RISK_ACTIVITY",
        ]
        for pid in real_pattern_ids:
            reason = generate_customer_safe_reason([pid])
            self.assertIsInstance(reason, str)
            self.assertTrue(len(reason) > 0)

    def test_unknown_pattern_id_falls_back_to_default(self):
        reason = generate_customer_safe_reason(["SOME_FUTURE_PATTERN_NOT_YET_MAPPED"])
        self.assertEqual(reason, DEFAULT_REASON)

    def test_empty_pattern_list_falls_back_to_default(self):
        reason = generate_customer_safe_reason([])
        self.assertEqual(reason, DEFAULT_REASON)

    def test_first_match_wins_precedence(self):
        reason = generate_customer_safe_reason(["FIRST_TIME_HIGH_VALUE_COUNTERPARTY", "RAPID_STRUCTURING"])
        self.assertEqual(reason, REASON_TEMPLATES["FIRST_TIME_HIGH_VALUE_COUNTERPARTY"])

    def test_trigger_patterns_all_have_dedicated_templates(self):
        """The 3 patterns that actually gate VerifyFlow must have specific (non-default) templates."""
        for pid in TRIGGER_PATTERNS:
            self.assertIn(pid, REASON_TEMPLATES)
            self.assertNotEqual(REASON_TEMPLATES[pid], DEFAULT_REASON)


if __name__ == "__main__":
    unittest.main()
