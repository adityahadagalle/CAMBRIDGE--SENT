/**
 * Global persistent store for SENTINEL Presentation Mode.
 * 
 * Supports two dedicated judge evaluation modes:
 * - 'evaluation1': Operational Investigation (Real-Time Feed, Analytics, Cases)
 * - 'evaluation2': ML & Benchmark (ML Intelligence, Benchmark Lab)
 * - null / 'off': Standard mode (Full developer and operations controls)
 * 
 * When Presentation Mode is active:
 * - Disruptive visual toasts and alert pop-ups are suppressed.
 * - Non-evaluation navigation items are hidden from the presentation UI.
 * - Autonomous action and freeze controls are suppressed from judge-facing views.
 * - Underlying risk scoring, WebSocket pipelines, case creation,
 *   audit logging, and operator actions continue running 100% normally in the backend.
 */

const STORAGE_KEY = 'sentinel_presentation_mode';
const EVAL_KEY = 'sentinel_evaluation_mode';

// Initialize from localStorage (default: false, null)
let evaluationMode = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedEval = window.localStorage.getItem(EVAL_KEY);
      if (storedEval === 'evaluation1' || storedEval === 'evaluation2') {
        return storedEval;
      }
      const storedLegacy = window.localStorage.getItem(STORAGE_KEY);
      if (storedLegacy === 'true') {
        return 'evaluation1';
      }
    }
  } catch (err) {
    console.warn('[PresentationStore] Failed to read localStorage:', err);
  }
  return null;
})();

let presentationMode = evaluationMode !== null;

const listeners = new Set();

/**
 * Returns current presentation mode synchronously as a boolean.
 * True if Evaluation 1 or Evaluation 2 is active.
 * @returns {boolean}
 */
export const getPresentationMode = () => Boolean(presentationMode);

/**
 * Returns current specific evaluation mode: 'evaluation1' | 'evaluation2' | null.
 * @returns {'evaluation1' | 'evaluation2' | null}
 */
export const getEvaluationMode = () => evaluationMode;

/**
 * Set specific evaluation mode ('evaluation1' | 'evaluation2' | null).
 * Automatically updates presentationMode boolean.
 * @param {'evaluation1' | 'evaluation2' | null | boolean} mode 
 */
export const setEvaluationMode = (mode) => {
  if (mode === true || mode === 'evaluation1') {
    evaluationMode = 'evaluation1';
    presentationMode = true;
  } else if (mode === 'evaluation2') {
    evaluationMode = 'evaluation2';
    presentationMode = true;
  } else {
    evaluationMode = null;
    presentationMode = false;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, String(presentationMode));
      if (evaluationMode) {
        window.localStorage.setItem(EVAL_KEY, evaluationMode);
      } else {
        window.localStorage.removeItem(EVAL_KEY);
      }
    }
  } catch (err) {
    console.warn('[PresentationStore] Failed to write localStorage:', err);
  }

  // Notify store subscribers
  listeners.forEach((listener) => {
    try {
      listener(presentationMode, evaluationMode);
    } catch (err) {
      console.error('[PresentationStore] Listener error:', err);
    }
  });

  // Dispatch custom event for external listeners
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(
      new CustomEvent('sentinel_presentation_mode_changed', {
        detail: { presentationMode, evaluationMode }
      })
    );
  }

  return evaluationMode;
};

/**
 * Set presentation mode boolean for backwards compatibility.
 * When enabled, defaults to 'evaluation1'.
 * @param {boolean} enabled 
 */
export const setPresentationMode = (enabled) => {
  if (enabled) {
    setEvaluationMode(evaluationMode || 'evaluation1');
  } else {
    setEvaluationMode(null);
  }
  return presentationMode;
};

/**
 * Toggles current presentation mode.
 * @returns {boolean} New presentation mode state
 */
export const togglePresentationMode = () => {
  return setPresentationMode(!presentationMode);
};

/**
 * Subscribe a listener callback to presentation mode changes.
 * @param {(mode: boolean, evalMode: 'evaluation1' | 'evaluation2' | null) => void} listener 
 * @returns {() => void} Unsubscribe function
 */
export const subscribePresentationMode = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/**
 * Resets store state (used primarily for test isolation).
 */
export const resetPresentationStoreForTesting = (initial = false) => {
  if (initial === true) {
    evaluationMode = 'evaluation1';
    presentationMode = true;
  } else if (initial === 'evaluation1' || initial === 'evaluation2') {
    evaluationMode = initial;
    presentationMode = true;
  } else {
    evaluationMode = null;
    presentationMode = false;
  }

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, String(presentationMode));
      if (evaluationMode) {
        window.localStorage.setItem(EVAL_KEY, evaluationMode);
      } else {
        window.localStorage.removeItem(EVAL_KEY);
      }
    }
  } catch {
    // ignore
  }
  listeners.clear();
};
