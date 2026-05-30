"""Customer + loyalty (M7).

A ``Customer`` row tracks repeat buyers: lifetime spend, visit count,
loyalty point balance, and a ``pending_redemption_baht`` flag that the
next-created order picks up automatically.

Loyalty rules (configurable in Settings):
- Earn: 1 point per ``pos_loyalty_baht_per_earn_point`` baht spent
  (default ``Decimal("20")`` — so ฿100 = 5 points).
- Redeem: 1 point = ``pos_loyalty_baht_per_redeem_point`` baht
  (default ``Decimal("0.10")`` — so 100 points = ฿10).

``code`` is server-generated as ``C{id:05d}`` post-insert.

Soft-delete via ``is_active=false`` — historical orders keep the FK valid.
"""

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

from app.utils.datetime import now_utc

if TYPE_CHECKING:
    from app.models.order import Order


class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    id: int | None = Field(default=None, primary_key=True)
    code: str = Field(max_length=20, index=True, unique=True)
    name: str = Field(max_length=120)
    # Phone is unique only when non-null — SQLite treats NULLs as distinct so
    # a unique index works directly.
    phone: str | None = Field(default=None, max_length=30, index=True, unique=True)
    email: str | None = Field(default=None, max_length=120)
    note: str | None = Field(default=None, max_length=255)

    # ── Lifetime aggregates ────────────────────────────────────────
    loyalty_points: int = Field(default=0, ge=0)
    total_spend: Decimal = Field(default=Decimal("0.00"), max_digits=14, decimal_places=2)
    total_visits: int = Field(default=0, ge=0)
    last_visit_at: datetime | None = Field(default=None)

    # ── Pending redemption flag ────────────────────────────────────
    # When > 0, the next order created for this customer auto-applies
    # an OrderDiscount of type POINTS with this baht amount.
    pending_redemption_baht: Decimal = Field(
        default=Decimal("0.00"), max_digits=12, decimal_places=2
    )

    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=now_utc, nullable=False)
    updated_at: datetime = Field(default_factory=now_utc, nullable=False)

    orders: list["Order"] = Relationship(back_populates="customer")
