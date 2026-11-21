"""Turns one event + brand into the exact 67-column row the models were trained on."""

from datetime import datetime
from typing import Dict, List

import numpy as np
import pandas as pd

from .catalog import BRAND_AFFINITIES, CITIES_POP, DEFAULT_WEATHER, EVENT_TAGS, FESTIVE_MONTHS, MP_WEATHER_DEFAULTS

# Categorical columns that training one-hot encoded with get_dummies(drop_first=True)
ONE_HOT_PREFIXES = ("city", "event_type", "brand_category", "brand_kpi", "brand_city_focus")

# Range of fit_score in the training data; a 0-100 synergy score maps onto exactly this
FIT_MIN, FIT_MAX = 0.25, 1.09


def calendar_features(date: str, organizer_says_festive: bool) -> Dict[str, float]:
    """Date-derived features, plus the month's typical weather."""
    day = datetime.strptime(date, "%Y-%m-%d")
    temperature, humidity, is_raining = MP_WEATHER_DEFAULTS.get(day.month, DEFAULT_WEATHER)
    return {
        "month": day.month,
        "day_of_week": day.weekday(),
        "is_weekend": int(day.weekday() in (5, 6)),
        # Training never marks events festive outside FESTIVE_MONTHS, and only about
        # 45% inside them, so the organizer decides and the month can only veto
        "is_festive": int(organizer_says_festive and day.month in FESTIVE_MONTHS),
        "temperature": temperature,
        "humidity": humidity,
        "is_raining": is_raining,
    }


def expected_competing_events(city: str, is_weekend: int, is_festive: int) -> int:
    """Bigger cities, weekends and festival seasons have more events competing for a crowd."""
    rate = 0.8 + 0.08 * float(CITIES_POP.get(city, 10.0))
    if is_weekend:
        rate *= 1.6
    if is_festive:
        rate *= 1.4
    return int(np.clip(round(rate), 0, 25))


def rule_based_fit_score(brand_category: str, event_type: str) -> float:
    """Brand-event fit from the affinity tables. Used when the AI synergy score is unavailable."""
    brand = BRAND_AFFINITIES.get(brand_category, {"aud": ["mass"], "aff": []})
    event_audience = EVENT_TAGS.get(event_type, ["mass"])
    type_match = 1.0 if event_type in brand["aff"] else 0.55
    shared_audiences = min(len(set(brand["aud"]) & set(event_audience)), 2)
    audience_score = {0: 0.50, 1: 0.82, 2: 1.05}[shared_audiences]
    return float(np.clip(type_match * audience_score * 0.95, 0.25, 1.60))


def fit_to_synergy(fit_score: float) -> int:
    """Model fit score -> 0-100 synergy shown to people."""
    return int(np.clip((fit_score - FIT_MIN) / (FIT_MAX - FIT_MIN) * 100, 0, 100))


def synergy_to_fit(synergy: int) -> float:
    """0-100 synergy -> fit score on the scale the model learned."""
    return float(np.clip((synergy / 100.0) * (FIT_MAX - FIT_MIN) + FIT_MIN, FIT_MIN, FIT_MAX))


def build_feature_row(columns: List[str], numeric: Dict[str, float], categories: Dict[str, str]) -> pd.DataFrame:
    """One row in training's column order. A category with no column (a dropped
    reference value such as Bhopal, or an unknown name) stays all zeros."""
    row = pd.DataFrame(0.0, index=[0], columns=columns)
    for name, value in numeric.items():
        if name in row.columns:
            row.at[0, name] = float(value)
    for prefix in ONE_HOT_PREFIXES:
        column = f"{prefix}_{categories[prefix]}"
        if column in row.columns:
            row.at[0, column] = 1.0
    return row
