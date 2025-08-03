"""Channel detection logic."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from scipy.signal import find_peaks
from sklearn.linear_model import LinearRegression, RANSACRegressor


@dataclass
class Trendline:
    slope: float
    intercept: float

    def value_at(self, x: float) -> float:
        return self.slope * x + self.intercept


def identify_pivots(data: pd.Series, lookback: int) -> Tuple[np.ndarray, np.ndarray]:
    """Return indices of significant highs and lows using *lookback* window."""
    highs, _ = find_peaks(data, distance=lookback)
    lows, _ = find_peaks(-data, distance=lookback)
    return highs, lows


def _fit_line(x: np.ndarray, y: np.ndarray) -> Trendline:
    x = x.reshape(-1, 1)
    model = RANSACRegressor(LinearRegression())
    model.fit(x, y)
    slope = model.estimator_.coef_[0]
    intercept = model.estimator_.intercept_
    return Trendline(slope, intercept)


def fit_trendlines(data: pd.Series, lookback: int) -> Tuple[Trendline, Trendline]:
    highs, lows = identify_pivots(data, lookback)
    upper = _fit_line(highs, data.iloc[highs].values)
    lower = _fit_line(lows, data.iloc[lows].values)
    return upper, lower


def validate_channel(upper: Trendline, lower: Trendline, data: pd.Series) -> bool:
    slope_diff = abs((upper.slope - lower.slope) / (lower.slope if lower.slope else 1))
    if slope_diff > 0.1:  # slopes must be ~parallel
        return False

    # containment check
    x = np.arange(len(data))
    upper_vals = upper.value_at(x)
    lower_vals = lower.value_at(x)
    within = np.logical_and(data <= upper_vals, data >= lower_vals)
    return np.mean(within) > 0.9


def detect_channel(data: pd.DataFrame, lookback: int = 5) -> Dict[str, object]:
    close = data['close']
    upper, lower = fit_trendlines(close, lookback)
    valid = validate_channel(upper, lower, close)
    status = 'Valid' if valid else 'Invalid'
    channel_type = 'Ascending' if upper.slope > 0 else 'Descending' if upper.slope < 0 else 'Horizontal'
    position = 'Middle'
    current_price = close.iloc[-1]
    x = len(close) - 1
    support = lower.value_at(x)
    resistance = upper.value_at(x)
    if abs(current_price - support) < abs(current_price - resistance):
        position = 'Near Support'
    elif abs(current_price - resistance) < abs(current_price - support):
        position = 'Near Resistance'

    return {
        'status': status,
        'type': channel_type,
        'support_params': (lower.slope, lower.intercept),
        'resistance_params': (upper.slope, upper.intercept),
        'quality_score': 1.0 if valid else 0.0,
        'current_position': position,
    }
