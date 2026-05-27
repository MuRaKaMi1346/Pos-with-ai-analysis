"""Inventory repository: StockLevel (1 per ingredient) + StockMovement (history)."""

from collections.abc import Sequence

from sqlmodel import Session, desc, select

from app.models import MovementType, StockLevel, StockMovement
from app.repositories.base import BaseRepository

stock_repo = BaseRepository(StockLevel)
movement_repo = BaseRepository(StockMovement)


def get_stock(session: Session, ingredient_id: int) -> StockLevel | None:
    return session.exec(select(StockLevel).where(StockLevel.ingredient_id == ingredient_id)).first()


def list_all_stock(session: Session) -> Sequence[StockLevel]:
    return session.exec(select(StockLevel)).all()


def list_movements(
    session: Session,
    *,
    ingredient_id: int | None = None,
    movement_type: MovementType | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[StockMovement]:
    statement = select(StockMovement).order_by(desc(StockMovement.created_at))
    if ingredient_id is not None:
        statement = statement.where(StockMovement.ingredient_id == ingredient_id)
    if movement_type is not None:
        statement = statement.where(StockMovement.type == movement_type)
    return session.exec(statement.offset(offset).limit(limit)).all()
