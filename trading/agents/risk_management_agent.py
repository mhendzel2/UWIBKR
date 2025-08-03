"""Risk management agent acting as circuit breaker."""
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class RiskManagementAgent:
    """Validate trades against predefined risk rules."""
    max_position_size: float = 10000.0
    max_sector_exposure: float = 0.25

    def assess_trade(self, proposed_trade: dict, current_portfolio: dict) -> bool:
        """Return True if trade is within limits, otherwise False."""
        trade_value = proposed_trade["value"]
        trade_sector = proposed_trade["sector"]
        if trade_value > self.max_position_size:
            return False

        portfolio_value = current_portfolio["total_value"]
        current_sector_value = current_portfolio["sector_exposure"].get(trade_sector, 0.0) * portfolio_value
        new_sector_value = current_sector_value + trade_value
        new_total = portfolio_value + trade_value
        new_exposure = new_sector_value / new_total
        return new_exposure <= self.max_sector_exposure
