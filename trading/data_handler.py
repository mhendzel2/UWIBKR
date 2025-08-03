"""Market data acquisition utilities."""
from __future__ import annotations

import pandas as pd
from typing import Optional

try:
    import yfinance as yf
except ImportError:  # pragma: no cover - optional dependency
    yf = None  # type: ignore


def fetch_data(ticker: str, timeframe: str, lookback_period: int) -> pd.DataFrame:
    """Fetch historical OHLCV data for *ticker*.

    Parameters
    ----------
    ticker: str
        Ticker symbol.
    timeframe: str
        Candle interval supported by yfinance (e.g., '1h', '1d').
    lookback_period: int
        Number of periods to retrieve.

    Returns
    -------
    pd.DataFrame
        Clean dataframe with DateTime index.
    """
    if yf is None:
        raise RuntimeError("yfinance is required for fetch_data")

    data = yf.download(ticker, period=f"{lookback_period}{timeframe}", interval=timeframe, progress=False)
    data = data.dropna().rename(columns=str.lower)
    return data
