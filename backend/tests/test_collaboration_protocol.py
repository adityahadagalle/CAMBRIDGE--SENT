"""
SENTINEL — Human Collaboration Protocol Test Suite (Phase 1)

Verifies:
  1. OllamaService challenge evaluation & schema normalization (mocked).
  2. POST /intelligence/challenge endpoint behaviors:
     - Successful collaborative challenge against verified agent finding.
     - Unavailable Ollama handling (non-blocking).
     - Missing case handling (not_found).
     - Invalid target stage handling (invalid_input).
     - Non-existent finding handling (not_found).
     - State non-mutation: challenges never alter cases, accounts, or policy state.
  3. Case Lifecycle Agent human override protocol:
     - Non-empty override rationale requirement when is_human_override=True.
     - Traceability chain persistence of human override metadata and inquiry log.
     - Full backward compatibility when is_human_override is omitted or False.
"""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, patch
import urllib.error

import pytest
from fastapi.testclient import TestClient

from app.services.ollama_service import (
    OllamaService,
    ChallengeResponse,
    ChallengeResult,
    SupportingEvidenceItem,
    OLLAMA_MODEL,
)
from app.core.data_store import data_store
import main as app_module


# ── MOCK DATA FIXTURES ────────────────────────────────────────────────────────

VALID_CHALLENGE_DICT = {
    "finding_id": "EV-STRUCT-01",
    "stage": "EVIDENCE",
    "reassessment_status": "REFINED",
    "agent_response": "Upon re-evaluating the transaction cadence with the analyst's observation, the structuring pattern is refined from rapid layering to intermittent batch aggregation.",
    "confidence_adjustment": -0.15,
    "updated_confidence": 0.72,
    "alternative_hypotheses": [
        "Legitimate merchant payroll distribution batch",
        "Multiple independent family remittances"
    ],
    "recommended_verification_steps": [
        "Request source-of-funds documentation for sender account",
        "Verify beneficiary employment records"
    ],
    "supporting_evidence": [
        {"evidence_id": "EV-STRUCT-01", "description": "3 transactions under 50k INR within 48h"}
    ]
}

VALID_CHALLENGE_JSON = json.dumps(VALID_CHALLENGE_DICT)

OLLAMA_CHALLENGE_ENVELOPE = json.dumps({
    "model": OLLAMA_MODEL,
    "message": {"role": "assistant", "content": VALID_CHALLENGE_JSON},
    "done": True,
})


# ── TEST GROUP 1: OllamaService Unit Tests ────────────────────────────────────

class TestOllamaServiceChallengeUnit:

    def test_challenge_success_mocked(self):
        service = OllamaService()
        mock_raw = OLLAMA_CHALLENGE_ENVELOPE

        with patch.object(service, "is_available", return_value=True), \
             patch.object(service, "_call_chat", return_value=mock_raw):
            result = service.challenge_agent_finding(
                case_id="CASE-COL-001",
                target_stage="EVIDENCE",
                agent_finding_id="EV-STRUCT-01",
                analyst_challenge_text="The client claims these transactions are payroll batches. Can we verify this?",
                investigation_context={"risk_score": 75, "risk_level": "HIGH"},
                finding_details={"id": "EV-STRUCT-01", "finding": "Rapid structuring detected"}
            )

        assert result.status == "ready"
        assert result.provider == "ollama"
        assert result.case_id == "CASE-COL-001"
        assert result.target_stage == "EVIDENCE"
        assert result.agent_finding_id == "EV-STRUCT-01"
        assert result.actor == "AI_INVESTIGATION_AGENT"
        assert result.purpose == "ANALYST_CHALLENGE_COLLABORATION"
        assert result.response is not None
        assert result.response.reassessment_status == "REFINED"
        assert result.response.confidence_adjustment == -0.15
        assert result.response.updated_confidence == 0.72
        assert len(result.response.alternative_hypotheses) == 2
        assert len(result.response.supporting_evidence) == 1
        assert result.response.supporting_evidence[0].evidence_id == "EV-STRUCT-01"

    def test_challenge_empty_text_returns_invalid_input(self):
        service = OllamaService()
        result = service.challenge_agent_finding(
            case_id="CASE-COL-001",
            target_stage="EVIDENCE",
            agent_finding_id="EV-STRUCT-01",
            analyst_challenge_text="   ",
            investigation_context={},
        )
        assert result.status == "invalid_input"
        assert "empty" in (result.error_detail or "").lower()

    def test_challenge_ollama_unavailable(self):
        service = OllamaService()
        with patch.object(service, "is_available", return_value=False):
            result = service.challenge_agent_finding(
                case_id="CASE-COL-001",
                target_stage="EVIDENCE",
                agent_finding_id="EV-STRUCT-01",
                analyst_challenge_text="Show evidence for this finding.",
                investigation_context={},
            )
        assert result.status == "unavailable"
        assert "not reachable" in (result.error_detail or "")

    def test_challenge_timeout(self):
        service = OllamaService()
        with patch.object(service, "is_available", return_value=True), \
             patch.object(service, "_call_chat", side_effect=TimeoutError()):
            result = service.challenge_agent_finding(
                case_id="CASE-COL-001",
                target_stage="EVIDENCE",
                agent_finding_id="EV-STRUCT-01",
                analyst_challenge_text="Explain this finding.",
                investigation_context={},
            )
        assert result.status == "timeout"
        assert "did not respond" in (result.error_detail or "")

    def test_challenge_malformed_json_returns_error(self):
        service = OllamaService()
        malformed = json.dumps({
            "model": OLLAMA_MODEL,
            "message": {"role": "assistant", "content": "Here is what I think: NOT JSON AT ALL"},
            "done": True,
        })
        with patch.object(service, "is_available", return_value=True), \
             patch.object(service, "_call_chat", return_value=malformed):
            result = service.challenge_agent_finding(
                case_id="CASE-COL-001",
                target_stage="EVIDENCE",
                agent_finding_id="EV-STRUCT-01",
                analyst_challenge_text="Explain this finding.",
                investigation_context={},
            )
        assert result.status == "error"
        assert "not valid JSON" in (result.error_detail or "")


# ── TEST GROUP 2: POST /intelligence/challenge API Tests ─────────────────────

class TestChallengeApiEndpoint:

    @pytest.fixture(autouse=True)
    def setup_test_case(self):
        # Seed test case and evidence report into data_store
        case_id = "CASE-COLLAB-API-01"
        data_store.setdefault("cases", {})[case_id] = {
            "case_id": case_id,
            "status": "INVESTIGATING",
            "risk_level": "HIGH",
            "risk_score": 85.0,
            "primary_tx_id": "TX-COLLAB-01",
            "topology_type": "MULE_RING",
            "actions_taken": [],
        }
        data_store.setdefault("transactions", {})["TX-COLLAB-01"] = {
            "tx_id": "TX-COLLAB-01",
            "case_id": case_id,
            "amount": 95000.0,
            "channel": "IMPS",
            "risk_score": 85.0,
        }
        data_store.setdefault("investigation_reports", {})[f"{case_id}::EVIDENCE"] = {
            "case_id": case_id,
            "report_type": "EVIDENCE",
            "report_data": {
                "evidence": [
                    {
                        "id": "EV-STRUCT-01",
                        "finding": "Rapid structuring across 3 hops",
                        "severity": "HIGH",
                        "category": "Velocity",
                    }
                ],
                "summary": {"total_evidence_items": 1, "high_severity_items": 1}
            }
        }
        yield case_id
        # Cleanup
        data_store.get("cases", {}).pop(case_id, None)
        data_store.get("transactions", {}).pop("TX-COLLAB-01", None)
        data_store.get("investigation_reports", {}).pop(f"{case_id}::EVIDENCE", None)

    def test_challenge_endpoint_success(self, setup_test_case):
        case_id = setup_test_case
        client = TestClient(app_module.app, raise_server_exceptions=False)

        def mock_challenge(case_id, target_stage, agent_finding_id, analyst_challenge_text, investigation_context, finding_details=None):
            return ChallengeResult(
                status="ready",
                case_id=case_id,
                target_stage=target_stage,
                agent_finding_id=agent_finding_id,
                response=ChallengeResponse(**VALID_CHALLENGE_DICT),
            )

        with patch("app.routes.intelligence.ollama_service.challenge_agent_finding", side_effect=mock_challenge):
            resp = client.post(
                "/intelligence/challenge",
                json={
                    "case_id": case_id,
                    "target_stage": "EVIDENCE",
                    "agent_finding_id": "EV-STRUCT-01",
                    "analyst_challenge_text": "Is this pattern justified by evidence?",
                }
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"
        assert data["case_id"] == case_id
        assert data["target_stage"] == "EVIDENCE"
        assert data["agent_finding_id"] == "EV-STRUCT-01"
        assert data["response"]["reassessment_status"] == "REFINED"
        assert data["actor"] == "AI_INVESTIGATION_AGENT"

    def test_challenge_nonexistent_case(self):
        client = TestClient(app_module.app, raise_server_exceptions=False)
        resp = client.post(
            "/intelligence/challenge",
            json={
                "case_id": "CASE-DOES-NOT-EXIST-999",
                "target_stage": "EVIDENCE",
                "agent_finding_id": "EV-001",
                "analyst_challenge_text": "Challenge question.",
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "not_found"
        assert "not found" in data["error_detail"]

    def test_challenge_invalid_stage(self, setup_test_case):
        case_id = setup_test_case
        client = TestClient(app_module.app, raise_server_exceptions=False)
        resp = client.post(
            "/intelligence/challenge",
            json={
                "case_id": case_id,
                "target_stage": "NON_EXISTENT_STAGE",
                "agent_finding_id": "EV-STRUCT-01",
                "analyst_challenge_text": "Challenge question.",
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "invalid_input"
        assert "Invalid target_stage" in data["error_detail"]

    def test_challenge_nonexistent_finding(self, setup_test_case):
        case_id = setup_test_case
        client = TestClient(app_module.app, raise_server_exceptions=False)
        resp = client.post(
            "/intelligence/challenge",
            json={
                "case_id": case_id,
                "target_stage": "EVIDENCE",
                "agent_finding_id": "EV-DOES-NOT-EXIST",
                "analyst_challenge_text": "Challenge question.",
            }
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "not_found"
        assert "not found" in data["error_detail"]

    def test_challenge_state_non_mutation(self, setup_test_case):
        case_id = setup_test_case
        client = TestClient(app_module.app, raise_server_exceptions=False)

        # Snapshot case state before challenge
        case_before = dict(data_store["cases"][case_id])
        actions_count_before = len(case_before.get("actions_taken", []))

        def mock_challenge(*args, **kwargs):
            return ChallengeResult(
                status="ready",
                case_id=case_id,
                target_stage="EVIDENCE",
                agent_finding_id="EV-STRUCT-01",
                response=ChallengeResponse(**VALID_CHALLENGE_DICT),
            )

        with patch("app.routes.intelligence.ollama_service.challenge_agent_finding", side_effect=mock_challenge):
            resp = client.post(
                "/intelligence/challenge",
                json={
                    "case_id": case_id,
                    "target_stage": "EVIDENCE",
                    "agent_finding_id": "EV-STRUCT-01",
                    "analyst_challenge_text": "Can we confirm this structuring hypothesis?",
                }
            )

        assert resp.status_code == 200
        case_after = data_store["cases"][case_id]
        # Verify strict state immutability
        assert case_after["status"] == case_before["status"]
        assert case_after["risk_score"] == case_before["risk_score"]
        assert case_after["risk_level"] == case_before["risk_level"]
        assert len(case_after.get("actions_taken", [])) == actions_count_before


# ── TEST GROUP 3: Human Override & Collaboration in Disposition ───────────────

class TestHumanOverrideProtocol:

    @pytest.fixture
    def decision_support_fixture(self):
        return {
            "found": True,
            "status": "SUCCESS",
            "case_id": "CASE-OVR-001",
            "primary_tx_id": "TX-OVR-001",
            "summary": {
                "review_priority": "P2_ELEVATED",
                "regulatory_severity": "MEDIUM",
                "assessment_heuristic_index": 65.0
            },
            "disposition_options": [
                {
                    "action_code": "REQUEST_CUSTOMER_CDD",
                    "label": "Request Additional Information / CDD",
                    "recommended": True,
                    "description": "Seek KYC confirmation from account holder.",
                    "requires_reason_note": True,
                    "requires_risk_acknowledgement": False,
                },
                {
                    "action_code": "DISMISS_CASE",
                    "label": "Dismiss Case / False Positive",
                    "recommended": False,
                    "description": "Legitimate business transactions confirmed.",
                    "requires_reason_note": True,
                    "requires_risk_acknowledgement": True,
                },
                {
                    "action_code": "ESCALATE_SENIOR_COMPLIANCE",
                    "label": "Escalate to Senior Compliance",
                    "recommended": False,
                    "description": "High probability structuring pattern.",
                    "requires_reason_note": True,
                    "requires_risk_acknowledgement": True,
                }
            ],
            "recommended_review_steps": [
                {
                    "step_id": "STP-01",
                    "action": "Verify client payroll records",
                    "supporting_regulatory_ids": ["REG-AML-01"],
                    "supporting_context_finding_ids": ["CTX-01"],
                    "supporting_context_pattern_ids": ["PAT-01"],
                    "supporting_evidence_ids": ["EV-01"]
                }
            ]
        }

    def test_human_override_with_valid_rationale(self, decision_support_fixture):
        from app.services.case_lifecycle_agent import submit_case_disposition

        store = {
            "cases": {
                "CASE-OVR-001": {
                    "case_id": "CASE-OVR-001",
                    "status": "UNDER_REVIEW",
                    "primary_tx_id": "TX-OVR-001",
                }
            },
            "dispositions": {},
            "audit_log": []
        }

        inquiry_log = [
            {
                "target_stage": "CONTEXTUAL",
                "agent_finding_id": "CTX-01",
                "analyst_challenge": "Is there proof of mule association?",
                "agent_reassessment": "CONCEDED",
                "confidence_adjustment": -0.2
            }
        ]

        # Analyst overrides AI recommendation (REQUEST_CUSTOMER_CDD) to DISMISS_CASE
        res = submit_case_disposition(
            case_id="CASE-OVR-001",
            action_code="DISMISS_CASE",
            analyst_notes="Analyst determined funds correspond to verified salary dispersal.",
            decision_support_report=decision_support_fixture,
            analyst_id="ANALYST-SENIOR-01",
            analyst_role="SENIOR_COMPLIANCE_OFFICER",
            risk_acknowledged=True,
            is_human_override=True,
            ai_recommended_action="REQUEST_CUSTOMER_CDD",
            override_rationale="Verified corporate tax filings and payroll records refute the automated structuring suspicion.",
            collaborative_inquiry_log=inquiry_log,
            store=store,
        )

        assert res["ok"] is True
        assert res["status"] == "SUCCESS"
        assert res["new_case_status"] == "RESOLVED_DISMISSED"

        # Verify audit event contains complete human override metadata
        audit = res["audit_entry"]
        assert audit is not None
        traceability = audit["traceability_chain"]
        assert "human_override" in traceability
        assert traceability["human_override"]["is_override"] is True
        assert traceability["human_override"]["ai_recommended_action"] == "REQUEST_CUSTOMER_CDD"
        assert "refute the automated structuring suspicion" in traceability["human_override"]["override_rationale"]
        assert len(traceability["collaborative_inquiry_log"]) == 1
        assert traceability["collaborative_inquiry_log"][0]["agent_reassessment"] == "CONCEDED"

        # Verify disposition record contains override flag
        disp = res["disposition"]
        assert disp["is_human_override"] is True
        assert disp["override_rationale"] is not None

    def test_human_override_rejected_when_rationale_empty(self, decision_support_fixture):
        from app.services.case_lifecycle_agent import submit_case_disposition

        store = {
            "cases": {
                "CASE-OVR-001": {
                    "case_id": "CASE-OVR-001",
                    "status": "UNDER_REVIEW",
                    "primary_tx_id": "TX-OVR-001",
                }
            }
        }

        # Override declared but empty rationale provided
        res = submit_case_disposition(
            case_id="CASE-OVR-001",
            action_code="DISMISS_CASE",
            analyst_notes="Dismissing case.",
            decision_support_report=decision_support_fixture,
            analyst_role="COMPLIANCE_ANALYST",
            risk_acknowledged=True,
            is_human_override=True,
            override_rationale="   ",  # Blank
            store=store,
        )

        assert res["ok"] is False
        assert res["status"] == "INVALID_INPUT"
        assert "Human override requires a non-empty override_rationale" in res["error"]

    def test_standard_disposition_backward_compatibility(self, decision_support_fixture):
        from app.services.case_lifecycle_agent import submit_case_disposition

        store = {
            "cases": {
                "CASE-OVR-001": {
                    "case_id": "CASE-OVR-001",
                    "status": "UNDER_REVIEW",
                    "primary_tx_id": "TX-OVR-001",
                }
            }
        }

        # Standard disposition without human override arguments
        res = submit_case_disposition(
            case_id="CASE-OVR-001",
            action_code="REQUEST_CUSTOMER_CDD",
            analyst_notes="Proceeding with AI recommended request for info.",
            decision_support_report=decision_support_fixture,
            store=store,
        )

        assert res["ok"] is True
        assert res["status"] == "SUCCESS"
        assert res["new_case_status"] == "CDD_PENDING"
        audit = res["audit_entry"]
        assert audit["traceability_chain"]["human_override"]["is_override"] is False
        assert audit["traceability_chain"]["human_override"]["override_rationale"] is None
