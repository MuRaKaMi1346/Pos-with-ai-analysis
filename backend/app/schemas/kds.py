"""KDS ticket schemas (M9).

``KdsTicketRead`` is a display DTO built explicitly in ``kds_service`` (it
flattens product + modifier names off the order lines), not a plain
``from_attributes`` projection.
"""

from datetime import datetime

from pydantic import BaseModel

from app.models.kds import KdsStatus, Station
from app.models.order import OrderChannel


class KdsLineRead(BaseModel):
    order_item_id: int
    product_id: int
    product_name: str
    qty: int
    modifiers: list[str]


class KdsTicketRead(BaseModel):
    id: int
    order_id: int
    order_number: str
    table_number: str | None
    channel: OrderChannel
    station: Station
    status: KdsStatus
    printed_at: datetime
    bumped_at: datetime | None
    lines: list[KdsLineRead]
