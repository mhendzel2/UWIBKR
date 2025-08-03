"""Strategy engine combining channels with options flow."""
from __future__ import annotations

from typing import Dict, List


def generate_signal(channel_data: Dict[str, object], flow_sentiment: float,
                    gex_profile: Dict[str, float], unusual_trades: List[dict]) -> Dict[str, object]:
    """Generate trading signal from the provided analyses."""
    if channel_data.get('status') != 'Valid':
        return {}

    gex_positive = gex_profile.get('gex', 0) > 0
    position = channel_data.get('current_position')
    channel_type = channel_data.get('type')

    long_cond = (
        channel_type in {'Ascending', 'Horizontal'} and
        position == 'Near Support' and
        flow_sentiment > 0.5 and
        any(t.get('type') == 'call' for t in unusual_trades) and
        gex_positive
    )
    short_cond = (
        channel_type in {'Descending', 'Horizontal'} and
        position == 'Near Resistance' and
        flow_sentiment < -0.5 and
        any(t.get('type') == 'put' for t in unusual_trades) and
        gex_positive
    )

    if not (long_cond or short_cond):
        return {}

    direction = 'LONG' if long_cond else 'SHORT'
    entry_price = channel_data['support_params'][1] if direction == 'LONG' else channel_data['resistance_params'][1]

    return {
        'ticker': channel_data.get('ticker'),
        'direction': direction,
        'confidence_score': channel_data.get('quality_score', 0),
        'entry_price_zone': entry_price,
        'stop_loss': None,
        'target_price_1': None,
        'target_price_2': None,
    }
