"""Product repository — generic CRUD + active-list filter."""

from collections.abc import Sequence

from sqlalchemy.orm import selectinload
from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, select

from app.models import Category, Modifier, Product
from app.repositories.base import BaseRepository

repository = BaseRepository(Product)


def get_by_name(session: Session, name: str) -> Product | None:
    return session.exec(select(Product).where(Product.name == name)).first()


def get_with_modifiers(session: Session, product_id: int) -> Product | None:
    """Product with its linked modifiers + their groups eager-loaded (POS picker)."""
    statement = (
        select(Product)
        .where(Product.id == product_id)
        .options(selectinload(Product.modifiers).selectinload(Modifier.group))  # type: ignore[arg-type]
    )
    return session.exec(statement).first()


def list_categories(session: Session) -> Sequence[Category]:
    name_col: ColumnElement[str] = Category.name  # type: ignore[assignment]
    return session.exec(select(Category).order_by(name_col)).all()


def list_filtered(
    session: Session,
    *,
    category_id: int | None = None,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[Product]:
    statement = select(Product).options(selectinload(Product.modifiers))  # type: ignore[arg-type]
    if active_only:
        statement = statement.where(Product.is_active.is_(True))  # type: ignore[attr-defined]
    if category_id is not None:
        statement = statement.where(Product.category_id == category_id)
    return session.exec(statement.offset(offset).limit(limit)).all()
