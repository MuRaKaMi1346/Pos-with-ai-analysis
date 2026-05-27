"""Dashboard aggregates — all SQL ``GROUP BY`` queries (per spec section 6).

Statuses ``voided`` and ``refunded`` are excluded; ``open`` + ``paid`` count
as revenue (payments come later; for now every created order is revenue).

SQLite-specific functions used here: ``DATE(...)``, ``strftime('%w', ...)``,
``strftime('%H', ...)``. If we move to Postgres, switch to ``date_trunc`` and
``extract(...)`` in this single module.
"""

from collections.abc import Sequence
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import bindparam, text
from sqlalchemy.sql.elements import BindParameter
from sqlmodel import Session

from app.schemas.dashboard import (
    CategoryMixRow,
    Granularity,
    PeakHoursCell,
    SalesTrendPoint,
    SalesTrendResponse,
    SummaryResponse,
    TopProductRow,
)

# Statuses that count toward revenue. Bound via expanding so ruff S608
# (SQL injection) doesn't fire — values are bound, never interpolated.
#
# NOTE: SQLAlchemy's Enum column stores the Python enum *name* by default
# ("OPEN", "PAID") even when the underlying StrEnum has lowercase values.
# Pydantic serializes the .value ("open") on the way out, so the API/frontend
# see lowercase — but the SQL filter must match the stored uppercase form.
_REVENUE_STATUSES = ["OPEN", "PAID"]
_STATUSES_BIND: BindParameter[str] = bindparam("statuses", expanding=True)


def _parse_range(from_: date | None, to: date | None) -> tuple[datetime, datetime, date, date]:
    """Return (start_dt, end_dt, from_date, to_date) — defaults: last 7 days."""
    today = datetime.now(tz=UTC).date()
    if to is None:
        to = today
    if from_ is None:
        from_ = to - timedelta(days=6)
    start = datetime.combine(from_, time.min, tzinfo=UTC)
    end = datetime.combine(to + timedelta(days=1), time.min, tzinfo=UTC)
    return start, end, from_, to


def _d(value: object) -> Decimal:
    """Coerce a SQL aggregate result to Decimal (handles None / int / float / Decimal)."""
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _params(start: datetime, end: datetime, **extra: object) -> dict[str, object]:
    return {"start": start, "end": end, "statuses": _REVENUE_STATUSES, **extra}


# ─── Summary ─────────────────────────────────────────────────────────


def get_summary(session: Session, from_: date | None, to: date | None) -> SummaryResponse:
    start, end, from_d, to_d = _parse_range(from_, to)
    params = _params(start, end)

    rev_row = session.execute(
        text(
            """
            SELECT COALESCE(SUM(total), 0) AS revenue,
                   COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= :start AND created_at < :end
              AND status IN :statuses
            """
        ).bindparams(_STATUSES_BIND),
        params,
    ).first()

    cogs_row = session.execute(
        text(
            """
            SELECT COALESCE(SUM(oi.qty * p.cost), 0) AS cogs
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.created_at >= :start AND o.created_at < :end
              AND o.status IN :statuses
            """
        ).bindparams(_STATUSES_BIND),
        params,
    ).first()

    revenue = _d(rev_row.revenue if rev_row else 0)
    order_count = int(rev_row.order_count if rev_row else 0)
    cogs = _d(cogs_row.cogs if cogs_row else 0)
    profit = revenue - cogs
    avg_ticket = (
        (revenue / order_count).quantize(Decimal("0.01")) if order_count > 0 else Decimal("0.00")
    )

    return SummaryResponse.model_validate(
        {
            "from": from_d,
            "to": to_d,
            "total_revenue": revenue,
            "order_count": order_count,
            "gross_profit": profit,
            "average_ticket": avg_ticket,
        }
    )


# ─── Sales trend ─────────────────────────────────────────────────────


def get_sales_trend(
    session: Session,
    from_: date | None,
    to: date | None,
    granularity: Granularity,
) -> SalesTrendResponse:
    start, end, _from_d, _to_d = _parse_range(from_, to)

    if granularity == "hour":
        bucket_expr = "strftime('%Y-%m-%d %H:00:00', created_at)"
    else:
        bucket_expr = "DATE(created_at)"

    rows = session.execute(
        text(
            f"""
            SELECT {bucket_expr} AS bucket,
                   COALESCE(SUM(total), 0) AS revenue,
                   COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= :start AND created_at < :end
              AND status IN :statuses
            GROUP BY bucket
            ORDER BY bucket ASC
            """  # noqa: S608 — only ``bucket_expr`` is interpolated; it's a literal we own
        ).bindparams(_STATUSES_BIND),
        _params(start, end),
    ).all()

    return SalesTrendResponse(
        granularity=granularity,
        points=[
            SalesTrendPoint(
                bucket=str(r.bucket),
                revenue=_d(r.revenue),
                order_count=int(r.order_count),
            )
            for r in rows
        ],
    )


# ─── Top products ────────────────────────────────────────────────────


def get_top_products(
    session: Session,
    from_: date | None,
    to: date | None,
    limit: int,
) -> list[TopProductRow]:
    start, end, _, _ = _parse_range(from_, to)

    rows = session.execute(
        text(
            """
            SELECT p.id AS product_id,
                   p.name AS product_name,
                   SUM(oi.qty) AS quantity_sold,
                   SUM(oi.qty * oi.unit_price) AS revenue,
                   SUM(oi.qty * (oi.unit_price - p.cost)) AS gross_profit
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.created_at >= :start AND o.created_at < :end
              AND o.status IN :statuses
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
            LIMIT :limit
            """
        ).bindparams(_STATUSES_BIND),
        _params(start, end, limit=limit),
    ).all()

    return [
        TopProductRow(
            product_id=int(r.product_id),
            product_name=str(r.product_name),
            quantity_sold=int(r.quantity_sold),
            revenue=_d(r.revenue),
            gross_profit=_d(r.gross_profit),
        )
        for r in rows
    ]


# ─── Peak hours (weekday x hour) ─────────────────────────────────────


def get_peak_hours(session: Session, from_: date | None, to: date | None) -> list[PeakHoursCell]:
    start, end, _, _ = _parse_range(from_, to)

    rows = session.execute(
        text(
            """
            SELECT CAST(strftime('%w', created_at) AS INTEGER) AS weekday,
                   CAST(strftime('%H', created_at) AS INTEGER) AS hour,
                   COALESCE(SUM(total), 0) AS revenue,
                   COUNT(*) AS order_count
            FROM orders
            WHERE created_at >= :start AND created_at < :end
              AND status IN :statuses
            GROUP BY weekday, hour
            ORDER BY weekday, hour
            """
        ).bindparams(_STATUSES_BIND),
        _params(start, end),
    ).all()

    return [
        PeakHoursCell(
            weekday=int(r.weekday),
            hour=int(r.hour),
            revenue=_d(r.revenue),
            order_count=int(r.order_count),
        )
        for r in rows
    ]


# ─── Category mix ────────────────────────────────────────────────────


def get_category_mix(
    session: Session, from_: date | None, to: date | None
) -> Sequence[CategoryMixRow]:
    start, end, _, _ = _parse_range(from_, to)

    rows = session.execute(
        text(
            """
            SELECT c.id AS category_id,
                   COALESCE(c.name, 'Uncategorized') AS category_name,
                   COALESCE(SUM(oi.qty * oi.unit_price), 0) AS revenue
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            LEFT JOIN categories c ON c.id = p.category_id
            WHERE o.created_at >= :start AND o.created_at < :end
              AND o.status IN :statuses
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
            """
        ).bindparams(_STATUSES_BIND),
        _params(start, end),
    ).all()

    total = sum((_d(r.revenue) for r in rows), Decimal("0"))
    if total == 0:
        total = Decimal("1")

    return [
        CategoryMixRow(
            category_id=int(r.category_id) if r.category_id is not None else None,
            category_name=str(r.category_name),
            revenue=_d(r.revenue),
            share_pct=(_d(r.revenue) / total * Decimal("100")).quantize(Decimal("0.01")),
        )
        for r in rows
    ]
