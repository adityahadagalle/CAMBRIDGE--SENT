# Graph Report - CAMBRIDGE--SENT  (2026-09-25)

## Corpus Check
- 208 files · ~212,839 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2274 nodes · 5613 edges · 95 communities detected
- Extraction: 43% EXTRACTED · 57% INFERRED · 0% AMBIGUOUS · INFERRED: 3221 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 128|Community 128]]
- [[_COMMUNITY_Community 129|Community 129]]
- [[_COMMUNITY_Community 130|Community 130]]
- [[_COMMUNITY_Community 131|Community 131]]
- [[_COMMUNITY_Community 132|Community 132]]
- [[_COMMUNITY_Community 133|Community 133]]
- [[_COMMUNITY_Community 134|Community 134]]
- [[_COMMUNITY_Community 135|Community 135]]
- [[_COMMUNITY_Community 136|Community 136]]
- [[_COMMUNITY_Community 137|Community 137]]
- [[_COMMUNITY_Community 138|Community 138]]
- [[_COMMUNITY_Community 139|Community 139]]
- [[_COMMUNITY_Community 140|Community 140]]
- [[_COMMUNITY_Community 141|Community 141]]
- [[_COMMUNITY_Community 142|Community 142]]
- [[_COMMUNITY_Community 143|Community 143]]
- [[_COMMUNITY_Community 144|Community 144]]
- [[_COMMUNITY_Community 145|Community 145]]
- [[_COMMUNITY_Community 146|Community 146]]
- [[_COMMUNITY_Community 147|Community 147]]
- [[_COMMUNITY_Community 148|Community 148]]
- [[_COMMUNITY_Community 149|Community 149]]
- [[_COMMUNITY_Community 150|Community 150]]
- [[_COMMUNITY_Community 151|Community 151]]
- [[_COMMUNITY_Community 152|Community 152]]
- [[_COMMUNITY_Community 153|Community 153]]

## God Nodes (most connected - your core abstractions)
1. `InMemoryCaseRepository` - 423 edges
2. `PostgreSQLCaseRepository` - 320 edges
3. `Case` - 234 edges
4. `Transaction` - 234 edges
5. `Account` - 232 edges
6. `AbstractCaseRepository` - 227 edges
7. `CaseLifecycleService` - 217 edges
8. `AuditEvent` - 78 edges
9. `Disposition` - 68 edges
10. `run_pipeline()` - 68 edges

## Surprising Connections (you probably didn't know these)
- `get_case_graph()` --calls--> `build_investigation_graph()`  [INFERRED]
  backend\main.py → backend\app\engines\graph_engine.py
- `get_transaction_graph()` --calls--> `build_investigation_graph()`  [INFERRED]
  backend\main.py → backend\app\engines\graph_engine.py
- `Base` --uses--> `CustomerVerification ORM Model for SENTINEL (n8n VerifyFlow Integration).  Per`  [INFERRED]
  backend\app\db\session.py → backend\app\models\customer_verification.py
- `AbstractCaseRepository` --uses--> `SENTINEL Benchmark Lab API Routes.  Exposes endpoints for initiating benchmark`  [INFERRED]
  backend\app\repositories\base.py → backend\app\routes\benchmark.py
- `AbstractCaseRepository` --uses--> `Returns list of supported benchmark feature profiles and their descriptions.`  [INFERRED]
  backend\app\repositories\base.py → backend\app\routes\benchmark.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (263): AbstractCaseRepository, Account, Account ORM Model for SENTINEL (Phase 7)., AuditEvent, AuditEvent ORM Model for SENTINEL (Phase 7)., Base, AbstractCaseRepository, Abstract contract for case lifecycle, disposition, and audit persistence operati (+255 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (130): generate_case_analyst_decision_support(), Wrapper to collect Phase 1-4 reports and generate Phase 5 Analyst Decision Suppo, generate_audit_explanation(), generate_case_audit_explanation(), generate_transaction_audit_explanation(), _now_iso(), Audit Explanation Agent for SENTINEL (Phase 4).  Responsibility: - Consumes P, Core entrypoint for Phase 4 Audit Explanation Agent.     Consumes Phase 1 evide (+122 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (70): ABC, CustomerVerification, CustomerVerification ORM Model for SENTINEL (n8n VerifyFlow Integration).  Per, build_event_envelope(), evaluate_and_dispatch(), event_id is deterministic per case (not per investigation run), so a case     t, Orchestrator entry point. Evaluates the trigger, and if warranted, persists, get_verification_repository() (+62 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (90): AccountNode, ActionLog, BaseModel, analyze_case(), AnalyzeRequest, _build_investigation_context(), challenge_finding(), ChallengeRequest (+82 more)

### Community 4 - "Community 4"
Cohesion: 0.02
Nodes (72): _now_iso(), InvestigationOrchestrator, Asynchronous End-to-End Investigation Pipeline Orchestrator with PostgreSQL Reli, Emits real-time status event to connected WebSocket clients if manager is availa, Executes a function with bounded retries for transient errors., Executes the 5-stage automated investigation lifecycle for a given case_id., _build_investigation_read_model(), get_case_investigation() (+64 more)

### Community 5 - "Community 5"
Cohesion: 0.03
Nodes (85): execute_automation_policy(), _now_iso(), SENTINEL Phase 15 — Automation & Response Executor Service.  Implements backen, Executes automated response policy actions based on backend-authoritative automa, evaluate_autonomous_policy(), SENTINEL Phase 16 — Deterministic Autonomous Policy Engine.  Enforces non-nego, Evaluates transaction risk signals and produces a deterministic policy decision., alert_action() (+77 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (100): add_custom_input_to_run(), BenchmarkStartRequest, cancel_benchmark_run(), custom_evaluate_transaction(), CustomTransactionRequest, evaluate_benchmark_run(), evaluate_single_benchmark_transaction(), build_evaluation_snapshot() (+92 more)

### Community 7 - "Community 7"
Cohesion: 0.03
Nodes (58): get_case_audit_history(), get_case_disposition_history(), Case Lifecycle & Audit Persistence Agent for SENTINEL (Phase 6 / Phase 7 Step 3), Returns True if current_state -> target_state is an allowed, valid transition., Delegates history retrieval directly to the repository., Synchronous entrypoint wrapper for backward compatibility across Phase 1–6 tests, Returns complete chronological list of disposition records for a given case., Returns complete chronological list of audit log entries for a given case. (+50 more)

### Community 8 - "Community 8"
Cohesion: 0.03
Nodes (44): process_scored_tx(), _timeline_event(), add_edge(), add_node(), build_investigation_graph(), classify_topology_archetype(), get_graph(), Calculates node flow metrics, degree counts, and topological layer depths. (+36 more)

### Community 9 - "Community 9"
Cohesion: 0.04
Nodes (32): get_database_url(), Database Environment Configuration for SENTINEL (Phase 7)., Returns the database connection URL from environment variable DATABASE_URL,, get_repository(), Run migrations in 'offline' mode., Run migrations in 'online' mode using AsyncEngine., Run migrations in 'online' mode., run_async_migrations() (+24 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (36): generate_analyst_decision_support(), generate_transaction_analyst_decision_support(), _now_iso(), Analyst Decision Support Agent for SENTINEL (Phase 5).  Responsibility: - Con, Core entrypoint for Phase 5 Analyst Decision Support Agent.     Consumes Phase, Wrapper to collect Phase 1-4 reports and generate Phase 5 Analyst Decision Suppo, get_transaction_decision_support(), Test 6: Mismatched case IDs across pipeline stages returns INVALID_INPUT. (+28 more)

### Community 11 - "Community 11"
Cohesion: 0.05
Nodes (29): evaluate_trigger(), extract_transaction_facts(), generate_customer_safe_reason(), Customer Verification Service for SENTINEL (n8n VerifyFlow Integration).  Resp, Builds the customer-facing reason string. Deliberately does not accept or     r, Resolves the DEMO_MODE synthetic customer email for an account_id, with a fallba, Deterministic trigger gate built on real contextual_agent.py pattern ids:     (, Pulls amount/currency/channel/timestamp from the real evidence_agent.py 'transac (+21 more)

### Community 12 - "Community 12"
Cohesion: 0.04
Nodes (33): ActionLog(), getAnomalyIndicator(), App(), AttackModeToggle(), Cases(), getCaseActionDetails(), getCaseEffectiveStatus(), ClusterDetailModal() (+25 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (16): ActionTakenToast(), BenchmarkLab(), formatCurrency(), getHumanRecommendedAction(), getHumanScenarioName(), getPlainLanguageFindings(), LiveAlertToast(), handleAction() (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (1): Abstract Case Repository Interface for SENTINEL (Phase 7).

### Community 15 - "Community 15"
Cohesion: 0.08
Nodes (13): API Test 1: POST /cases/{case_id}/disposition executes stateful transition., API Test 2: Disposition is persisted in data_store['dispositions']., API Test 3: Audit event is appended to data_store['audit_log']., API Test 4: GET /cases/{case_id}/history returns complete history., API Test 5: History endpoint preserves notes, identity, risk ack, and traceabili, API Test 6: GET /cases exposes current persistent lifecycle status., API Test 7: Closed case rejects subsequent invalid state transitions via API., API Test 8: Forbidden FREEZE action rejected by disposition endpoint. (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (7): downgrade(), Partial Unique Index for Active Investigation Runs  Revision ID: 004_active_in, upgrade(), downgrade(), Customer Verifications Table for n8n VerifyFlow Integration  Revision ID: 005_, upgrade(), TestPostgreSQLRealIntegration

### Community 17 - "Community 17"
Cohesion: 0.1
Nodes (10): Test 9: Critical query indexes are defined on models., Test 1: All 6 Phase 7 models are registered in Base.metadata.tables., Test 2: Each table defines the required Primary Key., Test 3: Foreign key relationships are accurately defined., Test 4: Monetary fields use NUMERIC type (not Float/Double)., Test 5: Timestamp fields use timezone-aware DateTime., Test 6: Complex investigation objects use JSON/JSONB fields., Test 7: Case status CheckConstraint is present on cases table. (+2 more)

### Community 18 - "Community 18"
Cohesion: 0.13
Nodes (12): evaluate_response_policy(), _now_iso(), SENTINEL Phase 14 — Automated Response Policy Engine.  Evaluates scored transa, Evaluates a scored transaction and computes a deterministic response decision., Phase 14 Automated Response Orchestration & Governance Unit Tests.  Verifies:, LOW score transaction maps to MONITOR decision., MEDIUM score transaction maps to ENHANCED_MONITORING decision., HIGH score transaction maps to ESCALATE_ANALYST_REVIEW decision. (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.13
Nodes (6): formatAmount(), formatLabel(), isIdLike(), isSeverity(), KeyValRow(), PrimitiveValue()

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (7): post_to_n8n(), Outbound n8n webhook dispatcher for SENTINEL.  n8n is an external orchestratio, Fire-and-forget POST to an n8n webhook. Never raises. Returns a result dict, _async_run(), Tests for app/services/n8n_dispatcher.py -- the outbound SENTINEL -> n8n call p, With max_retries=2, the client's .post must be attempted exactly 3 times (1 + 2, TestN8nDispatcherResilience

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (15): _cap_amount(), _generate_timestamp(), _generate_tx_id(), _pick_channel(), _random_account(), _run_forked_scenario(), run_sc01_mule_chain(), run_sc02_sim_swap() (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.16
Nodes (9): compute_case_investigation_confidence(), Case B: Weak Evidence         Low completeness (20%)         Low agent agreeme, Case D: Repeated Calculation         Identical inputs must produce strictly ide, Case E: Missing/Incomplete Investigation         No evidence, no agent reports, Case C: Reference Example Scenario         Completeness: 80%         Agreement, Verify /analytics/overview returns investigation_confidence and NO kyc_verificat, Case A: Strong Evidence         High evidence completeness (100%)         High, Tests for SENTINEL's deterministic Investigation Confidence metric.          F (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.3
Nodes (1): TestPhase8Step2AsyncEndpoints

### Community 24 - "Community 24"
Cohesion: 0.15
Nodes (5): Unit and Integration Tests for SENTINEL Benchmark Lab API Endpoints.  Validate, Validates POST /benchmark/runs/{run_id}/transactions/{tx_id}/evaluate     evalu, Case 3 — Batch evaluation:     Clicking EVALUATE BENCHMARK processes the whole, test_case_3_batch_evaluation_processes_all(), test_single_transaction_evaluation_route()

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (7): CustomTransactionModal(), formatCurrency(), getRiskColor(), getRiskLabel(), MLIntelligence(), stageIn(), useAnimatedCount()

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (1): TestPhase8Step5CasesWsCsvPg

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (8): AgentTooltipCard(), formatAmount(), formatLabel(), getContainerAlignment(), getStageInsightData(), InvestigationWorkflowGraph(), safeFormatValue(), statusColor()

### Community 28 - "Community 28"
Cohesion: 0.38
Nodes (6): generate_synthetic_data(), normalize(), Normalize features for better model stability., Generate synthetic fraud data for training., Load data, normalize, train RandomForest, and save with metadata., train_model()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (1): IDGenerator

### Community 32 - "Community 32"
Cohesion: 0.33
Nodes (1): SENTINEL Full Backend Integration Test Tests every major backend feature agains

### Community 33 - "Community 33"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 34 - "Community 34"
Cohesion: 0.6
Nodes (5): assignTopologicalLayers(), extractTransactionInvestigationSubgraph(), getEdgeSource(), getEdgeTarget(), simplifyGraphTopology()

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (3): Locks in the exact response contract of GET /health, since the n8n "SENTINEL --, Default dev config (no DATABASE_URL) must report healthy with database='disabled, test_health_endpoint_healthy_in_development_mode_without_database_url()

### Community 36 - "Community 36"
Cohesion: 0.5
Nodes (3): maskAccount(), nodeActionButtonStyle(), NodeActions()

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (1): Initial Schema for SENTINEL Phase 7  Revision ID: 001_initial_schema Revises:

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (1): Audit Event Immutability Trigger for SENTINEL Phase 7 Step 4  Revision ID: 002

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (1): Investigation Runs Table for Phase 9 Reliability Hardening  Revision ID: 003_i

### Community 41 - "Community 41"
Cohesion: 0.5
Nodes (3): AccountStatus, ActionTypes, CaseStatus

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (3): generate_sample_tx(), Generates diverse transaction payloads across 4 risk tiers.     All are Hop 0 (, run_correlation_test()

### Community 43 - "Community 43"
Cohesion: 0.83
Nodes (3): ActionPanel(), primaryButtonStyle(), secondaryButtonStyle()

### Community 88 - "Community 88"
Cohesion: 1.0
Nodes (1): Fetch case record by case_id without pessimistic locking.

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Fetch case record by case_id with a pessimistic row lock (SELECT FOR UPDATE).

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Lookup existing disposition record by idempotency key.

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Atomically executes:         1. Insertion of disposition record.         2. Ca

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Appends an immutable audit event record to the audit log repository.         Ex

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Retrieves complete chronological disposition and audit log history for a given c

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): Saves or initializes a case entity.

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): Saves or updates an investigation report artifact associated with a case.

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Fetch investigation report by case_id and report_type.

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Fetch all investigation reports for a given case_id.

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): Fetch account record by account_id.

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Saves or updates an account entity.

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Fetch transaction record by tx_id.

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Saves a transaction entity.

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Atomically executes in one database transaction:         1. Account creation/up

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Fetch all cases ordered by created_at descending.

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): Fetch recent transactions for WebSocket hydration.

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Fetch all transactions for CSV export.

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): Fetch all audit events/actions for CSV export.

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Saves or updates a durable InvestigationRun record.

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): Fetch investigation run by run_id.

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): Fetch active (RUNNING) investigation run for case_id.

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): Fetch most recent investigation run for case_id.

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): Fetch all historical investigation runs for case_id ordered by started_at DESC.

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): Finds active RUNNING investigations older than threshold and marks them FAILED/D

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): Fetch case with SELECT FOR UPDATE row lock to serialize concurrent operations ac

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): Commits current database transaction boundary.

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): Rolls back current database transaction boundary.

### Community 128 - "Community 128"
Cohesion: 1.0
Nodes (1): Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De

### Community 129 - "Community 129"
Cohesion: 1.0
Nodes (1): Quick reachability check against /api/tags.

### Community 130 - "Community 130"
Cohesion: 1.0
Nodes (1): Send investigation context to Qwen and return structured advisory intelligence.

### Community 131 - "Community 131"
Cohesion: 1.0
Nodes (1): Send an analyst challenge against an AI investigation finding to Qwen.

### Community 132 - "Community 132"
Cohesion: 1.0
Nodes (1): Convert investigation context dict to a compact, readable analyst briefing.

### Community 133 - "Community 133"
Cohesion: 1.0
Nodes (1): POST to /api/chat with non-streaming response.         Raises TimeoutError on t

### Community 134 - "Community 134"
Cohesion: 1.0
Nodes (1): Extract and validate the JSON analysis from Ollama's response envelope.

### Community 135 - "Community 135"
Cohesion: 1.0
Nodes (1): Construct structured prompt presenting the finding and analyst challenge to Qwen

### Community 136 - "Community 136"
Cohesion: 1.0
Nodes (1): Parse, validate, and normalize Qwen's response to an analyst challenge.

### Community 137 - "Community 137"
Cohesion: 1.0
Nodes (1): Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De

### Community 138 - "Community 138"
Cohesion: 1.0
Nodes (1): Quick reachability check against /api/tags.

### Community 139 - "Community 139"
Cohesion: 1.0
Nodes (1): Send investigation context to Qwen and return structured advisory intelligence.

### Community 140 - "Community 140"
Cohesion: 1.0
Nodes (1): Send an analyst challenge against an AI investigation finding to Qwen.

### Community 141 - "Community 141"
Cohesion: 1.0
Nodes (1): Convert investigation context dict to a compact, readable analyst briefing.

### Community 142 - "Community 142"
Cohesion: 1.0
Nodes (1): POST to /api/chat with non-streaming response.         Raises TimeoutError on t

### Community 143 - "Community 143"
Cohesion: 1.0
Nodes (1): Extract and validate the JSON analysis from Ollama's response envelope.

### Community 144 - "Community 144"
Cohesion: 1.0
Nodes (1): Construct structured prompt presenting the finding and analyst challenge to Qwen

### Community 145 - "Community 145"
Cohesion: 1.0
Nodes (1): Parse, validate, and normalize Qwen's response to an analyst challenge.

### Community 146 - "Community 146"
Cohesion: 1.0
Nodes (1): Rule-Guided ML Emulator.      Produces an ML-like score that closely tracks th

### Community 147 - "Community 147"
Cohesion: 1.0
Nodes (1): Kept for backward compatibility — not used in emulator mode.

### Community 148 - "Community 148"
Cohesion: 1.0
Nodes (1): Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De

### Community 149 - "Community 149"
Cohesion: 1.0
Nodes (1): Quick reachability check against /api/tags.

### Community 150 - "Community 150"
Cohesion: 1.0
Nodes (1): Send investigation context to Qwen and return structured advisory intelligence.

### Community 151 - "Community 151"
Cohesion: 1.0
Nodes (1): Convert investigation context dict to a compact, readable analyst briefing.

### Community 152 - "Community 152"
Cohesion: 1.0
Nodes (1): POST to /api/chat with non-streaming response.         Raises TimeoutError on t

### Community 153 - "Community 153"
Cohesion: 1.0
Nodes (1): Extract and validate the JSON analysis from Ollama's response envelope.

## Knowledge Gaps
- **271 isolated node(s):** `Run migrations in 'offline' mode.`, `Run migrations in 'online' mode using AsyncEngine.`, `Run migrations in 'online' mode.`, `Initial Schema for SENTINEL Phase 7  Revision ID: 001_initial_schema Revises:`, `Audit Event Immutability Trigger for SENTINEL Phase 7 Step 4  Revision ID: 002` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 14`** (29 nodes): `base.py`, `commit_transaction()`, `get_account()`, `get_active_investigation_run()`, `get_all_audit_events()`, `get_all_transactions()`, `get_case_by_id()`, `get_case_for_update()`, `get_case_history()`, `get_cases()`, `get_disposition_by_idempotency_key()`, `get_investigation_report()`, `get_investigation_reports_by_case_id()`, `get_investigation_run()`, `get_investigation_runs_for_case()`, `get_latest_investigation_run()`, `get_recent_transactions()`, `get_transaction()`, `Abstract Case Repository Interface for SENTINEL (Phase 7).`, `recover_stale_investigation_runs()`, `rollback_transaction()`, `save_account()`, `save_audit_event()`, `save_case()`, `save_disposition_and_audit()`, `save_investigation_report()`, `save_investigation_run()`, `save_transaction()`, `save_transaction_and_case()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (15 nodes): `TestPhase8Step2AsyncEndpoints`, `.clean_db()`, `.run_with_db()`, `.seed_case_fixture()`, `.setUp()`, `.tearDown()`, `.test_step2_01_successful_disposition_http_api()`, `.test_step2_02_03_04_persisted_in_postgresql()`, `.test_step2_05_06_idempotent_repeated_request()`, `.test_step2_07_invalid_transition_rejected()`, `.test_step2_08_unauthorized_analyst_role_rejected()`, `.test_step2_09_forbidden_autonomous_actions_rejected()`, `.test_step2_10_transaction_rollback_integrity()`, `.test_step2_11_12_get_history_returns_persisted_ordered_history()`, `.test_step2_13_concurrent_dispositions_select_for_update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (10 nodes): `TestPhase8Step5CasesWsCsvPg`, `.clean_db()`, `.run_with_db()`, `.seed_data()`, `.setUp()`, `.tearDown()`, `.test_step5_01_02_03_04_05_06_07_get_cases_pg_authoritative()`, `.test_step5_08_09_10_11_websocket_hydration_pg()`, `.test_step5_12_13_14_csv_export_pg()`, `.test_step5_16_repository_retrieval_contract()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (6 nodes): `id_generator.py`, `generate_account_id()`, `generate_action_id()`, `generate_case_id()`, `generate_tx_id()`, `IDGenerator`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (6 nodes): `test_full_system.py`, `check()`, `_now()`, `SENTINEL Full Backend Integration Test Tests every major backend feature agains`, `section()`, `_tx_id()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (6 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (4 nodes): `downgrade()`, `Initial Schema for SENTINEL Phase 7  Revision ID: 001_initial_schema Revises:`, `upgrade()`, `001_initial_schema.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (4 nodes): `downgrade()`, `Audit Event Immutability Trigger for SENTINEL Phase 7 Step 4  Revision ID: 002`, `upgrade()`, `002_audit_immutability.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (4 nodes): `downgrade()`, `Investigation Runs Table for Phase 9 Reliability Hardening  Revision ID: 003_i`, `upgrade()`, `003_investigation_runs.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 88`** (1 nodes): `Fetch case record by case_id without pessimistic locking.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Fetch case record by case_id with a pessimistic row lock (SELECT FOR UPDATE).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Lookup existing disposition record by idempotency key.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Atomically executes:         1. Insertion of disposition record.         2. Ca`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Appends an immutable audit event record to the audit log repository.         Ex`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Retrieves complete chronological disposition and audit log history for a given c`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `Saves or initializes a case entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `Saves or updates an investigation report artifact associated with a case.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Fetch investigation report by case_id and report_type.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Fetch all investigation reports for a given case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `Fetch account record by account_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Saves or updates an account entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Fetch transaction record by tx_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Saves a transaction entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Atomically executes in one database transaction:         1. Account creation/up`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Fetch all cases ordered by created_at descending.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `Fetch recent transactions for WebSocket hydration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Fetch all transactions for CSV export.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Fetch all audit events/actions for CSV export.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Saves or updates a durable InvestigationRun record.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Fetch investigation run by run_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `Fetch active (RUNNING) investigation run for case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Fetch most recent investigation run for case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Fetch all historical investigation runs for case_id ordered by started_at DESC.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Finds active RUNNING investigations older than threshold and marks them FAILED/D`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Fetch case with SELECT FOR UPDATE row lock to serialize concurrent operations ac`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Commits current database transaction boundary.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Rolls back current database transaction boundary.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 128`** (1 nodes): `Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 129`** (1 nodes): `Quick reachability check against /api/tags.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 130`** (1 nodes): `Send investigation context to Qwen and return structured advisory intelligence.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 131`** (1 nodes): `Send an analyst challenge against an AI investigation finding to Qwen.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 132`** (1 nodes): `Convert investigation context dict to a compact, readable analyst briefing.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 133`** (1 nodes): `POST to /api/chat with non-streaming response.         Raises TimeoutError on t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 134`** (1 nodes): `Extract and validate the JSON analysis from Ollama's response envelope.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 135`** (1 nodes): `Construct structured prompt presenting the finding and analyst challenge to Qwen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 136`** (1 nodes): `Parse, validate, and normalize Qwen's response to an analyst challenge.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 137`** (1 nodes): `Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 138`** (1 nodes): `Quick reachability check against /api/tags.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 139`** (1 nodes): `Send investigation context to Qwen and return structured advisory intelligence.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 140`** (1 nodes): `Send an analyst challenge against an AI investigation finding to Qwen.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 141`** (1 nodes): `Convert investigation context dict to a compact, readable analyst briefing.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 142`** (1 nodes): `POST to /api/chat with non-streaming response.         Raises TimeoutError on t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 143`** (1 nodes): `Extract and validate the JSON analysis from Ollama's response envelope.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 144`** (1 nodes): `Construct structured prompt presenting the finding and analyst challenge to Qwen`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 145`** (1 nodes): `Parse, validate, and normalize Qwen's response to an analyst challenge.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 146`** (1 nodes): `Rule-Guided ML Emulator.      Produces an ML-like score that closely tracks th`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 147`** (1 nodes): `Kept for backward compatibility — not used in emulator mode.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 148`** (1 nodes): `Minimal, dependency-free wrapper around the Ollama /api/chat endpoint.      De`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 149`** (1 nodes): `Quick reachability check against /api/tags.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 150`** (1 nodes): `Send investigation context to Qwen and return structured advisory intelligence.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 151`** (1 nodes): `Convert investigation context dict to a compact, readable analyst briefing.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 152`** (1 nodes): `POST to /api/chat with non-streaming response.         Raises TimeoutError on t`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 153`** (1 nodes): `Extract and validate the JSON analysis from Ollama's response envelope.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InMemoryCaseRepository` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 10`, `Community 15`, `Community 26`?**
  _High betweenness centrality (0.245) - this node is a cross-community bridge._
- **Why does `PostgreSQLCaseRepository` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 9`, `Community 16`, `Community 18`, `Community 23`, `Community 26`?**
  _High betweenness centrality (0.158) - this node is a cross-community bridge._
- **Why does `AbstractCaseRepository` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 14`?**
  _High betweenness centrality (0.102) - this node is a cross-community bridge._
- **Are the 392 inferred relationships involving `InMemoryCaseRepository` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`InMemoryCaseRepository` has 392 INFERRED edges - model-reasoned connections that need verification._
- **Are the 289 inferred relationships involving `PostgreSQLCaseRepository` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`PostgreSQLCaseRepository` has 289 INFERRED edges - model-reasoned connections that need verification._
- **Are the 230 inferred relationships involving `Case` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`Case` has 230 INFERRED edges - model-reasoned connections that need verification._
- **Are the 230 inferred relationships involving `Transaction` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`Transaction` has 230 INFERRED edges - model-reasoned connections that need verification._