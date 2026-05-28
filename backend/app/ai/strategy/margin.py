"""Margin analysis: classify products as stars / slow movers / high-margin."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlmodel import Session


def compute(session: Session, *, days: int = 30) -> dict[str, list[dict[str, Any]]]:
    """Return per-product stats grouped into ``stars / slow_movers / high_margin``.

    - stars: top by revenue among products with at-least-median profit margin
    - slow_movers: bottom by units sold (regardless of margin)
    - high_margin: top by profit margin (regardless of volume)
    """
    cutoff = datetime.now(tz=UTC) - timedelta(days=days)
    rows = session.execute(
        text(
            """
            SELECT p.id, p.name,
                   SUM(oi.qty) AS units_sold,
                   SUM(oi.qty * oi.unit_price) AS revenue,
                   SUM(oi.qty * (oi.unit_price - p.cost)) AS gross_profit
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            JOIN products p ON p.id = oi.product_id
            WHERE o.created_at >= :cutoff
              AND o.status IN ('OPEN', 'PAID')
              AND p.is_active = 1
            GROUP BY p.id, p.name
            ORDER BY revenue DESC
            """
        ),
        {"cutoff": cutoff},
    ).all()

    if not rows:
        return {"stars": [], "slow_movers": [], "high_margin": []}

    items: list[dict[str, Any]] = []
    for r in rows:
        revenue = Decimal(str(r.revenue))
        profit = Decimal(str(r.gross_profit))
        units = int(r.units_sold)
        margin_pct = float(profit / revenue) if revenue > 0 else 0.0
        items.append(
            {
                "product_id": int(r.id),
                "name": str(r.name),
                "units_sold": units,
                "revenue": round(float(revenue), 2),
                "gross_profit": round(float(profit), 2),
                "profit_margin": round(margin_pct, 4),
            }
        )

    sorted_margins = sorted(i["profit_margin"] for i in items)
    median_margin = sorted_margins[len(sorted_margins) // 2]

    stars = sorted(
        (i for i in items if i["profit_margin"] >= median_margin),
        key=lambda i: i["revenue"],
        reverse=True,
    )[:3]
    slow_movers = sorted(items, key=lambda i: i["units_sold"])[:3]
    high_margin = sorted(items, key=lambda i: i["profit_margin"], reverse=True)[:3]

    return {
        "stars": stars,
        "slow_movers": slow_movers,
        "high_margin": high_margin,
    }
