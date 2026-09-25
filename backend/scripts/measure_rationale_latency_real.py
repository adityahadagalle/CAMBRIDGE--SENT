"""
Real end-to-end latency measurement against the actual local Ollama
instance running in this sandbox (llama3.2:3b, confirmed reachable at
OLLAMA_BASE_URL). Measures the unmodified "before" behavior (full context
rebuild + synchronous blocking call replicated inline) against the "after"
endpoint (cached vs. first-generation) through the real FastAPI app.
"""
import time
from fastapi.testclient import TestClient
from main import app, data_store
from app.routes.intelligence import _build_investigation_context
from app.services.ollama_service import ollama_service

client = TestClient(app)

case_id, tx_id = "CASE-TIMING-REAL-1", "TX-TIMING-REAL-1"
data_store.setdefault("accounts", {})["ACC-TR-SND"] = {"account_id": "ACC-TR-SND", "status": "FROZEN"}
data_store.setdefault("transactions", {})[tx_id] = {
    "tx_id": tx_id, "case_id": case_id, "sender_account": "ACC-TR-SND",
    "receiver_account": "ACC-TR-RCV", "amount": 250000, "channel": "IMPS", "risk_score": 88,
}
data_store.setdefault("cases", {})[case_id] = {"case_id": case_id, "primary_tx_id": tx_id, "status": "FROZEN"}
data_store.setdefault("customer_verifications", {})[case_id] = {
    "case_id": case_id, "status": "RESPONDED_YES", "triggered": True,
    "reason_summary": "Customer confirmed via secure link",
}

print(f"Resolved Ollama model: {ollama_service._resolve_model()}")
print(f"is_available(): {ollama_service.is_available()}")

# ---- BEFORE (unmodified behavior, reproduced inline): full context rebuild
#      + synchronous, un-offloaded suggest_release_rationale call. ----
import asyncio


async def before():
    t0 = time.perf_counter()
    ctx = await _build_investigation_context(case_id, data_store, repo=None) or {}
    t_ctx = time.perf_counter()
    ctx["primary_transaction"] = data_store["transactions"][tx_id]
    res = ollama_service.suggest_release_rationale(
        case_id=case_id, transaction_id=tx_id, investigation_context=ctx,
        verification_status={"status": "RESPONDED_YES"},
    )
    t_done = time.perf_counter()
    print(f"BEFORE -- context-build: {round((t_ctx - t0) * 1000, 1)} ms, "
          f"ollama call: {round((t_done - t_ctx) * 1000, 1)} ms, "
          f"TOTAL: {round((t_done - t0) * 1000, 1)} ms, status={res.status}")


try:
    asyncio.run(before())
except Exception as e:
    print("BEFORE measurement error (repo=None path):", e)

# ---- AFTER: real endpoint, first call (uncached) then second (cached). ----
t0 = time.perf_counter()
r1 = client.get(f"/cases/{case_id}/transactions/{tx_id}/suggest-release-rationale")
t1 = time.perf_counter()
print(f"AFTER -- UNCACHED (first generation) endpoint latency: {round((t1 - t0) * 1000, 1)} ms, status={r1.status_code}")
print("  response:", r1.json())

t2 = time.perf_counter()
r2 = client.get(f"/cases/{case_id}/transactions/{tx_id}/suggest-release-rationale")
t3 = time.perf_counter()
print(f"AFTER -- CACHED-HIT endpoint latency: {round((t3 - t2) * 1000, 1)} ms, status={r2.status_code}")
print("  response:", r2.json())
