import React, { useState, useEffect } from 'react';
import { 
  X, Shield, ShieldAlert, ShieldCheck, Activity, ArrowRight, CheckCircle2, 
  AlertTriangle, HelpCircle, RefreshCw, Send, Sparkles, Scale, BookOpen, 
  Layers, Check, Info, FileText, CornerDownRight, Lightbulb, MessageSquareQuote
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const AGENT_LABELS = {
  EVIDENCE: {
    name: 'Evidence Collection Agent',
    icon: ShieldCheck,
    color: 'emerald',
    badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
  },
  CONTEXTUAL: {
    name: 'Contextual Investigation Agent',
    icon: Layers,
    color: 'purple',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  },
  REGULATORY: {
    name: 'Regulatory Risk Assessment Agent',
    icon: Scale,
    color: 'amber',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  },
  AUDIT_EXPLANATION: {
    name: 'Audit Explanation Agent',
    icon: BookOpen,
    color: 'teal',
    badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/30'
  },
  DECISION_SUPPORT: {
    name: 'Analyst Decision Support Agent',
    icon: Shield,
    color: 'sky',
    badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30'
  }
};

const QUICK_CHALLENGES = [
  'Request alternative benign hypothesis for this activity.',
  'Challenge high confidence score based on transaction frequency.',
  'Query whether counterparty KYC status was factored in.',
  'Check if this aligns with legitimate merchant batch settlement.'
];

export const FindingChallengeModal = ({
  isOpen,
  onClose,
  finding,
  caseId,
  onChallengeComplete
}) => {
  const [challengeText, setChallengeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeResult, setChallengeResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => {
    if (isOpen) {
      setChallengeText('');
      setChallengeResult(null);
      setErrorMsg(null);
      setLoading(false);
    }
  }, [isOpen, finding]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !finding) return null;

  const targetStage = String(finding.stage || 'EVIDENCE').toUpperCase();
  const agentMeta = AGENT_LABELS[targetStage] || AGENT_LABELS.EVIDENCE;
  const AgentIcon = agentMeta.icon;

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = challengeText.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a challenge or question for the agent.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setChallengeResult(null);

    try {
      const payload = {
        case_id: caseId || 'CASE-LIVE-CURRENT',
        target_stage: targetStage,
        agent_finding_id: finding.id || 'FINDING-UNKNOWN',
        analyst_challenge_text: trimmed
      };

      const res = await fetch(`${API_BASE}/intelligence/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setChallengeResult(data);

      if (data.status === 'ready' && data.response) {
        onChallengeComplete?.({
          id: `INQ-${Date.now().toString(36).toUpperCase()}`,
          finding_id: finding.id || 'FINDING',
          finding_title: finding.title || finding.statement || finding.id,
          stage: targetStage,
          agent_name: agentMeta.name,
          analyst_question: trimmed,
          agent_response: data.response.agent_response,
          reassessment_status: data.response.reassessment_status,
          confidence_adjustment: data.response.confidence_adjustment,
          updated_confidence: data.response.updated_confidence,
          alternative_hypotheses: data.response.alternative_hypotheses || [],
          recommended_verification_steps: data.response.recommended_verification_steps || [],
          supporting_evidence: data.response.supporting_evidence || [],
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      setChallengeResult({
        status: 'unavailable',
        error_detail: err.message || 'Network error communicating with SENTINEL intelligence service.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getReassessmentStatusBadge = (status) => {
    const s = String(status || '').toUpperCase();
    switch (s) {
      case 'MAINTAINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Shield className="w-3 h-3 text-amber-400" />
            FINDING MAINTAINED
          </span>
        );
      case 'REFINED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Activity className="w-3 h-3 text-purple-400" />
            ASSESSMENT REFINED
          </span>
        );
      case 'CONCEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            CONCEDED / DE-ESCALATED
          </span>
        );
      case 'CLARIFIED':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/30 font-mono text-[10px] font-bold uppercase tracking-wider">
            <Info className="w-3 h-3 text-sky-400" />
            CONTEXT CLARIFIED
          </span>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenge-modal-title"
    >
      <div 
        className="w-full max-w-2xl bg-[#090F1C] border border-[#1E293B] rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#0B1426] border-b border-[#1E293B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={twMerge('w-7 h-7 rounded-lg flex items-center justify-center border', agentMeta.badgeClass)}>
              <AgentIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="challenge-modal-title" className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                  CHALLENGE AGENT FINDING
                </span>
                <span className={twMerge('px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase border', agentMeta.badgeClass)}>
                  {agentMeta.name}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Human-in-the-Loop Inquiry · Case: <span className="text-slate-200 font-bold">{caseId || 'CURRENT'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1E293B] transition-colors disabled:opacity-50 cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto select-text font-sans">
          
          {/* Target Finding Card */}
          <div className="p-4 rounded-xl border border-sky-500/25 bg-[#050B14] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 font-bold border border-sky-500/30">
                  {finding.id || 'FINDING'}
                </span>
                {finding.severity && (
                  <span className={twMerge(
                    "px-2 py-0.5 rounded font-bold uppercase border",
                    finding.severity === 'CRITICAL' ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                    finding.severity === 'HIGH' ? "bg-rose-500/15 text-rose-300 border-rose-500/30" :
                    finding.severity === 'MEDIUM' ? "bg-amber-500/15 text-amber-300 border-amber-500/30" :
                    "bg-slate-800 text-slate-300 border-slate-700"
                  )}>
                    {finding.severity}
                  </span>
                )}
                {finding.source && (
                  <span className="text-slate-400">
                    Source: <span className="text-slate-300 font-semibold">{finding.source}</span>
                  </span>
                )}
              </div>
              <span className="text-slate-500 uppercase tracking-wider text-[9px]">
                Deterministic Agent Finding
              </span>
            </div>

            <div className="text-xs text-slate-100 font-medium leading-relaxed">
              {finding.title || finding.statement || finding.description}
            </div>

            {finding.evidenceIds?.length > 0 && (
              <div className="pt-1.5 border-t border-[#1E293B]/70 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-slate-400">
                <span className="text-slate-500">Supporting Evidence:</span>
                {finding.evidenceIds.map(eid => (
                  <span key={eid} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-bold">
                    {eid}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Structured Challenge Response */}
          {challengeResult && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {challengeResult.status === 'ready' && challengeResult.response && (
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-[#05111B] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1E293B]">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="font-mono text-xs font-bold text-slate-100 uppercase tracking-wider">
                        AGENT REASSESSMENT RESPONSE
                      </span>
                    </div>
                    {getReassessmentStatusBadge(challengeResult.response.reassessment_status)}
                  </div>

                  {/* Confidence Adjustment */}
                  {challengeResult.response.confidence_adjustment !== undefined && challengeResult.response.confidence_adjustment !== null && (
                    <div className="flex flex-wrap items-center gap-3 p-2.5 rounded-lg bg-[#020710] border border-[#1E293B] font-mono text-[11px]">
                      <span className="text-slate-400">Confidence Adjustment:</span>
                      <span className={twMerge(
                        "font-bold",
                        challengeResult.response.confidence_adjustment < 0 ? "text-amber-400" :
                        challengeResult.response.confidence_adjustment > 0 ? "text-emerald-400" : "text-slate-300"
                      )}>
                        {challengeResult.response.confidence_adjustment > 0 ? `+${(challengeResult.response.confidence_adjustment * 100).toFixed(0)}%` : `${(challengeResult.response.confidence_adjustment * 100).toFixed(0)}%`}
                      </span>
                      {challengeResult.response.updated_confidence !== undefined && (
                        <span className="text-slate-400">
                          Updated Confidence: <span className="font-bold text-slate-200">{(challengeResult.response.updated_confidence * 100).toFixed(0)}%</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Agent Response Narrative */}
                  {challengeResult.response.agent_response && (
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Agent Reasoning / Explanation:
                      </span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans bg-[#020710] p-3 rounded-lg border border-[#1E293B]">
                        {challengeResult.response.agent_response}
                      </p>
                    </div>
                  )}

                  {/* Alternative Hypotheses */}
                  {challengeResult.response.alternative_hypotheses?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-mono text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                        Alternative Hypotheses Considered ({challengeResult.response.alternative_hypotheses.length})
                      </span>
                      <ul className="space-y-1 pl-1">
                        {challengeResult.response.alternative_hypotheses.map((hyp, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-purple-400 font-mono text-[10px] mt-0.5">●</span>
                            <span>{hyp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Verification Steps */}
                  {challengeResult.response.recommended_verification_steps?.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-mono text-[10px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                        <CornerDownRight className="w-3.5 h-3.5 text-sky-400" />
                        Recommended Analyst Verification Steps ({challengeResult.response.recommended_verification_steps.length})
                      </span>
                      <ul className="space-y-1 pl-1">
                        {challengeResult.response.recommended_verification_steps.map((step, idx) => (
                          <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-sky-400 font-mono text-[10px] mt-0.5">→</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Supporting Evidence Items */}
                  {challengeResult.response.supporting_evidence?.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-[#1E293B]">
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Corroborating Evidence Grounding:
                      </span>
                      <div className="space-y-1">
                        {challengeResult.response.supporting_evidence.map((ev, idx) => (
                          <div key={idx} className="p-2 rounded bg-[#020710] border border-[#1E293B] text-[11px] font-mono flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sky-400 font-bold">{ev.evidence_id}</span>
                              <span className="text-slate-300 font-sans">{ev.relevance}</span>
                            </div>
                            {ev.direction && (
                              <span className={twMerge(
                                "px-1.5 py-0.2 rounded text-[9px] font-bold uppercase",
                                ev.direction === 'supports' ? "bg-emerald-500/10 text-emerald-400" :
                                ev.direction === 'refutes' ? "bg-rose-500/10 text-rose-400" : "bg-slate-800 text-slate-400"
                              )}>
                                {ev.direction}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#1E293B] text-[10px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Collaborative inquiry logged for audit traceability.</span>
                    <span className="text-emerald-400 font-semibold">Human Decision Authority Preserved</span>
                  </div>
                </div>
              )}

              {/* Ollama Offline Graceful Degradation */}
              {challengeResult.status === 'unavailable' && (
                <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>LOCAL OLLAMA SERVICE OFFLINE — DETERMINISTIC FINDINGS AUTHORITATIVE</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    The advisory LLM intelligence layer is currently offline or unreachable. The deterministic 5-stage investigation outputs, evidence graph records, and policy rules remain 100% authoritative and intact. You can proceed with compliance disposition directly.
                  </p>
                  {challengeResult.error_detail && (
                    <div className="text-[10px] font-mono text-slate-500 pt-1">
                      Detail: {challengeResult.error_detail}
                    </div>
                  )}
                </div>
              )}

              {/* Errors / Not Found */}
              {['not_found', 'invalid_input', 'error'].includes(challengeResult.status) && (
                <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-1 font-mono text-xs text-rose-300">
                  <div className="flex items-center gap-2 font-bold text-rose-400">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>CHALLENGE REJECTED: {challengeResult.status.toUpperCase()}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans">
                    {challengeResult.error_detail || 'Unable to evaluate challenge against case data.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="analyst-challenge-input" className="font-mono text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>ANALYST QUESTION OR CHALLENGE RATIONALE:</span>
                <span className="text-slate-500 font-normal">Auditable Human Inquiry</span>
              </label>

              <textarea
                id="analyst-challenge-input"
                value={challengeText}
                onChange={(e) => {
                  setChallengeText(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                disabled={loading}
                rows={3}
                placeholder="Specify your inquiry, question, or counter-evidence (e.g., Verify if transaction volume could be seasonal invoice clearing, or explain why threshold rule CP-01 triggered)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#03060C] border border-[#1E293B] focus:border-sky-500 text-xs text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none transition-all"
              />

              {errorMsg && (
                <div className="text-[11px] font-mono text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Presets */}
            <div className="space-y-1">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                Quick Challenge Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHALLENGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setChallengeText(preset);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155]/60 text-slate-300 hover:text-slate-100 font-mono text-[10px] text-left transition-colors cursor-pointer disabled:opacity-50"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-3 font-mono">
              <span className="text-[10px] text-slate-500 hidden sm:inline">
                Read-only inquiry · Case status remains unchanged
              </span>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-[#1E293B] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !challengeText.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:bg-sky-950 disabled:text-slate-600 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>CONSULTING AGENT...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>SUBMIT INQUIRY</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};

export default FindingChallengeModal;
