"""Deterministic orchestrator coordinating specialized agents."""
from __future__ import annotations
from dataclasses import dataclass
from typing import Optional

from .alpha_agent import AlphaSignalAgent
from .risk_management_agent import RiskManagementAgent

# Optional agents for enhanced capabilities
from .data_curation_agent import DataCurationAgent
from .dynamic_strategy_agent import DynamicStrategyAgent
from .post_trade_analysis_agent import PostTradeAnalysisAgent


@dataclass
class StrategyOrchestrator:
    """Coordinate the workflow between trading agents.

    The orchestrator enforces a strict sequence: curate data, obtain a signal,
    check risk, execute, and perform post-trade analysis. The optional dynamic
    strategy agent can modify behaviour in response to external context using
    the Google Agent Development Kit.
    """
    alpha_agent: AlphaSignalAgent
    risk_agent: RiskManagementAgent
    execution_agent: object  # Placeholder type
    data_agent: Optional[DataCurationAgent] = None
    dynamic_agent: Optional[DynamicStrategyAgent] = None
    analysis_agent: Optional[PostTradeAnalysisAgent] = None

    def run_cycle(self, symbol: str, market_data, portfolio_state, trade_details) -> None:
        """Execute one trading cycle."""
        if self.data_agent:
            market_data = self.data_agent.prepare(market_data)
        if self.dynamic_agent:
            self.dynamic_agent.adjust(self.alpha_agent, self.risk_agent)

        signal = self.alpha_agent.analyze_market_data(market_data)
        if signal == "HOLD":
            return

        if not self.risk_agent.assess_trade(trade_details, portfolio_state):
            return

        self.execution_agent.execute_trade(symbol=symbol, action=signal, quantity=trade_details["quantity"])

        if self.analysis_agent:
            self.analysis_agent.evaluate(symbol, trade_details, result={})
