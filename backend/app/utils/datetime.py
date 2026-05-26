"""Timezone-aware datetime helpers.

Project standard: store UTC in DB, convert to Asia/Bangkok at the API edge.
"""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

BANGKOK_TZ = ZoneInfo("Asia/Bangkok")


def now_utc() -> datetime:
    """Current UTC time (timezone-aware)."""
    return datetime.now(UTC)


def to_bangkok(dt: datetime) -> datetime:
    """Convert a datetime to Asia/Bangkok. Naive input is assumed to be UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(BANGKOK_TZ)
