import os
import sys
from pathlib import Path

# Settings are read at import time, so the test environment is set first
os.environ["SERVICE_API_KEY"] = "test-key"
os.environ["GROQ_API_KEY"] = ""
os.environ["DEV_MODE"] = ""

SERVICE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_DIR))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from sponsorwise_ml.api import app  # noqa: E402

API_KEY = {"X-API-Key": "test-key"}

VALID_EVENT = {
    "city": "Indore",
    "event_type": "Food Festival",
    "sponsor_category": "Beverage",
    "brand_name": "Nimbu Fizz",
    "date": "2027-01-16",
    "price": 0,
    "marketing_budget": 80000,
    "sponsor_amount": 45000,
    "venue_capacity": 8000,
}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


class FakeLanguageModel:
    """Stands in for Groq: returns a fixed reply so AI handling can be tested offline."""

    def __init__(self, reply):
        self.reply = reply
        self.prompts = []

    @property
    def enabled(self):
        return True

    def ask_json(self, system, prompt, max_tokens, temperature):
        self.prompts.append((system, prompt))
        return self.reply
