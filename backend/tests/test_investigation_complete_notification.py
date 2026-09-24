"""
Tests for the "SENTINEL -- Investigation Complete" n8n fan-out: pure
notification, fired from the real investigation.completed hook, non-blocking
(a slow/hung n8n call must never delay run_investigation()'s return), and it
never calls back into SENTINEL or mutates case state.
"""

import asyncio
import os
import time
import unittest
from typing import Any, Dict, List
from unittest.mock import AsyncMock, patch

from app.core.data_store import data_store
from app.repositories.in_memory import InMemoryCaseRepository
from app.services.investigation_orchestrator import InvestigationOrchestrator, _now_iso


class MockBroadcastManager:
    def __init__(self):
        self.events: List[Dict[str, Any]] = []

    async def broadcast(self, message: Dict[str, Any]) -> None:
        self.events.append(message)


class TestInvestigationCompleteFanOut(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        os.environ["N8N_ENABLED"] = "true"
        os.environ["N8N_INVESTIGATION_COMPLETE_TRIGGER_URL"] = "https://example.com/investigation-complete"
        os.environ["N8N_TRIGGER_AUTH_TOKEN"] = "test-token"

        self.repo = InMemoryCaseRepository(data_store)
        self.broadcast_mgr = MockBroadcastManager()
        self.orchestrator = InvestigationOrchestrator(broadcast_manager=self.broadcast_mgr)

        now = _now_iso()
        # Unique per test method: run_investigation() caches completed runs by
        # case_id in data_store["investigation_runs"], which persists across
        # tests in this process -- a shared case_id would short-circuit re-execution.
        self.case_id = f"CASE-IC-{self._testMethodName}"
        self.tx_id = f"TX-IC-{self._testMethodName}"

        data_store["accounts"] = {
            "ACC-IC-SND": {"account_id": "ACC-IC-SND", "status": "active"},
            "ACC-IC-RCV": {"account_id": "ACC-IC-RCV", "status": "active"},
        }
        data_store["transactions"] = {
            self.tx_id: {
                "tx_id": self.tx_id, "sender_account": "ACC-IC-SND", "receiver_account": "ACC-IC-RCV",
                "amount": 15000.0, "channel": "UPI", "risk_score": 30, "case_id": self.case_id, "timestamp": now,
            }
        }
        data_store["cases"] = {
            self.case_id: {
                "case_id": self.case_id, "primary_tx_id": self.tx_id, "status": "NEW",
                "risk_level": 30.0, "created_at": now, "updated_at": now,
            }
        }

    async def test_investigation_complete_does_not_block_on_slow_n8n(self):
        """A hung n8n endpoint must not delay run_investigation()'s return."""
        async def _slow_post(*args, **kwargs):
            await asyncio.sleep(5)
            return {"ok": True}

        with patch("app.services.n8n_dispatcher.post_to_n8n", side_effect=_slow_post):
            start = time.monotonic()
            record = await asyncio.wait_for(
                self.orchestrator.run_investigation(self.case_id, self.repo, store=data_store),
                timeout=2.0,  # would fail if the orchestrator awaited the 5s dispatch inline
            )
            elapsed = time.monotonic() - start

        self.assertEqual(record["status"], "COMPLETED")
        self.assertLess(elapsed, 2.0)

    async def test_investigation_complete_fan_out_payload_shape(self):
        with patch("app.services.n8n_dispatcher.post_to_n8n", new_callable=AsyncMock) as mock_post:
            record = await self.orchestrator.run_investigation(self.case_id, self.repo, store=data_store)
            # Allow the fire-and-forget asyncio.create_task(...) to actually run.
            await asyncio.sleep(0.05)

        self.assertEqual(record["status"], "COMPLETED")
        mock_post.assert_called()
        call_kwargs = mock_post.call_args.kwargs
        payload = call_kwargs["json_payload"]
        self.assertEqual(payload["event"], "INVESTIGATION_COMPLETED")
        self.assertEqual(payload["case_id"], self.case_id)
        self.assertIn("summary", payload)
        self.assertEqual(call_kwargs["headers"]["X-Sentinel-Auth"], "test-token")

    async def test_case_status_unchanged_by_fan_out(self):
        with patch("app.services.n8n_dispatcher.post_to_n8n", new_callable=AsyncMock):
            await self.orchestrator.run_investigation(self.case_id, self.repo, store=data_store)
            await asyncio.sleep(0.05)
        self.assertEqual(data_store["cases"][self.case_id]["status"], "NEW")


if __name__ == "__main__":
    unittest.main()
