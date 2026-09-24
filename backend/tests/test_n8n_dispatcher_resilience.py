"""
Tests for app/services/n8n_dispatcher.py -- the outbound SENTINEL -> n8n call
path. n8n is an external dependency: it must never be able to slow down or
break core fraud detection/investigation. These tests lock in: disabled-by-
default, bounded timeout, bounded retries, and "never raises."
"""

import asyncio
import os
import unittest
from unittest.mock import AsyncMock, patch

from app.services.n8n_dispatcher import post_to_n8n


def _async_run(coro):
    return asyncio.run(coro)


class TestN8nDispatcherResilience(unittest.TestCase):
    def setUp(self):
        self._orig_enabled = os.environ.get("N8N_ENABLED")

    def tearDown(self):
        if self._orig_enabled is None:
            os.environ.pop("N8N_ENABLED", None)
        else:
            os.environ["N8N_ENABLED"] = self._orig_enabled

    def test_disabled_by_default_makes_zero_network_calls(self):
        os.environ.pop("N8N_ENABLED", None)  # unset -> default false
        with patch("httpx.AsyncClient") as mock_client:
            result = _async_run(post_to_n8n(url="https://example.com/webhook", json_payload={"a": 1}))
        mock_client.assert_not_called()
        self.assertTrue(result["skipped"])
        self.assertFalse(result["ok"])

    def test_explicitly_disabled_makes_zero_network_calls(self):
        os.environ["N8N_ENABLED"] = "false"
        with patch("httpx.AsyncClient") as mock_client:
            result = _async_run(post_to_n8n(url="https://example.com/webhook", json_payload={}))
        mock_client.assert_not_called()
        self.assertTrue(result["skipped"])

    def test_enabled_but_no_url_makes_zero_network_calls(self):
        os.environ["N8N_ENABLED"] = "true"
        with patch("httpx.AsyncClient") as mock_client:
            result = _async_run(post_to_n8n(url=None, json_payload={}))
        mock_client.assert_not_called()
        self.assertTrue(result["skipped"])

    def test_enabled_with_url_succeeds(self):
        os.environ["N8N_ENABLED"] = "true"
        mock_response = type("R", (), {"status_code": 200})()

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client_instance):
            result = _async_run(post_to_n8n(
                url="https://example.com/webhook",
                json_payload={"a": 1},
                timeout=1,
                max_retries=0,
            ))
        self.assertTrue(result["ok"])
        self.assertEqual(result["status_code"], 200)

    def test_never_raises_on_persistent_failure(self):
        os.environ["N8N_ENABLED"] = "true"

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(side_effect=Exception("connection refused"))
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client_instance):
            try:
                result = _async_run(post_to_n8n(
                    url="https://unreachable.example.com/webhook",
                    json_payload={},
                    timeout=0.1,
                    max_retries=1,
                ))
            except Exception as e:
                self.fail(f"post_to_n8n raised instead of degrading gracefully: {e}")
        self.assertFalse(result["ok"])
        self.assertFalse(result.get("skipped", False))

    def test_bounded_retry_count_respected(self):
        """With max_retries=2, the client's .post must be attempted exactly 3 times (1 + 2 retries)."""
        os.environ["N8N_ENABLED"] = "true"

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(side_effect=Exception("boom"))
        mock_client_instance.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_client_instance.__aexit__ = AsyncMock(return_value=False)

        with patch("httpx.AsyncClient", return_value=mock_client_instance):
            _async_run(post_to_n8n(
                url="https://example.com/webhook",
                json_payload={},
                timeout=0.1,
                max_retries=2,
            ))
        self.assertEqual(mock_client_instance.post.call_count, 3)


if __name__ == "__main__":
    unittest.main()
