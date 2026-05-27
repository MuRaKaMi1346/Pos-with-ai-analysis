"""Time-series feature engineering for tabular forecasters (LightGBM)."""

import pandas as pd

FEATURE_COLS: list[str] = [
    "lag_1",
    "lag_7",
    "lag_14",
    "ma_7",
    "ma_14",
    "dow",
    "month",
    "is_weekend",
]
TARGET_COL = "qty"


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag / rolling / calendar features. Assumes ``df`` has columns (date, qty).

    Drops rows with NaN (the first ~14 days that lack lag history).
    """
    df = df.sort_values("date").reset_index(drop=True).copy()
    df["lag_1"] = df["qty"].shift(1)
    df["lag_7"] = df["qty"].shift(7)
    df["lag_14"] = df["qty"].shift(14)
    df["ma_7"] = df["qty"].shift(1).rolling(window=7).mean()
    df["ma_14"] = df["qty"].shift(1).rolling(window=14).mean()

    dates = pd.to_datetime(df["date"])
    df["dow"] = dates.dt.dayofweek.astype(int)
    df["month"] = dates.dt.month.astype(int)
    df["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)

    return df.dropna().reset_index(drop=True)
