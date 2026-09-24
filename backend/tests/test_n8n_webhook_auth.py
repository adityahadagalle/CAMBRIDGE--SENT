"""
Tests for both directions of n8n <-> SENTINEL webhook authentication:
- SENTINEL -> n8n: outbound calls carry X-Sentinel-Auth (N8N_TRIGGER_AUTH_TOKEN).
- n8n -> SENTINEL: POST /webhooks/n8n/verification-response requires a valid
  X-Sentinel-Signature (HMAC-SHA256 over the raw body, using N8N_WEBHOOK_SECRET).
"""

import hashlib
import hmac
import json
import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from app.routes.n8n import _verify_signature

client = TestClient(app)


def _sign(body_bytes: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), body_bytes, hashlib.sha256).hexdigest()


class TestSignatureVerificationHelper(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = "test-shared-secret"

    def test_valid_signature_verifies(self):
        body = b'{"verification_token":"abc","decision":"YES"}'
        sig = _sign(body, "test-shared-secret")
        self.assertTrue(_verify_signature(body, sig))

    def test_wrong_secret_fails(self):
        body = b'{"verification_token":"abc","decision":"YES"}'
        sig = _sign(body, "wrong-secret")
        self.assertFalse(_verify_signature(body, sig))

    def test_tampered_body_fails(self):
        body = b'{"verification_token":"abc","decision":"YES"}'
        sig = _sign(body, "test-shared-secret")
        tampered_body = b'{"verification_token":"abc","decision":"NO"}'
        self.assertFalse(_verify_signature(tampered_body, sig))

    def test_missing_signature_fails(self):
        body = b'{"verification_token":"abc","decision":"YES"}'
        self.assertFalse(_verify_signature(body, None))

    def test_missing_secret_env_var_fails_closed(self):
        os.environ.pop("N8N_WEBHOOK_SECRET", None)
        body = b'{"verification_token":"abc","decision":"YES"}'
        sig = _sign(body, "")  # signer also has no secret
        self.assertFalse(_verify_signature(body, sig))


class TestVerificationResponseRouteAuth(unittest.TestCase):
    def setUp(self):
        os.environ["N8N_WEBHOOK_SECRET"] = "test-shared-secret"

    def test_missing_signature_header_rejected_401(self):
        payload = {"verification_token": "nonexistent", "decision": "YES"}
        response = client.post("/webhooks/n8n/verification-response", json=payload)
        self.assertEqual(response.status_code, 401)

    def test_wrong_signature_rejected_401(self):
        payload = {"verification_token": "nonexistent", "decision": "YES"}
        response = client.post(
            "/webhooks/n8n/verification-response",
            json=payload,
            headers={"X-Sentinel-Signature": "0" * 64},
        )
        self.assertEqual(response.status_code, 401)

    def test_valid_signature_but_unknown_token_returns_404(self):
        body_dict = {"verification_token": "definitely-does-not-exist", "decision": "YES"}
        body_bytes = json.dumps(body_dict).encode("utf-8")
        sig = _sign(body_bytes, "test-shared-secret")
        response = client.post(
            "/webhooks/n8n/verification-response",
            content=body_bytes,
            headers={"X-Sentinel-Signature": sig, "Content-Type": "application/json"},
        )
        self.assertEqual(response.status_code, 404)


class TestOutboundTriggerAuthHeader(unittest.TestCase):
    def test_verifyflow_dispatch_includes_trigger_auth_header(self):
        os.environ["N8N_TRIGGER_AUTH_TOKEN"] = "sentinel-trigger-token"
        os.environ["N8N_ENABLED"] = "true"

        with patch("app.services.n8n_dispatcher.post_to_n8n", new_callable=AsyncMock) as mock_post:
            import asyncio
            from app.repositories.verification_repository import InMemoryVerificationRepository
            from app.services.customer_verification_service import evaluate_and_dispatch

            repo = InMemoryVerificationRepository({})
            contextual_rpt = {
                "found": True,
                "summary": {"contextual_severity": "HIGH"},
                "patterns": [{"pattern_id": "FIRST_TIME_HIGH_VALUE_COUNTERPARTY", "matched": True}],
            }
            evidence_pkg = {
                "found": True,
                "evidence": [{"id": "EV-001", "type": "transaction", "data": {
                    "amount": 280000.0, "currency": "INR", "channel": "NEFT",
                    "sender_account": "ACC-USR-1004", "receiver_account": "ACC-MULE-6001",
                }}],
            }
            asyncio.run(evaluate_and_dispatch(
                case_id="CASE-AUTH-TEST",
                evidence_pkg=evidence_pkg,
                contextual_rpt=contextual_rpt,
                case_record={"primary_tx_id": "TX-1"},
                verification_repo=repo,
            ))

        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["headers"]["X-Sentinel-Auth"], "sentinel-trigger-token")
        # n8n needs an actual recipient address to send the VerifyFlow email.
        self.assertIn("customer_email", kwargs["json_payload"])
        self.assertTrue(kwargs["json_payload"]["customer_email"])


if __name__ == "__main__":
    unittest.main()
