"""Preset filter configurations for Unusual Whales options flow."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass(frozen=True)
class FilterPreset:
    """Represents a saved set of query parameters for flow alerts."""

    description: str
    params: Dict[str, Any]


FILTER_PRESETS: Dict[str, FilterPreset] = {
    "clean_ask_side_opening_flow": FilterPreset(
        description="Ask-side opening transactions within 5-minute interval",
        params={
            "interval": "5m",
            "equity_type": "stocks",  # Remove ETFs and indices
            "option_type": "both",
            "volume_oi_ratio_min": 1.05,
            "ask_percent_min": 0.7,
            "percent_multi_max": 0.3,
            "premium_min": 100000,
            "exclude_in_the_money": True,
            "interval_volume_greater_than_oi": True,
            "total_volume_greater_than_oi": True,
        },
    ),
    "general_flow_feed": FilterPreset(
        description="Smaller to mid-sized orders with opening bias",
        params={
            "side": "bid,ask",
            "equity_type": "stocks,adrs",
            "premium_min": 750,
            "premium_max": 25000,
            "size_min": 5,
            "volume_oi_ratio_min": 2,
            "out_of_money_percent_min": 0.05,
            "volume_greater_than_oi": True,
            "size_greater_than_oi": True,
            "opening_trades": True,
            "exclude_deep_itm": True,
            "hide_expired": True,
        },
    ),
    "otm_call_buyers_500k": FilterPreset(
        description="Single name $500K+ OTM call buyers for swing ideas",
        params={
            "option_type": "calls",
            "side": "ask",
            "opening_trades": True,
            "equity_type": "stocks,adrs",
            "premium_min": 500000,
            "dte_min": 6,
            "dte_max": 183,
        },
    ),
    "single_leg_high_volume": FilterPreset(
        description="Single leg, OTM options with significant volume",
        params={
            "contract_type": "option",
            "issue_type": "common_stock",
            "volume_oi_ratio_min": 2,
            "premium_min": 2000,
            "spread_max": 0,
            "volume_greater_than_oi": True,
            "is_out_of_money": True,
        },
    ),
    "most_successful_combined_strategy": FilterPreset(
        description="High-probability OTM call alert using top trader settings",
        params={
            "option_type": "calls",
            "side": "ask",
            "is_out_of_money": True,
            "premium_min": 500000,
            "volume_oi_ratio_min": 2,
            "equity_type": "stocks,adrs",
            "opening_trades": True,
            "dte_min": 1,
            "dte_max": 28,
            "rule_name[]": "RepeatedHits",
        },
    ),
}

