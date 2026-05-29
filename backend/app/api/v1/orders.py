"""Order endpoints — create + lifecycle (hold / resume / send / void)."""

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, SettingsDep
from app.models import Order
from app.schemas.order import (
    OrderCreate,
    OrderItemsReplace,
    OrderRead,
    VoidReasonBody,
)
from app.services import order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    """Open a new bill. M3: no stock check / deduction — those happen at send-to-kitchen."""
    assert current.id is not None
    return order_service.create_order(
        session,
        user_id=current.id,
        payload=data,
        settings=settings,
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


@router.post("/{order_id}/hold", response_model=OrderRead)
def hold(
    order_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Order:
    order = order_service.get_or_404(session, order_id)
    return order_service.hold_order(session, order)


@router.post("/{order_id}/resume", response_model=OrderRead)
def resume(
    order_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Order:
    order = order_service.get_or_404(session, order_id)
    return order_service.resume_order(session, order)


@router.patch("/{order_id}/items", response_model=OrderRead)
def replace_items(
    order_id: int,
    data: OrderItemsReplace,
    session: DBSessionDep,
    settings: SettingsDep,
    _current: CurrentUserDep,
) -> Order:
    order = order_service.get_or_404(session, order_id)
    return order_service.replace_items(session, order, data, settings)


@router.post("/{order_id}/send-to-kitchen", response_model=OrderRead)
def send_to_kitchen(
    order_id: int,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> Order:
    assert current.id is not None
    order = order_service.get_or_404(session, order_id)
    return order_service.send_to_kitchen(session, order, user_id=current.id)


@router.post("/{order_id}/items/{item_id}/void", response_model=OrderRead)
def void_item(
    order_id: int,
    item_id: int,
    data: VoidReasonBody,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    """Line void. Staff OK pre-send; admin required once sent to kitchen."""
    order = order_service.get_or_404(session, order_id)
    return order_service.void_item(
        session,
        order,
        item_id,
        reason=data.reason,
        actor=current,
        settings=settings,
    )


@router.post("/{order_id}/void", response_model=OrderRead)
def void_bill(
    order_id: int,
    data: VoidReasonBody,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> Order:
    """Whole-bill void. Admin only. Reverses stock if the bill was sent."""
    order = order_service.get_or_404(session, order_id)
    return order_service.void_order(
        session,
        order,
        reason=data.reason,
        actor=current,
    )
