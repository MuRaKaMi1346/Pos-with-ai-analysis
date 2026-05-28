"""Market basket analysis via mlxtend's Apriori + association rules.

Pulls recent multi-item orders, runs Apriori to find frequent itemsets, then
extracts association rules sorted by lift. Single-item orders are excluded
(they cannot produce any pair-wise rule).
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder
from sqlalchemy import text
from sqlmodel import Session

from app.models import Product


def get_transactions(session: Session, *, days: int = 30) -> list[list[int]]:
    """Return one list of product_ids per order in the last ``days`` days."""
    cutoff = datetime.now(tz=UTC) - timedelta(days=days)
    rows = session.execute(
        text(
            """
            SELECT oi.order_id, oi.product_id
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE o.created_at >= :cutoff
              AND o.status IN ('OPEN', 'PAID')
            ORDER BY oi.order_id
            """
        ),
        {"cutoff": cutoff},
    ).all()

    by_order: dict[int, list[int]] = {}
    for row in rows:
        by_order.setdefault(int(row.order_id), []).append(int(row.product_id))

    return [items for items in by_order.values() if len(items) >= 2]


def find_rules(
    session: Session,
    *,
    days: int = 30,
    min_support: float = 0.05,
    min_lift: float = 1.0,
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """Return up to ``top_n`` association rules sorted by lift desc."""
    transactions = get_transactions(session, days=days)
    if len(transactions) < 3:
        return []

    encoder = TransactionEncoder()
    one_hot = encoder.fit(transactions).transform(transactions)
    df = pd.DataFrame(one_hot, columns=encoder.columns_)

    frequent = apriori(df, min_support=min_support, use_colnames=True)
    if frequent.empty:
        return []

    rules = association_rules(frequent, metric="lift", min_threshold=min_lift)
    if rules.empty:
        return []

    rules = rules.sort_values("lift", ascending=False).head(top_n)

    # Resolve names in one pass
    pids: set[int] = set()
    for col in ("antecedents", "consequents"):
        for items in rules[col]:
            pids.update(int(p) for p in items)
    name_map: dict[int, str] = {}
    for pid in pids:
        product = session.get(Product, pid)
        if product is not None:
            name_map[pid] = product.name

    return [
        {
            "antecedent_ids": sorted(int(p) for p in row["antecedents"]),
            "antecedent_names": [name_map.get(int(p), f"id:{p}") for p in row["antecedents"]],
            "consequent_ids": sorted(int(p) for p in row["consequents"]),
            "consequent_names": [name_map.get(int(p), f"id:{p}") for p in row["consequents"]],
            "support": round(float(row["support"]), 4),
            "confidence": round(float(row["confidence"]), 4),
            "lift": round(float(row["lift"]), 4),
        }
        for _, row in rules.iterrows()
    ]
