"""Refund endpoints (M6)."""

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.models import Refund
from app.schemas.refund import RefundCreate, RefundRead
from app.services import refund_service

router = APIRouter(prefix="/refunds", tags=["refunds"])


@router.post("/", response_model=RefundRead, status_code=status.HTTP_201_CREATED)
def create_refund(
    data: RefundCreate,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> Refund:
    """Cash-back one or more lines of a paid bill. Admin only — service enforces."""
    return refund_service.create_refund(session, data, actor=current)


@router.get("/", response_model=list[RefundRead])
def list_refunds(
    session: DBSessionDep,
    _current: CurrentUserDep,
    order_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[Refund]:
    return list(
        refund_service.list_filtered(session, order_id=order_id, offset=offset, limit=limit)
    )


@router.get("/{refund_id}", response_model=RefundRead)
def get_refund(
    refund_id: int,
    session: DBSessionDep,
    _current: CurrentUserDep,
) -> Refund:
    return refund_service.get_or_404(session, refund_id)
