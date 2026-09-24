import os
import joblib
import numpy as np
from typing import Optional, Any

# ──────────────────────────────────────────────────────────────────────────────
# Real RandomForest ML Engine
# Loads the trained model artifact and performs genuine inference.
# ──────────────────────────────────────────────────────────────────────────────

feature_names = ["amount", "hour", "is_new_receiver", "velocity", "chain_depth", "call_flag"]

# Resolve model path relative to this file's location
_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.normpath(
    os.path.join(_THIS_DIR, "..", "..", "backend", "models", "fraud_model.pkl")
)

model = None
_model_loaded = False

def _load_model():
    global model, _model_loaded
    if _model_loaded:
        return
    _model_loaded = True
    if os.path.exists(_MODEL_PATH):
        try:
            loaded = joblib.load(_MODEL_PATH)
            if isinstance(loaded, tuple):
                model, _ = loaded  # (RandomForestClassifier, feature_names)
            else:
                model = loaded
            print(f"  [ML Engine] RandomForest model loaded from {_MODEL_PATH}")
        except Exception as e:
            print(f"  [ML Engine] WARNING: Failed to load model: {e}. Falling back to rule emulator.")
            model = None
    else:
        print(f"  [ML Engine] WARNING: Model file not found at {_MODEL_PATH}. Using rule emulator.")

_load_model()


def normalize_features(features: list) -> list:
    """Normalize the 6-feature vector to [0,1] range for the model."""
    if not features or len(features) < 6:
        return features
    return [
        min(features[0] / 100000, 1.0),   # amount
        features[1] / 23.0,               # hour
        float(features[2]),               # is_new_receiver (already 0/1)
        min(features[3] / 10, 1.0),       # velocity
        min(features[4] / 5, 1.0),        # chain_depth
        float(features[5]),               # call_flag (already 0/1)
    ]


def predict_ml_score(rule_score: float, features: Optional[list] = None, seed: Optional[Any] = None) -> float:
    """
    Perform real ML inference using the trained RandomForest model.

    If a feature vector is provided and the model is loaded, uses genuine
    model.predict_proba() to produce a fraud probability score [0–100].

    Falls back to a rule-correlated emulator if the model is unavailable
    or no features are supplied (for backward compatibility).
    """
    # ── Real inference path ──────────────────────────────────────────────────
    if model is not None and features is not None and len(features) >= 6:
        try:
            normed = normalize_features(features)
            X = np.array([normed], dtype=float)
            proba = model.predict_proba(X)[0]
            # proba[1] = P(fraud); scale to 0–100
            ml_score = float(proba[1]) * 100.0
            return round(max(0.0, min(100.0, ml_score)), 2)
        except Exception as e:
            print(f"  [ML Engine] Inference error: {e}. Falling back to emulator.")

    # ── Fallback emulator (rule-correlated noise) ─────────────────────────────
    import random as _random
    rng = _random.Random(seed) if seed is not None else _random
    if rule_score >= 80:
        noise = rng.uniform(-5, 5)
    elif rule_score >= 50:
        noise = rng.uniform(-10, 10)
    else:
        noise = rng.uniform(-15, 15)
    return round(max(0.0, min(100.0, rule_score + noise)), 2)
