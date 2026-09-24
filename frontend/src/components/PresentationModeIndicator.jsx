import React from 'react';
import { X, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { usePresentationMode } from '../hooks/usePresentationMode';

/**
 * Non-intrusive floating indicator pill displayed when Presentation Mode is active.
 * Shows active evaluation mode and enables seamless single-click switching.
 */
const PresentationModeIndicator = () => {
  const { isPresentationMode, evaluationMode, setEvaluationMode } = usePresentationMode();

  if (!isPresentationMode || !evaluationMode) return null;

  const isEval1 = evaluationMode === 'evaluation1';

  return (
    <div
      id="presentation-mode-indicator"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-blue-500/40 text-slate-200 text-[11px] font-mono font-bold shadow-2xl shadow-black/80 backdrop-blur-md select-none animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isEval1 ? 'bg-blue-400' : 'bg-purple-400'}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${isEval1 ? 'bg-blue-500' : 'bg-purple-500'}`} />
      </span>

      <div className="flex items-center gap-1.5">
        <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isEval1 ? 'text-blue-400' : 'text-purple-400'}`} />
        <span className="tracking-wide text-slate-100">
          {isEval1 ? 'EVALUATION 1: OPERATIONAL INVESTIGATION' : 'EVALUATION 2: ML & BENCHMARK'}
        </span>
      </div>

      <div className="flex items-center gap-1 pl-2 border-l border-slate-800">
        <button
          type="button"
          onClick={() => setEvaluationMode(isEval1 ? 'evaluation2' : 'evaluation1')}
          className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          title={isEval1 ? 'Switch to Evaluation 2 (ML & Benchmark)' : 'Switch to Evaluation 1 (Operational Investigation)'}
        >
          <ArrowRightLeft className="w-2.5 h-2.5 text-slate-400" />
          <span>{isEval1 ? 'Switch to Eval 2' : 'Switch to Eval 1'}</span>
        </button>

        <button
          type="button"
          onClick={() => setEvaluationMode(null)}
          className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
          title="Exit Presentation Mode"
          aria-label="Exit Presentation Mode"
        >
          <span>EXIT</span>
          <X className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
};

export default PresentationModeIndicator;

