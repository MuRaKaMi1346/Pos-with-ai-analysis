"""Forecast accuracy metrics."""

from collections.abc import Iterable

import numpy as np


def _arr(x: Iterable[float]) -> np.ndarray:
    return np.asarray(list(x), dtype=float)


def mae(actual: Iterable[float], predicted: Iterable[float]) -> float:
    a, p = _arr(actual), _arr(predicted)
    return float(np.mean(np.abs(a - p)))


def rmse(actual: Iterable[float], predicted: Iterable[float]) -> float:
    a, p = _arr(actual), _arr(predicted)
    return float(np.sqrt(np.mean((a - p) ** 2)))


def mase(
    actual: Iterable[float],
    predicted: Iterable[float],
    *,
    naive_actuals: Iterable[float],
) -> float:
    """Mean Absolute Scaled Error.

    Scaled by the mean absolute first-difference (lag-1 naive) of the training
    series. <1 means we beat the naive forecaster; >=1 means we don't.
    """
    a, p = _arr(actual), _arr(predicted)
    naive = _arr(naive_actuals)
    if naive.size < 2:
        return float("inf")
    scale = float(np.mean(np.abs(np.diff(naive))))
    if scale == 0:
        return float("inf")
    return float(np.mean(np.abs(a - p)) / scale)
