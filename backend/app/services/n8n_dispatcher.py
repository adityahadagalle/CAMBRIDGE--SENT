"""
Outbound n8n webhook dispatcher for SENTINEL.

n8n is an external orchestration/communication dependency: its availability
must never affect core fraud detection, investigation, or disposition. This
module enforces that -- bounded timeout, bounded retries, never raises, and
is a complete no-op (zero network calls) unless N8N_ENABLED=true and a target
URL is supplied.
"""

import asyncio
import os
from typing import Any, Dict, Optional

import httpx


async def post_to_n8n(
    url: Optional[str],
    json_payload: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None,
    timeout: Optional[float] = None,
    max_retries: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Fire-and-forget POST to an n8n webhook. Never raises. Returns a result dict
    describing what happened, purely for logging/testing -- callers should not
    branch on it for control flow (this must stay non-blocking / best-effort).
    """
    if os.getenv("N8N_ENABLED", "false").lower() != "true":
        return {"ok": False, "skipped": True, "reason": "N8N_ENABLED is not true"}

    if not url:
        return {"ok": False, "skipped": True, "reason": "no target URL configured"}

    timeout = timeout if timeout is not None else float(os.getenv("N8N_OUTBOUND_TIMEOUT_SECONDS", "3"))
    max_retries = max_retries if max_retries is not None else int(os.getenv("N8N_OUTBOUND_MAX_RETRIES", "2"))

    last_error: Optional[str] = None
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=json_payload, headers=headers or {})
            return {"ok": response.status_code < 400, "status_code": response.status_code}
        except Exception as e:
            last_error = str(e)
            if attempt < max_retries:
                await asyncio.sleep(0.2 * (attempt + 1))

    print(f"[n8n_dispatcher] POST to {url} failed after {max_retries + 1} attempt(s): {last_error}")
    return {"ok": False, "skipped": False, "error": last_error}
