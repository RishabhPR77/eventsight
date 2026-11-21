"""API key check for the protected routes. Only the SponsorWise backend holds the key."""

import hmac
import logging
from typing import Optional

from fastapi import HTTPException, Security
from fastapi.security.api_key import APIKeyHeader

from .config import settings

logger = logging.getLogger("sponsorwise.security")

_api_key_header = APIKeyHeader(
    name="X-API-Key",
    description="The shared key the SponsorWise backend sends with every request.",
    auto_error=False,
)


def require_api_key(key: Optional[str] = Security(_api_key_header)) -> None:
    expected = settings.service_api_key
    if not expected:
        # Only possible with DEV_MODE on: startup refuses to run without a key otherwise
        return
    # Constant-time comparison, so response timing reveals nothing about the key
    if not key or not hmac.compare_digest(key.encode(), expected.encode()):
        logger.warning("Rejected request: invalid or missing API key")
        raise HTTPException(status_code=403, detail="Invalid or missing API key. Pass it in the X-API-Key header.")
