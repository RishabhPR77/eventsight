import json
import shutil

import pytest

from conftest import API_KEY, SERVICE_DIR, VALID_EVENT
from sponsorwise_ml.model_store import ARTIFACT_FILES, MANIFEST_FILE, ModelLoadError, load_models

RESPONSE_KEYS = {
    "normalized_input", "attendance", "attendance_raw_model_output", "ml_is_feasible",
    "feasibility_probability", "verdict", "verdict_band", "verdict_label", "breakdown",
    "ai_insights", "recommendations", "ai_analysis", "negotiation_points", "cold_email",
}


def test_health_is_public_and_reports_the_models(client):
    body = client.get("/health").json()
    assert body["ok"] and body["models_loaded"] and body["feature_count"] == 67
    assert body["model_version"]


def test_protected_routes_need_the_key(client):
    assert client.post("/predict", json=VALID_EVENT).status_code == 403
    assert client.post("/predict", json=VALID_EVENT, headers={"X-API-Key": "wrong"}).status_code == 403
    assert client.post("/analyze-brand", json={"company_name": "A", "industry": "FMCG"}).status_code == 403


def test_prediction_contract(client):
    response = client.post("/predict", json=VALID_EVENT, headers=API_KEY)
    assert response.status_code == 200
    body = response.json()
    assert set(body) == RESPONSE_KEYS
    assert 0 <= body["attendance"] <= VALID_EVENT["venue_capacity"]
    assert 0 <= body["feasibility_probability"] <= 1
    assert body["verdict_band"] in {"HIGH", "MEDIUM", "LOW", "UNLIKELY"}
    assert response.headers["X-Request-ID"] and response.headers["X-Content-Type-Options"] == "nosniff"


def test_predictions_are_deterministic(client):
    first = client.post("/predict", json=VALID_EVENT, headers=API_KEY).json()
    second = client.post("/predict", json=VALID_EVENT, headers=API_KEY).json()
    assert first == second


@pytest.mark.parametrize("change", [
    {"date": "16-01-2027"}, {"date": "1850-01-01"}, {"price": -1}, {"venue_capacity": 0},
    {"sponsor_amount": 10 ** 13}, {"organizer_reputation": 1.5}, {"brand_kpi": "fame"},
    {"event_description": "x" * 20_001},
])
def test_invalid_input_is_refused(client, change):
    assert client.post("/predict", json={**VALID_EVENT, **change}, headers=API_KEY).status_code == 422


def test_not_a_number_is_refused(client):
    body = json.dumps({**VALID_EVENT, "price": float("nan")})
    response = client.post("/predict", content=body, headers={**API_KEY, "Content-Type": "application/json"})
    assert response.status_code == 422


def test_oversized_bodies_are_refused(client):
    huge = {**VALID_EVENT, "event_description": "x" * 70_000}
    assert client.post("/predict", json=huge, headers=API_KEY).status_code == 413


def test_docs_are_hidden_in_production(client):
    assert client.get("/docs").status_code == 404
    assert client.get("/openapi.json").status_code == 404


def test_brand_profile_without_ai_uses_defaults(client):
    response = client.post("/analyze-brand", json={"company_name": "Nimbu", "industry": "Beverage"}, headers=API_KEY)
    assert response.status_code == 200 and response.json()["persona"] == "Standard"


@pytest.fixture
def artifact_copy(tmp_path):
    for filename in [*ARTIFACT_FILES.values(), MANIFEST_FILE]:
        shutil.copy(SERVICE_DIR / filename, tmp_path / filename)
    return tmp_path


def test_verified_models_load(artifact_copy):
    assert len(load_models(artifact_copy).feature_columns) == 67


def test_a_tampered_model_file_is_refused(artifact_copy):
    with open(artifact_copy / ARTIFACT_FILES["attendance_model"], "ab") as handle:
        handle.write(b"tampered")
    with pytest.raises(ModelLoadError, match="fingerprint"):
        load_models(artifact_copy)


def test_models_without_a_manifest_are_refused(artifact_copy):
    (artifact_copy / MANIFEST_FILE).unlink()
    with pytest.raises(ModelLoadError, match="missing"):
        load_models(artifact_copy)
