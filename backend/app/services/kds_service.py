"""KDS ticket service (M9).

A *leaf* service: ``order_service.send_to_kitchen`` calls
``create_tickets_for_order`` to split a freshly-sent bill into one ticket
per station; the kitchen display drives ``list_tickets`` / ``bump`` /
``recall``. No imports of order/payment/refund services, so it wires in
without cycles.

Ticket state machine::

    NEW ──bump──▶ DONE ──recall──▶ IN_PROGRESS ──bump──▶ DONE
"""

from collections import defaultdict
from datetime import datetime

from sqlmodel import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models import KdsStatus, KdsTicket, Order, OrderItem, Station
from app.repositories import kds_repo
from app.schemas.kds import KdsLineRead, KdsTicketRead
from app.utils.datetime import now_utc

# ── Station routing + ticket creation (called from send-to-kitchen) ──


def _station_for_item(item: OrderItem) -> Station:
    """``Product.category.default_station``; ``BAR`` when uncategorised."""
    product = item.product
    if product is None or product.category is None:
        return Station.BAR
    return product.category.default_station


def create_tickets_for_order(session: Session, order: Order, *, now: datetime) -> list[KdsTicket]:
    """Split the order's live lines by station into one KdsTicket each.

    Stamps each line's ``kds_ticket_id``. Caller (send-to-kitchen) owns the
    surrounding transaction — we only flush.
    """
    assert order.id is not None
    by_station: dict[Station, list[OrderItem]] = defaultdict(list)
    for item in order.items:
        if item.is_voided:
            continue
        by_station[_station_for_item(item)].append(item)

    tickets: list[KdsTicket] = []
    for station, items in by_station.items():
        ticket = KdsTicket(order_id=order.id, station=station, status=KdsStatus.NEW, printed_at=now)
        session.add(ticket)
        session.flush()
        assert ticket.id is not None
        for item in items:
            item.kds_ticket_id = ticket.id
            session.add(item)
        tickets.append(ticket)
    return tickets


# ── DTO mapping ─────────────────────────────────────────────────────


def _line_read(item: OrderItem) -> KdsLineRead:
    return KdsLineRead(
        order_item_id=item.id if item.id is not None else 0,
        product_id=item.product_id,
        product_name=item.product.name if item.product is not None else f"#{item.product_id}",
        qty=item.qty,
        modifiers=[oim.modifier.name for oim in item.modifiers if oim.modifier is not None],
    )


def _ticket_read(ticket: KdsTicket) -> KdsTicketRead:
    order = ticket.order
    return KdsTicketRead(
        id=ticket.id if ticket.id is not None else 0,
        order_id=ticket.order_id,
        order_number=order.order_number,
        table_number=order.table_number,
        channel=order.channel,
        station=ticket.station,
        status=ticket.status,
        printed_at=ticket.printed_at,
        bumped_at=ticket.bumped_at,
        lines=[_line_read(i) for i in ticket.items if not i.is_voided],
    )


# ── Read + bump / recall ────────────────────────────────────────────


def get_or_404(session: Session, ticket_id: int) -> KdsTicket:
    ticket = kds_repo.repository.get(session, ticket_id)
    if ticket is None:
        raise NotFoundError("kds_ticket_not_found")
    return ticket


def list_tickets(
    session: Session,
    *,
    station: Station | None = None,
    status: KdsStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[KdsTicketRead]:
    tickets = kds_repo.list_filtered(
        session, station=station, status=status, offset=offset, limit=limit
    )
    return [_ticket_read(t) for t in tickets]


def bump(session: Session, ticket_id: int) -> KdsTicketRead:
    """Mark a ticket DONE (items ready). Rejects a ticket that's already done."""
    ticket = get_or_404(session, ticket_id)
    if ticket.status == KdsStatus.DONE:
        raise ConflictError("ticket_already_bumped")
    ticket.status = KdsStatus.DONE
    ticket.bumped_at = now_utc()
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return _ticket_read(ticket)


def recall(session: Session, ticket_id: int) -> KdsTicketRead:
    """Pull a bumped ticket back to IN_PROGRESS. Only valid on a DONE ticket."""
    ticket = get_or_404(session, ticket_id)
    if ticket.status != KdsStatus.DONE:
        raise ConflictError("ticket_not_bumped")
    ticket.status = KdsStatus.IN_PROGRESS
    ticket.bumped_at = None
    session.add(ticket)
    session.commit()
    session.refresh(ticket)
    return _ticket_read(ticket)
