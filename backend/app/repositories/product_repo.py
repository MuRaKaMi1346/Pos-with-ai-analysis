"""Product repository — generic CRUD + active-list filter."""

from collections.abc import Sequence

from sqlmodel import Session, select

from app.models import Product
from app.repositories.base import BaseRepository

repository = BaseRepository(Product)


def get_by_name(session: Session, name: str) -> Product | None:
    return session.exec(select(Product).where(Product.name == name)).first()


def list_filtered(
    session: Session,
    *,
    category_id: int | None = None,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Product]:
    statement = select(Product)
    if active_only:
        statement = statement.where(Product.is_active.is_(True))  # type: ignore[attr-defined]
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    return session.exec(statement.offset(offset).limit(limit)).all()
