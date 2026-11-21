"""The full prediction for one event and brand:
names -> features -> stage 1 (attendance) -> stage 2 (feasibility) -> scores -> written analysis."""

import logging
from typing import Any, Dict, Optional

import numpy as np

from . import catalog, features, scoring
from .llm import DealFacts, LanguageModel, synergy_score, written_analysis
from .model_store import Models
from .schemas import EventInput

logger = logging.getLogger("sponsorwise.pipeline")

# Training medians, used when the caller leaves a quality signal out
DEFAULT_ORGANIZER_REPUTATION = 0.55
DEFAULT_LINEUP_QUALITY = 0.50
DEFAULT_ACTIVATION_MATURITY = 0.55
DEFAULT_SOCIAL_REACH = 1_800
DEFAULT_PAST_EVENTS = 10


def _or_default(value: Optional[float], default: float) -> float:
    """Zero is a real answer, so only a missing value gets the default."""
    return default if value is None else value


def predict(data: EventInput, models: Models, llm: LanguageModel) -> Dict[str, Any]:
    # 1. Match free-text names to the names the models were trained on
    city = catalog.resolve_city(data.city)
    event_type = catalog.resolve_event_type(data.event_type, data.event_description)
    brand_category = catalog.resolve_brand_category(data.sponsor_category, data.brand_description, data.brand_name)
    brand_kpi = data.brand_kpi or "awareness"
    brand_city_focus = data.brand_city_focus or "all_mp"

    # 2. Context the caller doesn't send: calendar, weather and competition
    calendar = features.calendar_features(data.date, bool(data.is_festive))
    competing_events = features.expected_competing_events(city, calendar["is_weekend"], calendar["is_festive"])

    # 3. Quality signals, clipped to the ranges seen in training
    organizer_reputation = float(np.clip(_or_default(data.organizer_reputation, DEFAULT_ORGANIZER_REPUTATION), 0.05, 0.97))
    lineup_quality = float(np.clip(_or_default(data.lineup_quality, DEFAULT_LINEUP_QUALITY), 0.05, 0.98))
    activation_maturity = float(np.clip(_or_default(data.brand_activation_maturity, DEFAULT_ACTIVATION_MATURITY), 0.0, 1.0))
    sponsor_amount = float(max(0.0, data.sponsor_amount))
    # Never derived from the ask, which would leak the target into the inputs
    brand_budget = (int(data.brand_annual_budget) if data.brand_annual_budget
                    else catalog.BRAND_BUDGET_DEFAULTS.get(brand_category, catalog.DEFAULT_BRAND_BUDGET))

    # 4. Brand-event fit: the AI's 0-100 score if available, otherwise the rule-based one
    ai_synergy = synergy_score(
        llm, brand_name=data.brand_name or "Brand", brand_description=data.brand_description,
        brand_category=brand_category, event_type=event_type, event_description=data.event_description, city=city,
    )
    if ai_synergy is not None:
        synergy, fit_score, synergy_source = ai_synergy, features.synergy_to_fit(ai_synergy), "ai"
    else:
        fit_score = features.rule_based_fit_score(brand_category, event_type)
        synergy, synergy_source = features.fit_to_synergy(fit_score), "math"

    # 5. The 67-column feature row, exactly as in training
    row = features.build_feature_row(
        models.feature_columns,
        numeric={
            **calendar,
            "is_indoor": 1.0 if data.is_indoor is None else float(data.is_indoor),
            "venue_capacity": float(max(0, data.venue_capacity)),
            "ticket_price": float(max(0.0, data.price)),
            "marketing_budget": float(max(0.0, data.marketing_budget)),
            "organizer_reputation": organizer_reputation,
            "lineup_quality": lineup_quality,
            "social_media_reach": float(max(0, _or_default(data.social_media_reach, DEFAULT_SOCIAL_REACH))),
            "past_events_organized": float(max(0, _or_default(data.past_events_organized, DEFAULT_PAST_EVENTS))),
            "competing_events": float(competing_events),
            "brand_annual_budget": float(brand_budget),
            "brand_activation_maturity": activation_maturity,
            "fit_score": float(fit_score),
            "sponsor_amount": sponsor_amount,
        },
        categories={
            "city": city, "event_type": event_type, "brand_category": brand_category,
            "brand_kpi": brand_kpi, "brand_city_focus": brand_city_focus,
        },
    )
    scaled_row = models.scaler.transform(row)

    # 6. Stage 1 predicts the crowd; stage 2 gets the raw prediction, as it did in training
    capacity = int(max(1, data.venue_capacity))
    raw_attendance = models.predict_attendance(scaled_row)
    attendance = scoring.clamp_attendance(raw_attendance, capacity)
    feasible, probability = models.predict_feasibility(scaled_row, raw_attendance)

    # 7. Figures people can act on
    cost_per_head = sponsor_amount / attendance if attendance > 0 else 0.0
    occupancy = attendance / capacity * 100.0
    roi = scoring.roi_bucket(cost_per_head)
    band = scoring.probability_band(probability)
    probability_pct = int(round(float(np.clip(probability, 0.0, 1.0)) * 100))
    advice = scoring.recommendations(
        predicted_attendance=attendance, marketing_budget=float(data.marketing_budget), cost_per_head=cost_per_head,
        competing_events=competing_events, organizer_reputation=organizer_reputation,
        lineup_quality=lineup_quality, synergy=synergy,
    )
    logger.info(
        "prediction model=%s band=%s synergy=%d (%s) demand_ratio=%.2f",
        models.version, band["tier"], synergy, synergy_source, raw_attendance / capacity,
    )

    # 8. Written analysis (AI, with a rule-based fallback)
    analysis = written_analysis(llm, DealFacts(
        brand_name=data.brand_name or "Brand", brand_description=data.brand_description,
        brand_category=brand_category, event_type=event_type, event_description=data.event_description,
        city=city, band_label=band["label"], probability_pct=probability_pct, synergy=synergy,
        attendance=attendance, occupancy=occupancy, cost_per_head=cost_per_head,
        competing_events=competing_events, roi=roi, advice=advice,
    ))

    return {
        "normalized_input": {
            "city": city,
            "event_type": event_type,
            "sponsor_category": brand_category,
            "brand_kpi": brand_kpi,
            "brand_city_focus": brand_city_focus,
        },
        "attendance": attendance,
        "attendance_raw_model_output": round(raw_attendance, 4),
        "ml_is_feasible": bool(feasible == 1),
        "feasibility_probability": round(probability, 4),
        "verdict": f"{band['label']} ({probability_pct}%)",
        "verdict_band": band["tier"],
        "verdict_label": band["label"],
        "breakdown": {
            "occupancy_rate": round(occupancy, 1),
            "brand_synergy": synergy,
            "synergy_source": synergy_source,
            "cost_per_head": round(cost_per_head, 2),
            "competing_events": competing_events,
            "roi_bucket": roi,
        },
        "ai_insights": {key: analysis[key] for key in
                        ("headline", "explanation", "key_factors", "what_it_means", "next_actions", "caution")},
        "recommendations": advice,
        "ai_analysis": analysis["analysis"],
        "negotiation_points": analysis["negotiation_points"],
        "cold_email": analysis["cold_email"],
    }
