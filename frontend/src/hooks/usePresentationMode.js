import { useState, useEffect } from 'react';
import {
  getPresentationMode,
  setPresentationMode,
  getEvaluationMode,
  setEvaluationMode,
  togglePresentationMode,
  subscribePresentationMode
} from '../presentationStore';

/**
 * Custom React hook to consume and control Presentation Mode and Evaluation Mode.
 * Syncs seamlessly across components and persists in localStorage.
 */
export const usePresentationMode = () => {
  const [isPresentationMode, setIsPresentationMode] = useState(getPresentationMode());
  const [evaluationMode, setEvalModeState] = useState(getEvaluationMode());

  useEffect(() => {
    // Initial sync
    setIsPresentationMode(getPresentationMode());
    setEvalModeState(getEvaluationMode());

    // Subscribe to store updates
    const unsubscribe = subscribePresentationMode((newPresMode, newEvalMode) => {
      setIsPresentationMode(newPresMode);
      setEvalModeState(newEvalMode);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    isPresentationMode,
    evaluationMode,
    setPresentationMode,
    setEvaluationMode,
    togglePresentationMode
  };
};

export default usePresentationMode;

