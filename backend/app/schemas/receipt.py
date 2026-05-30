"""Receipt DTO (M11) — a print/display-friendly projection of a bill.

Store header + footer come from the M10 settings KV; the money breakdown is
the snapshot already stored on the Order. Voided lines are omitted (they
aren't on the customer's bill).
"""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.order import OrderChannel, OrderStatus
from app.models.payment import PaymentMethod


class ReceiptStore(BaseModel):
    name: str
    address: str | None
    tax_id: str | None


class ReceiptModifier(BaseModel):
    name: str
    price_delta: Decimal


class ReceiptLine(BaseModel):
    product_name: str
    qty: int
    unit_price: Decimal
    modifiers: list[ReceiptModifier]
    line_total: Decimal  # gross: qty * (unit_price + Σ modifier deltas)


class ReceiptPayment(BaseModel):
    method: PaymentMethod
    amount: Decimal
    reference: str | None
    tendered_amount: Decimal | None


class ReceiptRead(BaseModel):
    store: ReceiptStore
    order_number: str
    status: OrderStatus
    channel: OrderChannel
    table_number: str | None
    cashier_name: str | None
    customer_name: str | None
    created_at: datetime
    closed_at: datetime | None
    currency: str

    lines: list[ReceiptLine]

    # ── Totals (snapshot from the Order) ────────────────────────────
    subtotal: Decimal
    discount_total: Decimal
    service_charge: Decimal
    service_charge_rate: Decimal
    tax_total: Decimal
    tax_rate: Decimal
    tax_inclusive: bool
    tip_total: Decimal
    rounding_adjustment: Decimal
    total: Decimal
    paid_total: Decimal
    change_due: Decimal

    payments: list[ReceiptPayment]
    footer: str | None
