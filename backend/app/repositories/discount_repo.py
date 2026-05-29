"""Discount repository."""

from collections.abc import Sequence

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, select

from app.models import Discount
from app.repositories.base import BaseRepository

repository = BaseRepository(Discount)


def get_by_code(session: Session, code: str) -> Discount | None:
    return session.exec(select(Discount).where(Discount.code == code)).first()


def list_filtered(session: Session, *, active_only: bool = False) -> Sequence[Discount]:
    id_col: ColumnElement[int] = Discount.id  # type: ignore[assignment]
    statement = select(Discount).order_by(id_col)
    if active_only:
        statement = statement.where(Discount.is_active == True)  # noqa: E712 (SQLAlchemy)
    return session.exec(statement).all()
