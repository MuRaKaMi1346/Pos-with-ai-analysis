"""Order endpoints."""

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.models import Order
from app.schemas.order import OrderCreate, OrderRead
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> Order:
    """Create a new sale. Stock is deducted per BOM in one transaction."""
    assert current.id is not None
    return order_service.create_order(
        session,
        user_id=current.id,
        items_in=data.items,
        note=data.note,
    )


@router.get("/", response_model=list[OrderRead])
def list_orders(
    session: DBSessionDep,
    _current: CurrentUserDep,
    mine_only: bool = False,
    offset: int = 0,
    limit: int = 100,
) -> list[Order]:
    user_id = _current.id if mine_only else None
    return list(order_service.list_recent(session, user_id=user_id, offset=offset, limit=limit))


@router.get("/{order_id}", response_model=OrderRead)
def get_order(
    order_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Order:
    return order_service.get_or_404(session, order_id)
