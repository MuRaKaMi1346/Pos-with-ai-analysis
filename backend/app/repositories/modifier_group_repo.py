"""ModifierGroup repository."""

from collections.abc import Sequence

from sqlalchemy.sql import ColumnElement
from sqlmodel import Session, select

from app.models import ModifierGroup
from app.repositories.base import BaseRepository

repository = BaseRepository(ModifierGroup)


def list_all(session: Session) -> Sequence[ModifierGroup]:
    sort_col: ColumnElement[int] = ModifierGroup.sort_order  # type: ignore[assignment]
    id_col: ColumnElement[int] = ModifierGroup.id  # type: ignore[assignment]
    return session.exec(select(ModifierGroup).order_by(sort_col, id_col)).all()


def get_by_name(session: Session, name: str) -> ModifierGroup | None:
    return session.exec(select(ModifierGroup).where(ModifierGroup.name == name)).first()
