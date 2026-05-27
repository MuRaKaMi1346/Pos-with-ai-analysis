"""LightGBM wrapper for daily-qty forecasting (one product per model)."""

from dataclasses import dataclass, field
from typing import Any, ClassVar

import lightgbm as lgb
import pandas as pd

from app.ai.data.features import FEATURE_COLS, TARGET_COL, build_features


@dataclass
class LgbmForecaster:
    """A trained LightGBM regressor plus the recent history it needs for iterative forecasting."""

    MIN_HISTORY: ClassVar[int] = 30

    model: lgb.LGBMRegressor | None = None
    last_history: pd.DataFrame = field(default_factory=pd.DataFrame)
    feature_cols: list[str] = field(default_factory=lambda: list(FEATURE_COLS))

    def train(
        self,
        history: pd.DataFrame,
        *,
        params: dict[str, Any] | None = None,
    ) -> None:
        """``history`` must have columns (date, qty). At least ``MIN_HISTORY`` rows."""
        if len(history) < self.MIN_HISTORY:
            raise ValueError(f"history too short ({len(history)} rows); need >= {self.MIN_HISTORY}")
        feats = build_features(history[["date", "qty"]].copy())
        if feats.empty:
            raise ValueError("feature engineering dropped all rows; history too short")

        defaults: dict[str, Any] = {
            "n_estimators": 200,
            "learning_rate": 0.05,
            "max_depth": 6,
            "num_leaves": 15,
            "min_data_in_leaf": 5,
            "verbose": -1,
            "random_state": 42,
        }
        if params:
            defaults.update(params)
        self.model = lgb.LGBMRegressor(**defaults)
        self.model.fit(feats[self.feature_cols], feats[TARGET_COL])
        self.last_history = (
            history[["date", "qty"]].sort_values("date").reset_index(drop=True).copy()
        )

    def predict(self, horizon: int) -> list[float]:
        """Iteratively forecast ``horizon`` days ahead."""
        if self.model is None or self.last_history.empty:
            raise ValueError("model is not trained")

        working = self.last_history.copy()
        last_date = pd.to_datetime(working["date"].iloc[-1])

        out: list[float] = []
        for step in range(1, horizon + 1):
            next_date = (last_date + pd.Timedelta(days=step)).date()
            extended = pd.concat(
                [working, pd.DataFrame([{"date": next_date, "qty": 0.0}])],
                ignore_index=True,
            )
            feats = build_features(extended)
            if feats.empty:
                pred = float(working["qty"].mean())
            else:
                pred = float(self.model.predict(feats[self.feature_cols].iloc[[-1]])[0])
            pred = max(0.0, pred)
            out.append(pred)
            working = pd.concat(
                [working, pd.DataFrame([{"date": next_date, "qty": pred}])],
                ignore_index=True,
            )
        return out
