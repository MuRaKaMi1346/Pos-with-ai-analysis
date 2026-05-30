"""Customer + loyalty endpoints (M7).

Cashiers (staff) manage profiles + redeem points at the counter; only the
soft-delete is admin-gated. Loyalty earning happens automatically when a
bill is paid (see ``payment_service`` / ``customer_service.earn_for_order``).
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, SettingsDep, require_role
from app.models import Customer, Order, Role, User
from app.schemas.customer import (
    CustomerCreate,
    CustomerRead,
    CustomerUpdate,
    LoyaltyRedeemBody,
    LoyaltyRedeemResult,
)
from app.schemas.order import OrderRead
from app.services import customer_service

router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Customer:
    """Create a customer profile. ``code`` is auto-assigned (``C00001`` …)."""
    return customer_service.create(session, data)


@router.get("/", response_model=list[CustomerRead])
def list_customers(
    session: DBSessionDep,
    _current: CurrentUserDep,
    q: str | None = None,
    include_inactive: bool = False,
    offset: int = 0,
    limit: int = 50,
) -> list[Customer]:
    return list(
        customer_service.search(
            session, q=q, include_inactive=include_inactive, offset=offset, limit=limit
        )
    )


@router.get("/{customer_id}", response_model=CustomerRead)
def get_customer(
    customer_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Customer:
    return customer_service.get_or_404(session, customer_id)


@router.patch("/{customer_id}", response_model=CustomerRead)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Customer:
    return customer_service.update(session, customer_id, data)


@router.delete("/{customer_id}", response_model=CustomerRead)
def delete_customer(
    customer_id: int,
    session: DBSessionDep,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
) -> Customer:
    """Soft-delete (``is_active=false``). Admin only — keeps order FKs valid."""
    return customer_service.soft_delete(session, customer_id)


@router.get("/{customer_id}/orders", response_model=list[OrderRead])
def list_customer_orders(
    customer_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
    offset: int = 0,
    limit: int = 100,
) -> list[Order]:
    customer_service.get_or_404(session, customer_id)  # 404 if the customer is gone
    return list(customer_service.list_orders(session, customer_id, offset=offset, limit=limit))


@router.post("/{customer_id}/loyalty/redeem", response_model=LoyaltyRedeemResult)
def redeem_loyalty(
    customer_id: int,
    data: LoyaltyRedeemBody,
    session: DBSessionDep,
    settings: SettingsDep,
    current: CurrentUserDep,
) -> LoyaltyRedeemResult:
    """Redeem points → parks a baht discount on the customer's next bill."""
    customer = customer_service.get_or_404(session, customer_id)
    return customer_service.redeem_points(
        session, customer, data.points, actor=current, settings=settings
    )
