"""Alpha/Signal agent using SMA crossover and Google Agent Development Kit placeholder."""
from __future__ import annotations
from dataclasses import dataclass
import pandas as pd
import pandas_ta as ta

@dataclass
class AlphaSignalAgent:
    """Generate trading signals from market data.

    Uses a simple moving average (SMA) crossover strategy. The agent can be
    extended to integrate with Google Agent Development Kit components that
    provide additional analytical capabilities.
    """
    short_window: int = 20
    long_window: int = 50

    def analyze_market_data(self, market_data: pd.DataFrame) -> str:
        """Return BUY, SELL or HOLD based on SMA crossover."""
        if len(market_data) < self.long_window:
            return "HOLD"

        market_data.ta.sma(length=self.short_window, append=True)
        market_data.ta.sma(length=self.long_window, append=True)

        last_short = market_data[f"SMA_{self.short_window}"].iloc[-1]
        last_long = market_data[f"SMA_{self.long_window}"].iloc[-1]
        prev_short = market_data[f"SMA_{self.short_window}"].iloc[-2]
        prev_long = market_data[f"SMA_{self.long_window}"].iloc[-2]

        if prev_short <= prev_long and last_short > last_long:
            return "BUY"
        if prev_short >= prev_long and last_short < last_long:
            return "SELL"
        return "HOLD"
