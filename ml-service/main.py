"""Entry point. Production runs `uvicorn main:app`; locally, `python main.py` also works.
The service itself lives in the sponsorwise_ml package."""

import os

import uvicorn

from sponsorwise_ml.api import app
from sponsorwise_ml.config import settings

__all__ = ["app"]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=settings.dev_mode)
