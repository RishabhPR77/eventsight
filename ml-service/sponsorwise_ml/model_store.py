"""Loads the trained models, refusing any file whose fingerprint doesn't match the manifest.

Pickle files can run code when loaded, so every artifact is checked against the
SHA-256 recorded in model_manifest.json by the training notebook before joblib touches it.
"""

import hashlib
import json
import logging
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import joblib
import numpy as np

logger = logging.getLogger("sponsorwise.models")

MANIFEST_FILE = "model_manifest.json"
ARTIFACT_FILES = {
    "scaler": "feature_scaler.pkl",
    "attendance_model": "stage1_attendance_xgboost.pkl",
    "feasibility_model": "stage2_sponsor_xgboost.pkl",
}
EXPECTED_FEATURE_COUNT = 67


class ModelLoadError(RuntimeError):
    pass


@dataclass(frozen=True)
class Models:
    scaler: Any
    attendance_model: Any
    feasibility_model: Any
    feature_columns: List[str]
    version: str

    def predict_attendance(self, scaled_row: np.ndarray) -> float:
        return float(self.attendance_model.predict(scaled_row)[0])

    def predict_feasibility(self, scaled_row: np.ndarray, raw_attendance: float) -> tuple:
        """Stage 2 sees the 67 features plus stage 1's raw prediction, as in training."""
        stage2_row = np.column_stack((scaled_row, [[raw_attendance]]))
        label = int(self.feasibility_model.predict(stage2_row)[0])
        probability = float(self.feasibility_model.predict_proba(stage2_row)[0][1])
        return label, probability


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _allow_older_numpy_pickles() -> None:
    """Pickles written by NumPy 2 refer to numpy._core; map it for other NumPy versions."""
    core = getattr(np, "_core", None) or getattr(np, "core", None)
    if core is None:
        return
    sys.modules.setdefault("numpy._core", core)
    for name in ("multiarray", "_multiarray_umath"):
        module = getattr(core, name, None)
        if module is not None:
            sys.modules.setdefault(f"numpy._core.{name}", module)


def load_models(directory: Path) -> Models:
    manifest_path = directory / MANIFEST_FILE
    if not manifest_path.exists():
        raise ModelLoadError(f"{MANIFEST_FILE} is missing, so the model files can't be verified")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

    for name, filename in ARTIFACT_FILES.items():
        expected = manifest["artifacts"][name]["sha256"]
        actual = sha256_of(directory / filename)
        if actual != expected:
            raise ModelLoadError(f"{filename} doesn't match its manifest fingerprint; refusing to load it")

    _allow_older_numpy_pickles()
    scaler = joblib.load(directory / ARTIFACT_FILES["scaler"])
    columns = list(getattr(scaler, "feature_names_in_", []))
    if len(columns) != EXPECTED_FEATURE_COUNT or columns != manifest["feature_columns"]:
        raise ModelLoadError(f"Scaler has {len(columns)} features; expected the manifest's {EXPECTED_FEATURE_COUNT}")

    models = Models(
        scaler=scaler,
        attendance_model=joblib.load(directory / ARTIFACT_FILES["attendance_model"]),
        feasibility_model=joblib.load(directory / ARTIFACT_FILES["feasibility_model"]),
        feature_columns=columns,
        version=manifest["model_version"],
    )
    logger.info("Models %s loaded and verified (%d features)", models.version, len(columns))
    return models


def write_manifest(directory: Path, model_version: str, feature_columns: List[str], training: Dict[str, Any]) -> Dict[str, Any]:
    """Called by the training notebook after it saves the artifacts."""
    manifest = {
        "model_version": model_version,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "artifacts": {
            name: {"file": filename, "sha256": sha256_of(directory / filename)}
            for name, filename in ARTIFACT_FILES.items()
        },
        "feature_columns": list(feature_columns),
        "training": training,
    }
    (directory / MANIFEST_FILE).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest
