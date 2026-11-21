"""Request bodies. Limits reject nonsense early (negative money, NaN, absurd sizes,
huge text) while staying far above any real event the backend can send."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

MONEY_LIMIT = 10_000_000_000       # ₹1,000 crore
CAPACITY_LIMIT = 10_000_000
NAME_LENGTH = 200
TEXT_LENGTH = 20_000               # long descriptions are trimmed before reaching the AI


def _money(description: str):
    return Field(..., ge=0, le=MONEY_LIMIT, allow_inf_nan=False, description=description)


def _rating():
    return Field(None, ge=0.0, le=1.0, allow_inf_nan=False)


class BrandInput(BaseModel):
    company_name: str = Field(..., max_length=NAME_LENGTH)
    industry: str = Field(..., max_length=NAME_LENGTH)
    brand_description: Optional[str] = Field(None, max_length=TEXT_LENGTH)


class EventInput(BaseModel):
    city: str = Field(..., max_length=NAME_LENGTH)
    event_type: str = Field(..., max_length=NAME_LENGTH)
    sponsor_category: str = Field(..., max_length=NAME_LENGTH)

    brand_name: Optional[str] = Field("Brand", max_length=NAME_LENGTH)
    brand_description: Optional[str] = Field(None, max_length=TEXT_LENGTH)
    event_description: Optional[str] = Field(None, max_length=TEXT_LENGTH)

    date: str = Field(..., description="Event date, YYYY-MM-DD.")
    price: float = _money("Ticket price in INR.")
    marketing_budget: float = _money("Marketing spend in INR.")
    sponsor_amount: float = _money("Sponsorship ask in INR.")
    venue_capacity: int = Field(..., ge=1, le=CAPACITY_LIMIT, description="Maximum venue capacity.")

    # Organizer and event quality. Omitted values use the training medians.
    organizer_reputation: Optional[float] = _rating()
    lineup_quality: Optional[float] = _rating()
    is_indoor: Optional[int] = Field(None, ge=0, le=1)
    is_festive: Optional[int] = Field(None, ge=0, le=1, description="1 if the event falls in a festival season.")
    social_media_reach: Optional[int] = Field(None, ge=0, le=MONEY_LIMIT)
    past_events_organized: Optional[int] = Field(None, ge=0, le=100_000)

    # Brand signals
    brand_annual_budget: Optional[int] = Field(
        None, ge=0, le=MONEY_LIMIT,
        description="The brand's yearly sponsorship budget. Omitted means the category benchmark; never derived from the ask.",
    )
    brand_kpi: Optional[Literal["awareness", "hybrid", "leads", "sales"]] = None
    brand_city_focus: Optional[Literal["all_mp", "metro", "tier2", "pilgrimage"]] = None
    brand_activation_maturity: Optional[float] = _rating()

    @field_validator("date")
    @classmethod
    def _real_calendar_date(cls, value: str) -> str:
        try:
            day = datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError("'date' must be in YYYY-MM-DD format.")
        if not 2000 <= day.year <= 2100:
            raise ValueError("'date' must be between the years 2000 and 2100.")
        return value
