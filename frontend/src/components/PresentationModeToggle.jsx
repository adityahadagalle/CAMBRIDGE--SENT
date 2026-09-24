import React from 'react';
import { BellOff, Presentation, Check } from 'lucide-react';
import { usePresentationMode } from '../hooks/usePresentationMode';

/**
 * Control toggle for Presentation Mode and Evaluation Modes.
 * 
 * Supports:
 * - Evaluation 1: Operational Investigation (Real-Time Feed, Analytics, Cases)
 * - Evaluation 2: ML & Benchmark (ML Intelligence, Benchmark Lab)
 * - Standard / Off: Full platform controls
 */
const PresentationModeToggle = () => {
  const { isPresentationMode, evaluationMode, setEvaluationMode } = usePresentationMode();

  return (
    <div id="presentation-mode-toggle" className="space-y-2 font-sans select-none">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider px-1">
        <span className="flex items-center gap-1.5">
          <Presentation className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          Presentation Mode
        </span>
        <span className={isPresentationMode ? 'text-blue-400 font-semibold' : 'text-slate-500'}>
          {evaluationMode === 'evaluation1' ? 'EVAL 1' : evaluationMode === 'evaluation2' ? 'EVAL 2' : 'OFF'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900/90 border border-slate-700/80 rounded-xl">
        <button
          type="button"
          id="toggle-eval-1"
          onClick={() => setEvaluationMode(evaluationMode === 'evaluation1' ? null : 'evaluation1')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all ${
            evaluationMode === 'evaluation1'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 border border-blue-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Evaluation 1: Operational Investigation (Feed, Analytics, Cases)"
        >
          {evaluationMode === 'evaluation1' && <Check className="w-3 h-3 text-white shrink-0" />}
          <span>Eval 1 (Ops)</span>
        </button>

        <button
          type="button"
          id="toggle-eval-2"
          onClick={() => setEvaluationMode(evaluationMode === 'evaluation2' ? null : 'evaluation2')}
          className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-mono font-bold transition-all ${
            evaluationMode === 'evaluation2'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-900/40 border border-purple-400/40'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title="Evaluation 2: ML & Benchmark (ML Intelligence, Benchmark Lab)"
        >
          {evaluationMode === 'evaluation2' && <Check className="w-3 h-3 text-white shrink-0" />}
          <span>Eval 2 (ML)</span>
        </button>
      </div>

      {isPresentationMode && (
        <div className="px-1 flex items-center justify-between text-[9px] font-mono select-none">
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <BellOff className="w-3 h-3" />
            Popups Suppressed
          </span>
          <button
            type="button"
            onClick={() => setEvaluationMode(null)}
            className="text-slate-500 hover:text-rose-400 underline font-semibold transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
};

export default PresentationModeToggle;

