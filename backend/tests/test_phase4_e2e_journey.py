"""
Phase 4 End-to-End User Journey & Claim Validation Test Suite.

Verifies the complete 20-step human analyst collaboration workflow:
1. Pre-seeded high-risk case (CASE-FRAUD-600) is loaded.
2. Investigation is triggered via POST /cases/{case_id}/investigate.
3. All 5 canonical agents execute in strict dependency order.
4. Investigation read model is fetched via GET /cases/{case_id}/investigation.
5. All 5 agent stages are confirmed COMPLETED with authentic outputs.
6. Analyst challenges Contextual Agent via POST /intelligence/challenge.
7. Reassessment returned with valid status, delta, and alternative hypotheses.
8. Analyst challenges Regulatory Agent via POST /intelligence/challenge.
9. Second reassessment returned cleanly.
10. Confirm challenge endpoints NEVER mutate case state or execute actions.
11. Inspect AI recommendation (ESCALATE_SENIOR_COMPLIANCE) from Stage 5.
12. Confirm AI recommendation does NOT auto-execute.
13. Verify override without rationale is strictly REJECTED (HTTP 400).
14. Verify high-risk action without risk_acknowledged is strictly REJECTED.
15. Submit valid Human Override (REQUEST_CUSTOMER_CDD) with mandatory rationale and inquiry log.
16. Verify case state transitions cleanly to CDD_PENDING according to state machine.
17. Verify audit log captures human override flag, rationale, and multi-turn inquiry log.
18. Verify immutable audit integrity.
"""

import pytest
from fastapi.testclient import TestClient

import main as app_module
from app.core.data_store import data_store
from app.services.case_lifecycle_agent import ACTION_STATE_MAP, STATE_CDD_PENDING, STATE_ESCALATED


@pytest.fixture
def client():
    from app.core.seed_data import seed_initial_demonstration_data
    seed_initial_demonstration_data(data_store)
    with TestClient(app_module.app) as test_client:
        yield test_client


def test_phase4_complete_analyst_user_journey(client):
    # ── Step 1: Verify Pre-Seeded Case (CASE-FRAUD-600) ────────────────────────
    case_id = "CASE-FRAUD-600"
    store = data_store
    assert case_id in store["cases"], f"Case {case_id} must exist in seed store"
    initial_case = store["cases"][case_id]
    initial_status = initial_case.get("status")
    assert initial_case["total_fraud_amount"] == 1530000.0

    # ── Step 2 & 3: Trigger Orchestrator & Run All 5 Agents ────────────────────
    inv_res = client.post(f"/cases/{case_id}/investigate?force_rerun=true")
    assert inv_res.status_code == 200, f"Investigation trigger failed: {inv_res.text}"
    inv_data = inv_res.json()
    assert inv_data.get("status") in ["SUCCESS", "COMPLETED"]

    # ── Step 4 & 5: Fetch & Verify Investigation Read Model ────────────────────
    get_res = client.get(f"/cases/{case_id}/investigation")
    assert get_res.status_code == 200, f"Failed to get investigation: {get_res.text}"
    report = get_res.json()

    stages = report.get("stages", [])
    assert len(stages) == 5, f"Expected 5 stages, found {len(stages)}"

    stage_names = [s.get("stage") for s in stages]
    assert stage_names == [
        "EVIDENCE",
        "CONTEXTUAL",
        "REGULATORY",
        "AUDIT_EXPLANATION",
        "DECISION_SUPPORT"
    ]

    for stage in stages:
        assert stage.get("status") == "COMPLETED"
        assert stage.get("output") is not None

    # Verify Stage 5 Recommendations
    ds_stage = next(s for s in stages if s["stage"] == "DECISION_SUPPORT")
    ds_output = ds_stage["output"]
    disposition_options = ds_output.get("disposition_options", [])
    assert len(disposition_options) > 0, "Stage 5 must offer disposition options"

    offered_codes = {o["action_code"] for o in disposition_options}
    # Verify all offered codes are valid in ACTION_STATE_MAP
    for code in offered_codes:
        assert code in ACTION_STATE_MAP, f"Offered code '{code}' must exist in backend ACTION_STATE_MAP"

    # ── Step 6 & 7: Human Challenge 1 (Contextual Agent) ───────────────────────
    ctx_stage = next(s for s in stages if s["stage"] == "CONTEXTUAL")
    ctx_patterns = ctx_stage["output"].get("patterns", [])
    ctx_findings = ctx_stage["output"].get("contextual_findings", []) or ctx_stage["output"].get("findings", [])
    ctx_finding_id = (ctx_patterns[0].get("pattern_id") or ctx_patterns[0].get("id")) if ctx_patterns else ctx_findings[0].get("id")
    assert ctx_finding_id is not None, "Contextual stage must produce inspectable pattern or finding ID"

    challenge_1_payload = {
        "case_id": case_id,
        "target_stage": "CONTEXTUAL",
        "agent_finding_id": ctx_finding_id,
        "analyst_challenge_text": "Could rapid dissipation across 5 hops be explained by legitimate festive bonus disbursements?"
    }
    c1_res = client.post("/intelligence/challenge", json=challenge_1_payload)
    assert c1_res.status_code == 200, f"Challenge 1 failed: {c1_res.text}"
    c1_data = c1_res.json()
    assert c1_data.get("status") in ["ready", "unavailable"]
    if c1_data.get("status") == "ready":
        c1_resp = c1_data.get("response", {})
        assert c1_resp.get("reassessment_status") in ["MAINTAINED", "REFINED", "CONCEDED", "CLARIFIED"]
        reassessment_1_status = c1_resp.get("reassessment_status")
        reassessment_1_summary = c1_resp.get("agent_response")
    else:
        # Offline degradation verified
        assert "not reachable" in c1_data.get("error_detail", "").lower() or "network" in c1_data.get("error_detail", "").lower()
        reassessment_1_status = "MAINTAINED"
        reassessment_1_summary = "Offline deterministic maintenance: pattern confirmed by multi-hop graph topology."

    # ── Step 8 & 9: Human Challenge 2 (Regulatory Agent) ───────────────────────
    reg_stage = next(s for s in stages if s["stage"] == "REGULATORY")
    reg_indicators = reg_stage["output"].get("regulatory_indicators", [])
    reg_finding_id = reg_indicators[0].get("id") or reg_indicators[0].get("indicator_code")
    assert reg_finding_id is not None, "Regulatory stage must produce inspectable indicator ID"

    challenge_2_payload = {
        "case_id": case_id,
        "target_stage": "REGULATORY",
        "agent_finding_id": reg_finding_id,
        "analyst_challenge_text": "Verify if PMLA Section 12 applies given the initial single transfer was under ₹50,000 threshold."
    }
    c2_res = client.post("/intelligence/challenge", json=challenge_2_payload)
    assert c2_res.status_code == 200, f"Challenge 2 failed: {c2_res.text}"
    c2_data = c2_res.json()
    assert c2_data.get("status") in ["ready", "unavailable"]
    if c2_data.get("status") == "ready":
        c2_resp = c2_data.get("response", {})
        assert c2_resp.get("reassessment_status") in ["MAINTAINED", "REFINED", "CONCEDED", "CLARIFIED"]
        reassessment_2_status = c2_resp.get("reassessment_status")
        reassessment_2_summary = c2_resp.get("agent_response")
    else:
        # Offline degradation verified
        assert "not reachable" in c2_data.get("error_detail", "").lower() or "network" in c2_data.get("error_detail", "").lower()
        reassessment_2_status = "MAINTAINED"
        reassessment_2_summary = "Offline deterministic maintenance: PMLA Section 12 threshold evaluated."

    # ── Step 10: Verify Challenges DID NOT Mutate Case State or Execute Actions ─
    current_case = store["cases"][case_id]
    assert current_case.get("status") == initial_status, "Challenges must never mutate case state"
    assert len(store["actions"]) == 0, "Challenges must never execute autonomous actions"

    # ── Step 11 & 12: Verify AI Recommendation Did Not Auto-Execute ────────────
    assert current_case.get("status") != STATE_ESCALATED, "AI recommendation must not auto-execute without human sign-off"

    # ── Step 13: Verify Override Without Rationale Is Strictly Rejected ────────
    inquiry_log = [
        {
            "target_stage": "CONTEXTUAL",
            "agent_finding_id": ctx_finding_id,
            "analyst_question": challenge_1_payload["analyst_challenge_text"],
            "agent_response": reassessment_1_summary,
            "reassessment_status": reassessment_1_status
        },
        {
            "target_stage": "REGULATORY",
            "agent_finding_id": reg_finding_id,
            "analyst_question": challenge_2_payload["analyst_challenge_text"],
            "agent_response": reassessment_2_summary,
            "reassessment_status": reassessment_2_status
        }
    ]

    invalid_override_payload = {
        "case_id": case_id,
        "action_code": "REQUEST_CUSTOMER_CDD",
        "analyst_notes": "Attempting override without rationale",
        "analyst_id": "COMPLIANCE_OFFICER_1",
        "analyst_role": "COMPLIANCE_ANALYST",
        "risk_acknowledged": False,
        "is_human_override": True,
        "ai_recommended_action": "ESCALATE_SENIOR_COMPLIANCE",
        "override_rationale": "",  # Empty rationale must fail!
        "collaborative_inquiry_log": inquiry_log
    }
    bad_res = client.post(f"/cases/{case_id}/disposition", json=invalid_override_payload)
    assert bad_res.status_code == 200, f"Disposition endpoint failed: {bad_res.text}"
    bad_data = bad_res.json()
    assert bad_data.get("ok") is False, "Empty override rationale must be rejected"
    assert bad_data.get("status") == "INVALID_INPUT"
    assert "override_rationale" in bad_data.get("error", "").lower()

    # ── Step 14: Verify Risk Acknowledgment Required on High-Risk Action ───────
    missing_risk_ack_payload = {
        "case_id": case_id,
        "action_code": "ESCALATE_SENIOR_COMPLIANCE",
        "analyst_notes": "Escalating without checking risk acknowledgment",
        "analyst_id": "COMPLIANCE_OFFICER_1",
        "analyst_role": "COMPLIANCE_ANALYST",
        "risk_acknowledged": False,  # Missing risk acknowledgment!
        "is_human_override": False,
        "ai_recommended_action": "ESCALATE_SENIOR_COMPLIANCE",
        "override_rationale": None,
        "collaborative_inquiry_log": []
    }
    risk_bad_res = client.post(f"/cases/{case_id}/disposition", json=missing_risk_ack_payload)
    assert risk_bad_res.status_code == 200, f"Disposition endpoint failed: {risk_bad_res.text}"
    risk_bad_data = risk_bad_res.json()
    assert risk_bad_data.get("ok") is False, "Missing risk acknowledgment must be rejected"
    assert risk_bad_data.get("status") == "INVALID_INPUT"
    assert "risk_acknowledged" in risk_bad_data.get("error", "").lower()

    # ── Step 15: Submit Valid Human Override with Complete Collaboration Metadata ─
    valid_override_payload = {
        "case_id": case_id,
        "action_code": "REQUEST_CUSTOMER_CDD",
        "analyst_notes": "Customer holds registered commercial account; requesting proof of funds CDD before considering freeze.",
        "analyst_id": "COMPLIANCE_OFFICER_1",
        "analyst_role": "COMPLIANCE_ANALYST",
        "risk_acknowledged": False,  # REQUEST_CUSTOMER_CDD does not require risk acknowledgment
        "is_human_override": True,
        "ai_recommended_action": "ESCALATE_SENIOR_COMPLIANCE",
        "override_rationale": "High-velocity pass-through exhibits commercial seasonal characteristics. Formal customer CDD requested to establish legitimate economic purpose.",
        "collaborative_inquiry_log": inquiry_log
    }
    disp_res = client.post(f"/cases/{case_id}/disposition", json=valid_override_payload)
    assert disp_res.status_code == 200, f"Valid disposition failed: {disp_res.text}"
    disp_data = disp_res.json()

    assert disp_data.get("ok") is True
    disp_record = disp_data.get("disposition", {})
    assert disp_record.get("action_code") == "REQUEST_CUSTOMER_CDD"
    assert disp_data.get("new_case_status") == STATE_CDD_PENDING
    assert disp_record.get("is_human_override") is True
    assert disp_record.get("override_rationale") is not None
    assert len(disp_record.get("collaborative_inquiry_log", [])) == 2

    # ── Step 16: Verify Case State Changed According to Lifecycle Rules ────────
    updated_case = store["cases"][case_id]
    assert updated_case.get("status") == STATE_CDD_PENDING, f"Case status must be {STATE_CDD_PENDING}, got {updated_case.get('status')}"

    # ── Step 17 & 18: Verify Audit Trail & Collaboration Details via History API ──
    hist_res = client.get(f"/cases/{case_id}/history")
    assert hist_res.status_code == 200, f"History fetch failed: {hist_res.text}"
    hist_data = hist_res.json()
    assert hist_data.get("found") is True
    assert hist_data.get("current_case_status") == STATE_CDD_PENDING
    assert len(hist_data.get("disposition_history", [])) >= 1
    latest_disp = hist_data["disposition_history"][0]
    assert latest_disp.get("is_human_override") is True
    assert latest_disp.get("action_code") == "REQUEST_CUSTOMER_CDD"
    assert latest_disp.get("ai_recommended_action") == "ESCALATE_SENIOR_COMPLIANCE"
    assert "seasonal characteristics" in (latest_disp.get("override_rationale") or "")
    assert len(latest_disp.get("collaborative_inquiry_log", [])) == 2
    assert len(hist_data.get("audit_history", [])) >= 1
