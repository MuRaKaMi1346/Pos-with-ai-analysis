"""Customer repository (M7)."""

from collections.abc import Sequence

from sqlalchemy import or_
from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, desc, select

from app.models import Customer
from app.repositories.base import BaseRepository

repository = BaseRepository(Customer)


def get_by_phone(session: Session, phone: str) -> Customer | None:
    return session.exec(select(Customer).where(Customer.phone == phone)).first()


def search(
    session: Session,
    *,
    q: str | None = None,
    include_inactive: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> Sequence[Customer]:
    """Substring search over name / phone / code, newest first.

    Active-only by default (``include_inactive`` surfaces soft-deleted rows
    for admin views).
    """
    created_col: ColumnElement[object] = Customer.created_at  # type: ignore[assignment]
    statement = select(Customer)
    if not include_inactive:
        statement = statement.where(Customer.is_active == True)  # noqa: E712 (SQLAlchemy)
    if q:
        like = f"%{q}%"
        name_col: ColumnElement[str] = Customer.name  # type: ignore[assignment]
        phone_col: ColumnElement[str] = Customer.phone  # type: ignore[assignment]
        code_col: ColumnElement[str] = Customer.code  # type: ignore[assignment]
        statement = statement.where(
            or_(name_col.like(like), phone_col.like(like), code_col.like(like))
        )
    statement = statement.order_by(desc(created_col)).offset(offset).limit(limit)
    return session.exec(statement).all()
