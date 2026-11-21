"""Settings, read once from the environment (and from .env in local development)."""

import logging
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

SERVICE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(SERVICE_DIR / ".env")


def _is_true(value: str) -> bool:
    return value.strip().lower() in ("1", "true", "yes")


def _split_origins(value: str) -> tuple:
    return tuple(origin.strip() for origin in value.split(",") if origin.strip())


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_model: str
    service_api_key: str
    dev_mode: bool
    allowed_origins: tuple
    artifact_dir: Path

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            groq_api_key=os.getenv("GROQ_API_KEY", ""),
            groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            service_api_key=os.getenv("SERVICE_API_KEY", ""),
            dev_mode=_is_true(os.getenv("DEV_MODE", "")),
            allowed_origins=_split_origins(os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")),
            artifact_dir=Path(os.getenv("ARTIFACT_DIR", str(SERVICE_DIR))),
        )

    def check(self) -> None:
        """Refuse to start in production without the key the backend authenticates with."""
        if not self.service_api_key and not self.dev_mode:
            raise RuntimeError("SERVICE_API_KEY must be set unless DEV_MODE is on.")


settings = Settings.from_env()


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
