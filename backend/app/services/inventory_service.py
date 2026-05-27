"""Inventory operations — every quantity change records a StockMovement."""

from collections.abc import Sequence
from decimal import Decimal

from sqlmodel import Session

from app.core.exceptions import NotFoundError
from app.models import Ingredient, MovementType, StockLevel, StockMovement
from app.repositories import inventory_repo
from app.utils.datetime import now_utc


def list_all_stock(session: Session) -> Sequence[StockLevel]:
    return inventory_repo.list_all_stock(session)


def list_movements(
    session: Session,
    *,
    ingredient_id: int | None = None,
    movement_type: MovementType | None = None,
    offset: int = 0,
    limit: int = 100,
) -> Sequence[StockMovement]:
    return inventory_repo.list_movements(
        session,
        ingredient_id=ingredient_id,
        movement_type=movement_type,
        offset=offset,
        limit=limit,
    )


def receive_stock(
    session: Session,
    *,
    ingredient_id: int,
    qty: Decimal,
    user_id: int | None,
    ref: str | None = None,
    note: str | None = None,
) -> StockLevel:
    """Increment ingredient stock and write the StockMovement row.

    Pydantic on the request side validates qty > 0; this guard is defensive.
    """
    if qty <= Decimal("0"):
        raise NotFoundError("invalid_qty")

    if session.get(Ingredient, ingredient_id) is None:
        raise NotFoundError("ingredient_not_found")

    stock = inventory_repo.get_stock(session, ingredient_id)
    if stock is None:
        stock = StockLevel(ingredient_id=ingredient_id, quantity=qty)
    else:
        stock.quantity = stock.quantity + qty
        stock.updated_at = now_utc()
    session.add(stock)

    movement = StockMovement(
        ingredient_id=ingredient_id,
        type=MovementType.RECEIVE,
        qty=qty,
        ref=ref,
        note=note,
        user_id=user_id,
    )
    session.add(movement)

    session.commit()
    session.refresh(stock)
    return stock
