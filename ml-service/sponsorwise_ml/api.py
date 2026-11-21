"""HTTP layer: routes, start-up, and request safeguards. Only the SponsorWise backend
calls this service; browsers never do."""

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import Dict

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import SERVICE_VERSION
from .config import configure_logging, settings
from .llm import brand_profile, create_language_model
from .model_store import ModelLoadError, load_models
from .pipeline import predict
from .schemas import BrandInput, EventInput
from .security import require_api_key

configure_logging()
logger = logging.getLogger("sponsorwise")

MAX_BODY_BYTES = 64 * 1024


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings.check()
    try:
        app.state.models = load_models(settings.artifact_dir)
    except (ModelLoadError, OSError, KeyError, ValueError) as exc:
        # Stay up so /health can report it; /predict answers 503 until fixed
        app.state.models = None
        logger.error("Models not loaded: %s", exc)
    app.state.llm = create_language_model()
    if not settings.service_api_key:
        logger.warning("DEV_MODE without SERVICE_API_KEY: protected routes are open")
    logger.info("Ready | models=%s | ai=%s", app.state.models is not None, app.state.llm.enabled)
    yield


app = FastAPI(
    title="SponsorWise ML Service",
    version=SERVICE_VERSION,
    description="Two-stage XGBoost pipeline for event sponsorship prediction, with AI-written insights.",
    lifespan=lifespan,
    # The interactive docs advertise every route, so they exist only in development
    docs_url="/docs" if settings.dev_mode else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.dev_mode else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
)


@app.exception_handler(RequestValidationError)
async def explain_invalid_input(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Says which field is wrong and why, without echoing the submitted values back
    (they may be private, and values like NaN can't even be written as JSON)."""
    errors = [{"field": ".".join(str(part) for part in error["loc"][1:]), "problem": error["msg"]}
              for error in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.middleware("http")
async def safeguards(request: Request, call_next):
    """Request ID and timing on every response, a body-size cap, and safe headers."""
    request_id = uuid.uuid4().hex[:8]
    started = time.perf_counter()

    declared_size = request.headers.get("content-length", "0")
    if not declared_size.isdigit() or int(declared_size) > MAX_BODY_BYTES:
        response = JSONResponse(status_code=413, content={"detail": "Request body is too large."})
    else:
        try:
            response = await call_next(request)
        except Exception:
            # Details go to the log only; the caller never sees internals
            logger.exception("[%s] Unhandled error on %s", request_id, request.url.path)
            response = JSONResponse(status_code=500, content={"detail": "Internal error. Please try again."})

    elapsed_ms = round((time.perf_counter() - started) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(elapsed_ms)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    logger.info("[%s] %s %s -> %s (%s ms)", request_id, request.method, request.url.path, response.status_code, elapsed_ms)
    return response


@app.get("/health", tags=["System"])
def health(request: Request) -> Dict:
    """Public, so uptime monitors and the backend's wake-up ping need no key."""
    models = request.app.state.models
    return {
        "ok": True,
        "models_loaded": models is not None,
        "groq_enabled": request.app.state.llm.enabled,
        "auth_enabled": bool(settings.service_api_key),
        "version": SERVICE_VERSION,
        "model_version": models.version if models else None,
        "feature_count": len(models.feature_columns) if models else 0,
    }


@app.post("/analyze-brand", tags=["AI"], dependencies=[Depends(require_api_key)])
def analyze_brand(data: BrandInput, request: Request) -> Dict:
    """AI-written brand profile for the setup screen."""
    return brand_profile(request.app.state.llm, data.company_name, data.industry, data.brand_description)


@app.post("/predict", tags=["Prediction"], dependencies=[Depends(require_api_key)])
def predict_deal(data: EventInput, request: Request) -> Dict:
    """Two-stage prediction: expected attendance, then sponsorship feasibility."""
    models = request.app.state.models
    if models is None:
        raise HTTPException(status_code=503, detail="ML models are not loaded. Check server startup logs.")
    return predict(data, models, request.app.state.llm)
