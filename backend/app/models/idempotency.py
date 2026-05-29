"""Idempotency-Key store (M5).

Clients pass an opaque ``Idempotency-Key`` header on POST /orders/ and
POST /orders/{id}/pay; the service replays the prior response when the
same key arrives again. Keys are scoped by ``(endpoint, user_id)`` so
one user's key can't replay another's response.

Rows older than ``IDEMPOTENCY_TTL_HOURS`` are pruned by a small
maintenance call (TTL=24h per spec). M5 doesn't run the prune
automatically — a cron / scheduled call is left for ops.
"""

from datetime import datetime

from sqlmodel import Field, SQLModel

from app.utils.datetime import now_utc


class IdempotencyKey(SQLModel, table=True):
    __tablename__ = "idempotency_keys"

    # Composite PK in spirit: (key, endpoint, user_id). Modelled here with
    # a synthetic id + a UNIQUE constraint via the indexes on the model
    # columns; SQLite would need a real composite via __table_args__.
    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(max_length=128, index=True)
    endpoint: str = Field(max_length=120, index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    # SHA-256 of the canonical request body; used to detect "same key but
    # different body" (-> 409).
    request_hash: str = Field(max_length=64)
    response_status: int
    response_json: str  # serialized JSON of the body that was returned
    created_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
