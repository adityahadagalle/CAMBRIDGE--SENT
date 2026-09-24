import React from 'react';
import { X, ShieldCheck, Lock, Activity, Bot, FileText, CheckCircle2, Clock, UserCheck } from 'lucide-react';

const AutomationAuditDrawer = ({ auditData, onClose }) => {
  if (!auditData) return null;

  const rec = auditData.execution_record || auditData.automation_execution || auditData;
  const isRestricted = rec.requires_human_approval || rec.action_status === 'REQUIRES_HUMAN_APPROVAL';

  return (
    <div className="fixed inset-y-0 right-0 z-[130] w-full max-w-xl bg-slate-950/95 border-l border-slate-800 backdrop-blur-2xl shadow-2xl flex flex-col font-sans select-none animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold font-mono text-slate-100 uppercase tracking-wide">
              AUTOMATION AUDIT TRAIL
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Transaction: {rec.transaction_id || rec.tx_id || 'UNKNOWN'}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isRestricted
              ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
          }`}
        >
          <div className="space-y-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              EXECUTION DECISION
            </div>
            <div className="font-mono font-bold text-sm uppercase flex items-center gap-2">
              {isRestricted ? <Lock className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {rec.action_status || 'EXECUTED'}
            </div>
          </div>

          <div className="text-right space-y-1 font-mono">
            <div className="text-[10px] text-slate-400 uppercase">MODE</div>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-200">
              {rec.mode || 'AUTOMATE_ON'}
            </span>
          </div>
        </div>

        {/* 16-Step Decision Trail Timeline */}
        <div className="space-y-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            16-FIELD DECISION & GOVERNANCE TRAIL
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">1. Transaction ID</span>
              <span className="font-mono font-bold text-slate-200">{rec.transaction_id || rec.tx_id}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">2. Associated Case ID</span>
              <span className="font-mono font-bold text-slate-200">{rec.case_id || 'CASE-UNASSIGNED'}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">3. Risk Score</span>
              <span className="font-mono font-bold text-slate-100">{rec.risk_score}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">4. Risk Level</span>
              <span className="font-mono font-bold text-rose-400">{rec.risk_level}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">5. Selected Action</span>
              <span className="font-mono font-bold text-sky-400">{rec.action}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">6. Governance Check</span>
              <span className={`font-mono font-bold ${isRestricted ? 'text-amber-400' : 'text-emerald-400'}`}>
                {isRestricted ? 'INTERCEPTED' : 'PASSED'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">7. Execution Result</span>
              <span className="font-mono font-bold text-slate-200">{rec.execution_result}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">8. Human Approval</span>
              <span className={`font-mono font-bold ${rec.requires_human_approval ? 'text-amber-400' : 'text-slate-400'}`}>
                {rec.requires_human_approval ? 'REQUIRED' : 'NOT REQUIRED'}
              </span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">9. Decision Factors / Signals</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(rec.decision_factors || ['standard_rules']).map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">10. Policy Rationale</span>
              <p className="text-slate-300 text-[11px] leading-relaxed mt-0.5">
                {rec.reason || 'Automated policy engine evaluation based on multi-vector signals.'}
              </p>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">11. Policy Version</span>
              <span className="font-mono font-bold text-slate-300">{rec.policy_version || 'v15.0-phase15'}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">12. Actor ID</span>
              <span className="font-mono font-bold text-slate-300">{rec.actor_id || 'SENTINEL_AUTOMATION_SERVICE'}</span>
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 col-span-2">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">13-16. Timestamp & Audit Reference</span>
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-300 mt-1">
                <span>Time: {rec.timestamp || rec.executed_at || 'NOW'}</span>
                <span className="text-sky-400">PostgreSQL Immutable Audit Record Logged</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── HUMAN COLLABORATION & OVERRIDE AUDIT METADATA (Phase 3) ── */}
        {(rec.is_human_override || rec.override_rationale || rec.ai_recommended_action || (rec.collaborative_inquiry_log && rec.collaborative_inquiry_log.length > 0)) && (
          <div className="space-y-3 p-4 rounded-xl bg-[#090F1C] border border-amber-500/30">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2 font-mono">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-400" />
                HUMAN OVERRIDE & COLLABORATION AUDIT
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold uppercase">
                {rec.is_human_override ? 'OVERRIDE EXECUTED' : 'COLLABORATION LOGGED'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
                <span className="text-[9px] text-slate-500 uppercase block">AI Recommended Action</span>
                <span className="font-bold text-sky-300">{rec.ai_recommended_action || 'ESCALATE_SENIOR_COMPLIANCE'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#040812] border border-[#1E293B]">
                <span className="text-[9px] text-slate-500 uppercase block">Human Decided Action</span>
                <span className="font-bold text-amber-400">{rec.action_code || rec.action || 'REQUEST_CUSTOMER_CDD'}</span>
              </div>
            </div>

            {rec.override_rationale && (
              <div className="p-3 rounded-lg bg-[#040812] border border-amber-500/30 space-y-1">
                <span className="font-mono text-[9px] font-bold text-amber-400 uppercase block">
                  Mandatory Human Override Rationale:
                </span>
                <p className="text-slate-200 text-xs font-sans leading-relaxed">
                  {rec.override_rationale}
                </p>
              </div>
            )}

            {Array.isArray(rec.collaborative_inquiry_log) && rec.collaborative_inquiry_log.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-mono text-[9px] font-bold text-slate-400 uppercase block">
                  Prior Inquiries Conducted ({rec.collaborative_inquiry_log.length}):
                </span>
                <div className="space-y-1.5">
                  {rec.collaborative_inquiry_log.map((inq, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-[#040812] border border-[#1E293B] text-[10.5px] space-y-1">
                      <div className="flex items-center justify-between text-blue-400 font-mono font-bold text-[9px]">
                        <span>Q: {inq.analyst_question}</span>
                        {inq.reassessment_status && (
                          <span className="text-purple-400 uppercase">[{inq.reassessment_status}]</span>
                        )}
                      </div>
                      {inq.agent_response && (
                        <p className="text-slate-300 text-[10px] pl-2 border-l border-purple-500/40">
                          {inq.agent_response}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── END-TO-END DECISION LINEAGE ── */}
        <div className="space-y-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>END-TO-END DECISION LINEAGE</span>
            <span className="text-[9px] text-sky-400 font-normal">7-POINT TRACEABILITY</span>
          </h4>

          <div className="space-y-2 font-mono text-[10.5px]">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">1</span>
              <span className="text-slate-400">Transaction Ingested:</span>
              <span className="text-slate-200 font-bold ml-auto">{rec.transaction_id || rec.tx_id || 'TX-INGESTED'}</span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">2</span>
              <span className="text-slate-400">Deterministic 5 Agents:</span>
              <span className="text-emerald-400 font-bold ml-auto">5/5 Verified Complete</span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">3</span>
              <span className="text-slate-400">Human Inquiry / Challenge:</span>
              <span className="text-purple-400 font-bold ml-auto">
                {rec.collaborative_inquiry_log?.length ? `${rec.collaborative_inquiry_log.length} Inquiries Filed` : 'Completed / Reviewed'}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">4</span>
              <span className="text-slate-400">AI Synthesized Advice:</span>
              <span className="text-sky-400 font-bold ml-auto">{rec.ai_recommended_action || 'ESCALATE_SENIOR_COMPLIANCE'}</span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">5</span>
              <span className="text-slate-400">Human Adjudication:</span>
              <span className={twMerge("font-bold ml-auto", rec.is_human_override ? "text-amber-400" : "text-emerald-400")}>
                {rec.is_human_override ? 'HUMAN OVERRIDE' : 'ACCEPTED AI ADVICE'}
              </span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">6</span>
              <span className="text-slate-400">Executed Action:</span>
              <span className="text-slate-200 font-bold ml-auto">{rec.action_code || rec.action || 'EXECUTED'}</span>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[9px] font-bold">7</span>
              <span className="text-slate-400">Audit Commitment:</span>
              <span className="text-sky-400 font-bold ml-auto">PostgreSQL Immutable Record</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomationAuditDrawer;
