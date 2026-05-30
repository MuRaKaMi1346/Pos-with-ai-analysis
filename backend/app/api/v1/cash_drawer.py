"""Cash drawer movement endpoints (M8)."""

from fastapi import APIRouter, status

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.core.exceptions import NotFoundError
from app.models import CashMovement
from app.schemas.shift import CashMovementBody, CashMovementRead
from app.services import shift_service

router = APIRouter(prefix="/cash-drawer", tags=["cash-drawer"])


@router.post("/movements", response_model=CashMovementRead, status_code=status.HTTP_201_CREATED)
def create_movement(
    data: CashMovementBody,
    session: DBSessionDep,
    current: CurrentUserDep,
) -> CashMovement:
    """Record a pay-in / pay-out against the caller's open shift. 409 if none open."""
    return shift_service.record_cash_movement(
        session,
        actor=current,
        movement_type=data.type,
        amount=data.amount,
        reason=data.reason,
    )


@router.get("/movements", response_model=list[CashMovementRead])
def list_movements(
    session: DBSessionDep,
    current: CurrentUserDep,
    shift_id: int | None = None,
) -> list[CashMovement]:
    """Movements for ``shift_id``, or the caller's open shift when omitted."""
    assert current.id is not None
    if shift_id is None:
        shift = shift_service.get_open_for_user(session, current.id)
        if shift is None:
            raise NotFoundError("no_open_shift")
        assert shift.id is not None
        shift_id = shift.id
    return list(shift_service.list_movements(session, shift_id))
