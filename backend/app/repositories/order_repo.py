"""Order repository."""

from collections.abc import Sequence

from sqlmodel import Session, desc, select

from app.models import Order
from app.repositories.base import BaseRepository

repository = BaseRepository(Order)


def list_recent(
    session: Session,
    *,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Order]:
    statement = select(Order).order_by(desc(Order.created_at))
    if user_id is not None:
        statement = statement.where(Order.user_id == user_id)
    return session.exec(statement.offset(offset).limit(limit)).all()
