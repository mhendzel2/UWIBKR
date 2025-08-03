# AI-Powered Options Trading Platform

A sophisticated AI-driven options trading application that combines algorithmic analysis with human oversight. Features real-time market intelligence, automated signal generation, and institutional-grade execution capabilities.

## 🚀 Key Features

### Core Trading Capabilities
- **Real-time Options Flow Analysis**: Monitor unusual options activity with institutional-grade filtering
- **AI-Powered Signal Generation**: Multi-agent trading system with consensus-driven decisions
- **LEAP Analysis Tools**: Long-term options opportunities with sophisticated probability scoring
- **Risk Management Framework**: Pre-trade controls, real-time monitoring, and emergency safeguards
- **Interactive Brokers Integration**: Direct trading execution with TWS connectivity

### Advanced Analytics
- **Stringency Refinement Tools**: Adaptive controls with AI-powered optimization for both LEAP analysis and options screener
- **FDA Monitoring System**: Pharmaceutical trading opportunities with rapid alert generation
- **Sentiment Analysis Engine**: Multi-source sentiment aggregation including Fear & Greed Index, VIX analysis, and crypto correlation
- **Options Heat Map**: Visual market opportunity analysis with real-time conviction scoring
- **Machine Learning Models**: TensorFlow.js-powered pattern recognition and visual chart analysis

### Market Intelligence
- **Unusual Whales API Integration**: Premium options flow data and gamma exposure metrics
- **Morning Update System**: Automated pre-market intelligence generation
- **News Sentiment Monitoring**: Real-time analysis including Trump communications impact
- **Macro Dashboard**: Comprehensive market sentiment and economic indicators

## 🛠 Technology Stack

- **Frontend**: React 18 + TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js + Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Real-time**: WebSocket implementation for live data streaming
- **AI/ML**: Google Gemini, TensorFlow.js
- **Market Data**: Unusual Whales API, Interactive Brokers TWS, OpenFDA API
- **Build Tool**: Vite for fast development and optimized production builds

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- API keys for external services (see Configuration section)

### Setup Steps

1. **Clone and Install**
```bash
tar -xzf ai-trading-platform-complete.tar.gz
cd ai-trading-platform
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your API keys and database URL
```

3. **Database Setup**
```bash
npm run db:push
```

4. **Start Development Server**
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 🔑 Required API Keys

Add these to your `.env` file:

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AI Services
GEMINI_API_KEY=your_gemini_key_here

# Market Data
UNUSUAL_WHALES_API_KEY=your_unusual_whales_key_here
OPENFDA_API_KEY=your_fda_key_here
MARKETAUX_API_KEY=your_marketaux_key_here

# Trading (for live execution)
IBKR_HOST=127.0.0.1
IBKR_PORT=7497
IBKR_CLIENT_ID=1
```

If the IBKR port is unreachable, the application will automatically use Yahoo Finance as a fallback source for market data.

## 🎯 Main Features Overview

### Dashboard
- Real-time trading metrics and performance analytics
- Active signals and position monitoring
- System health and connectivity status
- AI confidence scoring and market sentiment

### Options Screener
- Multi-dimensional filtering with adaptive stringency controls (1-10 scale)
- AI-powered conviction scoring and sentiment analysis
- Training mode for performance optimization
- Real-time market opportunity identification

### LEAP Analysis
- Long-term options opportunities with 90+ days to expiry
- Institutional flow detection and probability scoring
- Stringency controls for customizable filtering
- Performance tracking and success rate monitoring

### FDA Monitoring
- Real-time pharmaceutical event monitoring
- Drug approvals, recalls, and warning letter alerts
- Automatic ticker identification and trading opportunities
- Confidence scoring for rapid execution decisions

### Risk Management
- Pre-trade position sizing and exposure limits
- Real-time risk monitoring with emergency controls
- Multi-layer validation system
- Circuit breakers and master kill switch

## 🤖 AI Agent System

The platform features a sophisticated multi-agent architecture:

- **Market Intelligence Agent** (25% weight): Analyzes market conditions and unusual flow
- **Technical Analysis Agent** (20% weight): Chart patterns and technical indicators
- **Risk Management Agent** (30% weight): Position sizing and risk assessment
- **Sentiment Analysis Agent** (15% weight): News flow and market sentiment
- **Execution Agent** (10% weight): Order management and execution logic

All agents contribute to consensus-driven decision making with performance-based weighting.

## 📊 Stringency Controls

Both the Options Screener and LEAP Analysis feature advanced stringency controls:

- **Scale**: 1-10 adjustable stringency levels
- **Training Mode**: Systematic performance data collection
- **AI Optimization**: Automated stringency recommendations
- **Performance Metrics**: Success rate, returns, Sharpe ratio, profit factor
- **Adaptive Learning**: Historical performance-based adjustments

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run db:push` - Push database schema changes
- `npm run db:studio` - Open database management interface

### Project Structure
```
├── client/src/          # React frontend
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   └── lib/            # Utility functions
├── server/             # Express backend
│   ├── routes/         # API route handlers
│   ├── services/       # Business logic services
│   └── utils/          # Server utilities
├── shared/             # Shared types and schemas
└── data/              # Static data and configurations
```

## 🚨 Important Notes

### Production Deployment
- Ensure all API keys are properly configured
- Set up SSL/TLS for secure connections
- Configure rate limiting for API endpoints
- Monitor system resources and performance

### Risk Disclaimers
- This software is for educational and research purposes
- All trading involves risk of financial loss
- Test thoroughly with paper trading before live execution
- Ensure compliance with applicable financial regulations

### Data Sources
- Market data requires active API subscriptions
- Real-time data feeds may have associated costs
- Some features require premium service tiers

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For technical support or questions about the trading platform:
- Check the documentation in `/docs`
- Review the FAQ section
- Ensure all API keys are properly configured
- Verify database connectivity

## 🔄 Recent Updates

- ✅ Implemented comprehensive stringency refinement tools
- ✅ Added FDA monitoring system with OpenFDA API integration
- ✅ Enhanced AI-powered conviction scoring and optimization
- ✅ Built training mode for systematic performance data collection
- ✅ Integrated advanced sentiment analysis with crypto/commodity correlation
- ✅ Added real-time options opportunity radar and heat map visualization

---

**Built with ❤️ for algorithmic traders seeking institutional-grade tools and AI-powered market intelligence.**