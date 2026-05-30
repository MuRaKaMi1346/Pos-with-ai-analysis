"""Audit log writer (M4 skeleton).

A single ``record`` helper everyone calls. Payload is serialized to JSON
text on SQLite for portability. Callers don't commit — the caller's
outer transaction owns commit timing so a failed action doesn't leave
an orphan audit row.
"""

import json
from collections.abc import Sequence
from typing import Any

from sqlmodel import Session

from app.models import AuditLog, User
from app.repositories import audit_repo


def _default(value: object) -> object:
    """Coerce non-JSON-native values to strings (Decimal, datetime, etc.)."""
    return str(value)


def record(
    session: Session,
    *,
    actor: User | None,
    action: str,
    entity_type: str,
    entity_id: int,
    payload: dict[str, Any] | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Append one ``AuditLog`` row. Caller commits."""
    row = AuditLog(
        user_id=actor.id if actor is not None else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        payload_json=json.dumps(payload, default=_default) if payload else None,
        ip_address=ip_address,
    )
    session.add(row)
    return row


def list_logs(
    session: Session,
    *,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[AuditLog]:
    """Most-recent-first audit trail (admin read)."""
    return audit_repo.list_filtered(
        session,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=user_id,
        offset=offset,
        limit=limit,
    )
