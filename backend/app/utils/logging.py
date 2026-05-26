"""Structured logging setup (stdlib only — keep dependency-free)."""

import logging
import sys

from app.core.config import Settings


def setup_logging(settings: Settings) -> None:
    """Configure root logger with a single stdout handler."""
    handler = logging.StreamHandler(stream=sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S%z",
        )
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())
