import pytest

from sponsorwise_ml.catalog import (BRAND_CATEGORIES, EVENT_TYPES, resolve_brand_category, resolve_city,
                                   resolve_event_type)


@pytest.mark.parametrize("name", sorted(EVENT_TYPES))
def test_every_trained_event_type_matches_itself_in_any_case(name):
    assert resolve_event_type(name) == name
    assert resolve_event_type(name.lower()) == name
    assert resolve_event_type(name.upper()) == name


@pytest.mark.parametrize("name", sorted(BRAND_CATEGORIES))
def test_every_trained_brand_category_matches_itself_in_any_case(name):
    assert resolve_brand_category(name) == name
    assert resolve_brand_category(name.lower()) == name
    assert resolve_brand_category(name.upper()) == name


@pytest.mark.parametrize("text, expected", [
    ("stand-up comedy", "Standup Comedy"),
    ("Stand Up  Comedy!", "Standup Comedy"),
    ("tech meet-up", "Tech Meetup"),
    ("hackathon", "Tech Meetup"),
])
def test_event_aliases_ignore_punctuation(text, expected):
    assert resolve_event_type(text) == expected


def test_event_keywords_decide_when_no_alias_matches():
    assert resolve_event_type("Evening", "live DJ and music") == "Music Concert"
    assert resolve_event_type("Something new") == "Religious/Cultural"


def test_brand_keywords_need_whole_words():
    # "ev" (electric vehicle) must not match inside "events"
    assert resolve_brand_category("Unknown", "we sponsor events") != "Automobile"
    assert resolve_brand_category("Unknown", "an EV charging network") == "Automobile"


def test_cities():
    assert resolve_city("indore city") == "Indore"
    assert resolve_city("") == "Indore"
    assert resolve_city("  Atlantis ") == "Atlantis"  # unknown cities pass through
