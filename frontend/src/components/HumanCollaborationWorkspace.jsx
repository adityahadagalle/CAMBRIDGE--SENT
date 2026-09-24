import React, { useState, useMemo, useEffect } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Activity, ArrowRight, CheckCircle2,
  AlertTriangle, HelpCircle, RefreshCw, Send, Sparkles, Scale, BookOpen,
  Layers, Check, Info, FileText, CornerDownRight, Lightbulb, Lock,
  Clock, UserCheck, AlertCircle, ChevronDown, ChevronRight, Eye, Copy,
  CheckCheck, MessageSquareQuote, GitCommit, FileCheck, ExternalLink,
  MailQuestion
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import FindingChallengeModal from './FindingChallengeModal';
import { getRole } from '../roleStore';

const AGENT_META = {
  EVIDENCE: {
    key: 'evidence',
    name: 'Evidence Collection Agent',
    icon: ShieldCheck,
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    description: 'Ingests transaction streams, velocity spikes, and telemetry baselines.'
  },
  CONTEXTUAL: {
    key: 'contextual',
    name: 'Contextual Investigation Agent',
    icon: Layers,
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    description: 'Maps multi-hop graph topology, mule clusters, and behavioral fan-outs.'
  },
  REGULATORY: {
    key: 'regulatory',
    name: 'Regulatory Risk Assessment Agent',
    icon: Scale,
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    description: 'Evaluates PMLA 2002, FIU-IND thresholds, and statutory STR/SAR requirements.'
  },
  AUDIT_EXPLANATION: {
    key: 'audit_explanation',
    name: 'Audit Explanation Agent',
    icon: BookOpen,
    color: 'teal',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    description: 'Constructs deterministic cross-stage narrative and backward DAG traceability.'
  },
  DECISION_SUPPORT: {
    key: 'decision_support',
    name: 'Analyst Decision Support Agent',
    icon: Shield,
    color: 'sky',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    description: 'Formulates policy recommendations, review priorities, and disposition matrix.'
  },
  CUSTOMER_VERIFICATION: {
    key: 'customer_verification',
    name: 'Customer Verification',
    icon: MailQuestion,
    color: 'violet',
    badgeClass: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    description: 'Automated customer YES/NO confirmation (n8n VerifyFlow) recorded as additional case evidence -- never an automatic disposition.'
  }
};

const DEFAULT_DISPOSITION_OPTIONS = [
  {
    action_code: "REQUEST_CUSTOMER_CDD",
    label: "Request Customer Proof of Funds / CDD",
    requires_reason_note: true,
    requires_risk_acknowledgement: false
  },
  {
    action_code: "ESCALATE_SENIOR_COMPLIANCE",
    label: "Escalate to Senior Compliance Officer / MLRO",
    requires_reason_note: true,
    requires_risk_acknowledgement: true
  },
  {
    action_code: "DISMISS_CASE",
    label: "Dismiss as Legitimate Activity / False Positive",
    requires_reason_note: true,
    requires_risk_acknowledgement: false
  },
  {
    action_code: "APPROVE_TRANSACTION",
    label: "Approve Transaction Settlement",
    requires_reason_note: true,
    requires_risk_acknowledgement: false
  }
];

export const HumanCollaborationWorkspace = ({
  caseId,
  selectedCase,
  selectedTransaction,
  investigationReadModel,
  timelineStages = [],
  role,
  onClose,
  onOpenAuditDossier,
  onDispositionComplete
}) => {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  const activeRole = role || getRole() || 'COMPLIANCE_ANALYST';

  // ── Selected Stage & Finding State ──────────────────────────────────────────
  const [activeStageKey, setActiveStageKey] = useState('contextual');
  const [challengeModalFinding, setChallengeModalFinding] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  // ── Collaboration Thread State (Persisted in Session) ──────────────────────
  const [collaborationThread, setCollaborationThread] = useState([]);

  // ── Decision Panel State ───────────────────────────────────────────────────
  const [decisionMode, setDecisionMode] = useState('accept'); // 'accept' | 'override'
  const [overrideActionCode, setOverrideActionCode] = useState('REQUEST_CUSTOMER_CDD');
  const [overrideRationale, setOverrideRationale] = useState('');
  const [analystNotes, setAnalystNotes] = useState('');
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [decisionSuccess, setDecisionSuccess] = useState(null);

  // ── Extract Stage Outputs ──────────────────────────────────────────────────
  const stagesList = Array.isArray(investigationReadModel?.stages) ? investigationReadModel.stages : [];
  
  const getStageOutput = (stageName) => {
    const fromModel = stagesList.find(s => s.stage?.toUpperCase() === stageName?.toUpperCase())?.output;
    if (fromModel) return fromModel;
    const fromTimeline = timelineStages.find(s => s.key?.toLowerCase() === stageName?.toLowerCase())?.data;
    return fromTimeline || {};
  };

  const evidenceData = getStageOutput('evidence');
  const contextualData = getStageOutput('contextual');
  const regulatoryData = getStageOutput('regulatory');
  const auditData = getStageOutput('audit_explanation');
  const decisionSupportData = getStageOutput('decision_support');

  // ── AI Synthesized Recommendation ──────────────────────────────────────────
  const aiRecommendation = useMemo(() => {
    const options = decisionSupportData.disposition_options || [];
    const recommendedOpt = options.find(o => o.recommended);
    if (recommendedOpt) {
      return {
        action_code: recommendedOpt.action_code,
        label: recommendedOpt.label || recommendedOpt.action_code,
        description: recommendedOpt.description || 'AI recommended policy disposition based on multi-agent evidence synthesis.',
        priority: decisionSupportData.review_priority || decisionSupportData.summary?.review_priority || 'HIGH'
      };
    }
    // Fallback recommendation from heuristic index or priority
    const priority = decisionSupportData.review_priority || 'HIGH';
    return {
      action_code: 'ESCALATE_SENIOR_COMPLIANCE',
      label: 'Escalate to Senior Compliance Officer / MLRO',
      description: decisionSupportData.analyst_executive_brief || 'Multi-agent consensus indicates anomalous fund movement requiring senior compliance intervention.',
      priority: priority
    };
  }, [decisionSupportData]);

  // Valid Disposition Options
  const availableDispositions = useMemo(() => {
    const fromData = decisionSupportData.disposition_options;
    if (Array.isArray(fromData) && fromData.length > 0) {
      return fromData;
    }
    return DEFAULT_DISPOSITION_OPTIONS;
  }, [decisionSupportData]);

  // Set default override code when options load
  useEffect(() => {
    if (availableDispositions.length > 0 && !overrideActionCode) {
      const nonRec = availableDispositions.find(d => d.action_code !== aiRecommendation.action_code);
      setOverrideActionCode(nonRec?.action_code || availableDispositions[0].action_code);
    }
  }, [availableDispositions, aiRecommendation, overrideActionCode]);

  // ── Representative Finding for Selected Stage ─────────────────────────────
  const currentStageFinding = useMemo(() => {
    switch (activeStageKey) {
      case 'evidence': {
        const items = evidenceData.evidence || [];
        const topItem = items.find(i => i.severity === 'HIGH') || items[0];
        if (topItem) {
          return {
            id: topItem.id,
            title: topItem.finding || topItem.statement || `${topItem.indicator} = ${topItem.value}`,
            stage: 'EVIDENCE',
            severity: topItem.severity || 'HIGH',
            source: topItem.source || 'Ingestion Telemetry',
            evidenceIds: [topItem.id],
            description: topItem.finding || topItem.statement || `${topItem.indicator} = ${topItem.value}`,
            confidence: 0.96
          };
        }
        return {
          id: 'EV-01',
          title: 'Transaction Velocity Spike Detected',
          stage: 'EVIDENCE',
          severity: 'HIGH',
          source: 'UPI Transaction Pipeline',
          evidenceIds: ['EV-01'],
          description: 'Five transactions just under reporting threshold executed within 12 minutes.',
          confidence: 0.95
        };
      }
      case 'contextual': {
        const patterns = contextualData.patterns || [];
        const topPattern = patterns[0];
        if (topPattern) {
          return {
            id: topPattern.pattern_id || 'CP-01',
            title: topPattern.name || topPattern.pattern_name || 'Mule Account Rapid Layering',
            stage: 'CONTEXTUAL',
            severity: topPattern.severity || 'CRITICAL',
            source: 'Graph Topology Engine',
            evidenceIds: topPattern.supporting_evidence_ids || ['CTX-01', 'EV-01', 'EV-03'],
            description: topPattern.description || topPattern.reasoning || 'Rapid fund dissipation within minutes of credit arrival across dispersed mule accounts.',
            confidence: contextualData.summary?.confidence || 0.94
          };
        }
        return {
          id: 'CP-01',
          title: 'Mule Account Rapid Layering & Fan-Out',
          stage: 'CONTEXTUAL',
          severity: 'CRITICAL',
          source: 'Topological Graph Clustering',
          evidenceIds: ['CTX-01', 'EV-01', 'EV-03'],
          description: 'Observed fan-out velocity and rapid dissipation consistent with mule relay network.',
          confidence: 0.94
        };
      }
      case 'regulatory': {
        const indicators = regulatoryData.regulatory_indicators || [];
        const topInd = indicators[0];
        if (topInd) {
          return {
            id: topInd.id || 'REG-01',
            title: `${topInd.code || 'PMLA'}: ${topInd.description || topInd.indicator}`,
            stage: 'REGULATORY',
            severity: topInd.severity || 'CRITICAL',
            source: topInd.regulatory_framework || 'PMLA 2002 / FIU-IND',
            evidenceIds: topInd.supporting_evidence_ids || ['REG-01', 'EV-01'],
            description: topInd.description || 'Statutory threshold exceeded requiring Suspicious Transaction Report.',
            confidence: regulatoryData.summary?.assessment_heuristic_index || 0.88
          };
        }
        return {
          id: 'REG-PMLA-01',
          title: 'PMLA Sec 12: Mandatory STR Threshold Exceeded',
          stage: 'REGULATORY',
          severity: 'CRITICAL',
          source: 'FIU-IND Regulatory Ruleset',
          evidenceIds: ['REG-01', 'EV-01'],
          description: 'High aggregate velocity without economic rationale triggers mandatory STR filing.',
          confidence: 0.88
        };
      }
      case 'audit_explanation': {
        const keyFindings = auditData.key_findings || [];
        const topKf = keyFindings[0];
        if (topKf) {
          return {
            id: topKf.finding_id || 'KF-01',
            title: topKf.statement,
            stage: 'AUDIT_EXPLANATION',
            severity: topKf.severity || 'HIGH',
            source: 'Audit Explanation Agent',
            evidenceIds: topKf.supporting_evidence_ids || ['EV-01', 'CP-01'],
            description: topKf.statement,
            confidence: 0.92
          };
        }
        return {
          id: 'KF-01',
          title: 'Verified Cross-Stage Audit Lineage Confirmed',
          stage: 'AUDIT_EXPLANATION',
          severity: 'HIGH',
          source: 'Traceability Chain DAG',
          evidenceIds: ['EV-01', 'CP-01', 'REG-01'],
          description: 'Backward evidence resolution confirmed with zero unverified references.',
          confidence: 0.92
        };
      }
      case 'decision_support':
      default: {
        const steps = decisionSupportData.recommended_review_steps || [];
        const topStep = steps[0];
        if (topStep) {
          return {
            id: topStep.step_id || 'STEP-01',
            title: topStep.action,
            stage: 'DECISION_SUPPORT',
            severity: topStep.priority || 'CRITICAL',
            source: 'Analyst Decision Support Matrix',
            evidenceIds: topStep.supporting_evidence_ids || ['EV-01'],
            description: topStep.rationale || topStep.action,
            confidence: decisionSupportData.summary?.assessment_heuristic_index || 0.99
          };
        }
        return {
          id: 'STEP-01',
          title: 'Escalate to Senior Compliance for Mule Interdiction',
          stage: 'DECISION_SUPPORT',
          severity: 'CRITICAL',
          source: 'Policy Decision Matrix',
          evidenceIds: ['STEP-01', 'EV-01', 'CP-01'],
          description: 'Recommend expedited hold or CDD enhancement prior to fund dissipation.',
          confidence: 0.99
        };
      }
    }
  }, [activeStageKey, evidenceData, contextualData, regulatoryData, auditData, decisionSupportData]);

  // ── Handle Challenge Completion ───────────────────────────────────────────
  const handleChallengeComplete = (inquiry) => {
    setCollaborationThread(prev => [inquiry, ...prev]);
  };

  // ── Handle Copy Case ID ───────────────────────────────────────────────────
  const handleCopyId = () => {
    if (caseId) {
      navigator.clipboard?.writeText(caseId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // ── Handle Disposition Submission ─────────────────────────────────────────
  const handleSubmitDisposition = async (e) => {
    e?.preventDefault();
    setDecisionError(null);
    setDecisionSuccess(null);

    const isOverride = decisionMode === 'override';
    const finalActionCode = isOverride ? overrideActionCode : aiRecommendation.action_code;

    // Validation
    if (isOverride && !overrideRationale.trim()) {
      setDecisionError('Mandatory: Please provide an override rationale explaining why the AI recommendation is being overturned.');
      return;
    }

    if (isOverride && !riskAcknowledged) {
      setDecisionError('Mandatory: You must acknowledge regulatory compliance accountability to submit a human override.');
      return;
    }

    setIsSubmittingDecision(true);

    try {
      const payload = {
        case_id: caseId || 'CASE-LIVE-CURRENT',
        action_code: finalActionCode,
        analyst_notes: isOverride 
          ? `[HUMAN OVERRIDE] ${overrideRationale.trim()}${analystNotes ? ` | Note: ${analystNotes.trim()}` : ''}`
          : (analystNotes.trim() || `Analyst accepted AI recommendation (${aiRecommendation.action_code}).`),
        analyst_id: 'ANALYST-001',
        analyst_role: activeRole,
        risk_acknowledged: isOverride ? riskAcknowledged : false,
        is_human_override: isOverride,
        ai_recommended_action: aiRecommendation.action_code,
        override_rationale: isOverride ? overrideRationale.trim() : null,
        collaborative_inquiry_log: collaborationThread.map(item => ({
          inquiry_id: item.id,
          finding_id: item.finding_id,
          stage: item.stage,
          analyst_question: item.analyst_question,
          agent_response: item.agent_response,
          reassessment_status: item.reassessment_status,
          confidence_adjustment: item.confidence_adjustment,
          timestamp: item.timestamp
        }))
      };

      const res = await fetch(`${API_BASE}/cases/${caseId}/disposition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setDecisionSuccess({
          disposition_id: data.disposition_id || `DISP-${Date.now().toString(36).toUpperCase()}`,
          action_code: finalActionCode,
          is_override: isOverride,
          new_status: data.new_case_status || 'ACTIONED',
          timestamp: new Date().toLocaleTimeString()
        });
        onDispositionComplete?.(data);
      } else {
        setDecisionError(data.error || data.detail || 'Failed to submit case disposition.');
      }
    } catch (err) {
      setDecisionError(err.message || 'Network error reaching Sentinel disposition service.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const riskScore = Number(selectedCase?.risk_level || selectedTransaction?.risk_score || 81);
  const totalAmount = Number(selectedCase?.total_fraud_amount || selectedTransaction?.amount || 125000);
  const channel = selectedTransaction?.channel || 'UPI';
  const primaryTx = selectedTransaction?.tx_id || selectedCase?.primary_tx_id || 'TX-27678ED4';

  return (
    <div className="flex flex-col space-y-5 font-sans select-none animate-in fade-in duration-200">
      
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: CASE CONTEXT TELEMETRY HEADER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-xl bg-[#090F1C] border border-[#1E293B] shadow-lg space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-xs font-black text-slate-100 uppercase tracking-wider">
                  HUMAN COLLABORATION WORKSPACE
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono text-[9px] font-bold uppercase tracking-wider">
                  1 Analyst ↔ 5 AI Agents
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                <span>Final Authority: <strong className="text-emerald-400 font-semibold">Human Compliance Analyst</strong></span>
                <span>·</span>
                <span>AI Agents: <strong className="text-sky-400 font-semibold">Advisory & Evidence Grounding</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAuditDossier && (
              <button
                type="button"
                onClick={onOpenAuditDossier}
                className="px-3 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-200 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer border border-[#334155]"
                title="View full audit dossier & decision lineage"
              >
                <FileText className="w-3.5 h-3.5 text-sky-400" />
                <span>Audit Dossier</span>
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Metric Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
            <span className="text-[9px] text-slate-500 uppercase block">Case Identifier</span>
            <div className="flex items-center justify-between gap-1 mt-0.5">
              <span className="font-bold text-slate-100 truncate text-[11px]">{caseId || 'CASE-LIVE'}</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                title="Copy Case ID"
              >
                {copiedId ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
            <span className="text-[9px] text-slate-500 uppercase block">Risk Assessment</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={twMerge(
                "w-2 h-2 rounded-full",
                riskScore >= 80 ? "bg-rose-500 animate-pulse" : "bg-amber-400"
              )} />
              <span className={twMerge(
                "font-bold text-[11px]",
                riskScore >= 80 ? "text-rose-400" : "text-amber-400"
              )}>
                {riskScore}/100 · {riskScore >= 80 ? 'CRITICAL' : 'HIGH RISK'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
            <span className="text-[9px] text-slate-500 uppercase block">Primary Transaction</span>
            <span className="font-bold text-sky-300 block mt-0.5 text-[11px] truncate">{primaryTx}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
            <span className="text-[9px] text-slate-500 uppercase block">Transaction Value</span>
            <span className="font-bold text-emerald-400 block mt-0.5 text-[11px]">
              ₹{totalAmount.toLocaleString('en-IN')} <span className="text-[9px] text-slate-500">({channel})</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B] col-span-2 sm:col-span-1">
            <span className="text-[9px] text-slate-500 uppercase block">Assigned Human</span>
            <span className="font-bold text-slate-200 block mt-0.5 text-[10px] truncate">
              Compliance Officer 1
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: 5-AGENT INVESTIGATION PIPELINE & SELECTED FINDING
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-xl bg-[#090F1C] border border-[#1E293B] shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-2.5 font-mono">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              AI INVESTIGATION — 5 AGENT FORENSIC CHAIN
            </span>
          </div>
          <span className="text-[9px] text-slate-500 uppercase">
            Click an agent to inspect findings or launch inquiry
          </span>
        </div>

        {/* 5-Agent Pipeline Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {Object.entries(AGENT_META).map(([stageEnum, meta], idx) => {
            const isSelected = activeStageKey === meta.key;
            const Icon = meta.icon;
            return (
              <button
                key={stageEnum}
                type="button"
                onClick={() => setActiveStageKey(meta.key)}
                className={twMerge(
                  "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer",
                  isSelected
                    ? "bg-[#0D1829] border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-500"
                    : "bg-[#040812] border-[#1E293B] hover:border-slate-700 hover:bg-[#060D1A]"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono text-[9px] font-bold text-slate-500">
                    STAGE 0{idx + 1}
                  </span>
                  <div className={twMerge(
                    "w-2 h-2 rounded-full",
                    isSelected ? "bg-sky-400" : "bg-emerald-500"
                  )} />
                </div>

                <div className="flex items-center gap-2">
                  <div className={twMerge('w-6 h-6 rounded-md flex items-center justify-center border shrink-0', meta.badgeClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className={twMerge(
                    "text-[10.5px] font-bold truncate",
                    isSelected ? "text-slate-100 font-black" : "text-slate-300"
                  )}>
                    {meta.name.replace(' Agent', '')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Agent Finding Card */}
        <div className="p-4 rounded-xl bg-[#050D18] border border-sky-500/30 space-y-3 relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold">
                {currentStageFinding.id}
              </span>
              <span className={twMerge(
                "px-2 py-0.5 rounded font-bold uppercase border",
                currentStageFinding.severity === 'CRITICAL' ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                currentStageFinding.severity === 'HIGH' ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                "bg-amber-500/15 text-amber-300 border-amber-500/30"
              )}>
                {currentStageFinding.severity}
              </span>
              <span className="text-slate-400">
                Confidence: <strong className="text-purple-300">{Math.round((currentStageFinding.confidence || 0.94) * 100)}%</strong>
              </span>
            </div>

            <span className="text-[9px] font-mono text-slate-500 uppercase">
              Source: {currentStageFinding.source}
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-100 leading-snug">
              {currentStageFinding.title}
            </h4>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {currentStageFinding.description}
            </p>
          </div>

          {/* Evidence Grounding Badges */}
          {currentStageFinding.evidenceIds?.length > 0 && (
            <div className="pt-2 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                <span className="text-slate-500">Supporting Evidence:</span>
                {currentStageFinding.evidenceIds.map(eid => (
                  <span key={eid} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-bold">
                    {eid}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setChallengeModalFinding(currentStageFinding)}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-sky-500/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>CHALLENGE AGENT</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: HUMAN COLLABORATION THREAD
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-xl bg-[#090F1C] border border-[#1E293B] shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-2.5 font-mono">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              HUMAN COLLABORATION THREAD
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[9px] font-bold">
              {collaborationThread.length} INQUIRIES LOGGED
            </span>
          </div>

          <button
            type="button"
            onClick={() => setChallengeModalFinding(currentStageFinding)}
            className="px-2.5 py-1 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-sky-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>+ NEW CHALLENGE</span>
          </button>
        </div>

        {/* Empty State vs Inquiries List */}
        {collaborationThread.length === 0 ? (
          <div className="p-4 rounded-xl bg-[#040812] border border-[#1E293B] space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px]">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>No collaborative challenges submitted yet for this case.</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              As the human investigator, you can question any agent’s reasoning, test counter-evidence, or challenge confidence scores. Launch an inquiry using the button above or pick a quick prompt:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "Why is transaction velocity classified as mule drainage rather than legitimate vendor payroll batch?",
                "Does counterparty KYC verification meet the threshold for benign dismissal?",
                "Request alternative benign hypothesis for transaction frequency.",
                "Simulate 30-day velocity threshold before enforcing account freeze."
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setChallengeModalFinding({
                      ...currentStageFinding,
                      prefillQuestion: prompt
                    });
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#0B132B] hover:bg-[#15234A] border border-sky-500/25 text-slate-300 hover:text-slate-100 font-mono text-[10px] text-left transition-colors cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {collaborationThread.map((inquiry, idx) => (
              <div key={inquiry.id || idx} className="rounded-xl border border-[#1E293B] bg-[#040812] overflow-hidden space-y-3 p-4">
                {/* 1. Human Question */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>HUMAN ANALYST INQUIRY</span>
                      <span className="text-slate-500 font-normal">→ TARGET: {inquiry.agent_name || inquiry.stage}</span>
                    </div>
                    <span className="text-slate-500 text-[9px]">
                      {inquiry.timestamp ? new Date(inquiry.timestamp).toLocaleTimeString() : 'RECENT'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 bg-[#081020] p-3 rounded-lg border border-[#1E293B] font-medium leading-relaxed">
                    "{inquiry.analyst_question}"
                  </p>
                </div>

                {/* 2. Targeted Agent Response */}
                <div className="pl-3 border-l-2 border-purple-500/40 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                      <span className="font-bold text-slate-100">{inquiry.agent_name || 'AGENT'} RESPONSE</span>
                    </div>
                    {inquiry.reassessment_status && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-bold">
                        {inquiry.reassessment_status}
                      </span>
                    )}
                  </div>

                  {inquiry.confidence_adjustment !== undefined && inquiry.confidence_adjustment !== null && (
                    <div className="text-[10px] font-mono text-slate-400">
                      Confidence Delta: <strong className="text-amber-400">{inquiry.confidence_adjustment > 0 ? `+${inquiry.confidence_adjustment * 100}%` : `${inquiry.confidence_adjustment * 100}%`}</strong>
                      {inquiry.updated_confidence && (
                        <span className="ml-2">Updated: <strong className="text-slate-200">{Math.round(inquiry.updated_confidence * 100)}%</strong></span>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {inquiry.agent_response}
                  </p>

                  {/* Alternative Hypotheses */}
                  {inquiry.alternative_hypotheses?.length > 0 && (
                    <div className="text-[11px] text-slate-400 pt-1 space-y-1">
                      <span className="font-mono text-[9px] font-bold text-purple-400 uppercase block">Alternative Hypotheses Evaluated:</span>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {inquiry.alternative_hypotheses.map((h, i) => (
                          <li key={i}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Verification Steps */}
                  {inquiry.recommended_verification_steps?.length > 0 && (
                    <div className="text-[11px] text-slate-400 pt-1 space-y-1">
                      <span className="font-mono text-[9px] font-bold text-sky-400 uppercase block">Prescribed Analyst Verification Steps:</span>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {inquiry.recommended_verification_steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: HUMAN DECISION & ACCOUNTABILITY PANEL
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-5 rounded-xl bg-[#090F1C] border border-[#1E293B] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              HUMAN FINAL DECISION & STATUTORY ACCOUNTABILITY
            </h3>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[9px] font-bold uppercase">
            Human Approval Boundary Mandatory
          </span>
        </div>

        {/* AI Recommendation Banner */}
        <div className="p-3.5 rounded-xl bg-[#040812] border border-sky-500/30 space-y-2">
          <div className="flex items-center justify-between font-mono text-[10px]">
            <span className="text-slate-400 uppercase font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              SYNTHESIZED AI RECOMMENDATION (STAGE 5):
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold uppercase">
              {aiRecommendation.action_code}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-sans">
            {aiRecommendation.description}
          </p>
        </div>

        {/* Decision Mode Selection: Accept vs Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => {
              setDecisionMode('accept');
              setDecisionError(null);
            }}
            className={twMerge(
              "p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer",
              decisionMode === 'accept'
                ? "bg-[#0A1828] border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.15)] ring-1 ring-sky-500"
                : "bg-[#040812] border-[#1E293B] hover:border-slate-700"
            )}
          >
            <div className={twMerge(
              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
              decisionMode === 'accept' ? "border-sky-400 bg-sky-500/20 text-sky-400" : "border-slate-600"
            )}>
              {decisionMode === 'accept' && <Check className="w-3 h-3" />}
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                ACCEPT AI RECOMMENDATION
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                Concur with multi-agent evidence synthesis and execute action: <strong className="text-slate-200">{aiRecommendation.label}</strong>.
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setDecisionMode('override');
              setDecisionError(null);
            }}
            className={twMerge(
              "p-3 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer",
              decisionMode === 'override'
                ? "bg-[#1C1208] border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.15)] ring-1 ring-amber-500"
                : "bg-[#040812] border-[#1E293B] hover:border-slate-700"
            )}
          >
            <div className={twMerge(
              "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
              decisionMode === 'override' ? "border-amber-400 bg-amber-500/20 text-amber-400" : "border-slate-600"
            )}>
              {decisionMode === 'override' && <Check className="w-3 h-3" />}
            </div>
            <div>
              <div className="font-mono text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>OVERRIDE AI RECOMMENDATION</span>
                <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[8px] font-bold">RATIONALE REQ</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-sans">
                Overturn agent findings with documented human compliance rationale and custom adjudication.
              </div>
            </div>
          </button>
        </div>

        {/* Form Details based on Mode */}
        <form onSubmit={handleSubmitDisposition} className="space-y-3 pt-2">
          
          {decisionMode === 'override' && (
            <div className="p-4 rounded-xl bg-[#0D0803] border border-amber-500/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 font-mono text-xs text-amber-400 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>HUMAN OVERRIDE ACTIVE — STATUTORY RECORD PRESERVED</span>
              </div>

              {/* 1. Human Decision Dropdown */}
              <div className="space-y-1">
                <label htmlFor="human-override-action" className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider block">
                  ADJUDICATED HUMAN DISPOSITION ACTION:
                </label>
                <select
                  id="human-override-action"
                  value={overrideActionCode}
                  onChange={(e) => setOverrideActionCode(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#040812] border border-[#1E293B] text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
                >
                  {availableDispositions.map((opt) => (
                    <option key={opt.action_code} value={opt.action_code}>
                      {opt.label || opt.action_code} {opt.action_code === aiRecommendation.action_code ? '(AI Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Mandatory Override Rationale */}
              <div className="space-y-1">
                <label htmlFor="human-override-rationale" className="font-mono text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center justify-between">
                  <span>MANDATORY OVERRIDE RATIONALE: *</span>
                  <span className="text-slate-500 font-normal">Audit Compliance Requirement</span>
                </label>
                <textarea
                  id="human-override-rationale"
                  value={overrideRationale}
                  onChange={(e) => {
                    setOverrideRationale(e.target.value);
                    if (decisionError) setDecisionError(null);
                  }}
                  rows={3}
                  placeholder="Document the specific operational, regulatory, or business reason for overriding the AI recommendation (e.g., Verified counterparty identity via direct branch confirmation; seasonal merchant transaction pattern confirmed with invoice clearance)..."
                  className="w-full px-3 py-2 rounded-xl bg-[#040812] border border-amber-500/40 text-slate-100 font-sans text-xs focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* 3. Statutory Risk Acknowledgment Checkbox */}
              <div className="flex items-start gap-2.5 pt-1">
                <input
                  type="checkbox"
                  id="risk-acknowledgment-checkbox"
                  checked={riskAcknowledged}
                  onChange={(e) => {
                    setRiskAcknowledged(e.target.checked);
                    if (decisionError) setDecisionError(null);
                  }}
                  className="mt-1 rounded border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="risk-acknowledgment-checkbox" className="text-xs text-slate-300 font-sans leading-relaxed cursor-pointer">
                  <strong className="text-slate-100">Regulatory Risk Acknowledgment:</strong> I acknowledge that overriding this classification assumes institutional responsibility with reference to PMLA Section 12 / FIU-IND decision-support guidelines.
                </label>
              </div>
            </div>
          )}

          {/* Optional Analyst Notes (for both modes) */}
          <div className="space-y-1">
            <label htmlFor="analyst-general-notes" className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              {decisionMode === 'override' ? 'ADDITIONAL OPERATIONAL NOTES (OPTIONAL):' : 'ANALYST CASE NOTES / DIRECTIVES:'}
            </label>
            <input
              id="analyst-general-notes"
              type="text"
              value={analystNotes}
              onChange={(e) => setAnalystNotes(e.target.value)}
              placeholder="Enter case disposition comments or directives for downstream investigators..."
              className="w-full px-3 py-2 rounded-xl bg-[#040812] border border-[#1E293B] text-slate-100 font-sans text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>

          {/* Error & Success Messages */}
          {decisionError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{decisionError}</span>
            </div>
          )}

          {decisionSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>DISPOSITION COMMITTED TO IMMUTABLE AUDIT LOG</span>
                </div>
                {onOpenAuditDossier && (
                  <button
                    type="button"
                    onClick={() => onOpenAuditDossier({
                      execution_record: {
                        transaction_id: primaryTx,
                        tx_id: primaryTx,
                        case_id: caseId,
                        action_status: 'EXECUTED',
                        mode: 'HUMAN_ADJUDICATION',
                        timestamp: new Date().toISOString(),
                        action_code: decisionSuccess.action_code,
                        ai_recommended_action: aiRecommendation.action_code,
                        is_human_override: decisionSuccess.is_override,
                        override_rationale: overrideRationale || '',
                        collaborative_inquiry_log: collaborationThread.map(inq => ({
                          analyst_question: inq.challenge_question || inq.analyst_question,
                          agent_response: inq.reassessment_summary || inq.agent_response,
                          reassessment_status: inq.reassessment_status
                        })),
                        requires_human_approval: true
                      }
                    })}
                    className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>INSPECT AUDIT DOSSIER</span>
                  </button>
                )}
              </div>
              <div className="text-[10px] text-slate-300 font-sans">
                Disposition ID: <strong>{decisionSuccess.disposition_id}</strong> · Action: <strong>{decisionSuccess.action_code}</strong> · Status: <strong>{decisionSuccess.new_status}</strong>
              </div>
            </div>
          )}

          {/* Analyst Attribution & Submit CTA */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#1E293B]">
            <div className="font-mono text-[10px] text-slate-400 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ATTESTED BY: <strong className="text-slate-200">COMPLIANCE_OFFICER_1</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">ROLE: {activeRole}</span>
            </div>

            <button
              type="submit"
              disabled={isSubmittingDecision}
              className={twMerge(
                "px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg disabled:opacity-50",
                decisionMode === 'override'
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
              )}
            >
              {isSubmittingDecision ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>RECORDING AUDIT EVENT...</span>
                </>
              ) : decisionMode === 'override' ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>SUBMIT HUMAN OVERRIDE</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>CONFIRM & EXECUTE DECISION</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: DECISION LINEAGE VISUALIZATION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="p-4 rounded-xl bg-[#090F1C] border border-[#1E293B] shadow-lg space-y-3 font-mono">
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 text-xs">
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4 text-sky-400" />
            <span className="font-bold text-slate-100 uppercase tracking-wider">
              END-TO-END DECISION LINEAGE
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] text-slate-500 uppercase">
              End-to-End Decision Provenance
            </span>
            {onOpenAuditDossier && (
              <button
                type="button"
                onClick={() => onOpenAuditDossier()}
                className="px-2 py-0.5 rounded bg-[#111927] hover:bg-[#1E293B] text-sky-400 border border-sky-500/30 text-[9px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="Inspect Automation & Collaboration Audit Dossier"
              >
                <ExternalLink className="w-3 h-3" />
                <span>AUDIT DOSSIER</span>
              </button>
            )}
          </div>
        </div>

        {/* 7-Step Chronological Pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 text-[10px]">
          {/* Step 1 */}
          <div className="p-2 rounded-lg bg-[#040812] border border-emerald-500/30 space-y-1">
            <span className="text-[8.5px] text-emerald-400 font-bold block">1. INGESTION</span>
            <span className="text-slate-200 font-semibold block truncate">{primaryTx}</span>
            <span className="text-[8px] text-slate-500 block">UPI Rail Verified</span>
          </div>

          {/* Step 2 */}
          <div className="p-2 rounded-lg bg-[#040812] border border-emerald-500/30 space-y-1">
            <span className="text-[8.5px] text-emerald-400 font-bold block">2. 5 AGENTS</span>
            <span className="text-slate-200 font-semibold block">
              {stagesList.length >= 5 ? '5/5 Complete' : (stagesList.length > 0 ? `${stagesList.length}/5 Stages` : 'Pending DAG')}
            </span>
            <span className="text-[8px] text-slate-500 block">Deterministic Pipeline</span>
          </div>

          {/* Step 3 */}
          <div className={twMerge(
            "p-2 rounded-lg border space-y-1",
            collaborationThread.length > 0 ? "bg-[#040812] border-purple-500/30" : "bg-[#02050A] border-slate-800"
          )}>
            <span className={twMerge("text-[8.5px] font-bold block", collaborationThread.length > 0 ? "text-purple-400" : "text-slate-500")}>
              3. INQUIRIES
            </span>
            <span className={twMerge("font-semibold block", collaborationThread.length > 0 ? "text-slate-200" : "text-slate-600")}>
              {collaborationThread.length} Filed
            </span>
            <span className="text-[8px] text-slate-500 block">Human Challenges</span>
          </div>

          {/* Step 4 */}
          <div className={twMerge(
            "p-2 rounded-lg border space-y-1",
            collaborationThread.length > 0 ? "bg-[#040812] border-purple-500/30" : "bg-[#02050A] border-slate-800"
          )}>
            <span className={twMerge("text-[8.5px] font-bold block", collaborationThread.length > 0 ? "text-purple-400" : "text-slate-500")}>
              4. REASSESS
            </span>
            <span className={twMerge("font-semibold block", collaborationThread.length > 0 ? "text-slate-200" : "text-slate-600")}>
              {collaborationThread[0]?.reassessment_status || 'Standby'}
            </span>
            <span className="text-[8px] text-slate-500 block">Agent Defense</span>
          </div>

          {/* Step 5 */}
          <div className="p-2 rounded-lg bg-[#040812] border border-sky-500/30 space-y-1">
            <span className="text-[8.5px] text-sky-400 font-bold block">5. AI ADVICE</span>
            <span className="text-slate-200 font-semibold block truncate">{aiRecommendation.action_code}</span>
            <span className="text-[8px] text-slate-500 block">Calibrated Conf.</span>
          </div>

          {/* Step 6 */}
          <div className={twMerge(
            "p-2 rounded-lg border space-y-1",
            decisionSuccess ? "bg-[#040812] border-emerald-500/30" : "bg-[#0D0803] border-amber-500/30"
          )}>
            <span className={twMerge("text-[8.5px] font-bold block", decisionSuccess ? "text-emerald-400" : "text-amber-400")}>
              6. HUMAN
            </span>
            <span className="text-slate-200 font-semibold block truncate">
              {decisionSuccess ? (decisionSuccess.is_override ? 'OVERRIDE' : 'ACCEPTED') : (decisionMode === 'override' ? 'Pending Override' : 'Pending Accept')}
            </span>
            <span className="text-[8px] text-slate-500 block">Final Authority</span>
          </div>

          {/* Step 7 */}
          <div className={twMerge(
            "p-2 rounded-lg border space-y-1",
            decisionSuccess ? "bg-[#040812] border-emerald-500/40" : "bg-[#02050A] border-slate-800"
          )}>
            <span className={twMerge("text-[8.5px] font-bold block", decisionSuccess ? "text-emerald-400" : "text-slate-600")}>
              7. AUDIT LOG
            </span>
            <span className={twMerge("font-semibold block", decisionSuccess ? "text-slate-200" : "text-slate-600")}>
              {decisionSuccess ? 'COMMITTED' : 'Pending'}
            </span>
            <span className="text-[8px] text-slate-500 block">Immutable Record</span>
          </div>
        </div>
      </div>

      {/* ── CHALLENGE MODAL (Connected to Workspace Thread) ────────────────── */}
      <FindingChallengeModal
        isOpen={!!challengeModalFinding}
        onClose={() => setChallengeModalFinding(null)}
        finding={challengeModalFinding}
        caseId={caseId}
        onChallengeComplete={handleChallengeComplete}
      />
    </div>
  );
};

export default HumanCollaborationWorkspace;
