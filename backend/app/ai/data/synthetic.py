"""Generate plausible coffee-shop daily sales for training / testing.

Pattern: base demand x day-of-week multiplier x upward trend x Gaussian noise
+ occasional spike. Deterministic given ``seed``.
"""

from datetime import date, timedelta

import numpy as np
import pandas as pd


def generate_sales_history(
    *,
    product_ids: list[int],
    days: int = 180,
    start_date: date | None = None,
    seed: int = 42,
) -> pd.DataFrame:
    """Return a DataFrame with columns ``(date, product_id, qty)``."""
    rng = np.random.default_rng(seed)
    start = start_date or (date.today() - timedelta(days=days - 1))

    rows: list[dict[str, object]] = []
    for pid in product_ids:
        base = float(rng.uniform(15, 35))
        for i in range(days):
            d = start + timedelta(days=i)
            dow_mult = 1.3 if d.weekday() >= 5 else 1.0  # weekend boost
            trend = 1.0 + (i / max(days, 1)) * 0.15  # +15% over the period
            noise = float(rng.normal(1.0, 0.15))
            spike = 1.8 if rng.random() < 0.03 else 1.0
            qty = max(0, round(base * dow_mult * trend * noise * spike))
            rows.append({"date": d, "product_id": pid, "qty": qty})

    return pd.DataFrame(rows)
