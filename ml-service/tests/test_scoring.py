import pytest

from sponsorwise_ml.scoring import MAX_FILL, clamp_attendance, probability_band, recommendations, roi_bucket


def test_attendance_never_exceeds_the_fill_cap():
    assert clamp_attendance(1_000_000, 1000) == int(1000 * MAX_FILL)
    assert clamp_attendance(-50, 1000) == 0


def test_attendance_never_falls_as_demand_rises():
    crowds = [clamp_attendance(raw, 1000) for raw in range(0, 3000, 10)]
    assert crowds == sorted(crowds)


def test_low_demand_is_trusted():
    assert clamp_attendance(400, 1000) == 400


@pytest.mark.parametrize("probability, tier", [
    (0.60, "HIGH"), (0.59, "MEDIUM"), (0.35, "MEDIUM"), (0.20, "LOW"), (0.14, "UNLIKELY"),
    (1.7, "HIGH"), (-1, "UNLIKELY"), (None, "UNKNOWN"),
])
def test_probability_bands(probability, tier):
    assert probability_band(probability)["tier"] == tier


@pytest.mark.parametrize("cost, bucket", [(5, "strong"), (12, "moderate"), (25, "moderate"), (25.01, "weak")])
def test_roi_buckets(cost, bucket):
    assert roi_bucket(cost) == bucket


def test_recommendations_are_capped_and_well_formed():
    advice = recommendations(predicted_attendance=500, marketing_budget=0, cost_per_head=90,
                             competing_events=12, organizer_reputation=0.1, lineup_quality=0.1, synergy=10)
    assert 1 <= len(advice) <= 4
    assert all(set(item) == {"action", "why", "expected_effect"} for item in advice)
