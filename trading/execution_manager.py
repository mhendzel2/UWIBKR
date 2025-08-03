"""Order execution utilities for IBKR."""
from __future__ import annotations

from typing import Dict


def calculate_position_size(account_balance: float, risk_percentage: float, stop_loss_distance: float) -> int:
    risk_amount = account_balance * risk_percentage
    if stop_loss_distance <= 0:
        return 0
    return int(risk_amount / stop_loss_distance)


def place_order(signal: Dict[str, object]) -> None:  # pragma: no cover - external API
    """Placeholder for order execution via IBKR."""
    # Actual implementation would interact with ib_insync or ibapi.
    print(f"Placing order: {signal}")
