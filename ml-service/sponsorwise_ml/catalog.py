"""What the models know about Madhya Pradesh events and brands, and how free-text
names are matched to the exact names the models were trained on."""

import re
from typing import Dict, List, Optional, Tuple

# Monthly weather defaults for Madhya Pradesh: (temperature °C, humidity %, is_raining)
MP_WEATHER_DEFAULTS: Dict[int, Tuple[int, int, int]] = {
    1:  (17, 55, 0), 2:  (20, 45, 0), 3:  (26, 32, 0),
    4:  (32, 25, 0), 5:  (36, 28, 0), 6:  (34, 58, 1),
    7:  (28, 82, 1), 8:  (27, 85, 1), 9:  (28, 78, 0),
    10: (27, 58, 0), 11: (22, 52, 0), 12: (18, 55, 0),
}
DEFAULT_WEATHER: Tuple[int, int, int] = (25, 60, 0)

# Training only marks events as festive in these months
FESTIVE_MONTHS = frozenset({1, 2, 3, 4, 8, 9, 10, 11, 12})

# Relative population weight of each city, used to estimate competing events
CITIES_POP: Dict[str, float] = {
    "Indore": 35.0,  "Bhopal": 28.0,       "Jabalpur": 16.0,  "Gwalior": 12.0,
    "Ujjain": 6.5,   "Sagar": 4.0,          "Dewas": 3.5,      "Satna": 3.5,
    "Rewa": 2.8,     "Ratlam": 3.0,         "Katni": 2.5,      "Chhindwara": 2.0,
    "Khandwa": 2.5,  "Burhanpur": 2.2,      "Morena": 2.5,     "Singrauli": 2.8,
    "Vidisha": 2.0,  "Narmadapuram": 1.8,   "Shivpuri": 1.8,   "Damoh": 1.5,
    "Sehore": 1.5,   "Seoni": 1.3,          "Neemuch": 1.3,    "Mandsaur": 1.5,
    "Khargone": 1.8,
}
DEFAULT_CITY = "Indore"

# Category benchmark budgets (INR), used only when the brand's own budget is not supplied
BRAND_BUDGET_DEFAULTS: Dict[str, int] = {
    "Automobile":           40_00_000,
    "Telecom":              38_00_000,
    "Real Estate":          30_00_000,
    "FMCG":                 22_00_000,
    "Beverage":             20_00_000,
    "Fintech":              18_00_000,
    "Edtech":               14_00_000,
    "Apparel":              12_00_000,
    "Beauty/Personal Care": 10_00_000,
    "Local Retail":          6_00_000,
}
DEFAULT_BRAND_BUDGET = 20_00_000

# Who each brand category targets ("aud") and the event types it likes ("aff")
BRAND_AFFINITIES: Dict[str, Dict[str, List[str]]] = {
    "FMCG": {
        "aud": ["mass", "family"],
        "aff": ["Food Festival", "Cricket Screening", "Religious/Cultural", "College Fest"],
    },
    "Beverage": {
        "aud": ["mass", "youth", "family"],
        "aff": ["Music Concert", "Food Festival", "Cricket Screening", "College Fest", "Sports Tournament"],
    },
    "Fintech": {
        "aud": ["youth", "professional"],
        "aff": ["Tech Meetup", "Business Conference", "College Fest"],
    },
    "Edtech": {
        "aud": ["youth"],
        "aff": ["Tech Meetup", "College Fest"],
    },
    "Automobile": {
        "aud": ["mass", "professional"],
        "aff": ["Sports Tournament", "Cricket Screening", "Business Conference", "Music Concert"],
    },
    "Telecom": {
        "aud": ["mass", "youth"],
        "aff": ["Music Concert", "Cricket Screening", "College Fest", "Food Festival", "Religious/Cultural"],
    },
    "Apparel": {
        "aud": ["youth", "family"],
        "aff": ["Music Concert", "College Fest", "Standup Comedy", "Food Festival"],
    },
    "Beauty/Personal Care": {
        "aud": ["youth", "family"],
        "aff": ["Music Concert", "College Fest", "Food Festival"],
    },
    "Local Retail": {
        "aud": ["mass", "family"],
        "aff": ["Religious/Cultural", "Food Festival", "Sports Tournament", "Cricket Screening"],
    },
    "Real Estate": {
        "aud": ["professional", "family"],
        "aff": ["Business Conference", "Cricket Screening", "Religious/Cultural"],
    },
}

# The audience each event type draws
EVENT_TAGS: Dict[str, List[str]] = {
    "Music Concert":       ["youth", "family"],
    "Food Festival":       ["family", "mass"],
    "Religious/Cultural":  ["family", "mass"],
    "Cricket Screening":   ["mass", "youth"],
    "Standup Comedy":      ["youth"],
    "Tech Meetup":         ["youth", "professional"],
    "College Fest":        ["youth"],
    "Sports Tournament":   ["youth", "mass"],
    "Business Conference": ["professional"],
}

# Every name the models were trained on. "Business Conference" and "Apparel" have no
# one-hot column because get_dummies(drop_first=True) dropped them: all zeros means them.
EVENT_TYPES = frozenset(EVENT_TAGS)
BRAND_CATEGORIES = frozenset(BRAND_BUDGET_DEFAULTS)


def normalize_text(text: Optional[str]) -> str:
    """Lowercase and turn every run of non-alphanumeric characters into one space."""
    return re.sub(r"[^a-z0-9]+", " ", (text or "").lower()).strip()


def _normalized_keys(raw: Dict[str, str]) -> Dict[str, str]:
    # Keys are normalized like the input, so "stand-up comedy" matches "stand up comedy"
    return {normalize_text(key): value for key, value in raw.items()}


EVENT_ALIASES: Dict[str, str] = _normalized_keys({
    "stand-up comedy":     "Standup Comedy",
    "standup comedy":      "Standup Comedy",
    "comedy show":         "Standup Comedy",
    "religious/cultural":  "Religious/Cultural",
    "cultural festival":   "Religious/Cultural",
    "charity gala":        "Religious/Cultural",
    "art exhibition":      "Religious/Cultural",
    "tech meet-up":        "Tech Meetup",
    "tech meetup":         "Tech Meetup",
    "tech conference":     "Tech Meetup",
    "business conference": "Business Conference",
    "startup pitch":       "Tech Meetup",
    "hackathon":           "Tech Meetup",
    "college fest":        "College Fest",
    "fashion show":        "College Fest",
    "music concert":       "Music Concert",
    "food festival":       "Food Festival",
    "cricket screening":   "Cricket Screening",
    "sports tournament":   "Sports Tournament",
    "sports event":        "Sports Tournament",
    "gaming tournament":   "Sports Tournament",
})

BRAND_ALIASES: Dict[str, str] = _normalized_keys({
    "beauty":               "Beauty/Personal Care",
    "beauty/personal care": "Beauty/Personal Care",
    "personal care":        "Beauty/Personal Care",
    "health":               "Beauty/Personal Care",
    "wellness":             "Beauty/Personal Care",
    "fmcg":                 "FMCG",
    "food & beverage":      "FMCG",
    "food and beverage":    "FMCG",
    "telecom":              "Telecom",
    "technology":           "Telecom",
    "entertainment":        "Telecom",
    "software":             "Telecom",
    "electronics":          "Telecom",
    "real estate":          "Real Estate",
    "beverage":             "Beverage",
    "fintech":              "Fintech",
    "finance":              "Fintech",
    "finance & banking":    "Fintech",
    "banking":              "Fintech",
    "edtech":               "Edtech",
    "education":            "Edtech",
    "local retail":         "Local Retail",
    "retail":               "Local Retail",
    "e-commerce":           "Local Retail",
    "travel & tourism":     "Local Retail",
    "fashion & apparel":    "Apparel",
    "fashion":              "Apparel",
    "apparel":              "Apparel",
    "sports & fitness":     "Apparel",
    "automobile":           "Automobile",
})

# When no alias matches, keywords in the name and description decide, checked in order
EVENT_KEYWORDS: List[Tuple[str, List[str]]] = [
    ("Music Concert",       ["concert", "gig", "music", "dj"]),
    ("Food Festival",       ["festival", "food", "fair", "culinary"]),
    ("Standup Comedy",      ["comedy", "stand up", "standup"]),
    ("College Fest",        ["college", "campus", "youth", "fashion"]),
    ("Sports Tournament",   ["sports", "tournament", "match", "gaming", "esports"]),
    ("Business Conference", ["business conference", "corporate"]),
    ("Tech Meetup",         ["tech", "startup", "conference", "summit", "hackathon", "meetup", "pitch", "expo"]),
    ("Cricket Screening",   ["cricket", "screening", "watch party"]),
    ("Religious/Cultural",  ["cultural", "religious", "community", "heritage", "art", "charity"]),
]
DEFAULT_EVENT_TYPE = "Religious/Cultural"

BRAND_KEYWORDS: List[Tuple[str, List[str]]] = [
    ("Fintech",              ["finance", "bank", "banking", "payment", "wallet", "insurance", "loan", "credit"]),
    ("Beauty/Personal Care", ["beauty", "wellness", "health", "personal care", "cosmetic", "skin", "spa"]),
    ("Beverage",             ["beverage", "drink", "energy drink", "juice", "cola", "water"]),
    ("FMCG",                 ["food", "snack", "grocery", "fmcg", "consumer goods", "household"]),
    ("Edtech",               ["education", "edtech", "learning", "academy", "course", "training"]),
    ("Real Estate",          ["real estate", "property", "builder", "housing", "residential"]),
    ("Automobile",           ["automobile", "car", "bike", "ev", "vehicle", "mobility"]),
    ("Telecom",              ["technology", "tech", "telecom", "software", "electronics", "media",
                              "streaming", "entertainment", "digital"]),
    ("Apparel",              ["fashion", "apparel", "clothing", "fitness", "sportswear"]),
    ("Local Retail",         ["retail", "e commerce", "ecommerce", "marketplace", "travel", "tourism",
                              "hotel", "restaurant"]),
]
DEFAULT_BRAND_CATEGORY = "Local Retail"


def _mentions_any(text: str, terms: List[str]) -> bool:
    """Whole-word match, plural allowed, so "ev" does not match "event"."""
    return any(re.search(rf"\b{re.escape(term)}s?\b", text) for term in terms)


def _first_keyword_match(text: str, rules: List[Tuple[str, List[str]]], default: str) -> str:
    for name, terms in rules:
        if _mentions_any(text, terms):
            return name
    return default


def resolve_city(name: Optional[str]) -> str:
    wanted = normalize_text(name)
    if not wanted:
        return DEFAULT_CITY
    for city in CITIES_POP:
        known = normalize_text(city)
        if known == wanted or known in wanted or wanted in known:
            return city
    # Unknown cities pass through; they simply get no one-hot column
    return (name or "").strip()


def resolve_event_type(name: Optional[str], description: Optional[str] = None) -> str:
    alias = EVENT_ALIASES.get(normalize_text(name))
    if alias in EVENT_TYPES:
        return alias
    text = normalize_text(f"{name or ''} {description or ''}")
    return _first_keyword_match(text, EVENT_KEYWORDS, DEFAULT_EVENT_TYPE)


def resolve_brand_category(name: Optional[str], description: Optional[str] = None, brand_name: Optional[str] = None) -> str:
    alias = BRAND_ALIASES.get(normalize_text(name))
    if alias in BRAND_CATEGORIES:
        return alias
    text = normalize_text(f"{name or ''} {description or ''} {brand_name or ''}")
    return _first_keyword_match(text, BRAND_KEYWORDS, DEFAULT_BRAND_CATEGORY)
