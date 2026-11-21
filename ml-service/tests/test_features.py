import joblib
import pandas as pd
import pytest

from conftest import SERVICE_DIR
from sponsorwise_ml.features import (FIT_MAX, FIT_MIN, ONE_HOT_PREFIXES, build_feature_row, calendar_features,
                                     expected_competing_events, fit_to_synergy, rule_based_fit_score,
                                     synergy_to_fit)


@pytest.fixture(scope="module")
def columns():
    return list(joblib.load(SERVICE_DIR / "feature_scaler.pkl").feature_names_in_)


def test_calendar_marks_weekends():
    assert calendar_features("2027-01-16", False)["is_weekend"] == 1  # Saturday
    assert calendar_features("2027-01-18", False)["is_weekend"] == 0  # Monday


def test_festive_flag_is_vetoed_outside_festive_months():
    assert calendar_features("2027-01-16", True)["is_festive"] == 1
    assert calendar_features("2027-06-16", True)["is_festive"] == 0
    assert calendar_features("2027-01-16", False)["is_festive"] == 0


def test_competition_grows_with_city_size_weekends_and_festivals():
    small = expected_competing_events("Seoni", 0, 0)
    assert expected_competing_events("Indore", 0, 0) > small
    assert expected_competing_events("Indore", 1, 1) >= expected_competing_events("Indore", 0, 0)
    assert 0 <= expected_competing_events("Indore", 1, 1) <= 25


def test_synergy_and_fit_map_onto_the_training_range():
    assert synergy_to_fit(0) == pytest.approx(FIT_MIN)
    assert synergy_to_fit(100) == pytest.approx(FIT_MAX)
    assert fit_to_synergy(synergy_to_fit(60)) in (59, 60)
    assert 0 <= fit_to_synergy(rule_based_fit_score("Beverage", "Music Concert")) <= 100


def test_reference_categories_are_all_zeros(columns):
    row = build_feature_row(columns, {}, {"city": "Bhopal", "event_type": "Business Conference",
                                          "brand_category": "Apparel", "brand_kpi": "awareness",
                                          "brand_city_focus": "all_mp"})
    one_hot = [column for column in columns if column.startswith(ONE_HOT_PREFIXES)]
    assert row[one_hot].to_numpy().sum() == 0


def test_serving_builds_the_same_features_as_training(columns):
    """Training-serving skew check: raw dataset rows, encoded the way the live service
    encodes them, must equal the rows the models were trained on."""
    raw = pd.read_csv(SERVICE_DIR / "mp_sponsorwise_dataset.csv", nrows=200)
    trained = pd.read_csv(SERVICE_DIR / "mp_sponsorwise_ml_features.csv", nrows=200)[columns]
    numeric = [column for column in columns if not column.startswith(ONE_HOT_PREFIXES)]
    for index in range(len(raw)):
        record = raw.iloc[index]
        row = build_feature_row(
            columns,
            {name: record[name] for name in numeric},
            {prefix: record[prefix] for prefix in ONE_HOT_PREFIXES},
        )
        assert row.iloc[0].tolist() == pytest.approx(trained.iloc[index].astype(float).tolist())
