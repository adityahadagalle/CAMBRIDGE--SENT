# SENTINEL × n8n Integration

**Scope:** n8n is an external orchestration/communication layer. It never investigates, scores, or decides fraud outcomes. Every rule in this document exists to protect that boundary: "AI investigates. Human decides." applies equally to n8n — n8n is not part of the AI investigation either; it only sends messages and relays a customer's raw YES/NO answer back as evidence.

## 1. Architecture

```
Transaction → Scoring → Case Creation → 5-Agent Investigation
                                              │
                               (investigation.completed)
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
      CustomerVerificationService.evaluate_and_dispatch      n8n_dispatcher.post_to_n8n
      (evidence-driven trigger decision)                     (fire-and-forget fan-out)
                    │                                                   │
                    ▼                                                   ▼
         n8n "SENTINEL — VerifyFlow"                    n8n "SENTINEL — Investigation Complete"
                    │                                                   │
          customer email (YES/NO)                              email to compliance analyst
                    │
          customer clicks a link
                    │
    n8n "SENTINEL — VerifyFlow" (response webhook)
                    │
     HMAC-signed POST /webhooks/n8n/verification-response
                    │
        recorded as case evidence (audit event)
        + WebSocket broadcast to the frontend
                    │
        human analyst reviews + submits final disposition
        via POST /cases/{case_id}/disposition (unchanged, unaffected by n8n)
```

A third, independent workflow, "SENTINEL — System Health Monitor", polls `GET /health` on a schedule and alerts on failure. It has no callback into SENTINEL.

## 2. Workflow 1 — SENTINEL VerifyFlow

### 2.1 Trigger decision (evidence-driven, not risk-score-driven)

Implemented in `backend/app/services/customer_verification_service.py::evaluate_trigger()`, built directly on real `contextual_agent.py` pattern ids — not invented ones:

```
should_trigger = (
    any pattern in {FIRST_TIME_HIGH_VALUE_COUNTERPARTY, RAPID_STRUCTURING, CROSS_BORDER_HIGH_RISK_ACTIVITY} matched
) and contextual_severity in {HIGH, CRITICAL}
```

These three patterns map directly onto the brief's three example scenarios:

| Scenario | Pattern |
|---|---|
| High-value transaction + new beneficiary | `FIRST_TIME_HIGH_VALUE_COUNTERPARTY` |
| Multiple transactions in a short period | `RAPID_STRUCTURING` |
| Unusual access/device + high-value | `CROSS_BORDER_HIGH_RISK_ACTIVITY` |

Verified empirically against the canonical demo case: `tests/test_customer_verification_trigger.py::TestTriggerAgainstRealCaseFraud600` runs the real evidence + contextual agents against real `CASE-FRAUD-600` seed data and asserts the trigger actually fires (it matches `RAPID_STRUCTURING` at `HIGH` severity).

### 2.2 Customer-safe reason generation

`generate_customer_safe_reason()` maps each trigger pattern to a static, plain-language template (e.g. *"This payment is much higher than your recent activity and was sent to a recipient you have not paid before."*). The output **never** contains: internal risk scores, ML confidence, `EV-`/`CTX-`/`REG-` ids, pattern-id strings, mule/laundering terminology, graph topology, analyst notes, or internal case state. Enforced by `tests/test_customer_verification_reason.py`, which regex-asserts every template against a forbidden-term list.

### 2.3 Event envelope & idempotency

```json
{
  "event": "CUSTOMER_VERIFICATION_REQUIRED",
  "event_id": "VF-<case_id>",
  "schema_version": "1.0",
  "timestamp": "...",
  "source": "sentinel",
  "case_id": "...",
  "transaction_id": "...",
  "customer_ref": "<account_id>",
  "customer_email": "<demo email>",
  "reason_code": "<matched pattern id>",
  "customer_reason": "<plain-language text>",
  "amount": 280000.0,
  "currency": "INR",
  "channel": "NEFT",
  "verification_token": "<single-use response token>",
  "demo_mode": true
}
```

`event_id` is deterministic **per case** (`VF-{case_id}`), not per investigation run — a case triggers at most one customer verification in its lifetime, even if the investigation is re-run (`force_rerun`). Before creating a new record, the service checks `verification_repo.get_by_event_id(case_id, event_id)`.

### 2.4 DEMO_MODE customer contact

`seed_data.py` account records have no email/phone field — this is entirely synthetic demo data. `DEMO_ACCOUNT_EMAIL_MAP` in `customer_verification_service.py` maps known seed `account_id`s to a demo address, falling back to `DEMO_VERIFICATION_FALLBACK_EMAIL`. Gated by `DEMO_MODE` (default `true`); set `DEMO_MODE=false` to disable customer contact entirely.

### 2.5 n8n workflow design

Two webhook triggers in one workflow:

- **Trigger A** (`POST /webhook/verifyflow-trigger`, Header Auth credential "SENTINEL Trigger Auth", `responseMode: onReceived`): receives the event envelope → acks SENTINEL **immediately, before running any downstream node** → builds the HTML email (amount, payment method, reference, plain-language reason, YES/NO buttons) → sends via the existing "SMTP account" credential. `responseMode: onReceived` is required, not cosmetic: live testing found that `responseMode: responseNode` (ack only after the whole chain, including the SMTP send, finishes) let the SMTP send occasionally exceed SENTINEL's `N8N_OUTBOUND_TIMEOUT_SECONDS` (3s), causing `post_to_n8n`'s bounded retry to resend the identical trigger and produce a **second real execution and a duplicate customer email** for the same `event_id`. The same fix was needed on the Investigation Complete workflow's webhook for the same reason.
- **Trigger B** (`GET /webhook/verifyflow-response`, public — a human clicks this from their email, so it cannot require the SENTINEL→n8n header auth): reads `token`/`decision` from the query string → a Code node computes `HMAC-SHA256(N8N_WEBHOOK_SECRET, JSON.stringify({verification_token, decision, n8n_execution_id}))` using the **n8n Variable** `N8N_WEBHOOK_SECRET` (never hard-coded into the workflow) → an HTTP Request node POSTs the **exact same raw string** it signed (raw body mode, not re-serialized) to SENTINEL's `/webhooks/n8n/verification-response` with the signature in `X-Sentinel-Signature` → responds with a simple "thank you" HTML page.

All token validity/expiry/replay logic lives in SENTINEL, not n8n — n8n Trigger B is a dumb, unauthenticated relay; SENTINEL is the actual authority.

### 2.6 SENTINEL callback

`POST /webhooks/n8n/verification-response` (`backend/app/routes/n8n.py`):

```json
{"verification_token": "...", "decision": "YES"|"NO", "n8n_execution_id": "..."}
```

Auth: `X-Sentinel-Signature` = `hex(HMAC-SHA256(N8N_WEBHOOK_SECRET, raw_request_body))`, verified with `hmac.compare_digest`.

Behavior:
- Missing/invalid signature → `401`.
- Unknown token → `404`.
- Expired token (past `token_expires_at`, still `PENDING`) → `410`.
- Already-responded token (repeat/replay) → `200`, `duplicate: true`, **no mutation** — idempotent.
- First valid response → `mark_responded()`, then appends an **audit event** (`event_type: CUSTOMER_VERIFICATION_RESPONSE_RECEIVED`, `analyst_id: SYSTEM_N8N_VERIFYFLOW`, `analyst_role: AUTOMATION_ENGINE`) via the existing `AbstractCaseRepository.save_audit_event`. `previous_case_status == new_case_status` always — this route **never** touches `Case.status` and **never** creates a `Disposition` row. Only `POST /cases/{case_id}/disposition`, submitted by a human analyst, can do that. Proven negatively in `tests/test_no_autonomous_disposition_from_n8n.py` (forged `action_code`/`status` fields in the callback body are ignored; `CaseLifecycleService.submit_case_disposition` is never invoked from this path).
- Broadcasts `customer.verification.responded` over the existing WebSocket manager.

## 3. Workflow 2 — SENTINEL Investigation Complete

Fired from the existing `investigation.completed` hook in `investigation_orchestrator.py`, immediately after the existing WS broadcast, via `asyncio.create_task(...)` (never awaited inline — a slow/hung n8n call cannot delay `run_investigation()`'s return; proven in `tests/test_investigation_complete_notification.py`). Payload: `{event, case_id, investigation_id, summary}` where `summary` is the same `record["summary"]` already computed by the orchestrator (`review_priority`, `regulatory_severity`, `recommended_action`). n8n sends one email to the compliance analyst. No callback, no case mutation — pure fan-out.

## 4. Workflow 3 — SENTINEL System Health Monitor

n8n Schedule Trigger (every 5 min) → `GET {SENTINEL_PUBLIC_BASE_URL}/health` → on non-2xx or connection failure (n8n's `onError: continueErrorOutput`, which naturally covers both an unreachable backend and a `503 unhealthy` response) → email alert. Zero backend changes — `/health`'s existing contract (`{status, mode, database, timestamp}` / 503 `{status, database}`) is locked in by `tests/test_health_endpoint_contract.py`, added because no test previously existed for this endpoint.

## 5. Security model

| Direction | Mechanism |
|---|---|
| SENTINEL → n8n (triggers) | n8n Webhook node Header Auth credential ("SENTINEL Trigger Auth"), value = `N8N_TRIGGER_AUTH_TOKEN` |
| n8n → SENTINEL (VerifyFlow callback) | HMAC-SHA256 over the raw request body, shared secret = `N8N_WEBHOOK_SECRET` (stored as an n8n instance Variable, never hard-coded in the workflow) |
| Customer → n8n (email link click) | None (public webhook) — protected instead by the single-use, expiring `verification_token`, validated SENTINEL-side |

## 6. Resilience

n8n is an external dependency. It must never block or degrade core fraud detection, investigation, or disposition:
- `N8N_ENABLED` (default `false`) is a master kill-switch — with it unset/false, `post_to_n8n()` makes zero network calls.
- Bounded timeout (`N8N_OUTBOUND_TIMEOUT_SECONDS`, default 3s) and bounded retries (`N8N_OUTBOUND_MAX_RETRIES`, default 2) on every outbound call.
- `post_to_n8n()` never raises — all failures are logged and swallowed.
- Every dispatch from the orchestrator runs via `asyncio.create_task(...)`, never awaited inline.

Verified in `tests/test_n8n_dispatcher_resilience.py`.

## 7. Database

New table `customer_verifications` (migration `005_customer_verifications`, `down_revision = '004_active_inv_unique_idx'`): `verification_id, case_id, event_id, account_id, demo_customer_email, reason_summary, trigger_pattern_ids, verification_token, token_expires_at, status, response_received_at, response_source_ip, n8n_execution_id, created_at, updated_at`. Kept as its own model + a small parallel `AbstractVerificationRepository` (in-memory and PostgreSQL implementations) rather than folded into the existing 18-method `AbstractCaseRepository`.

## 8. Frontend

- `GET /cases/{case_id}/verification-status` — returns the latest verification for a case with the customer email masked (`a***@gmail.com`) and the raw token withheld.
- New WebSocket events `customer.verification.requested` / `customer.verification.responded` (see `docs/frontend_contracts.md` for payload shapes).
- `InvestigationSidebar.jsx` (the live case workspace) renders a "Customer Verification" card automatically when a verification exists for the open case — showing the reason, status (waiting / authorized / not authorized), and timestamp. The analyst never needs to press a "send customer email" button; it is triggered automatically by the evidence.

## 9. Setup / environment variables

See the README's Environment Variables table for the full list (`N8N_ENABLED`, `N8N_VERIFYFLOW_TRIGGER_URL`, `N8N_INVESTIGATION_COMPLETE_TRIGGER_URL`, `N8N_TRIGGER_AUTH_TOKEN`, `N8N_WEBHOOK_SECRET`, `N8N_OUTBOUND_TIMEOUT_SECONDS`, `N8N_OUTBOUND_MAX_RETRIES`, `DEMO_MODE`, `DEMO_VERIFICATION_FALLBACK_EMAIL`, `VERIFICATION_TOKEN_TTL_HOURS`, `SENTINEL_PUBLIC_BASE_URL`). `backend/main.py` loads `backend/.env` via `python-dotenv` at import time.

n8n-side, two instance **Variables** hold non-hardcoded values referenced by workflow Code/HTTP nodes: `N8N_WEBHOOK_SECRET` and `SENTINEL_PUBLIC_BASE_URL` (update the latter whenever the backend's public URL changes, e.g. a new ngrok session).

## 9.1 ngrok free-tier note

An ngrok free-tier HTTPS URL serves a browser-warning interstitial page to any request without the `ngrok-skip-browser-warning: true` header, which would otherwise make every n8n → SENTINEL call (the VerifyFlow callback's HTTP Request node and the Health Monitor's GET request) receive that HTML page instead of SENTINEL's real response. Both nodes send this header. Not needed for a paid ngrok domain or a production deployment.

## 10. Manual smoke test (not part of automated CI)

Networked, credential-dependent, and only meaningful with a live public backend URL — run manually before a demo, not in CI:

1. Set `SENTINEL_PUBLIC_BASE_URL` (env var + the matching n8n Variable) to the current public tunnel URL, activate all three n8n workflows.
2. Start the backend (`uvicorn main:app`), trigger `CASE-FRAUD-600`'s investigation.
3. Confirm the VerifyFlow email arrives at the demo address; click YES or NO.
4. Confirm the case's Customer Verification panel updates live (WebSocket) with the response.
5. Confirm the Investigation Complete email arrives.
6. Confirm the Health Monitor's next scheduled run reports healthy; stop the backend briefly and confirm the next run sends a failure alert.
