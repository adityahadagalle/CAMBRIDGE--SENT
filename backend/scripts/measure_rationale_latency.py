"""
Throwaway timing script for the AI release-rationale caching work.
Measures (a) prompt-size reduction and (b) endpoint latency cached vs.
uncached. Ollama is not reachable in this sandbox, so the actual model call
is mocked with a synthetic sleep standing in for generation time; everything
else (context lookup, cache check, endpoint overhead) is measured for real.
"""
import time
from unittest.mock import patch
from fastapi.testclient import TestClient
from main import app, data_store
from app.services.ollama_service import ollama_service, ReleaseRationaleResult, ReleaseRationaleResponse

client = TestClient(app)

case_id, tx_id = "CASE-TIMING-1", "TX-TIMING-1"
data_store.setdefault("accounts", {})["ACC-T-SND"] = {"account_id": "ACC-T-SND", "status": "FROZEN"}
data_store.setdefault("transactions", {})[tx_id] = {
    "tx_id": tx_id, "case_id": case_id, "sender_account": "ACC-T-SND",
    "receiver_account": "ACC-T-RCV", "amount": 10000, "channel": "UPI", "risk_score": 50,
}
data_store.setdefault("cases", {})[case_id] = {"case_id": case_id, "primary_tx_id": tx_id, "status": "FROZEN"}

# Old prompt shape: full 2000-char JSON dump x5 stages (simulate the same
# input the OLD _build_rationale_message would have serialized).
import json as _json
big_report = {"summary": "x" * 3000, "detail": "y" * 3000, "items": ["z" * 200] * 20}
ctx_big = {
    "primary_transaction": data_store["transactions"][tx_id],
    "investigation_reports": {
        stg: big_report for stg in ["evidence", "contextual", "regulatory", "audit_explanation", "decision_support"]
    },
}
old_style_size = len("=== GENERATE SUGGESTED RELEASE RATIONALE ===") + sum(
    len(_json.dumps(big_report, indent=2)[:2000]) for _ in range(5)
)
new_prompt = ollama_service._build_rationale_message(case_id, tx_id, ctx_big, {"status": "RESPONDED_YES"})
print(f"OLD-STYLE prompt size (5 x 2000-char raw report dumps): ~{old_style_size} chars")
print(f"NEW prompt size (lightweight per-stage conclusions):    {len(new_prompt)} chars")

mock_res = ReleaseRationaleResult(
    status="ready", case_id=case_id, transaction_id=tx_id, model="qwen3:8b",
    response=ReleaseRationaleResponse(rationale="Synthetic rationale for timing."),
)


def slow_suggest(*a, **kw):
    time.sleep(0.05)  # synthetic Ollama generation time (unreachable in this sandbox)
    return mock_res


with patch.object(ollama_service, "is_available", return_value=True), \
     patch.object(ollama_service, "suggest_release_rationale", side_effect=slow_suggest):
    t0 = time.perf_counter()
    r1 = client.get(f"/cases/{case_id}/transactions/{tx_id}/suggest-release-rationale")
    t1 = time.perf_counter()
    print(f"UNCACHED (first generation) latency: {round((t1 - t0) * 1000, 2)} ms -- {r1.status_code} {r1.json()}")

    t2 = time.perf_counter()
    r2 = client.get(f"/cases/{case_id}/transactions/{tx_id}/suggest-release-rationale")
    t3 = time.perf_counter()
    print(f"CACHED-HIT latency:                  {round((t3 - t2) * 1000, 2)} ms -- {r2.status_code} {r2.json()}")
