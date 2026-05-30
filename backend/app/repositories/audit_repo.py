"""Audit log repository (M10 read side)."""

from collections.abc import Sequence

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, desc, select

from app.models import AuditLog
from app.repositories.base import BaseRepository

repository = BaseRepository(AuditLog)


def list_filtered(
    session: Session,
    *,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[AuditLog]:
    created_col: ColumnElement[object] = AuditLog.created_at  # type: ignore[assignment]
    statement = select(AuditLog).order_by(desc(created_col))
    if action is not None:
        statement = statement.where(AuditLog.action == action)
    if entity_type is not None:
        statement = statement.where(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        statement = statement.where(AuditLog.entity_id == entity_id)
    if user_id is not None:
        statement = statement.where(AuditLog.user_id == user_id)
    return session.exec(statement.offset(offset).limit(limit)).all()
