"""Simplified options flow analysis using Unusual Whales API."""
from __future__ import annotations

from typing import Dict, List, Optional

import requests

from .filter_presets import FILTER_PRESETS

BASE_URL = "https://api.unusualwhales.com"  # Placeholder


def fetch_unusual_trades(ticker: str) -> List[dict]:
    """Fetch unusual options trades for *ticker*.

    This is a placeholder implementation that returns an empty list if the API
    is unreachable. In production, authentication headers would be required.
    """
    try:
        resp = requests.get(f"{BASE_URL}/stocks/{ticker}/unusual").json()
        return resp.get("data", [])
    except Exception:
        return []


def fetch_filtered_flow(preset: str, ticker: Optional[str] = None) -> List[dict]:
    """Fetch flow alerts using a preset filter configuration.

    Parameters
    ----------
    preset:
        Key referencing a preset in ``FILTER_PRESETS``.
    ticker:
        Optional single ticker to filter on.
    """
    cfg = FILTER_PRESETS.get(preset)
    if cfg is None:
        raise ValueError(f"Unknown preset: {preset}")

    params = cfg.params.copy()
    if ticker:
        params["ticker"] = ticker

    try:
        resp = requests.get(
            f"{BASE_URL}/api/option-trades/flow-alerts", params=params
        ).json()
        return resp.get("data", [])
    except Exception:
        return []


def analyze_flow_sentiment(ticker: str) -> float:
    """Return a normalized sentiment score between -1 and 1."""
    trades = fetch_unusual_trades(ticker)
    if not trades:
        return 0.0
    call_premium = sum(t.get("call_premium", 0) for t in trades)
    put_premium = sum(t.get("put_premium", 0) for t in trades)
    total = call_premium + put_premium
    if total == 0:
        return 0.0
    return (call_premium - put_premium) / total


def get_gex_profile(ticker: str) -> Dict[str, float]:
    """Return a simplified Gamma Exposure profile."""
    try:
        resp = requests.get(f"{BASE_URL}/stocks/{ticker}/gex").json()
        return {
            "gex": resp.get("gex", 0.0),
            "flip_point": resp.get("flip_point", 0.0),
        }
    except Exception:
        return {"gex": 0.0, "flip_point": 0.0}
