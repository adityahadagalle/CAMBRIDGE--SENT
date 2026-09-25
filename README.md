# SENTINEL

### Real-Time Financial Crime & Fraud Intelligence Platform

SENTINEL is a full-stack prototype that combines real-time transaction scoring, a deterministic policy engine, a five-stage automated investigation pipeline, multi-hop transaction-graph analysis, and a local (Ollama-hosted) advisory AI, all wired into an analyst workstation with a strict human-approval boundary on high-impact actions. It is designed to demonstrate — not certify — an architecture for detecting suspicious financial activity, tracing how funds move across accounts, accelerating investigation, and keeping every consequential action under human sign-off with an immutable record of what happened and why.

This is a demonstration / hackathon-grade system. Transaction data is synthetic (simulator-generated), external agency integrations are simulated in-process, and no production security, compliance, or accuracy claims are made anywhere in this document. See [Current Limitations](#current-limitations) before treating any part of this as production-ready.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution](#solution)
3. [Key Features](#key-features)
4. [Architecture](#architecture)
5. [Technology Stack](#technology-stack)
6. [Fraud Detection](#fraud-detection)
7. [Risk Levels](#risk-levels)
8. [Investigation Workflow](#investigation-workflow)
9. [Transaction Network Analysis](#transaction-network-analysis)
10. [Golden Window & Recovery](#golden-window--recovery)
11. [Human Approval Boundary](#human-approval-boundary)
12. [Action System](#action-system)
13. [Audit & Governance](#audit--governance)
14. [n8n Integration](#n8n-integration)
15. [API Reference](#api-reference)
16. [Project Structure](#project-structure)
17. [Installation](#installation)
18. [Environment Variables](#environment-variables)
19. [Running SENTINEL](#running-sentinel)
20. [Testing](#testing)
21. [Demo Workflow](#demo-workflow)
22. [Security & Governance Controls](#security--governance-controls)
23. [Current Limitations](#current-limitations)
24. [Future Enhancements](#future-enhancements)
25. [Disclaimer](#disclaimer)

---

## Problem Statement

Financial crime moves fast and across many accounts. A few of the concrete challenges SENTINEL's architecture targets:

- **Rapidly moving funds** — once money lands in a mule account it can be layered through several more hops or cashed out within minutes, well inside any manual review cycle.
- **Multi-hop chains and mule networks** — a single fraudulent transfer is rarely the whole picture; tracing source → intermediary → destination requires graph-level context, not row-by-row transaction review.
- **Fragmented investigation** — evidence collection, contextual analysis, regulatory assessment, and audit documentation are often separate manual steps; SENTINEL automates the first pass of each so an analyst starts from a synthesized brief instead of raw data.
- **Automation risk vs. response speed** — fully autonomous account actions are fast but risky; fully manual review is safe but slow. SENTINEL's policy engine automates lower-impact responses while keeping the highest-impact action (`FREEZE`, and its reversal `RELEASE`) strictly behind human sign-off.
- **Auditability** — every automated or human decision needs a durable, attributable record for later review.

---

## Solution

```text
Transaction
     │
     ▼
Hybrid Risk Scoring (Rule Engine + Random Forest ML)
     │
     ▼
Deterministic Policy Decision (fail-closed)
     │
     ▼
Case Creation / Update  ──────────►  Multi-Hop Graph Update
     │
     ▼
5-Stage Investigation Pipeline (Evidence → Contextual → Regulatory → Audit Explanation → Decision Support)
     │
     ├──► Local AI Advisory Brief (Qwen 3:8B via Ollama, advisory-only)
     │
     ▼
Human Analyst Review (Investigation Workstation)
     │
     ▼
Action Execution (autonomous for lower-impact actions; FREEZE/RELEASE always human-only)
     │
     ▼
Immutable Audit Record
```

Every stage above corresponds to code in this repository — see [Architecture](#architecture) and [API Reference](#api-reference) for the exact modules and endpoints.

---

## Key Features

Verified against the current codebase:

- **Real-time transaction ingestion** via `POST /transaction`, scored synchronously and broadcast over WebSocket.
- **Hybrid risk scoring**: a weighted rule engine combined with a trained Random Forest classifier (see [Fraud Detection](#fraud-detection) for the exact formula).
- **Deterministic, fail-closed policy engine** (`app/engines/autonomous_policy_engine.py`) that rejects malformed input, unknown actions, and invalid case states by default rather than allowing them through.
- **Automated 5-stage investigation pipeline** (Evidence, Contextual, Regulatory, Audit Explanation, Decision Support) with per-stage persistence and WebSocket progress events.
- **Multi-hop transaction graph** with chain/hop/pattern metadata and six deterministic demo scenario injectors (mule chain, funnel, fan-out, circular flow, etc.).
- **Human approval boundary**: `FREEZE` and its reversal `RELEASE` can only be executed by an authenticated human operator call, never autonomously, never by n8n, never by the AI.
- **Local, advisory-only AI** (Qwen 3:8B via Ollama) producing a structured JSON brief; it has no execution authority.
- **Immutable, append-only audit log** with a documented 21-field internal record and a 16-column CSV export.
- **Freeze/Unfreeze/Complete Case PDF report generation** (`app/services/report_service.py`, `app/routes/reports.py`) — a read-only reporting module that renders existing case, account, and audit data into a downloadable PDF; it never mutates state.
- **Case Queue, Investigation Workstation, Benchmark Lab, ML Intelligence, and Data Integration** frontend pages (React + Vite).
- **WebSocket event bus** (`/ws`) broadcasting live scoring, case, action, and investigation-stage events.
- **PostgreSQL persistence** (SQLAlchemy 2.0 async + Alembic) with an in-memory repository fallback when `DATABASE_URL` is not set.
- **n8n as an external notification/orchestration layer only** — it never scores, decides, or executes a fraud action (see [n8n Integration](#n8n-integration)).

---

## Architecture

```mermaid
flowchart TD
    SIM["Transaction Simulator<br/>(backend/simulator/simulator.py)"] -->|POST /transaction| ORCH["Orchestrator<br/>(app/services/orchestrator.py)"]

    ORCH --> RULE["Rule Engine<br/>(scoring_engine.py)"]
    ORCH --> ML["Random Forest ML<br/>(ml_risk_engine.py)"]
    RULE --> FUSION["Hybrid Fusion<br/>0.6 x ML + 0.4 x Rule"]
    ML --> FUSION

    FUSION --> POLICY["Deterministic Policy Engine<br/>(autonomous_policy_engine.py)"]
    POLICY --> EXEC["Simulated Action Executor<br/>(simulated_action_executor.py)"]
    POLICY --> CASE["Case Manager<br/>(case_manager.py)"]

    CASE --> GRAPH["Graph Engine<br/>(graph_engine.py)"]
    CASE --> ORCH2["Investigation Orchestrator<br/>(5-stage pipeline)"]
    ORCH2 --> AI["Qwen 3:8B via Ollama<br/>(advisory only)"]

    EXEC --> AUDIT["Immutable Audit Log<br/>(in-memory + PostgreSQL)"]
    EXEC -->|FREEZE/RELEASE require| HUMAN["Human Operator<br/>(Investigation Workstation)"]
    HUMAN --> EXEC

    ORCH2 --> WS["WebSocket Broadcast<br/>(/ws)"]
    EXEC --> WS
    WS --> UI["React Investigation Workstation<br/>(Vite + Cytoscape.js)"]

    CASE -.->|evidence-driven trigger| N8N1["n8n: VerifyFlow<br/>(customer email, external)"]
    ORCH2 -.->|fan-out notification| N8N2["n8n: Investigation Complete<br/>(analyst email, external)"]
    N8N1 -.->|HMAC-signed webhook| WEBHOOK["POST /webhooks/n8n/verification-response"]
    WEBHOOK --> AUDIT

    DB[("PostgreSQL<br/>(optional, async SQLAlchemy)")] --- EXEC
    MEM[("In-memory data_store<br/>(fallback when DATABASE_URL unset)")] --- EXEC
```

n8n sits outside the fraud-decision path entirely: it sends emails and relays a customer's raw YES/NO reply back as case *evidence*. It cannot score a transaction, create a case, or change an account's state — that boundary is enforced structurally (the n8n webhook route never imports or calls the freeze/release/disposition functions) and is covered by dedicated tests (`tests/test_freeze_release_flow.py::test_15_n8n_route_module_never_references_release`).

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | React 18, React Router 6, Vite 5, TailwindCSS 3, Cytoscape.js (+ `cytoscape-dagre`), Recharts, Lucide Icons |
| Backend API | Python 3.10+ (developed/run on 3.13), FastAPI, Uvicorn (ASGI), Pydantic v2, asyncio |
| Database | PostgreSQL, SQLAlchemy 2.0 (async, `asyncpg`), Alembic migrations; in-memory repository fallback for local/dev use |
| Machine Learning | scikit-learn `RandomForestClassifier`, trained via `backend/scripts/train_model.py`, loaded with `joblib`; NumPy for feature normalization |
| Local AI | Ollama HTTP API, Qwen 3:8B (`qwen3:8b`), advisory-only |
| Reporting | `fpdf2` — read-only PDF generation for the Freeze/Unfreeze/Complete Case report module |
| Realtime | FastAPI native WebSockets (`/ws`) |
| External Orchestration | n8n (workflow automation, outside the fraud-decision boundary) |
| Backend Testing | pytest, FastAPI `TestClient` |
| Frontend Testing | Node's built-in `node --test` runner |

> **Note:** `backend/requirements.txt` currently lists `fastapi`, `uvicorn`, `pydantic`, `websockets`, `sqlalchemy`, `asyncpg`, `psycopg2-binary`, `alembic`, `httpx`, `python-dotenv`, and `fpdf2`. It does **not** currently pin `scikit-learn`, `joblib`, `numpy`, `requests` (used by the simulator), `greenlet` (required by SQLAlchemy's async engine), or `pytest` — all of which the code imports and needs at runtime. See [Potential Documentation Notes](#potential-documentation-notes-not-part-of-the-readme) in the delivery summary for detail; this file was left unmodified per this task's scope.

---

## Fraud Detection

### Rule Engine (`app/engines/scoring_engine.py`)

Four base weighted factors (from `app/core/config.py`, weights sum to 1.0):

| Factor | Weight |
| :--- | :---: |
| New Receiver Anomaly | 0.35 |
| Amount Deviation (vs. account's average monthly amount) | 0.30 |
| Time Anomaly (transactions between 22:00–06:00) | 0.20 |
| Active-Call Flag | 0.15 |

Each factor is scored 0–100 and combined as `value × weight` per factor, summed and capped at 100. The rule engine also applies several deterministic boosts for simulator-supplied signals (velocity spikes, cross-border activity, device/location change, bulk transfers, crypto-related flags, remote-access activity, round-number amounts, scripted behavior, first-time payees) and a proportional scaling factor for very small transaction amounts so that low-value transfers don't automatically inherit a high score from a triggered flag alone.

### Machine Learning (`app/services/ml_risk_engine.py`)

- **Model:** a `RandomForestClassifier` (scikit-learn), trained offline by `backend/scripts/train_model.py` on synthetic transaction data and serialized with `joblib`.
- **Features (6):** `amount`, `hour`, `is_new_receiver`, `velocity`, `chain_depth`, `call_flag` — normalized to `[0, 1]` before inference.
- **Inference:** `model.predict_proba()`; `P(fraud)` is scaled to a 0–100 ML score.
- **Fallback:** if the model file is missing or inference fails, the system falls back to a rule-correlated emulator so scoring never hard-fails.
- **No measured accuracy is reported anywhere in this repository.** Do not treat the ML component as production-validated; it has not been benchmarked against a labeled real-world dataset in this codebase.

### Hybrid Fusion (`app/services/orchestrator.py`)

```text
final_risk_score = round(0.6 × ML_score + 0.4 × Rule_score)
```

This fused score is what drives case creation, risk-level classification, and the policy engine. A transaction scoring **≥ 20** creates a new case or joins an existing chain (`app/engines/case_manager.py`); chain depth is capped at 8 hops.

---

## Risk Levels

The four-tier classification below is the one that governs policy/action decisions (`app/engines/autonomous_policy_engine.py`):

| Score Range | Risk Level | Default Policy Action | Execution Mode |
| :--- | :--- | :--- | :--- |
| 0 – 39 | LOW | `MONITOR` | Autonomous or manual |
| 40 – 69 | MEDIUM | `ENHANCED_MONITORING` | Autonomous or manual |
| 70 – 84 | HIGH | `ESCALATE_ANALYST_REVIEW` | Autonomous or manual |
| 85 – 100 | CRITICAL | `FREEZE` (proposed), `BLOCK`, `CLOSE_ACCOUNT` | `FREEZE` always requires human operator approval |

> A separate, internal 60/40 threshold pair exists in `app/core/config.py` (`HIGH_RISK_THRESHOLD=60`, `MEDIUM_THRESHOLD=40`) and is used only to set a secondary `HIGH_RISK`/`MEDIUM`/`LOW` label on the rule-engine's own output and the transaction's `threshold` field. **It does not drive policy actions** — the table above (from the policy engine) is the authoritative one for what actually happens to a transaction.

---

## Investigation Workflow

`app/services/investigation_orchestrator.py` runs five stages sequentially per case, with `PENDING → IN_PROGRESS → COMPLETED/FAILED/SKIPPED` state tracking and WebSocket progress broadcasts:

1. **Evidence Agent** (`evidence_agent.py`) — extracts transaction metadata, financial exposure, primary transaction detail, graph topology counts, and prior action history into structured findings.
2. **Contextual Agent** (`contextual_agent.py`) — evaluates account history and pattern context (e.g. first-time high-value counterparty, rapid structuring, cross-border high-risk activity).
3. **Regulatory Agent** (`regulatory_agent.py`) — assesses AML/CFT-style statutory thresholds and STR/SAR-style filing indicators.
4. **Audit Explanation Agent** (`audit_explanation_agent.py`) — produces step-by-step reasoning and traceability documentation.
5. **Analyst Decision Support Agent** (`analyst_agent.py`) — synthesizes the above into an executive brief, a review priority, and a set of disposition options (e.g. `DISMISS_CASE`, `REQUEST_CUSTOMER_CDD`, `ESCALATE_SENIOR_COMPLIANCE`, `APPROVE_TRANSACTION`) for the analyst.

Every stage's report is retrievable individually or as a bundle (see [API Reference](#api-reference)). The analyst still submits the final disposition manually via `POST /cases/{case_id}/disposition` — the agents produce recommendations, not decisions.

---

## Transaction Network Analysis

`app/engines/graph_engine.py` models each case as a directed graph. Every edge carries `chain_id`, `hop_number`, `total_hops`, `pattern_type`, `parent_transaction_id`, and `root_transaction_id`.

**Deterministic demo scenarios** (injectable via `POST /simulate/multi_hop_scenario/{scenario_id}`):

| Scenario ID | Name | Hops | Pattern |
| :--- | :--- | :---: | :--- |
| `scenario-1` | Normal Payment | 1 | Direct peer-to-merchant transfer |
| `scenario-2` | 3-Hop Transfer | 3 | Sequential transfer through 2 intermediaries |
| `scenario-3` | 5-Hop Mule Chain | 4 | Multi-layer mule network |
| `scenario-4` | Funnel Account | 2 | Multiple sources into one funnel account |
| `scenario-5` | Fan-Out Distribution | 1 | Single source disbursing to multiple receivers |
| `scenario-6` | Circular Flow | 4 | Looping sequence returning to origin |

**General topology classification** (`classify_topology_archetype()`, applied to any case graph, not just the demo scenarios): `CIRCULAR_LOOP`, `FAN_OUT`, `FAN_IN`, `DIRECT_TRANSFER`, `STRUCTURING_PASS_THROUGH`, `LINEAR_CHAIN`.

The frontend renders this graph interactively via Cytoscape.js in the Investigation Workstation and the standalone `/graph/:caseId` page.

---

## Golden Window & Recovery

- `GOLDEN_WINDOW_MINUTES = 20` (`app/core/config.py`) is the default window assigned to a new case.
- It feeds a case's `urgency_score`: `urgency_score = risk_level × (1 + 1 / golden_window_minutes)` (`case_manager.py`) — i.e. it's used as an urgency/priority signal in the UI, **not** as a literal countdown that guarantees fund recovery.
- **Recoverable amount** is computed independently in `app/engines/recovery_engine.py`, by summing the simulated balances still held at graph nodes downstream of the fraud, capped at the total fraud amount. This is a simulated-balance calculation over the in-memory/demo account model, not a real-world funds-recovery mechanism.

---

## Human Approval Boundary

`FREEZE` and its reversal `RELEASE` are structurally carved out from autonomous execution:

- The policy engine always returns `execution_status = REQUIRES_OPERATOR_ACTION` for `FREEZE`, even when global Automation Mode is ON.
- `POST /transactions/{id}/freeze` and `POST /transactions/{id}/release` require an explicit human-originated call; `RELEASE` additionally requires a non-empty rationale (`422` if missing).
- The n8n webhook route (`app/routes/n8n.py`) never imports or calls the release/freeze execution path — a customer's "YES" response is recorded as evidence only, and this is asserted directly by a test that inspects the module's source for the absence of those symbols.
- All freeze/release attribution (`frozen_by`, `frozen_at`, `frozen_reason`, `released_by`, `released_at`, `released_reason`) is persisted on the account record and readable via `GET /accounts/{account_id}/freeze-status`.

This boundary reduces (it does not eliminate) automation risk on the highest-impact action in the system. It does not claim to eliminate false positives or guarantee correct human judgment.

---

## Action System

Nine deterministic actions plus the human-only release, all executed through `app/services/simulated_action_executor.py` against the in-memory/simulated account model — **none of these call a real external bank, telecom, or law-enforcement system.**

| Action Code | Target | Execution Authority | Resulting State |
| :--- | :--- | :--- | :--- |
| `MONITOR` | Account | Autonomous or manual | `MONITORING` |
| `ENHANCED_MONITORING` | Account | Autonomous or manual | `ENHANCED_MONITORING` |
| `ESCALATE_ANALYST_REVIEW` | Case | Autonomous or manual | `ESCALATED` |
| `BLOCK` | Account/Transaction | Autonomous or manual | `BLOCKED` |
| `REJECT_TRANSACTION` | Transaction | Autonomous or manual | `REJECTED` |
| `FILE_STR` | Case/Transaction | Autonomous or manual | `STR_FILED` (simulated filing record) |
| `CLOSE_ACCOUNT` | Account | Autonomous or manual | `CLOSED` |
| `CLOSE_FP` | Case | Manual analyst only | `CLOSED_FALSE_POSITIVE` |
| `FREEZE` | Account | **Human operator only** | `FROZEN` |
| `RELEASE` | Account | **Human operator only**, mandatory rationale | `ACTIVE` (unfreeze) |

`app/services/mock_apis.py` additionally provides simulated agency-side stubs (`mock_bank_freeze`, `mock_telecom_flag`, `mock_police_alert`, `mock_monitor_account`, `mock_close_case`) that simply return a static in-process success payload — these are explicitly simulated integrations, not live connections to any bank, telecom, or police system.

Idempotency is enforced via a deterministic key (`AUTO-ACTION:{case_id}:{tx_id}:{policy_rule_id}`), so re-processing the same decision does not double-execute or double-log.

---

## Audit & Governance

Every executed action produces an audit record (`simulated_action_executor.py`) containing, among other fields: `audit_id`, `event_type`, `case_id`, `primary_tx_id`, `analyst_id`, `analyst_role`, `action_code`, previous/new account state, `analyst_notes`, `reason`, `actor_type` (`HUMAN_OPERATOR` or `SYSTEM_AUTOMATION`), a nested `traceability_chain` (risk score, risk level, policy rule id, execution id, correlation id), and a `timestamp`. Records are appended to an in-memory list and, when a database session is available, also persisted via the repository layer — the application does not expose any endpoint that edits or deletes a stored audit record.

`GET /export/sentinel_audit.csv` streams a **16-column** CSV (Timestamp, Audit ID, Case ID, Transaction ID, Account ID, Risk Score, Risk Level, Action, Execution Mode, Actor, Action Status, Previous State, Resulting State, Reason, Policy Rule ID, Operator/Analyst ID) with a UTF-8 BOM for Excel compatibility, and basic formula-injection sanitization on each field.

The Freeze/Unfreeze/Complete Case PDF report module (`app/services/report_service.py`) reads from this same audit log — not the mutable account object — so a report generated *after* an account is released still shows the original freeze event correctly, and downloading a report never writes to the audit log, case, or account state.

No regulatory certification, legal compliance, or "audit-grade" claim is made — this is a structured internal record, not a certified compliance artifact.

---

## n8n Integration

n8n is used strictly as an **external communication/orchestration layer**. Per `docs/n8n_integration.md` and `app/routes/n8n.py`, it:

- **Never** scores a transaction, creates a case, or executes a fraud-response action.
- Sends customer-facing verification emails ("SENTINEL — VerifyFlow") only when evidence-driven trigger conditions match (specific contextual pattern ids at HIGH/CRITICAL severity) — not on risk score alone.
- Sends an internal fan-out notification ("SENTINEL — Investigation Complete") when the 5-stage pipeline finishes — pure notification, no callback.
- A third workflow ("SENTINEL — System Health Monitor") polls `GET /health` externally and has no callback into SENTINEL at all.
- The customer's YES/NO reply reaches SENTINEL only via `POST /webhooks/n8n/verification-response`, authenticated with an **HMAC-SHA256 signature** (`X-Sentinel-Signature` header, checked against `N8N_WEBHOOK_SECRET`). Invalid signatures are rejected with `401`; replayed/duplicate callbacks are handled idempotently.
- The customer's response is recorded strictly as case **evidence** — it never closes, dismisses, approves, escalates, freezes, or releases anything. This is structurally enforced: the n8n route module never imports the freeze/release functions, verified by `tests/test_freeze_release_flow.py`.
- All outbound calls to n8n are gated by `N8N_ENABLED` (default `false` — safe by default), with a bounded timeout and retry count.

Webhook URLs and secrets are configured entirely through environment variables (see [Environment Variables](#environment-variables)); none are present in this document. When referencing your own instance, use a placeholder such as `<YOUR_N8N_WEBHOOK_URL>`.

---

## API Reference

The backend exposes 50+ routes; the table below covers the core lifecycle. Full detail is available via the live OpenAPI schema at `GET /openapi.json` (or Swagger UI at `/docs`) once the backend is running.

### Transactions & Scoring

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| POST | `/transaction` | Ingest and score a transaction; may create/update a case and trigger an action |
| GET | `/cases` | List all cases |
| GET | `/cases/{case_id}` | Full case payload (graph, transactions, evidence, investigation summaries) |
| GET | `/cases/{case_id}/graph` | Multi-hop graph for a case |
| GET | `/transactions/{tx_id}/graph` | Multi-hop graph rooted at a transaction |

### Investigation

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| POST | `/cases/{case_id}/investigate` | Trigger/re-run the 5-stage investigation pipeline |
| GET | `/cases/{case_id}/investigation` | Read-model of current investigation state |
| GET | `/cases/{case_id}/investigation-runs` | All historical investigation runs |
| GET | `/cases/{case_id}/reports/{report_type}` | Persisted stage report (`EVIDENCE`, `CONTEXTUAL`, `REGULATORY`, `AUDIT_EXPLANATION`, `DECISION_SUPPORT`) |
| GET | `/cases/{case_id}/evidence` \| `/regulatory-assessment` \| `/audit-explanation` \| `/decision-support` | Individual stage outputs |

### Human Actions & Approval

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| POST | `/transactions/{id}/freeze` | Human-only account freeze |
| POST | `/transactions/{id}/release` | Human-only unfreeze (mandatory rationale) |
| GET | `/accounts/{account_id}/freeze-status` | Freeze/release attribution for an account |
| GET | `/cases/{case_id}/transactions/{id}/suggest-release-rationale` | AI-suggested (advisory-only) release rationale |
| POST | `/cases/{case_id}/disposition` | Analyst's final case disposition |
| POST | `/action/{freeze\|block\|monitor\|...}` | Generic action-execution endpoints |

### Reporting

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| GET | `/cases/{case_id}/reports/freeze/pdf` | Read-only Freeze Report PDF |
| GET | `/cases/{case_id}/reports/unfreeze/pdf` | Read-only Unfreeze Report PDF |
| GET | `/cases/{case_id}/reports/complete/pdf` | Read-only Complete Case Report PDF |
| GET | `/export/sentinel_audit.csv` | Full audit log CSV export |

### AI, n8n, Simulation

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| GET | `/intelligence/health` | Ollama/Qwen availability |
| POST | `/intelligence/analyze` | Generate advisory AI brief for a case |
| POST | `/webhooks/n8n/verification-response` | HMAC-authenticated n8n callback |
| POST | `/simulate/multi_hop_scenario/{scenario_id}` | Inject a deterministic demo topology (`scenario-1`…`scenario-6`) |
| GET/POST | `/automation-mode` | Read/toggle global Automation Mode |

### Realtime

| Protocol | Endpoint | Purpose |
| :--- | :--- | :--- |
| WebSocket | `/ws` | Broadcasts `tx_scored`, `case_updated`, `action_taken`, `automation_mode_changed`, `investigation_stage_updated`, `investigation_completed`, and related events |

---

## Project Structure

```text
CAMBRIDGE--SENT-1/
├── backend/
│   ├── app/
│   │   ├── core/                 # config (weights, thresholds), constants, in-memory data_store
│   │   ├── db/                   # async SQLAlchemy session/engine
│   │   ├── engines/               # scoring, policy, graph, case, recovery, response-policy engines
│   │   ├── models/                # SQLAlchemy ORM models
│   │   ├── repositories/         # PostgreSQL & in-memory repository implementations
│   │   ├── routes/                # intelligence, benchmark, n8n, reports routers
│   │   └── services/              # 5-stage agents, action executor, ollama service, report service, etc.
│   ├── alembic/                   # DB migrations
│   ├── scripts/train_model.py     # offline RandomForest training script
│   ├── simulator/simulator.py     # synthetic transaction stream generator
│   ├── tests/                     # 56 pytest files, 519 collected tests
│   ├── main.py                    # FastAPI application entrypoint
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/            # Login, InvestigationSidebar, RiskBadge, AutomationAuditDrawer, ...
│   │   ├── modules/GraphModule/   # Cytoscape.js graph canvas, node/report modals
│   │   ├── pages/                 # Feed, Dashboard, Cases, Graph, BenchmarkLab, MLIntelligence, DataIntegration
│   │   ├── hooks/useWebSocket.js
│   │   ├── roleStore.js           # client-side demo role storage (see Current Limitations)
│   │   └── App.jsx
│   ├── tests/                     # 8 files, run via `node --test`
│   └── package.json
├── docs/
│   └── n8n_integration.md         # n8n architecture, event contracts, security model
└── README.md
```

---

## Installation

### Prerequisites

- Python 3.10+ (this environment was verified on 3.13)
- Node.js with `npm` (an `engines` field is not pinned in `package.json`; an LTS release is recommended)
- Ollama with the `qwen3:8b` model pulled (optional — only needed for the AI advisory feature)
- PostgreSQL 14+ (optional — an in-memory fallback is used automatically when `DATABASE_URL` is unset)

### Backend Setup (PowerShell)

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

> As noted in [Technology Stack](#technology-stack), `requirements.txt` does not currently include every package the code imports at runtime (`scikit-learn`, `joblib`, `numpy`, `requests`, `greenlet`, `pytest`). You may need to install these separately, e.g.:
> ```powershell
> pip install scikit-learn joblib numpy requests greenlet pytest
> ```

### PostgreSQL Setup (Optional)

```powershell
$env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/sentinel_db"
alembic upgrade head
```

### Local Ollama Setup (Optional)

```powershell
ollama serve
ollama pull qwen3:8b
```

### Frontend Setup (PowerShell)

```powershell
cd frontend
npm install
```

---

## Environment Variables

| Variable | Purpose | Required |
| :--- | :--- | :---: |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql+asyncpg://...`) | No — in-memory fallback used if unset |
| `SENTINEL_MODE` | `development` (default) or `production`; production mode fails fast without `DATABASE_URL` | No |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults to common local dev ports) | No |
| `OLLAMA_BASE_URL` | Base URL for the local Ollama HTTP API (default `http://localhost:11434`) | No |
| `OLLAMA_MODEL` | Ollama model identifier (default `qwen3:8b`) | No |
| `OLLAMA_TIMEOUT` | Timeout in seconds for Ollama calls (default `60`) | No |
| `N8N_ENABLED` | Master kill-switch for all outbound n8n calls (default `false`) | No |
| `N8N_VERIFYFLOW_TRIGGER_URL` | n8n webhook URL for VerifyFlow | No — use `<YOUR_N8N_WEBHOOK_URL>` |
| `N8N_INVESTIGATION_COMPLETE_TRIGGER_URL` | n8n webhook URL for Investigation Complete | No |
| `N8N_TRIGGER_AUTH_TOKEN` | Shared header value authenticating SENTINEL → n8n calls | No |
| `N8N_WEBHOOK_SECRET` | HMAC-SHA256 secret authenticating n8n → SENTINEL callbacks | Yes, if `N8N_ENABLED=true` |
| `N8N_OUTBOUND_TIMEOUT_SECONDS` / `N8N_OUTBOUND_MAX_RETRIES` | Bounded timeout/retry for outbound n8n calls | No |
| `DEMO_MODE` | Gates the synthetic demo customer email map for VerifyFlow (default `true`) | No |
| `DEMO_VERIFICATION_FALLBACK_EMAIL` | Fallback demo email when an account isn't in the static map | No |
| `VERIFICATION_TOKEN_TTL_HOURS` | Expiry window for a customer-verification link (default `72`) | No |
| `SENTINEL_PUBLIC_BASE_URL` | Publicly reachable base URL for n8n's callback/health checks | No |
| `SECRET_KEY` | Present in `.env.example`; not currently read via `os.getenv` anywhere in the inspected backend code | No |
| `VITE_API_URL` | Frontend: backend base URL (default `http://localhost:8000`) | No |
| `VITE_WS_URL` | Frontend: WebSocket URL (default `ws://localhost:8000/ws`) | No |

Never commit real values for `DATABASE_URL`, `N8N_WEBHOOK_SECRET`, or `N8N_TRIGGER_AUTH_TOKEN`. Use `backend/.env.example` and `frontend/.env.example` as templates.

---

## Running SENTINEL

Three terminals:

### Terminal 1 — Backend

```powershell
cd backend
python main.py
```

Starts on `http://localhost:8000`.

### Terminal 2 — Frontend

```powershell
cd frontend
npm run dev
```

Starts on `http://localhost:5173`.

### Terminal 3 — Transaction Simulator

```powershell
cd backend
python simulator/simulator.py
```

Streams synthetic transactions to the running backend.

---

## Testing

### Backend

```powershell
cd backend
pytest
```

`pytest --collect-only` reports **519 tests across 56 files**. In this environment, a targeted run excluding the four PostgreSQL-integration files produced **449 passed, 19 failed, 21 skipped**; the 19 failures were confirmed (by running the same files against an unmodified checkout) to be pre-existing and environment-dependent — primarily tests under `test_benchmark_reproducibility.py`, `test_benchmark_service.py`, and `test_ollama_intelligence.py` that appear to require conditions (e.g. a live Ollama instance, or benchmark state isolation) not present in this environment. They are not attributable to any change made in this session.

### Frontend

```powershell
cd frontend
npm run build
```

Verified in this environment: **2316 modules transformed, 0 build errors**. Frontend also ships 8 test files under `frontend/tests/`, runnable via `npm test` (Node's built-in test runner).

---

## Demo Workflow

```text
Transaction (simulator or POST /transaction)
     ↓
Hybrid Risk Score (Rule + Random Forest ML)
     ↓
Deterministic Policy Decision
     ↓
Case Created / Updated  +  Graph Node/Edge Added
     ↓
5-Stage Investigation Pipeline Runs Automatically
     ↓
Analyst Opens Investigation Workstation
     ↓
Analyst Reviews Graph, Evidence, AI Advisory Brief
     ↓
High-Impact Action (FREEZE) → Explicit Human Confirmation Required
     ↓
Action Executed → Immutable Audit Record Written
     ↓
(Optional) Analyst Downloads Freeze/Unfreeze/Complete Case PDF Report
```

---

## Security & Governance Controls

Implemented and verifiable in the codebase:

- **Fail-closed policy evaluation** — missing/invalid transaction payload, missing/invalid risk score, unrecognized risk level, unsupported action code, or a closed case state are all explicitly rejected rather than defaulting to an allowed action.
- **Human-only `FREEZE`/`RELEASE`**, enforced at the policy-engine and executor level, not just in the UI.
- **Immutable, append-only audit trail**, with no delete/edit endpoint exposed.
- **Local AI processing** — the Ollama-hosted advisory model runs locally/off-cloud; it has no execution authority and cannot mutate case, account, or audit state.
- **HMAC-signed n8n webhook callback**, with signature verification and idempotent replay handling.
- **CORS allow-list**, configurable via `CORS_ORIGINS`, defaulting to a fixed set of local dev origins.
- **Read-only reporting module** — the Freeze/Unfreeze/Complete Case PDF endpoints are guaranteed not to mutate case, account, or audit state (verified in this session by generating reports before/after and diffing stored state).

Explicitly **not** implemented (see next section) — real authentication/authorization, encryption at rest, rate limiting, or any regulatory certification.

---

## Current Limitations

- **No real backend authentication or authorization.** `frontend/src/components/Login.jsx` checks two hardcoded credential pairs (`admin`/`admin123`, `viewer`/`viewer123`) entirely client-side; the resulting role is stored in `localStorage` (`frontend/src/roleStore.js`) and is not verified by the backend on any request. `operator_id`/`analyst_id` fields sent to freeze/release/disposition endpoints are free-text and trusted at face value. **Do not expose this backend to an untrusted network as-is.**
- **All external integrations are simulated.** Bank, telecom, and police-agency APIs (`app/services/mock_apis.py`) are in-process stub functions that return a static success payload — there is no real institutional integration.
- **No measured ML accuracy.** The Random Forest classifier has not been evaluated against a labeled, real-world dataset in this repository; no accuracy/precision/recall figure should be inferred or repeated.
- **Synthetic data.** All transactions originate from `backend/simulator/simulator.py` or manually injected demo scenarios — not real financial data.
- **In-memory fallback by default.** Without `DATABASE_URL` set, all state (cases, accounts, audit log) lives in a process-local `data_store` dict and is lost on restart.
- **Local Qwen/Ollama dependency for AI features.** The advisory AI panel degrades gracefully (`unavailable`/`timeout`/`error` states) if Ollama isn't running, but requires it for actual advisory output.
- **Dependency-file gap.** `backend/requirements.txt` does not list several packages the code actually imports (`scikit-learn`, `joblib`, `numpy`, `requests`, `greenlet`, `pytest`) — see [Technology Stack](#technology-stack).
- **No demonstrated production-scale benchmark.** There is no load test, concurrency benchmark, or multi-tenant deployment configuration in this repository.
- **19 pre-existing test failures** in this environment, confirmed unrelated to any change in this task (see [Testing](#testing)).

---

## Future Enhancements

The following are explicitly **not implemented** — planned/aspirational only:

- Real banking, telecom, and law-enforcement API integrations (replacing the current simulated stubs)
- Production-grade authentication/authorization (replacing the current client-side demo login)
- Distributed/production deployment configuration (containers, orchestration, reverse proxy)
- Scalable graph processing for larger transaction volumes
- Advanced behavioral modeling and additional labeled training data for the ML component
- Device/IP intelligence signals
- Formal, measured performance and load benchmarking
- Regulatory compliance review and certification

---

## Disclaimer

SENTINEL is a project/prototype demonstrating a financial crime intelligence architecture. Production deployment, external institutional integrations, regulatory implementation, and operational decisions require appropriate authorization, infrastructure, security controls, and applicable legal/regulatory review. Nothing in this repository or document constitutes a compliance certification, a guarantee of fraud detection or fund recovery, or a substitute for qualified legal and regulatory advice.
