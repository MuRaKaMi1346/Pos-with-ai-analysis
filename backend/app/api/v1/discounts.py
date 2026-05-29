"""Discount endpoints — master CRUD + apply/remove per bill/line (M4)."""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.models import Discount, DiscountScope, Role
from app.schemas.discount import (
    DiscountCreate,
    DiscountRead,
    DiscountUpdate,
)
from app.services import discount_service

router = APIRouter(prefix="/discounts", tags=["discounts"])


@router.get("/", response_model=list[DiscountRead])
def list_discounts(
    session: DBSessionDep,
    _current: CurrentUserDep,
    active_only: bool = False,
) -> list[Discount]:
    return list(discount_service.list_filtered(session, active_only=active_only))


@router.get("/applicable", response_model=list[DiscountRead])
def list_applicable(
    session: DBSessionDep,
    _current: CurrentUserDep,
    subtotal: Decimal = Query(default=Decimal("0"), ge=0),
    scope: DiscountScope | None = None,
) -> list[Discount]:
    return discount_service.list_applicable(session, subtotal=subtotal, scope=scope)


@router.get("/{discount_id}", response_model=DiscountRead)
def get_discount(
    discount_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Discount:
    return discount_service.get_or_404(session, discount_id)


@router.post(
    "/",
    response_model=DiscountRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def create_discount(data: DiscountCreate, session: DBSessionDep) -> Discount:
    return discount_service.create(session, data)


@router.patch(
    "/{discount_id}",
    response_model=DiscountRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def update_discount(discount_id: int, data: DiscountUpdate, session: DBSessionDep) -> Discount:
    return discount_service.update(session, discount_id, data)


@router.delete(
    "/{discount_id}",
    response_model=DiscountRead,
    dependencies=[Depends(require_role(Role.ADMIN))],
)
def deactivate_discount(discount_id: int, session: DBSessionDep) -> Discount:
    """Soft-delete (is_active=false). Bills referencing the discount stay valid."""
    return discount_service.deactivate(session, discount_id)
