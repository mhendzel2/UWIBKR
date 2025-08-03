"""Configuration settings for the channel trading system."""
from dataclasses import dataclass, field
from typing import List

@dataclass
class APIConfig:
    """API keys and connection settings."""
    unusual_whales_key: str = ""
    ibkr_host: str = "localhost"
    ibkr_port: int = 7497
    ibkr_client_id: int = 1

@dataclass
class StrategyConfig:
    """General strategy parameters."""
    timeframe: str = "1h"
    lookback_period: int = 100
    pivot_lookback: int = 5
    sentiment_threshold: float = 0.5
    risk_percentage: float = 0.01

@dataclass
class AppConfig:
    api: APIConfig = field(default_factory=APIConfig)
    strategy: StrategyConfig = field(default_factory=StrategyConfig)
    watchlist: List[str] = field(default_factory=lambda: ["AAPL", "MSFT", "SPY"])
