"""Naive baseline forecaster: trailing moving average.

Used as the floor that any real model must beat.
"""

from collections.abc import Iterable

import numpy as np


class MovingAverageForecaster:
    """Predict y_t = mean of the last ``window`` actuals; recurse for multi-step."""

    def __init__(self, window: int = 7) -> None:
        if window < 1:
            raise ValueError("window must be >= 1")
        self.window = window

    def predict(self, history: Iterable[float], horizon: int) -> np.ndarray:
        buffer = [float(x) for x in history][-self.window :]
        if not buffer:
            return np.zeros(horizon, dtype=float)
        out: list[float] = []
        for _ in range(horizon):
            pred = float(np.mean(buffer[-self.window :]))
            out.append(pred)
            buffer.append(pred)
        return np.asarray(out, dtype=float)
