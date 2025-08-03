"""High-speed data curation and feature engineering agent."""
from __future__ import annotations
from dataclasses import dataclass
import pandas as pd
import pandas_ta as ta

@dataclass
class DataCurationAgent:
    """Prepare raw market data for alpha agents."""
    def prepare(self, market_data: pd.DataFrame) -> pd.DataFrame:
        """Clean and enrich market data with additional features."""
        df = market_data.copy()
        df.fillna(method="ffill", inplace=True)
        df.ta.rsi(append=True)
        df.ta.macd(append=True)
        df.ta.bbands(append=True)
        return df
