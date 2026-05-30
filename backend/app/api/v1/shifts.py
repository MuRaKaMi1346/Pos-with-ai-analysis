"""Cashier shift endpoints (M8).

Open/close + current are cashier (staff) actions; the cross-user history
listing is admin-only.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.dependencies import CurrentUserDep, DBSessionDep, require_role
from app.core.exceptions import NotFoundError
from app.models import CashierShift, Role, User
from app.schemas.shift import ShiftCloseBody, ShiftOpenBody, ShiftRead
from app.services import shift_service

router = APIRouter(prefix="/shifts", tags=["shifts"])


@router.post("/open", response_model=ShiftRead, status_code=status.HTTP_201_CREATED)
def open_shift(
    data: ShiftOpenBody,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> CashierShift:
    """Open a till session for the caller. 409 if one is already open."""
    return shift_service.open_shift(session, actor=current, opening_float=data.opening_float)


@router.post("/close", response_model=ShiftRead)
def close_shift(
    data: ShiftCloseBody,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> CashierShift:
    """Close the caller's open shift; returns expected vs counted + variance."""
    return shift_service.close_shift(
        session,
        actor=current,
        closing_cash_counted=data.closing_cash_counted,
        closing_note=data.closing_note,
    )


@router.get("/current", response_model=ShiftRead)
def current_shift(
    session: DBSessionDep,
    current: CurrentUserDep,
) -> CashierShift:
    """The caller's open shift, or 404 if none is open."""
    assert current.id is not None
    shift = shift_service.get_open_for_user(session, current.id)
    if shift is None:
        raise NotFoundError("no_open_shift")
    return shift


@router.get("/", response_model=list[ShiftRead])
def list_shifts(
    session: DBSessionDep,
    _admin: Annotated[User, Depends(require_role(Role.ADMIN))],
    user_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[CashierShift]:
    """Shift history. Admin only."""
    return list(
        shift_service.list_shifts(
            session,
            user_id=user_id,
            date_from=date_from,
            date_to=date_to,
            offset=offset,
            limit=limit,
        )
    )
