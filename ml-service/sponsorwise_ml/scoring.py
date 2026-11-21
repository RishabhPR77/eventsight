"""Turns raw model output into figures and advice people can act on."""

from typing import Dict, List, Optional

import numpy as np

# Realistic fill rates for Tier-2/3 MP city events (see clamp_attendance)
TRUST_BELOW_DEMAND = 0.7
FULL_DEMAND = 1.4
COMPRESSION_SPAN = 0.7      # FULL_DEMAND - TRUST_BELOW_DEMAND, written out to keep the exact float
MIN_COMPRESSED_FILL = 0.70
FILL_RISE = 0.12            # from 70% up to MAX_FILL
MAX_FILL = 0.82

PROBABILITY_BANDS = [  # (lowest probability, tier, label), highest first
    (0.60, "HIGH", "HIGH POTENTIAL"),
    (0.35, "MEDIUM", "MEDIUM POTENTIAL"),
    (0.15, "LOW", "LOW POTENTIAL"),
    (0.00, "UNLIKELY", "UNLIKELY"),
]

STRONG_COST_PER_HEAD = 12   # INR per person
WEAK_COST_PER_HEAD = 25
MAX_RECOMMENDATIONS = 4


def clamp_attendance(raw_prediction: float, capacity: int) -> int:
    """Raw model output -> a believable crowd. Fill never decreases as demand rises:
    below 0.7x capacity the model is trusted, from 0.7x to 1.4x the fill rate rises
    smoothly from 70% to 82%, and beyond that it stays at 82% (true sell-outs are rare)."""
    capacity = max(1, capacity)
    demand = raw_prediction / capacity
    if demand >= FULL_DEMAND:
        fill = MAX_FILL
    elif demand >= TRUST_BELOW_DEMAND:
        fill = MIN_COMPRESSED_FILL + FILL_RISE * ((demand - TRUST_BELOW_DEMAND) / COMPRESSION_SPAN)
    else:
        fill = demand
    return int(np.clip(capacity * fill, 0, capacity))


def probability_band(probability: Optional[float]) -> Dict[str, str]:
    if probability is None:
        return {"tier": "UNKNOWN", "label": "UNKNOWN"}
    p = float(np.clip(probability, 0.0, 1.0))
    for lowest, tier, label in PROBABILITY_BANDS:
        if p >= lowest:
            return {"tier": tier, "label": label}
    return {"tier": "UNLIKELY", "label": "UNLIKELY"}


def roi_bucket(cost_per_head: float) -> str:
    if cost_per_head < STRONG_COST_PER_HEAD:
        return "strong"
    if cost_per_head <= WEAK_COST_PER_HEAD:
        return "moderate"
    return "weak"


def _advice(action: str, why: str, effect: str) -> Dict[str, str]:
    return {"action": action, "why": why, "expected_effect": effect}


def recommendations(
    predicted_attendance: int,
    marketing_budget: float,
    cost_per_head: float,
    competing_events: int,
    organizer_reputation: float,
    lineup_quality: float,
    synergy: int,
) -> List[Dict[str, str]]:
    """Up to four rule-based recommendations, most important first. Works without the AI."""
    advice: List[Dict[str, str]] = []

    if predicted_attendance > 0:
        if cost_per_head > WEAK_COST_PER_HEAD:
            advice.append(_advice(
                f"Reduce ask to ~₹{int(predicted_attendance * 15.0):,} or split into stall / sampling / branding packages.",
                f"₹{cost_per_head:.2f}/reach is above the ₹12–₹20 comfort zone for Tier-2/3 sponsors.",
                "Often increases acceptance by ~10–25 points.",
            ))
        elif cost_per_head > STRONG_COST_PER_HEAD:
            advice.append(_advice(
                f"Negotiate toward ₹{int(predicted_attendance * 12.0):,} OR add measurable deliverables to justify the current ask.",
                f"₹{cost_per_head:.2f}/reach is moderate; strong deliverables can bridge the gap.",
                "Can increase acceptance by ~5–15 points.",
            ))
        else:
            advice.append(_advice(
                "Keep ask; strengthen deliverables — exclusivity + sampling + QR lead capture + post-event report.",
                f"ROI is strong at ₹{cost_per_head:.2f}/reach. Decision will hinge on measurement clarity.",
                "Can improve acceptance by ~5–12 points.",
            ))

    if competing_events >= 8:
        advice.append(_advice(
            "Lock category exclusivity + premium zones, or shift to a less cluttered date.",
            f"High competition ({competing_events} events) dilutes sponsor visibility.",
            "Can improve acceptance by ~5–15 points.",
        ))
    elif competing_events >= 5:
        advice.append(_advice(
            "Differentiate with a signature activation: contest + sampling + influencer reel.",
            f"{competing_events} competing events make differentiation critical for recall.",
            "Can improve acceptance by ~3–10 points.",
        ))

    if organizer_reputation < 0.60 or lineup_quality < 0.55:
        advice.append(_advice(
            "Boost credibility: share past sponsor logos / testimonials, final lineup, permits, and timeline.",
            f"Organizer trust is a primary risk signal (rep={organizer_reputation:.2f}, lineup={lineup_quality:.2f}).",
            "Can improve acceptance by ~5–12 points.",
        ))

    if predicted_attendance > 0:
        spend_per_attendee = marketing_budget / max(1.0, float(predicted_attendance))
        if spend_per_attendee < 8:
            advice.append(_advice(
                f"Increase marketing budget toward ~₹{int(predicted_attendance * 10):,} or add influencer / PR amplification.",
                f"Current spend ≈ ₹{spend_per_attendee:.1f}/attendee; stronger demand lowers sponsor risk.",
                "Can improve acceptance by ~3–10 points.",
            ))

    if synergy < 45:
        advice.append(_advice(
            "Switch to a higher-fit event type for this sponsor category, or realign the target audience.",
            "Low synergy is a major deterrent for local sponsors.",
            "Can improve acceptance by ~8–20 points.",
        ))

    return advice[:MAX_RECOMMENDATIONS]
