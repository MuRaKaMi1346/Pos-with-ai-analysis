"""Ingredient repository."""

from collections.abc import Sequence

from sqlmodel import Session, select

from app.models import Ingredient
from app.repositories.base import BaseRepository

repository = BaseRepository(Ingredient)


def get_by_name(session: Session, name: str) -> Ingredient | None:
    return session.exec(select(Ingredient).where(Ingredient.name == name)).first()


def list_filtered(
    session: Session,
    *,
    active_only: bool = True,
    offset: int = 0,
    limit: int = 200,
) -> Sequence[Ingredient]:
    statement = select(Ingredient)
    if active_only:
        statement = statement.where(Ingredient.is_active.is_(True))  # type: ignore[attr-defined]
    return session.exec(statement.offset(offset).limit(limit)).all()
