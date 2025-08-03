# Agent Components

This package provides a modular multi-agent trading framework built with the
[Google Agent Development Kit](https://ai.google.dev/). Each agent focuses on a
single responsibility and can be developed, tested, and deployed independently.
Integration is primarily about passing data in common Python structures like
`pandas.DataFrame` and dictionaries.

## Available Agents

- **AlphaSignalAgent** – technical-analysis driven signal generation using SMA
  crossovers.
- **RiskManagementAgent** – circuit breaker enforcing position and sector
  limits.
- **StrategyOrchestrator** – deterministic coordinator ensuring the correct
  sequence of data curation, signal evaluation, risk checks and execution.
- **DataCurationAgent** – cleans and enriches raw market data with common
  indicators so multiple alpha agents can share features.
- **DynamicStrategyAgent** – LLM-powered meta strategy component that can adjust
  other agents in real time based on unstructured context such as news or human
  input.
- **PostTradeAnalysisAgent** – collects execution metrics to close the feedback
  loop for optimisation.

The design emphasises modularity: specialised agents accelerate data processing
and safeguard execution, while the dynamic strategy and post-trade components
allow the system to adapt and learn from outcomes.
