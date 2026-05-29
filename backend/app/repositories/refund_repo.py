"""Refund repository."""

from collections.abc import Sequence

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, desc, select

from app.models import Refund
from app.repositories.base import BaseRepository

repository = BaseRepository(Refund)


def list_filtered(
    session: Session,
    *,
    order_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Refund]:
    created_col: ColumnElement[object] = Refund.created_at  # type: ignore[assignment]
    statement = select(Refund).order_by(desc(created_col))
    if order_id is not None:
        statement = statement.where(Refund.order_id == order_id)
    return session.exec(statement.offset(offset).limit(limit)).all()
