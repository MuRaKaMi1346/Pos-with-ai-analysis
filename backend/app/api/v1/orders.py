"""Order endpoints — create + lifecycle + discounts + pay (M5)."""

from typing import Any

from fastapi import APIRouter, Header, status
from fastapi.responses import JSONResponse

from app.core.dependencies import CurrentUserDep, DBSessionDep, SettingsDep
from app.core.exceptions import NotFoundError
from app.models import Order
from app.schemas.discount import ApplyDiscountBody
from app.schemas.order import (
    OrderCreate,
    OrderItemsReplace,
    OrderRead,
    VoidReasonBody,
)
from app.schemas.payment import PayBody
from app.services import discount_service, idempotency, order_service, payment_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
def create_order(
    data: OrderCreate,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    """Open a new bill. M3: no stock check / deduction — those happen at send-to-kitchen.

    M5: honors ``Idempotency-Key`` — repeats with the same key + body replay
    the cached response; same key + different body → 409 mismatch.
    """
    assert current.id is not None
    body = data.model_dump(mode="json")
    if idempotency_key:
        hit = idempotency.check(
            session,
            key=idempotency_key,
            endpoint="create_order",
            user_id=current.id,
            request_body=body,
        )
        if hit is not None:
            return JSONResponse(status_code=hit.status_code, content=hit.body)

    order = order_service.create_order(
        session,
        user_id=current.id,
        payload=data,
        settings=settings,
    )

    if idempotency_key:
        response_body = OrderRead.model_validate(order, from_attributes=True).model_dump(
            mode="json"
        )
        idempotency.record(
            session,
            key=idempotency_key,
            endpoint="create_order",
            user_id=current.id,
            request_body=body,
            response_status=status.HTTP_201_CREATED,
            response_body=response_body,
        )
        session.commit()
    return order


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


# ── M5: pay (multi-tender + idempotency) ────────────────────────────


@router.post("/{order_id}/pay", response_model=OrderRead)
def pay_order(
    order_id: int,
    data: PayBody,
    session: DBSessionDep,
    current: CurrentUserDep,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> Any:
    """Flip bill to PAID with the supplied tender mix.

    Idempotency-Key replays the prior response on retry (same key + body)
    or 409s on body mismatch. Pay is the high-stakes path for retries —
    double-charge is the failure mode we're guarding.
    """
    assert current.id is not None
    body = data.model_dump(mode="json")
    if idempotency_key:
        hit = idempotency.check(
            session,
            key=idempotency_key,
            endpoint="pay_order",
            user_id=current.id,
            request_body={"order_id": order_id, **body},
        )
        if hit is not None:
            return JSONResponse(status_code=hit.status_code, content=hit.body)

    order = order_service.get_or_404(session, order_id)
    paid = payment_service.pay_order(session, order, data.tenders)

    if idempotency_key:
        response_body = OrderRead.model_validate(paid, from_attributes=True).model_dump(mode="json")
        idempotency.record(
            session,
            key=idempotency_key,
            endpoint="pay_order",
            user_id=current.id,
            request_body={"order_id": order_id, **body},
            response_status=status.HTTP_200_OK,
            response_body=response_body,
        )
        session.commit()
    return paid


# ── M4: discount apply / remove ──────────────────────────────────────


@router.post(
    "/{order_id}/discounts",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
)
def apply_order_discount(
    order_id: int,
    data: ApplyDiscountBody,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    """Apply an order-level discount (coded or ad-hoc). Admin if over threshold."""
    order = order_service.get_or_404(session, order_id)
    discount_service.apply_to_order(session, order, data, actor=current, settings=settings)
    order_service.recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order


@router.delete("/{order_id}/discounts/{order_discount_id}", response_model=OrderRead)
def remove_order_discount(
    order_id: int,
    order_discount_id: int,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    """Remove a previously-applied order-level discount."""
    order = order_service.get_or_404(session, order_id)
    discount_service.remove_from_order(session, order, order_discount_id, actor=current)
    order_service.recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order


@router.post(
    "/{order_id}/items/{item_id}/discounts",
    response_model=OrderRead,
    status_code=status.HTTP_201_CREATED,
)
def apply_item_discount(
    order_id: int,
    item_id: int,
    data: ApplyDiscountBody,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    """Apply a line-level discount."""
    order = order_service.get_or_404(session, order_id)
    item = next((i for i in order.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("order_item_not_found")
    discount_service.apply_to_item(session, order, item, data, actor=current, settings=settings)
    order_service.recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order


@router.delete(
    "/{order_id}/items/{item_id}/discounts/{order_item_discount_id}",
    response_model=OrderRead,
)
def remove_item_discount(
    order_id: int,
    item_id: int,
    order_item_discount_id: int,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> Order:
    order = order_service.get_or_404(session, order_id)
    item = next((i for i in order.items if i.id == item_id), None)
    if item is None:
        raise NotFoundError("order_item_not_found")
    discount_service.remove_from_item(session, order, item, order_item_discount_id, actor=current)
    order_service.recompute_totals(session, order, settings)
    session.commit()
    session.refresh(order)
    return order
