"""AuditLog — structured trail for admin-flagged actions (M4 skeleton).

M4 writes for discount-apply / discount-remove; M10 (settings) will wire
void / refund / shift / settings changes through the same helper. JSON
payload is stored as TEXT on SQLite for portability — read/write through
``json.dumps`` / ``json.loads`` in the service.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.utils.datetime import now_utc


class AuditLog(SQLModel, table=True):
    __tablename__ = "audit_logs"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int | None = Field(default=None, foreign_key="users.id")
    action: str = Field(max_length=50, index=True)
    entity_type: str = Field(max_length=50, index=True)
    entity_id: int
    payload_json: str | None = Field(default=None)
    ip_address: str | None = Field(default=None, max_length=45)  # IPv6 max
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
