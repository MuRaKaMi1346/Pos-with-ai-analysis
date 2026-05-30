"""Receipt endpoints (M11) — mounted under /orders.

``GET /orders/{id}/receipt`` returns the receipt DTO; ``.../receipt.pdf``
returns a server-rendered PDF, gated behind the ``receipt_pdf_enabled``
store setting.
"""

from fastapi import APIRouter
from fastapi.responses import Response

from app.core.dependencies import CurrentUserDep, DBSessionDep
from app.core.exceptions import NotFoundError
from app.schemas.receipt import ReceiptRead
from app.services import order_service, receipt_service, settings_service

router = APIRouter(prefix="/orders", tags=["receipts"])


@router.get("/{order_id}/receipt", response_model=ReceiptRead)
def get_receipt(order_id: int, session: DBSessionDep, _current: CurrentUserDep) -> ReceiptRead:
    order = order_service.get_or_404(session, order_id)
    settings = settings_service.get_effective(session)
    return receipt_service.build_receipt(session, order, settings=settings)


@router.get("/{order_id}/receipt.pdf")
def get_receipt_pdf(order_id: int, session: DBSessionDep, _current: CurrentUserDep) -> Response:
    """80mm receipt PDF. 404 when the ``receipt_pdf_enabled`` flag is off."""
    order = order_service.get_or_404(session, order_id)
    settings = settings_service.get_effective(session)
    if not settings["receipt_pdf_enabled"]:
        raise NotFoundError("receipt_pdf_disabled")
    receipt = receipt_service.build_receipt(session, order, settings=settings)
    pdf = receipt_service.render_pdf(receipt)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="receipt-{order.order_number}.pdf"'},
    )
