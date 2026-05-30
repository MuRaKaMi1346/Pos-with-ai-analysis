"""Receipt assembly + 80mm PDF rendering (M11).

``build_receipt`` projects an Order (+ effective store settings) into the
``ReceiptRead`` DTO. ``render_pdf`` lays that DTO out as a narrow thermal-
style PDF via ReportLab (imported lazily so the dependency only loads when
the feature-flagged PDF endpoint is actually hit).
"""

from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from sqlmodel import Session

from app.models import Customer, Order, User
from app.schemas.receipt import (
    ReceiptLine,
    ReceiptModifier,
    ReceiptPayment,
    ReceiptRead,
    ReceiptStore,
)

_TWO_DP = Decimal("0.01")


def _q(amount: Decimal) -> Decimal:
    return amount.quantize(_TWO_DP, rounding=ROUND_HALF_UP)


def build_receipt(session: Session, order: Order, *, settings: dict[str, Any]) -> ReceiptRead:
    """Assemble the receipt DTO from the bill + effective store settings."""
    lines: list[ReceiptLine] = []
    for item in order.items:
        if item.is_voided:
            continue
        modifiers = [
            ReceiptModifier(
                name=oim.modifier.name if oim.modifier is not None else f"#{oim.modifier_id}",
                price_delta=oim.price_delta,
            )
            for oim in item.modifiers
        ]
        gross = item.unit_price * item.qty
        for oim in item.modifiers:
            gross += oim.price_delta * item.qty
        lines.append(
            ReceiptLine(
                product_name=(
                    item.product.name if item.product is not None else f"#{item.product_id}"
                ),
                qty=item.qty,
                unit_price=item.unit_price,
                modifiers=modifiers,
                line_total=_q(gross),
            )
        )

    cashier = session.get(User, order.user_id) if order.user_id is not None else None
    customer = session.get(Customer, order.customer_id) if order.customer_id is not None else None
    payments = [
        ReceiptPayment(
            method=p.method,
            amount=p.amount,
            reference=p.reference,
            tendered_amount=p.tendered_amount,
        )
        for p in order.payments
        if not p.is_refund
    ]

    return ReceiptRead(
        store=ReceiptStore(
            name=settings["store_name"],
            address=settings["store_address"],
            tax_id=settings["store_tax_id"],
        ),
        order_number=order.order_number,
        status=order.status,
        channel=order.channel,
        table_number=order.table_number,
        cashier_name=cashier.username if cashier is not None else None,
        customer_name=customer.name if customer is not None else None,
        created_at=order.created_at,
        closed_at=order.closed_at,
        currency=settings["currency"],
        lines=lines,
        subtotal=order.subtotal,
        discount_total=order.discount_total,
        service_charge=order.service_charge,
        service_charge_rate=order.service_charge_rate,
        tax_total=order.tax_total,
        tax_rate=order.tax_rate,
        tax_inclusive=order.tax_inclusive,
        tip_total=order.tip_total,
        rounding_adjustment=order.rounding_adjustment,
        total=order.total,
        paid_total=order.paid_total,
        change_due=order.change_due,
        payments=payments,
        footer=settings["receipt_footer"],
    )


def render_pdf(receipt: ReceiptRead) -> bytes:
    """Render an 80mm-wide thermal-style receipt PDF. Lazy ReportLab import."""
    from io import BytesIO

    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas

    width = 80 * mm
    margin = 5 * mm
    line_h = 12.0

    def money(amount: Decimal) -> str:
        return f"{amount:,.2f}"

    # ── Pass 1: collect rows so we can size the (continuous) page ────
    rows: list[tuple[Any, ...]] = []

    def text(s: str, *, bold: bool = False, center: bool = False) -> None:
        rows.append(("text", s, bold, center))

    def lr(left: str, right: str, *, bold: bool = False) -> None:
        rows.append(("lr", left, right, bold))

    def sep() -> None:
        rows.append(("sep",))

    text(receipt.store.name, bold=True, center=True)
    if receipt.store.address:
        text(receipt.store.address, center=True)
    if receipt.store.tax_id:
        text(f"Tax ID: {receipt.store.tax_id}", center=True)
    sep()
    text(f"Receipt: {receipt.order_number}")
    text(f"Date: {receipt.created_at:%Y-%m-%d %H:%M}")
    channel_row = f"Channel: {receipt.channel.value}"
    if receipt.table_number:
        channel_row += f"   Table: {receipt.table_number}"
    text(channel_row)
    if receipt.cashier_name:
        text(f"Cashier: {receipt.cashier_name}")
    if receipt.customer_name:
        text(f"Customer: {receipt.customer_name}")
    sep()
    for line in receipt.lines:
        lr(f"{line.qty} x {line.product_name}", money(line.line_total))
        for m in line.modifiers:
            extra = f" (+{money(m.price_delta)})" if m.price_delta else ""
            text(f"   + {m.name}{extra}")
    sep()
    lr("Subtotal", money(receipt.subtotal))
    if receipt.discount_total > 0:
        lr("Discount", f"-{money(receipt.discount_total)}")
    if receipt.service_charge > 0:
        lr(f"Service ({receipt.service_charge_rate * 100:.0f}%)", money(receipt.service_charge))
    if receipt.tax_total > 0:
        incl = "incl." if receipt.tax_inclusive else "added"
        lr(f"VAT ({receipt.tax_rate * 100:.0f}%) {incl}", money(receipt.tax_total))
    if receipt.tip_total > 0:
        lr("Tip", money(receipt.tip_total))
    if receipt.rounding_adjustment != 0:
        lr("Rounding", money(receipt.rounding_adjustment))
    lr(f"TOTAL ({receipt.currency})", money(receipt.total), bold=True)
    sep()
    for p in receipt.payments:
        label = p.method.value + (f" [{p.reference}]" if p.reference else "")
        lr(label, money(p.amount))
    if receipt.change_due > 0:
        lr("Change", money(receipt.change_due))
    if receipt.footer:
        sep()
        text(receipt.footer, center=True)

    # ── Pass 2: draw top-down on a page sized to the content ─────────
    height = (len(rows) + 4) * line_h
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=(width, height))
    y = height - 2 * line_h
    for row in rows:
        kind = row[0]
        if kind == "sep":
            c.setDash([1, 2])
            c.line(margin, y + line_h * 0.4, width - margin, y + line_h * 0.4)
            c.setDash([])
        elif kind == "text":
            _, s, bold, center = row
            c.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
            if center:
                c.drawCentredString(width / 2, y, s)
            else:
                c.drawString(margin, y, s)
        else:  # "lr"
            _, left, right, bold = row
            c.setFont("Helvetica-Bold" if bold else "Helvetica", 9)
            c.drawString(margin, y, left)
            c.drawRightString(width - margin, y, right)
        y -= line_h
    c.showPage()
    c.save()
    return buffer.getvalue()
