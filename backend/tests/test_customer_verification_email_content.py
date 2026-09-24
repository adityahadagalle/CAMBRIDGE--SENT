"""
Tests for demo customer email resolution (DEMO_MODE gating, account map,
fallback address). SENTINEL's real account records have no email/phone field
-- this is entirely synthetic demo-mode data, never treated as production PII.
"""

import os
import unittest

from app.services.customer_verification_service import (
    DEMO_ACCOUNT_EMAIL_MAP,
    resolve_demo_customer_email,
)


class TestResolveDemoCustomerEmail(unittest.TestCase):
    def setUp(self):
        self._orig_demo_mode = os.environ.get("DEMO_MODE")
        self._orig_fallback = os.environ.get("DEMO_VERIFICATION_FALLBACK_EMAIL")

    def tearDown(self):
        for key, val in (("DEMO_MODE", self._orig_demo_mode), ("DEMO_VERIFICATION_FALLBACK_EMAIL", self._orig_fallback)):
            if val is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = val

    def test_known_seed_account_resolves_to_mapped_email(self):
        os.environ["DEMO_MODE"] = "true"
        email = resolve_demo_customer_email("ACC-USR-1004")
        self.assertEqual(email, DEMO_ACCOUNT_EMAIL_MAP["ACC-USR-1004"])

    def test_unknown_account_falls_back_to_default(self):
        os.environ["DEMO_MODE"] = "true"
        os.environ.pop("DEMO_VERIFICATION_FALLBACK_EMAIL", None)
        email = resolve_demo_customer_email("ACC-UNKNOWN-9999")
        self.assertIsNotNone(email)
        self.assertIn("@", email)

    def test_fallback_env_var_override(self):
        os.environ["DEMO_MODE"] = "true"
        os.environ["DEMO_VERIFICATION_FALLBACK_EMAIL"] = "override@example.com"
        email = resolve_demo_customer_email("ACC-UNKNOWN-9999")
        self.assertEqual(email, "override@example.com")

    def test_demo_mode_disabled_returns_none(self):
        os.environ["DEMO_MODE"] = "false"
        email = resolve_demo_customer_email("ACC-USR-1004")
        self.assertIsNone(email)

    def test_demo_mode_default_is_true_when_unset(self):
        os.environ.pop("DEMO_MODE", None)
        email = resolve_demo_customer_email("ACC-USR-1004")
        self.assertIsNotNone(email)

    def test_none_account_id_still_resolves_via_fallback(self):
        os.environ["DEMO_MODE"] = "true"
        email = resolve_demo_customer_email(None)
        self.assertIsNotNone(email)


if __name__ == "__main__":
    unittest.main()
