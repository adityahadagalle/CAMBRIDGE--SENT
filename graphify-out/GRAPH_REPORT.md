# Graph Report - sentinel  (2026-09-25)

## Corpus Check
- 382 files · ~399,834 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 2438 nodes · 6444 edges · 94 communities detected
- Extraction: 47% EXTRACTED · 53% INFERRED · 0% AMBIGUOUS · INFERRED: 3405 edges (avg confidence: 0.58)
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
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
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
- [[_COMMUNITY_Community 116|Community 116]]

## God Nodes (most connected - your core abstractions)
1. `InMemoryCaseRepository` - 452 edges
2. `PostgreSQLCaseRepository` - 349 edges
3. `Case` - 264 edges
4. `Transaction` - 264 edges
5. `Account` - 261 edges
6. `AbstractCaseRepository` - 253 edges
7. `CaseLifecycleService` - 246 edges
8. `AbstractVerificationRepository` - 86 edges
9. `AuditEvent` - 79 edges
10. `Disposition` - 69 edges

## Surprising Connections (you probably didn't know these)
- `Base` --uses--> `CustomerVerification ORM Model for SENTINEL (n8n VerifyFlow Integration).  Per`  [INFERRED]
  sentinel-fincrime-platform\sentinel\backend\app\db\session.py → backend\app\models\customer_verification.py
- `AbstractCaseRepository` --uses--> `Returns list of supported benchmark feature profiles and their descriptions.`  [INFERRED]
  sentinel-fincrime-platform\sentinel\backend\app\repositories\base.py → backend\app\routes\benchmark.py
- `AbstractCaseRepository` --uses--> `Phase 1: Generates a batch of test transactions strictly as UNEVALUATED INPUTS.`  [INFERRED]
  sentinel-fincrime-platform\sentinel\backend\app\repositories\base.py → backend\app\routes\benchmark.py
- `AbstractCaseRepository` --uses--> `Phase 2: User explicitly triggers SENTINEL evaluation.     Routes every transac`  [INFERRED]
  sentinel-fincrime-platform\sentinel\backend\app\repositories\base.py → backend\app\routes\benchmark.py
- `AbstractCaseRepository` --uses--> `Evaluates ONLY a single transaction within a benchmark run.     Enforces transa`  [INFERRED]
  sentinel-fincrime-platform\sentinel\backend\app\repositories\base.py → backend\app\routes\benchmark.py

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (275): AbstractCaseRepository, Account, AuditEvent, Base, AbstractCaseRepository, Abstract contract for case lifecycle, disposition, and audit persistence operati, Case, CaseLifecycleService (+267 more)

### Community 1 - "Community 1"
Cohesion: 0.01
Nodes (139): generate_analyst_decision_support(), generate_case_analyst_decision_support(), generate_transaction_analyst_decision_support(), _now_iso(), Analyst Decision Support Agent for SENTINEL (Phase 5).  Responsibility: - Con, Core entrypoint for Phase 5 Analyst Decision Support Agent.     Consumes Phase, Wrapper to collect Phase 1-4 reports and generate Phase 5 Analyst Decision Suppo, Wrapper to collect Phase 1-4 reports and generate Phase 5 Analyst Decision Suppo (+131 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (75): CustomerVerification, CustomerVerification ORM Model for SENTINEL (n8n VerifyFlow Integration).  Per, build_event_envelope(), evaluate_and_dispatch(), extract_transaction_facts(), generate_customer_safe_reason(), Customer Verification Service for SENTINEL (n8n VerifyFlow Integration).  Resp, Builds the customer-facing reason string. Deliberately does not accept or     r (+67 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (71): InvestigationOrchestrator, _now_iso(), Investigation Orchestrator Service for SENTINEL (Phase 9 Reliability Hardening)., Asynchronous End-to-End Investigation Pipeline Orchestrator with PostgreSQL Reli, Asynchronous End-to-End Investigation Pipeline Orchestrator with PostgreSQL Reli, Executes a function with bounded retries for transient errors., Executes a function with bounded retries for transient errors., Executes the 5-stage automated investigation lifecycle for a given case_id. (+63 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (103): evaluate_autonomous_policy(), SENTINEL Phase 16 — Deterministic Autonomous Policy Engine.  Enforces non-nego, Evaluates transaction risk signals and produces a deterministic policy decision., ActionRequest, alert_action(), _baseline_loop(), block_action(), _build_investigation_read_model() (+95 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (82): BaseModel, analyze_case(), AnalyzeRequest, _build_investigation_context(), challenge_finding(), ChallengeRequest, _extract_finding_from_stage_report(), HealthResponse (+74 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (106): add_custom_input_to_run(), BenchmarkStartRequest, cancel_benchmark_run(), custom_evaluate_transaction(), CustomTransactionRequest, evaluate_benchmark_run(), evaluate_single_benchmark_transaction(), build_evaluation_snapshot() (+98 more)

### Community 7 - "Community 7"
Cohesion: 0.02
Nodes (73): get_case_audit_history(), get_case_disposition_history(), _now_iso(), Case Lifecycle & Audit Persistence Agent for SENTINEL (Phase 6 / Phase 7 Step 3), Returns True if current_state -> target_state is an allowed, valid transition., Delegates history retrieval directly to the repository., Delegates history retrieval directly to the repository., Returns complete chronological list of disposition records for a given case. (+65 more)

### Community 8 - "Community 8"
Cohesion: 0.02
Nodes (55): downgrade(), Partial Unique Index for Active Investigation Runs  Revision ID: 004_active_in, upgrade(), Account ORM Model for SENTINEL (Phase 7)., AuditEvent ORM Model for SENTINEL (Phase 7)., execute_automation_policy(), _now_iso(), SENTINEL Phase 15 — Automation & Response Executor Service.  Implements backen (+47 more)

### Community 9 - "Community 9"
Cohesion: 0.03
Nodes (49): generate_audit_explanation(), generate_case_audit_explanation(), generate_transaction_audit_explanation(), _now_iso(), Audit Explanation Agent for SENTINEL (Phase 4).  Responsibility: - Consumes P, Core entrypoint for Phase 4 Audit Explanation Agent.     Consumes Phase 1 evide, Wrapper to collect Phase 1 evidence, Phase 2 contextual report, Phase 3 regulato, Wrapper to collect Phase 1 evidence, Phase 2 contextual report, Phase 3 regulato (+41 more)

### Community 10 - "Community 10"
Cohesion: 0.04
Nodes (44): ActionLog(), getAnomalyIndicator(), App(), AttackModeToggle(), Cases(), formatStatusLabel(), getCaseActionDetails(), getCaseEffectiveStatus() (+36 more)

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (23): ActionTakenToast(), BenchmarkLab(), formatCurrency(), getHumanRecommendedAction(), getHumanScenarioName(), getHumanSignalChips(), getPlainLanguageFindings(), LiveAlertToast() (+15 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (29): ABC, commit_transaction(), get_account(), get_active_investigation_run(), get_all_audit_events(), get_all_transactions(), get_case_by_id(), get_case_for_update() (+21 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (16): evaluate_trigger(), Deterministic trigger gate built on real contextual_agent.py pattern ids:     (, _iso_now(), SENTINEL Pre-Seeded Demonstration Data Engine Provides authentic multi-tier for, Populates data_store with distinct, authentic forensic topologies.     Idempote, seed_initial_demonstration_data(), _contextual_rpt(), Tests for CustomerVerificationService.evaluate_trigger() -- the deterministic, (+8 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (13): evaluate_response_policy(), _now_iso(), SENTINEL Phase 14 — Automated Response Policy Engine.  Evaluates scored transa, Evaluates a scored transaction and computes a deterministic response decision., Phase 14 Automated Response Orchestration & Governance Unit Tests.  Verifies:, LOW score transaction maps to MONITOR decision., MEDIUM score transaction maps to ENHANCED_MONITORING decision., HIGH score transaction maps to ESCALATE_ANALYST_REVIEW decision. (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.1
Nodes (10): Test 9: Critical query indexes are defined on models., Test 1: All 6 Phase 7 models are registered in Base.metadata.tables., Test 2: Each table defines the required Primary Key., Test 3: Foreign key relationships are accurately defined., Test 4: Monetary fields use NUMERIC type (not Float/Double)., Test 5: Timestamp fields use timezone-aware DateTime., Test 6: Complex investigation objects use JSON/JSONB fields., Test 7: Case status CheckConstraint is present on cases table. (+2 more)

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (18): AnalystEvidenceViewer(), AuditExplanationView(), AuditTrailCard(), ContextualView(), DecisionSupportView(), EvidenceView(), formatAmount(), formatLabel() (+10 more)

### Community 17 - "Community 17"
Cohesion: 0.24
Nodes (2): setUpClass(), TestPhase8Step2AsyncEndpoints

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (7): post_to_n8n(), Outbound n8n webhook dispatcher for SENTINEL.  n8n is an external orchestratio, Fire-and-forget POST to an n8n webhook. Never raises. Returns a result dict, _async_run(), Tests for app/services/n8n_dispatcher.py -- the outbound SENTINEL -> n8n call p, With max_retries=2, the client's .post must be attempted exactly 3 times (1 + 2, TestN8nDispatcherResilience

### Community 19 - "Community 19"
Cohesion: 0.46
Nodes (15): _cap_amount(), _generate_timestamp(), _generate_tx_id(), _pick_channel(), _random_account(), _run_forked_scenario(), run_sc01_mule_chain(), run_sc02_sim_swap() (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (5): AccountNode, ensure_tz_aware(), ActionLog, ensure_tz_aware(), ensure_tz_aware()

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (13): Unit and Integration Tests for SENTINEL Benchmark Lab API Endpoints.  Validate, Validates POST /benchmark/runs/{run_id}/transactions/{tx_id}/evaluate     evalu, Case 3 — Batch evaluation:     Clicking EVALUATE BENCHMARK processes the whole, test_cancel_benchmark_run(), test_case_3_batch_evaluation_processes_all(), test_custom_evaluate_endpoint(), test_export_csv_endpoint(), test_get_benchmark_profiles() (+5 more)

### Community 22 - "Community 22"
Cohesion: 0.28
Nodes (2): setUpClass(), TestPhase8Step4ReportPersistence

### Community 23 - "Community 23"
Cohesion: 0.26
Nodes (10): CustomTransactionModal(), FlowConnector(), formatCurrency(), getNormalizedWeights(), getRiskColor(), getRiskLabel(), MLIntelligence(), NeuralNetworkViz() (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (2): setUpClass(), TestPhase8Step3TransactionIngestion

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (4): Resolves the DEMO_MODE synthetic customer email for an account_id, with a fallba, resolve_demo_customer_email(), Tests for demo customer email resolution (DEMO_MODE gating, account map, fallba, TestResolveDemoCustomerEmail

### Community 26 - "Community 26"
Cohesion: 0.44
Nodes (9): AgentTooltipCard(), computeTooltipPosition(), formatAmount(), formatLabel(), getContainerAlignment(), getStageInsightData(), InvestigationWorkflowGraph(), safeFormatValue() (+1 more)

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (4): _amount_deviation(), score_transaction(), _time_anomaly(), TestAnalyticsRealtime

### Community 28 - "Community 28"
Cohesion: 0.39
Nodes (6): generate_synthetic_data(), normalize(), Normalize features for better model stability., Generate synthetic fraud data for training., Load data, normalize, train RandomForest, and save with metadata., train_model()

### Community 29 - "Community 29"
Cohesion: 0.43
Nodes (6): applyHierarchicalDagLayout(), buildRevealSequence(), drawEdgeFrame(), formatTransactionLabel(), getRoleTheme(), startRevealAnimation()

### Community 30 - "Community 30"
Cohesion: 0.48
Nodes (5): mock_bank_freeze(), mock_close_case(), mock_monitor_account(), mock_police_alert(), mock_telecom_flag()

### Community 31 - "Community 31"
Cohesion: 0.48
Nodes (5): generate_account_id(), generate_action_id(), generate_case_id(), generate_tx_id(), IDGenerator

### Community 32 - "Community 32"
Cohesion: 0.48
Nodes (5): check(), _now(), SENTINEL Full Backend Integration Test Tests every major backend feature agains, section(), _tx_id()

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (1): ErrorBoundary

### Community 34 - "Community 34"
Cohesion: 0.38
Nodes (3): maskAccount(), nodeActionButtonStyle(), NodeActions()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (5): assignTopologicalLayers(), extractTransactionInvestigationSubgraph(), getEdgeSource(), getEdgeTarget(), simplifyGraphTopology()

### Community 36 - "Community 36"
Cohesion: 0.6
Nodes (3): downgrade(), Initial Schema for SENTINEL Phase 7  Revision ID: 001_initial_schema Revises:, upgrade()

### Community 37 - "Community 37"
Cohesion: 0.6
Nodes (3): downgrade(), Audit Event Immutability Trigger for SENTINEL Phase 7 Step 4  Revision ID: 002, upgrade()

### Community 38 - "Community 38"
Cohesion: 0.6
Nodes (3): downgrade(), Investigation Runs Table for Phase 9 Reliability Hardening  Revision ID: 003_i, upgrade()

### Community 39 - "Community 39"
Cohesion: 0.6
Nodes (3): AccountStatus, ActionTypes, CaseStatus

### Community 40 - "Community 40"
Cohesion: 0.6
Nodes (3): generate_sample_tx(), Generates diverse transaction payloads across 4 risk tiers.     All are Hop 0 (, run_correlation_test()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (3): Locks in the exact response contract of GET /health, since the n8n "SENTINEL --, Default dev config (no DATABASE_URL) must report healthy with database='disabled, test_health_endpoint_healthy_in_development_mode_without_database_url()

### Community 42 - "Community 42"
Cohesion: 0.8
Nodes (3): ActionPanel(), primaryButtonStyle(), secondaryButtonStyle()

### Community 44 - "Community 44"
Cohesion: 0.5
Nodes (1): Customer Verifications Table for n8n VerifyFlow Integration  Revision ID: 005_

### Community 45 - "Community 45"
Cohesion: 0.67
Nodes (2): RecoveryBar(), StatItem()

### Community 46 - "Community 46"
Cohesion: 0.67
Nodes (2): handleCustomInputAddedMock(), Program()

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (1): make_tx()

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (1): ActionButton()

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (1): AutomateModeToggle()

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (1): AutomationAuditDrawer()

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (1): CaseCard()

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (1): CenterFlow()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (1): FactorBreakdown()

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (1): GoldenTimer()

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (1): Login()

### Community 57 - "Community 57"
Cohesion: 0.67
Nodes (1): RiskBadge()

### Community 58 - "Community 58"
Cohesion: 0.67
Nodes (1): RiskScoreTrend()

### Community 59 - "Community 59"
Cohesion: 0.67
Nodes (1): SystemStatusBar()

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (2): generateRealisticAmount(), getSyntheticTransaction()

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (1): AgentReportModal()

### Community 62 - "Community 62"
Cohesion: 0.67
Nodes (1): EntityDetailModal()

### Community 63 - "Community 63"
Cohesion: 0.67
Nodes (1): InvestigationBriefModal()

### Community 64 - "Community 64"
Cohesion: 0.67
Nodes (1): Legend()

### Community 65 - "Community 65"
Cohesion: 0.67
Nodes (1): TransactionDetailModal()

### Community 66 - "Community 66"
Cohesion: 0.67
Nodes (1): TransactionInspectorModal()

### Community 67 - "Community 67"
Cohesion: 0.67
Nodes (1): exportAuditLog()

### Community 89 - "Community 89"
Cohesion: 1.0
Nodes (1): Fetch case record by case_id without pessimistic locking.

### Community 90 - "Community 90"
Cohesion: 1.0
Nodes (1): Fetch case record by case_id with a pessimistic row lock (SELECT FOR UPDATE).

### Community 91 - "Community 91"
Cohesion: 1.0
Nodes (1): Lookup existing disposition record by idempotency key.

### Community 92 - "Community 92"
Cohesion: 1.0
Nodes (1): Atomically executes:         1. Insertion of disposition record.         2. Ca

### Community 93 - "Community 93"
Cohesion: 1.0
Nodes (1): Appends an immutable audit event record to the audit log repository.         Ex

### Community 94 - "Community 94"
Cohesion: 1.0
Nodes (1): Retrieves complete chronological disposition and audit log history for a given c

### Community 95 - "Community 95"
Cohesion: 1.0
Nodes (1): Saves or initializes a case entity.

### Community 96 - "Community 96"
Cohesion: 1.0
Nodes (1): Saves or updates an investigation report artifact associated with a case.

### Community 97 - "Community 97"
Cohesion: 1.0
Nodes (1): Fetch investigation report by case_id and report_type.

### Community 98 - "Community 98"
Cohesion: 1.0
Nodes (1): Fetch all investigation reports for a given case_id.

### Community 99 - "Community 99"
Cohesion: 1.0
Nodes (1): Fetch account record by account_id.

### Community 100 - "Community 100"
Cohesion: 1.0
Nodes (1): Saves or updates an account entity.

### Community 101 - "Community 101"
Cohesion: 1.0
Nodes (1): Fetch transaction record by tx_id.

### Community 102 - "Community 102"
Cohesion: 1.0
Nodes (1): Saves a transaction entity.

### Community 103 - "Community 103"
Cohesion: 1.0
Nodes (1): Atomically executes in one database transaction:         1. Account creation/up

### Community 104 - "Community 104"
Cohesion: 1.0
Nodes (1): Fetch all cases ordered by created_at descending.

### Community 105 - "Community 105"
Cohesion: 1.0
Nodes (1): Fetch recent transactions for WebSocket hydration.

### Community 106 - "Community 106"
Cohesion: 1.0
Nodes (1): Fetch all transactions for CSV export.

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): Fetch all audit events/actions for CSV export.

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): Saves or updates a durable InvestigationRun record.

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): Fetch investigation run by run_id.

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): Fetch active (RUNNING) investigation run for case_id.

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): Fetch most recent investigation run for case_id.

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): Fetch all historical investigation runs for case_id ordered by started_at DESC.

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): Finds active RUNNING investigations older than threshold and marks them FAILED/D

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): Fetch case with SELECT FOR UPDATE row lock to serialize concurrent operations ac

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): Commits current database transaction boundary.

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (1): Rolls back current database transaction boundary.

## Knowledge Gaps
- **221 isolated node(s):** `Run migrations in 'offline' mode.`, `Run migrations in 'online' mode using AsyncEngine.`, `Run migrations in 'online' mode.`, `Customer Verifications Table for n8n VerifyFlow Integration  Revision ID: 005_`, `Populates data_store with distinct, authentic forensic topologies.     Idempote` (+216 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 17`** (18 nodes): `test_async_disposition_history_api.py`, `test_async_disposition_history_api.py`, `setUpClass()`, `TestPhase8Step2AsyncEndpoints`, `.clean_db()`, `.run_with_db()`, `.seed_case_fixture()`, `.setUp()`, `.tearDown()`, `.test_step2_01_successful_disposition_http_api()`, `.test_step2_02_03_04_persisted_in_postgresql()`, `.test_step2_05_06_idempotent_repeated_request()`, `.test_step2_07_invalid_transition_rejected()`, `.test_step2_08_unauthorized_analyst_role_rejected()`, `.test_step2_09_forbidden_autonomous_actions_rejected()`, `.test_step2_10_transaction_rollback_integrity()`, `.test_step2_11_12_get_history_returns_persisted_ordered_history()`, `.test_step2_13_concurrent_dispositions_select_for_update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (15 nodes): `test_investigation_report_pg.py`, `test_investigation_report_pg.py`, `setUpClass()`, `TestPhase8Step4ReportPersistence`, `.clean_db()`, `.run_with_db()`, `.seed_case_fixture()`, `.setUp()`, `.tearDown()`, `.test_step4_01_02_03_04_save_report_pg_persistence_and_orm_roundtrip()`, `.test_step4_05_06_repository_retrieval_pg_and_in_memory()`, `.test_step4_09_duplicate_report_type_upsert_semantics()`, `.test_step4_10_concurrent_report_persistence_safety()`, `.test_step4_11_invalid_case_foreign_key_rejected()`, `.test_step4_12_report_insertion_failure_rolls_back()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (14 nodes): `test_transaction_ingestion_pg.py`, `test_transaction_ingestion_pg.py`, `setUpClass()`, `TestPhase8Step3TransactionIngestion`, `.clean_db()`, `.run_with_db()`, `.setUp()`, `.tearDown()`, `.test_step3_01_02_03_04_http_ingestion_persists_in_pg()`, `.test_step3_05_06_foreign_key_referential_integrity()`, `.test_step3_07_08_atomic_ingestion_and_rollback_on_invalid_input()`, `.test_step3_09_failure_during_tx_creation_rolls_back_account()`, `.test_step3_10_failure_during_case_creation_rolls_back_everything()`, `.test_step3_11_12_duplicate_and_concurrent_ingestion_consistency()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (7 nodes): `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`, `ErrorBoundary.jsx`, `ErrorBoundary.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (4 nodes): `downgrade()`, `Customer Verifications Table for n8n VerifyFlow Integration  Revision ID: 005_`, `upgrade()`, `005_customer_verifications.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `RecoveryBar.jsx`, `RecoveryBar()`, `StatItem()`, `RecoveryBar.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `test_benchmark_regression.test.js`, `test_benchmark_regression.test.js`, `handleCustomInputAddedMock()`, `Program()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (3 nodes): `check_importance.py`, `make_tx()`, `check_importance.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (3 nodes): `ActionButton()`, `ActionButton.jsx`, `ActionButton.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (3 nodes): `AutomateModeToggle()`, `AutomateModeToggle.jsx`, `AutomateModeToggle.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `AutomationAuditDrawer()`, `AutomationAuditDrawer.jsx`, `AutomationAuditDrawer.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (3 nodes): `CaseCard()`, `CaseCard.jsx`, `CaseCard.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (3 nodes): `CenterFlow()`, `CenterFlow.jsx`, `CenterFlow.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (3 nodes): `FactorBreakdown()`, `FactorBreakdown.jsx`, `FactorBreakdown.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (3 nodes): `GoldenTimer.jsx`, `GoldenTimer()`, `GoldenTimer.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (3 nodes): `Login.jsx`, `Login()`, `Login.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (3 nodes): `RiskBadge.jsx`, `RiskBadge()`, `RiskBadge.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (3 nodes): `RiskScoreTrend.jsx`, `RiskScoreTrend()`, `RiskScoreTrend.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (3 nodes): `SystemStatusBar.jsx`, `SystemStatusBar.jsx`, `SystemStatusBar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (3 nodes): `syntheticGovernmentData.js`, `generateRealisticAmount()`, `getSyntheticTransaction()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (3 nodes): `AgentReportModal()`, `AgentReportModal.jsx`, `AgentReportModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (3 nodes): `EntityDetailModal()`, `EntityDetailModal.jsx`, `EntityDetailModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (3 nodes): `InvestigationBriefModal.jsx`, `InvestigationBriefModal()`, `InvestigationBriefModal.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (3 nodes): `Legend.jsx`, `Legend()`, `Legend.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (3 nodes): `TransactionDetailModal.jsx`, `TransactionDetailModal.jsx`, `TransactionDetailModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (3 nodes): `TransactionInspectorModal.jsx`, `TransactionInspectorModal.jsx`, `TransactionInspectorModal()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (3 nodes): `exportAuditLog()`, `exportAuditLog.js`, `exportAuditLog.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 89`** (1 nodes): `Fetch case record by case_id without pessimistic locking.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 90`** (1 nodes): `Fetch case record by case_id with a pessimistic row lock (SELECT FOR UPDATE).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 91`** (1 nodes): `Lookup existing disposition record by idempotency key.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 92`** (1 nodes): `Atomically executes:         1. Insertion of disposition record.         2. Ca`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 93`** (1 nodes): `Appends an immutable audit event record to the audit log repository.         Ex`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 94`** (1 nodes): `Retrieves complete chronological disposition and audit log history for a given c`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 95`** (1 nodes): `Saves or initializes a case entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 96`** (1 nodes): `Saves or updates an investigation report artifact associated with a case.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 97`** (1 nodes): `Fetch investigation report by case_id and report_type.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 98`** (1 nodes): `Fetch all investigation reports for a given case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 99`** (1 nodes): `Fetch account record by account_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 100`** (1 nodes): `Saves or updates an account entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 101`** (1 nodes): `Fetch transaction record by tx_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 102`** (1 nodes): `Saves a transaction entity.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 103`** (1 nodes): `Atomically executes in one database transaction:         1. Account creation/up`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 104`** (1 nodes): `Fetch all cases ordered by created_at descending.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 105`** (1 nodes): `Fetch recent transactions for WebSocket hydration.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 106`** (1 nodes): `Fetch all transactions for CSV export.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `Fetch all audit events/actions for CSV export.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `Saves or updates a durable InvestigationRun record.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `Fetch investigation run by run_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `Fetch active (RUNNING) investigation run for case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `Fetch most recent investigation run for case_id.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `Fetch all historical investigation runs for case_id ordered by started_at DESC.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `Finds active RUNNING investigations older than threshold and marks them FAILED/D`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `Fetch case with SELECT FOR UPDATE row lock to serialize concurrent operations ac`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `Commits current database transaction boundary.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `Rolls back current database transaction boundary.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `InMemoryCaseRepository` connect `Community 0` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 7`, `Community 8`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.209) - this node is a cross-community bridge._
- **Why does `PostgreSQLCaseRepository` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 14`, `Community 17`, `Community 22`, `Community 24`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `run_pipeline()` connect `Community 1` to `Community 4`, `Community 6`, `Community 9`, `Community 14`, `Community 27`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Are the 420 inferred relationships involving `InMemoryCaseRepository` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`InMemoryCaseRepository` has 420 INFERRED edges - model-reasoned connections that need verification._
- **Are the 317 inferred relationships involving `PostgreSQLCaseRepository` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`PostgreSQLCaseRepository` has 317 INFERRED edges - model-reasoned connections that need verification._
- **Are the 258 inferred relationships involving `Case` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`Case` has 258 INFERRED edges - model-reasoned connections that need verification._
- **Are the 258 inferred relationships involving `Transaction` (e.g. with `ConnectionManager` and `EvidenceRequest`) actually correct?**
  _`Transaction` has 258 INFERRED edges - model-reasoned connections that need verification._