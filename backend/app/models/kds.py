"""KDS (kitchen display system) tickets (M9).

When a bill is sent to the kitchen, its live lines are split by station —
each product's category carries a ``default_station`` — into one
``KdsTicket`` per station. The station screen pulls open tickets; the cook
**bumps** a ticket when its items are ready (→ DONE) and can **recall** a
bumped ticket back to IN_PROGRESS if bumped by mistake.

Station routing: ``OrderItem`` → ``Product`` → ``Category.default_station``
(falls back to ``BAR`` when the product has no category).
"""

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import Order, OrderItem


class Station(StrEnum):
    BAR = "bar"
    KITCHEN = "kitchen"


class KdsStatus(StrEnum):
    NEW = "new"  # printed, not yet picked up
    IN_PROGRESS = "in_progress"  # reached only via recall of a bumped ticket
    DONE = "done"  # bumped — items ready


class KdsTicket(SQLModel, table=True):
    __tablename__ = "kds_tickets"

    id: int | None = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    station: Station = Field(index=True)
    status: KdsStatus = Field(default=KdsStatus.NEW, index=True)
    printed_at: datetime = Field(default_factory=now_utc, index=True, nullable=False)
    bumped_at: datetime | None = Field(default=None)

    # One-way nav to the bill (read-only convenience for the DTO mapper).
    order: "Order" = Relationship()
    items: list["OrderItem"] = Relationship(back_populates="kds_ticket")
