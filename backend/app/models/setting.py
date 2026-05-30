"""Key/value store settings (M10).

One row per setting ``key`` holding a JSON-encoded ``value_json``. The typed
view + defaults live in ``settings_service`` / ``schemas.setting``; this
table just holds durable overrides an admin can edit at runtime without a
redeploy.

Distinct from ``app.core.config.Settings`` (the env/.env bootstrap config) —
hence the ``AppSetting`` class name to avoid confusion at import sites.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.utils.datetime import now_utc


class AppSetting(SQLModel, table=True):
    __tablename__ = "settings"

    key: str = Field(primary_key=True, max_length=100)
    value_json: str  # JSON-encoded scalar; Decimals stored as strings
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)
