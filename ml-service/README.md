# SponsorWise ML service

Predicts how many people will attend an event and whether sponsoring it is likely to pay off for a given brand, then explains the result in plain language.

- **Stage 1** (`XGBRegressor`): expected attendance from 67 features.
- **Stage 2** (`XGBClassifier`): feasibility probability from the same 67 features plus stage 1's prediction.
- **Language model** (Groq, optional): brand-event synergy score, written insights, negotiation points and an outreach email. Every AI output has a rule-based fallback, so the service also works with no key.

| Held-out events (20%, split by event) | Score |
|---|---|
| Stage 1 R² / MAE | 0.922 / 2,231 people |
| Stage 2 accuracy / F1 (feasible) / ROC-AUC | 0.806 / 0.726 / 0.855 |

The data is synthetic (10,000 Madhya Pradesh events × 7 candidate brands), so these scores show how well the models recover its patterns, not real-world accuracy.

## Layout

```
ml-service/
├── 1_data_preparation.ipynb   statistics, trends, leakage removal, feature building
├── 2_model_training.ipynb     model comparison, two-stage training, evaluation, saving
├── main.py                    entry point (uvicorn main:app)
├── model_manifest.json        model version, file fingerprints, features, metrics
├── sponsorwise_ml/
│   ├── api.py                 routes, start-up, request safeguards
│   ├── pipeline.py            one prediction, step by step
│   ├── features.py            the 67-column row, exactly as in training
│   ├── catalog.py             cities, event types, brand categories, name matching
│   ├── scoring.py             attendance clamp, probability bands, ROI, recommendations
│   ├── llm.py                 AI calls, prompt safety, fallbacks
│   ├── model_store.py         verified model loading
│   ├── schemas.py             request validation
│   ├── security.py            API key check
│   └── config.py              settings from the environment
└── tests/                     unit and API tests
```

## Run

```bash
pip install -r requirements.txt
cp .env.example .env        # set SERVICE_API_KEY, or DEV_MODE=true locally
uvicorn main:app --reload --port 8000
```

| Route | Auth | Purpose |
|---|---|---|
| `GET /health` | public | Liveness, model version, whether AI is on |
| `POST /predict` | `X-API-Key` | Full two-stage prediction and analysis |
| `POST /analyze-brand` | `X-API-Key` | AI brand profile |

## Retrain and test

```bash
pip install -r requirements-dev.txt
jupyter nbconvert --to notebook --execute --inplace 1_data_preparation.ipynb 2_model_training.ipynb
python -m pytest tests
```

With the pinned versions and fixed seeds, the notebooks rebuild the deployed model files byte for byte, and write a new `model_manifest.json`.

## Design notes

**Correct evaluation**
- Splits are grouped by `event_id`, because each event appears once per candidate brand. A random split would test on events the model had seen.
- Stage 2 is trained on out-of-fold stage 1 predictions (`cross_val_predict` with `GroupKFold`), so it learns from predictions as imperfect as the ones it gets in production.
- Post-event columns (rating, ROI, brand lift…) are dropped before training to avoid leakage.

**Training and serving stay in step**
- The feature row is built in training's column order from the scaler's own feature list.
- A test encodes raw dataset rows the way the live service does and checks they equal the training features.

**Model integrity**
- Pickle files can run code when loaded, so each one is checked against the SHA-256 in `model_manifest.json` first.
- A missing manifest or a changed file means the models aren't loaded, and `/predict` answers 503.

**Security**
- The API key is compared in constant time, and the service won't start without one outside `DEV_MODE`.
- Inputs have type, range and length limits; NaN and infinity are refused; request bodies are capped at 64 KB.
- Validation errors name the field without echoing the submitted value.
- Unexpected errors return a generic message; details stay in the logs.
- Interactive API docs exist only in `DEV_MODE`.

**Prompt safety**
- User-written text is trimmed and wrapped in `<user_data>` tags the model is told never to obey.
- Every AI reply is type-checked field by field before use; anything malformed keeps its rule-based value.

**Reliability**
- Groq calls have a 10-second timeout and no retries, so a slow AI can't stall a prediction.
- Each response carries `X-Request-ID` and `X-Response-Time-Ms`, and each prediction is logged with its model version, band and synergy source, never with user text.
