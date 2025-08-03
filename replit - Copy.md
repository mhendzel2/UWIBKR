# AI-Powered Options Trading System

## Overview

This project is a sophisticated AI-driven options trading application that combines algorithmic analysis with human oversight. It integrates real-time market data from Unusual Whales, AI-powered analysis via Google Gemini, and automated execution through Interactive Brokers (IBKR). The system features a React frontend with WebSocket communication and an Express.js backend implementing event-driven microservices.

The application focuses on analyzing unusual options flow and other market intelligence to identify high-probability trading opportunities while maintaining strict risk management protocols. All AI-generated trade signals require human approval before execution. Key capabilities include comprehensive trade tracking, real-time performance analytics, AI-powered trade assessment, and historical trade analysis. The system also provides institutional-grade pre-market intelligence, a multi-agent trading system for consensus-driven decisions, and a sophisticated alert-based architecture for swing and LEAP opportunities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React + TypeScript**: Modern component-based UI with type safety.
- **Tailwind CSS + shadcn/ui**: Utility-first styling with pre-built components.
- **Wouter**: Lightweight client-side routing.
- **TanStack Query**: Server state management with caching and real-time updates.
- **WebSocket Integration**: Real-time data streaming for live market updates.

### Backend Architecture
- **Express.js + TypeScript**: RESTful API server with type safety.
- **Event-Driven Services**: Modular architecture with services like Signal Processor, Risk Manager, and WebSocket Service.
- **Async/Await Pattern**: Non-blocking operations for external API calls.
- **Service Layer Pattern**: Encapsulated business logic.
- **Multi-Agent System**: Sophisticated architecture with specialized agents (Market Intelligence, Technical Analysis, Risk Management, Sentiment Analysis, Execution) and a central Orchestrator for consensus-based decision-making with performance-based weighting.

### Data Storage
- **PostgreSQL + Drizzle ORM**: Type-safe database operations for persisting all trading data, including comprehensive trade records, assessments, and performance metrics.
- **In-Memory Processing**: Polars library for high-performance data transformation.

### Real-Time Communication
- **WebSocket Server**: Bi-directional communication for live updates, event broadcasting of signals, position changes, and system status.

### Risk Management Framework
- **Pre-Trade Controls**: Position sizing, portfolio exposure limits, drawdown protection.
- **Real-Time Monitoring**: Continuous risk assessment and emergency stop capabilities.
- **Multi-Layer Validation**: AI analysis, risk checks, and mandatory human approval.
- **Emergency Risk Controls**: Master kill switch and circuit breakers.

### Trading Logic & Features
- **Alert-Based Architecture**: Sophisticated alert processing for swing and LEAP opportunities, focusing on high-conviction signals with institutional-grade filtering.
- **Multi-Agent Trading System**: 5 specialized AI agents (Market Intelligence 25%, Technical Analysis 20%, Risk Management 30%, Sentiment Analysis 15%, Execution 10%) with consensus-driven decision making and performance-based weighting.
- **Test Mode for ML Training**: Automated order execution toggle that bypasses human approval for systematic ML training data collection, with comprehensive agent decision logging and ML metrics tracking.
- **Visual Transformer Model**: AI-powered chart pattern recognition using TensorFlow.js with sophisticated visual analysis capabilities for detecting patterns, trends, support/resistance levels, and price predictions with real-time chart analysis and image upload functionality.
- **Comprehensive Trade Tracking System**: Full trade lifecycle management from signal to assessment, with dedicated UI for monitoring, history, analytics, and assessment tools.
- **Advanced Execution Engine**: Sophisticated order management with adaptive algorithms, smart combo execution, and VWAP/TWAP integration.
- **Confluence-Based Filtering**: Multi-factor signal analysis combining technical indicators, gamma exposure regimes, and dark pool correlation.
- **Integrated Morning Update System**: Automated pre-market intelligence generation including sentiment analysis, key metrics, trading signals, and AI-powered summaries.
- **Data Import and Watchlist System**: Barchart Excel integration for historical data, automated smart watchlists, and comprehensive market intelligence tracking (dark pool, insider trading, analyst changes, GEX levels).
- **Advanced Options Screener**: Multi-dimensional screening with adaptive stringency controls (1-10 scale), AI-powered conviction scoring, real-time sentiment analysis, day trading opportunities, sector rotation analysis, and performance tracking with training mode for success rate optimization.
- **AI-Powered Options Heat Map**: Real-time visual analysis of options flow with dynamic cell sizing, color-coded sentiment indicators, conviction badges, and interactive drill-down capabilities. Features customizable color schemes (sentiment, volume, heat, AI confidence), auto-refresh functionality, and comprehensive market context with sector performance overlays.
- **Real-Time Options Opportunity Radar**: Continuous monitoring and alerting system for high-probability trading opportunities with AI-powered analysis, confidence scoring, and real-time notifications. Features configurable sensitivity, sound alerts, multi-source data aggregation, and detailed opportunity breakdowns with trade recommendations.
- **Enhanced Sentiment Analysis**: Multi-source sentiment aggregation including Fear & Greed Index, VIX analysis, crypto correlation (Bitcoin price and market cap), commodities tracking (gold and oil), Trump communications impact assessment, news flow impact scoring, and institutional vs retail flow analysis for comprehensive market sentiment assessment with real-time alerts on high-impact political communications.
- **FDA Monitoring System**: Integrated FDA event monitoring with OpenFDA API and Unusual Whales FDA endpoints for drug approvals, recalls, warning letters, and device recalls. Automatically identifies relevant tickers and generates trading opportunity alerts with confidence scoring and timeframe recommendations for rapid options execution on FDA events.
- **Stringency Refinement Tools**: Advanced adaptive controls for both LEAP analysis and options screener with AI-powered optimization. Features 1-10 scale stringency adjustment, training mode for performance data collection, real-time success rate tracking, automated stringency recommendations based on historical performance, comprehensive metrics tracking (success rate, avg return, profit factor, Sharpe ratio, max drawdown, win rate), and performance-based auto-adjustment capabilities. Training mode enables systematic collection of trade outcomes for machine learning optimization of stringency parameters.

### UI/UX Decisions
- Modern component-based UI leveraging Tailwind CSS and shadcn/ui for styling.
- Intuitive navigation with updated sidebar and dedicated pages for trades, settings, and AI signals.
- Professional-grade charting and advanced analytics dashboards.

## External Dependencies

### Market Data & Trading
- **Unusual Whales API**: Primary source for options flow data, gamma exposure metrics, and market alerts.
- **Interactive Brokers (IBKR) TWS**: Trading execution platform and primary institutional-grade data source.
- **Barchart**: Source for historical and options data import.

### AI & Analysis
- **Google Gemini**: Large language model for intelligent signal analysis, market sentiment evaluation, trade opportunity assessment, and morning update summaries.

### Development & Infrastructure
- **Neon Database**: Serverless PostgreSQL hosting.
- **Vite**: Fast development server and build tool for the React frontend.
- **Drizzle Kit**: Database schema management and migration system.

### UI & Styling
- **Radix UI**: Headless component primitives.
- **Lucide Icons**: Comprehensive icon library.
- **Font Awesome**: Additional iconography.

### Real-Time Features
- **WebSocket (ws)**: Native WebSocket implementation for real-time data streaming.