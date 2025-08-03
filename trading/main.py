"""Entry point for running the channel trading pipeline."""
from __future__ import annotations

import json
from typing import List

from .config import AppConfig
from .data_handler import fetch_data
from .channel_detector import detect_channel
from .options_flow_analyzer import analyze_flow_sentiment, fetch_unusual_trades, get_gex_profile
from .strategy_engine import generate_signal


def run_for_ticker(ticker: str, cfg: AppConfig) -> dict:
    data = fetch_data(ticker, cfg.strategy.timeframe, cfg.strategy.lookback_period)
    channel = detect_channel(data, cfg.strategy.pivot_lookback)
    channel['ticker'] = ticker
    sentiment = analyze_flow_sentiment(ticker)
    unusual = fetch_unusual_trades(ticker)
    gex = get_gex_profile(ticker)
    signal = generate_signal(channel, sentiment, gex, unusual)
    return signal


def main(tickers: List[str] | None = None) -> List[dict]:
    cfg = AppConfig()
    tickers = tickers or cfg.watchlist
    results = []
    for symbol in tickers:
        try:
            results.append(run_for_ticker(symbol, cfg))
        except Exception as exc:  # pragma: no cover - robustness
            results.append({"ticker": symbol, "error": str(exc)})
    return results


if __name__ == "__main__":  # pragma: no cover
    import sys
    tickers = sys.argv[1:]
    signals = main(tickers)
    print(json.dumps(signals))
