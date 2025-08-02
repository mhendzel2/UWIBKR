import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import agentRoutes from "./agentRoutes";
import visualTransformerRoutes from "./visualTransformerRoutes";
import sentimentRoutes from "./routes/sentimentRoutes";
import shortExpiryRoutes from "./routes/shortExpiryRoutes";
import ordersRoutes from "./routes/orders";
import fdaRoutes from "./routes/fdaRoutes";
import optionsScreenerRoutes from "./routes/optionsScreener";
import { 
  insertTradingSignalSchema, 
  insertPositionSchema,
  insertTradeSchema,
  insertTradeAssessmentSchema,
  insertPerformanceMetricsSchema,
  type Trade,
  type TradeAssessment
} from "@shared/schema";
import { WebSocketService } from "./services/websocket";
import { SignalProcessor } from "./services/signalProcessor";
import { RiskManager } from "./services/riskManager";
import { IBKRService } from "./services/ibkr";
import { UnusualWhalesService } from "./services/unusualWhales";

// Helper function for sector analysis
function getTopSectors(trades: any[]): any[] {
  const sectorMap = new Map();
  trades.forEach(trade => {
    const sector = trade.sector || 'Unknown';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + 1);
  });
  
  return Array.from(sectorMap.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([sector, count]) => ({ sector, count }));
}

// Generate comprehensive fundamental data for a symbol
function generateFundamentalData(symbol: string) {
  const symbolData: any = {
    'AAPL': { sector: 'Technology', marketCap: 3100000000000, revenue: 394328000000, netIncome: 99803000000, eps: 6.16, pe: 32.9, pb: 39.2, roe: 1.477, debt: 109610000000, cash: 67150000000 },
    'MSFT': { sector: 'Technology', marketCap: 2800000000000, revenue: 211915000000, netIncome: 72361000000, eps: 9.71, pe: 35.1, pb: 11.8, roe: 0.368, debt: 58495000000, cash: 144000000000 },
    'GOOGL': { sector: 'Technology', marketCap: 2100000000000, revenue: 307394000000, netIncome: 73795000000, eps: 5.80, pe: 25.4, pb: 5.8, roe: 0.274, debt: 13253000000, cash: 110000000000 },
    'AMZN': { sector: 'Consumer Discretionary', marketCap: 1700000000000, revenue: 574785000000, netIncome: 30425000000, eps: 2.90, pe: 74.0, pb: 8.4, roe: 0.129, debt: 67150000000, cash: 88000000000 },
    'NVDA': { sector: 'Technology', marketCap: 4300000000000, revenue: 126000000000, netIncome: 61000000000, eps: 24.69, pe: 70.4, pb: 46.2, roe: 1.068, debt: 28000000000, cash: 31000000000 },
    'META': { sector: 'Technology', marketCap: 1900000000000, revenue: 134902000000, netIncome: 39098000000, eps: 14.87, pe: 25.1, pb: 7.2, roe: 0.332, debt: 18000000000, cash: 65000000000 },
    'TSLA': { sector: 'Consumer Discretionary', marketCap: 970000000000, revenue: 96773000000, netIncome: 14997000000, eps: 4.73, pe: 64.0, pb: 14.5, roe: 0.193, debt: 3115000000, cash: 20500000000 }
  };

  const data = symbolData[symbol] || {
    sector: 'Technology',
    marketCap: Math.random() * 1000000000000 + 50000000000,
    revenue: Math.random() * 200000000000 + 10000000000,
    netIncome: Math.random() * 50000000000 + 1000000000,
    eps: Math.random() * 15 + 1,
    pe: Math.random() * 50 + 10,
    pb: Math.random() * 20 + 1,
    roe: Math.random() * 0.5 + 0.1,
    debt: Math.random() * 100000000000,
    cash: Math.random() * 150000000000
  };

  return {
    symbol,
    company: getCompanyName(symbol),
    sector: data.sector,
    industry: getIndustry(data.sector),
    description: `${getCompanyName(symbol)} operates in the ${data.sector} sector.`,
    valuation: {
      marketCap: data.marketCap,
      enterpriseValue: data.marketCap + data.debt - data.cash,
      peRatio: data.pe,
      pbRatio: data.pb,
      psRatio: data.marketCap / data.revenue,
      evRevenue: (data.marketCap + data.debt - data.cash) / data.revenue,
      evEbitda: Math.random() * 30 + 5
    },
    profitability: {
      grossMargin: Math.random() * 0.5 + 0.2,
      operatingMargin: Math.random() * 0.3 + 0.1,
      netMargin: data.netIncome / data.revenue,
      roe: data.roe,
      roa: data.roe * 0.6,
      roic: data.roe * 0.8
    },
    growth: {
      revenueGrowthTTM: Math.random() * 0.4 - 0.1,
      earningsGrowthTTM: Math.random() * 0.6 - 0.2,
      revenueGrowth5Y: Math.random() * 0.3 + 0.05,
      earningsGrowth5Y: Math.random() * 0.4 + 0.05
    },
    financial: {
      revenue: data.revenue,
      grossProfit: data.revenue * (Math.random() * 0.5 + 0.2),
      operatingIncome: data.revenue * (Math.random() * 0.3 + 0.1),
      netIncome: data.netIncome,
      totalAssets: data.marketCap * 0.8,
      totalDebt: data.debt,
      cash: data.cash,
      bookValue: data.marketCap / data.pb
    },
    perShare: {
      earnings: data.eps,
      book: data.marketCap / data.pb / 1000000,
      sales: data.revenue / 1000000000,
      cashFlow: data.eps * 1.2,
      dividend: data.eps * 0.3,
      dividendYield: (data.eps * 0.3) / 100
    },
    analyst: {
      recommendation: Math.random() > 0.6 ? 'BUY' : Math.random() > 0.3 ? 'HOLD' : 'SELL',
      targetPrice: 100 + Math.random() * 200,
      priceTarget12M: 100 + Math.random() * 250,
      analystCount: Math.floor(Math.random() * 20) + 5,
      strongBuy: Math.floor(Math.random() * 8),
      buy: Math.floor(Math.random() * 10),
      hold: Math.floor(Math.random() * 8),
      sell: Math.floor(Math.random() * 3),
      strongSell: Math.floor(Math.random() * 2)
    },
    lastUpdated: new Date().toISOString()
  };
}

function getCompanyName(symbol: string): string {
  const names: { [key: string]: string } = {
    'AAPL': 'Apple Inc.',
    'MSFT': 'Microsoft Corporation',
    'GOOGL': 'Alphabet Inc.',
    'AMZN': 'Amazon.com Inc.',
    'NVDA': 'NVIDIA Corporation',
    'META': 'Meta Platforms Inc.',
    'TSLA': 'Tesla Inc.',
    'AMD': 'Advanced Micro Devices Inc.',
    'ARM': 'Arm Holdings plc',
    'AVGO': 'Broadcom Inc.',
    'BA': 'The Boeing Company',
    'BAC': 'Bank of America Corporation',
    'C': 'Citigroup Inc.',
    'COIN': 'Coinbase Global Inc.',
    'CRM': 'Salesforce Inc.',
    'DIS': 'The Walt Disney Company',
    'FCX': 'Freeport-McMoRan Inc.',
    'GM': 'General Motors Company',
    'HOOD': 'Robinhood Markets Inc.',
    'INTC': 'Intel Corporation',
    'JPM': 'JPMorgan Chase & Co.',
    'LRCX': 'Lam Research Corporation',
    'MRVL': 'Marvell Technology Inc.',
    'MS': 'Morgan Stanley',
    'MSTR': 'MicroStrategy Incorporated',
    'MU': 'Micron Technology Inc.',
    'NFLX': 'Netflix Inc.',
    'NKE': 'NIKE Inc.',
    'ORCL': 'Oracle Corporation',
    'PLTR': 'Palantir Technologies Inc.',
    'PYPL': 'PayPal Holdings Inc.',
    'QCOM': 'QUALCOMM Incorporated',
    'RBLX': 'Roblox Corporation',
    'SHOP': 'Shopify Inc.',
    'SNOW': 'Snowflake Inc.',
    'TSM': 'Taiwan Semiconductor Manufacturing Company Limited',
    'UBER': 'Uber Technologies Inc.',
    'VRT': 'Vertiv Holdings Co.',
    'WFC': 'Wells Fargo & Company',
    'QQQ': 'Invesco QQQ Trust',
    'SMH': 'VanEck Semiconductor ETF',
    'XLI': 'Industrial Select Sector SPDR Fund'
  };
  return names[symbol] || `${symbol} Corporation`;
}

function getIndustry(sector: string): string {
  const industries: { [key: string]: string } = {
    'Technology': 'Software & Technology Services',
    'Consumer Discretionary': 'Consumer Discretionary',
    'Financials': 'Banking & Financial Services',
    'Healthcare': 'Healthcare & Pharmaceuticals',
    'Industrials': 'Industrial Manufacturing',
    'Energy': 'Oil, Gas & Energy',
    'Communication Services': 'Media & Communications',
    'Consumer Staples': 'Consumer Staples',
    'Utilities': 'Utilities & Infrastructure',
    'Real Estate': 'Real Estate Investment',
    'Materials': 'Materials & Mining'
  };
  return industries[sector] || 'Diversified Services';
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize services
  const wsService = new WebSocketService(httpServer);
  const signalProcessor = new SignalProcessor();
  const riskManager = new RiskManager();
  const ibkrService = new IBKRService();
  const uwService = new UnusualWhalesService();

  // Start services
  await ibkrService.connect();
  signalProcessor.startProcessing();

  // Trading Signals endpoints
  app.get("/api/signals", async (req, res) => {
    try {
      const signals = await storage.getTradingSignals();
      res.json(signals);
    } catch (error) {
      console.error("Failed to get signals:", error);
      res.status(500).json({ message: "Failed to retrieve signals" });
    }
  });

  app.get("/api/signals/:id", async (req, res) => {
    try {
      const signal = await storage.getTradingSignal(req.params.id);
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }
      res.json(signal);
    } catch (error) {
      console.error("Failed to get signal:", error);
      res.status(500).json({ message: "Failed to retrieve signal" });
    }
  });

  app.post("/api/signals/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.body;

      const signal = await storage.getTradingSignal(id);
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      // Risk assessment
      const riskAssessment = await riskManager.assessTradeRisk(signal, quantity);
      
      if (!riskAssessment.approved) {
        return res.status(400).json({ 
          message: "Trade rejected by risk management",
          reason: riskAssessment.reason,
          riskScore: riskAssessment.riskScore 
        });
      }

      // Update signal status
      const updatedSignal = await storage.updateTradingSignal(id, {
        status: 'approved',
        approvedAt: new Date(),
      });

      // Broadcast update
      wsService.broadcastSignalUpdate(updatedSignal);

      res.json({ 
        message: "Signal approved", 
        signal: updatedSignal,
        riskAssessment 
      });
    } catch (error) {
      console.error("Failed to approve signal:", error);
      res.status(500).json({ message: "Failed to approve signal" });
    }
  });

  app.post("/api/signals/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.body;

      const signal = await storage.getTradingSignal(id);
      if (!signal) {
        return res.status(404).json({ message: "Signal not found" });
      }

      if (signal.status !== 'approved') {
        return res.status(400).json({ message: "Signal must be approved before execution" });
      }

      // Execute trade through IBKR
      const contract = {
        symbol: signal.ticker,
        secType: 'OPT',
        exchange: 'SMART',
        currency: 'USD',
        strike: 150, // This would be parsed from signal details
        expiry: signal.expiry.replace(/-/g, ''),
        right: 'C',
      };

      const order = {
        action: 'BUY',
        totalQuantity: quantity,
        orderType: 'LMT',
        lmtPrice: parseFloat(signal.entryPrice),
      };

      const orderId = await ibkrService.placeOrder(contract, order);

      if (orderId) {
        // Create position record
        const position = await storage.createPosition({
          signalId: id,
          ticker: signal.ticker,
          strategy: signal.strategy,
          quantity,
          entryPrice: signal.entryPrice || '0',
          currentPrice: signal.entryPrice || '0',
          pnl: '0',
          pnlPercent: '0',
          status: 'open',
          contractDetails: { orderId, contract, order },
        });

        // Update signal status
        const updatedSignal = await storage.updateTradingSignal(id, {
          status: 'executed',
          executedAt: new Date(),
        });

        // Broadcast updates
        wsService.broadcastSignalUpdate(updatedSignal);
        wsService.broadcastPositionUpdate(position);

        res.json({ 
          message: "Trade executed successfully", 
          orderId,
          position,
          signal: updatedSignal 
        });
      } else {
        res.status(500).json({ message: "Failed to execute trade" });
      }
    } catch (error) {
      console.error("Failed to execute trade:", error);
      res.status(500).json({ message: "Failed to execute trade" });
    }
  });

  // Positions endpoints
  app.get("/api/positions", async (req, res) => {
    try {
      const positions = await storage.getAllPositions();
      res.json(positions);
    } catch (error) {
      console.error("Failed to get positions:", error);
      res.status(500).json({ message: "Failed to retrieve positions" });
    }
  });

  app.get("/api/positions/:id", async (req, res) => {
    try {
      const position = await storage.getPosition(req.params.id);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }
      res.json(position);
    } catch (error) {
      console.error("Failed to get position:", error);
      res.status(500).json({ message: "Failed to retrieve position" });
    }
  });

  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const { id } = req.params;
      
      const position = await storage.getPosition(id);
      if (!position) {
        return res.status(404).json({ message: "Position not found" });
      }

      if (position.status !== 'open') {
        return res.status(400).json({ message: "Position is not open" });
      }

      // Close position through IBKR (mock implementation)
      const orderId = `CLOSE_${Date.now()}`;
      
      const updatedPosition = await storage.updatePosition(id, {
        status: 'closed',
        exitTime: new Date(),
      });

      wsService.broadcastPositionUpdate(updatedPosition);

      res.json({ 
        message: "Position closed successfully", 
        orderId,
        position: updatedPosition 
      });
    } catch (error) {
      console.error("Failed to close position:", error);
      res.status(500).json({ message: "Failed to close position" });
    }
  });

  // Options Flow endpoints - DISABLED for sophisticated alert-based approach
  app.get("/api/options-flow", async (req, res) => {
    console.warn("Direct options flow collection disabled - using sophisticated alert-based system");
    res.json([]);
  });

  // Test real TWS connection
  app.get("/api/test/tws-connection", async (req, res) => {
    try {
      const { testTWSConnection, testAllTWSPorts } = await import('./services/realTwsConnection');
      
      const allPortTests = await testAllTWSPorts();
      const connectedPorts = allPortTests.filter(test => test.isReachable);
      
      console.log('TWS Connection Test Results:', allPortTests);
      
      res.json({
        success: connectedPorts.length > 0,
        connectedPorts: connectedPorts.length,
        totalPorts: allPortTests.length,
        tests: allPortTests,
        recommendation: connectedPorts.length > 0 
          ? `TWS is running on port ${connectedPorts[0].port}` 
          : 'TWS is not running. Please start TWS or IB Gateway.'
      });
    } catch (error) {
      console.error("Failed to test TWS connection:", error);
      res.status(500).json({ message: "Failed to test TWS connection" });
    }
  });

  // Get real Friday options flow
  app.get("/api/options-flow/friday", async (req, res) => {
    try {
      console.log('Fetching real Friday options flow data...');
      
      const fridayFlow = await uwService.getFridayOptionsFlow();
      
      res.json({
        date: new Date().toISOString().split('T')[0],
        totalFlows: fridayFlow.length,
        flows: fridayFlow.slice(0, 50), // Return first 50 for display
        summary: {
          totalPremium: fridayFlow.reduce((sum, flow) => sum + (flow.total_premium || 0), 0),
          avgPremium: fridayFlow.length > 0 
            ? fridayFlow.reduce((sum, flow) => sum + (flow.total_premium || 0), 0) / fridayFlow.length 
            : 0,
          callPutRatio: fridayFlow.length > 0 
            ? fridayFlow.filter(f => f.option_type === 'call').length / fridayFlow.filter(f => f.option_type === 'put').length 
            : 0
        }
      });
    } catch (error) {
      console.error("Failed to get Friday options flow:", error);
      res.status(500).json({ 
        message: "Failed to retrieve Friday options flow data",
        error: error.message
      });
    }
  });

  // LEAP Analysis endpoints
  app.get("/api/leaps/analyze", async (req, res) => {
    try {
      const { LEAPAnalyzer } = await import('./services/leapAnalyzer');
      const analyzer = new LEAPAnalyzer();
      
      console.log('Analyzing past week LEAP trades...');
      const leapTrades = await analyzer.analyzePastWeekLEAPs();
      
      res.json({
        success: true,
        totalTrades: leapTrades.length,
        trades: leapTrades,
        summary: {
          highConviction: leapTrades.filter(t => t.conviction === 'high' || t.conviction === 'exceptional').length,
          totalPremium: leapTrades.reduce((sum, t) => sum + t.originalPremium, 0),
          avgProbabilityScore: leapTrades.reduce((sum, t) => sum + t.probabilityScore, 0) / leapTrades.length || 0,
          topSectors: getTopSectors(leapTrades)
        }
      });
    } catch (error) {
      console.error("Failed to analyze LEAP trades:", error);
      res.status(500).json({ message: "Failed to analyze LEAP trades", error: error.message });
    }
  });

  app.get("/api/leaps/:id/details", async (req, res) => {
    try {
      const { LEAPAnalyzer } = await import('./services/leapAnalyzer');
      const analyzer = new LEAPAnalyzer();
      
      const leapId = req.params.id;
      const analysis = await analyzer.getDetailedAnalysis(leapId);
      
      res.json(analysis);
    } catch (error) {
      console.error("Failed to get LEAP details:", error);
      res.status(500).json({ message: "Failed to get LEAP details", error: error.message });
    }
  });

  app.post("/api/leaps/update-prices", async (req, res) => {
    try {
      const { LEAPAnalyzer } = await import('./services/leapAnalyzer');
      const analyzer = new LEAPAnalyzer();
      
      const { leapIds } = req.body;
      if (!Array.isArray(leapIds)) {
        return res.status(400).json({ message: "leapIds must be an array" });
      }
      
      await analyzer.updateCurrentPrices(leapIds);
      
      res.json({ success: true, updatedCount: leapIds.length });
    } catch (error) {
      console.error("Failed to update LEAP prices:", error);
      res.status(500).json({ message: "Failed to update LEAP prices", error: error.message });
    }
  });



  // Sophisticated Alert-Based Endpoints for Swing/LEAP Opportunities
  app.get("/api/flow-alerts", async (req, res) => {
    try {
      const { ticker, minPremium, minDte } = req.query;
      
      const filters = {
        ticker: ticker as string,
        minPremium: minPremium ? parseInt(minPremium as string) : 500000,
        minDte: minDte ? parseInt(minDte as string) : 45,
        issueTypes: ['Common Stock', 'ADR']
      };

      const alerts = await unusualWhales.getFlowAlerts(filters);
      res.json(alerts);
    } catch (error) {
      console.error("Failed to fetch sophisticated flow alerts:", error);
      res.status(500).json({ message: "Failed to fetch flow alerts" });
    }
  });

  // Process alerts through sophisticated filtering
  app.post("/api/alerts/process", async (req, res) => {
    try {
      const { rawAlerts } = req.body;
      
      if (!rawAlerts || !Array.isArray(rawAlerts)) {
        return res.status(400).json({ message: "Raw alerts array required" });
      }

      const { alertProcessor } = await import('./services/alertProcessor');
      const processedAlerts = await alertProcessor.processFlowAlerts(rawAlerts);
      
      res.json({
        processed: processedAlerts.length,
        alerts: processedAlerts
      });
    } catch (error) {
      console.error("Failed to process alerts:", error);
      res.status(500).json({ message: "Failed to process alerts" });
    }
  });

  // Get sophisticated swing/LEAP signals
  app.get("/api/signals/swing-leap", async (req, res) => {
    try {
      const signals = await storage.getTradingSignals();
      const swingLeapSignals = signals.filter(signal => 
        signal.strategy === 'swing' || signal.strategy === 'leap'
      );
      res.json(swingLeapSignals);
    } catch (error) {
      console.error("Failed to fetch swing/LEAP signals:", error);
      res.status(500).json({ message: "Failed to fetch swing/LEAP signals" });
    }
  });

  // Analytics and Reporting Endpoints
  app.get("/api/analytics/comprehensive-report", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to generate analytics report:", error);
      res.status(500).json({ message: "Failed to generate analytics report" });
    }
  });

  app.get("/api/analytics/performance-overview", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report.overview);
    } catch (error) {
      console.error("Failed to get performance overview:", error);
      res.status(500).json({ message: "Failed to get performance overview" });
    }
  });

  app.get("/api/analytics/strategy-performance", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report.strategyPerformance);
    } catch (error) {
      console.error("Failed to get strategy performance:", error);
      res.status(500).json({ message: "Failed to get strategy performance" });
    }
  });

  app.get("/api/analytics/monthly-performance", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report.monthlyPerformance);
    } catch (error) {
      console.error("Failed to get monthly performance:", error);
      res.status(500).json({ message: "Failed to get monthly performance" });
    }
  });

  app.get("/api/analytics/risk-metrics", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report.riskMetrics);
    } catch (error) {
      console.error("Failed to get risk metrics:", error);
      res.status(500).json({ message: "Failed to get risk metrics" });
    }
  });

  app.get("/api/analytics/drawdown-analysis", async (req, res) => {
    try {
      const { analyticsEngine } = await import('./services/analyticsEngine');
      const report = await analyticsEngine.generateComprehensiveReport();
      res.json(report.drawdownAnalysis);
    } catch (error) {
      console.error("Failed to get drawdown analysis:", error);
      res.status(500).json({ message: "Failed to get drawdown analysis" });
    }
  });

  // Development endpoint to generate sample data for analytics
  app.post("/api/analytics/generate-sample-data", async (req, res) => {
    try {
      const { generateSampleTradingData } = await import('./utils/sampleData');
      const result = await generateSampleTradingData();
      res.json(result);
    } catch (error) {
      console.error("Failed to generate sample data:", error);
      res.status(500).json({ message: "Failed to generate sample data" });
    }
  });

  // Portfolio Optimization Endpoints
  app.get("/api/portfolio/metrics", async (req, res) => {
    try {
      // Mock portfolio metrics for demonstration
      const metrics = {
        totalValue: 125847,
        totalReturn: 8.4,
        sharpeRatio: 1.85,
        volatility: 18.2,
        maxDrawdown: 12.3,
        beta: 1.15,
        alpha: 0.08,
        diversificationRatio: 0.82
      };
      res.json(metrics);
    } catch (error) {
      console.error("Failed to get portfolio metrics:", error);
      res.status(500).json({ message: "Failed to retrieve portfolio metrics" });
    }
  });

  app.get("/api/portfolio/allocations", async (req, res) => {
    try {
      // Mock allocation data for demonstration
      const allocations = [];
      res.json(allocations);
    } catch (error) {
      console.error("Failed to get portfolio allocations:", error);
      res.status(500).json({ message: "Failed to retrieve portfolio allocations" });
    }
  });

  app.get("/api/portfolio/optimization-scenarios", async (req, res) => {
    try {
      // Mock optimization scenarios for demonstration
      const scenarios = [];
      res.json(scenarios);
    } catch (error) {
      console.error("Failed to get optimization scenarios:", error);
      res.status(500).json({ message: "Failed to retrieve optimization scenarios" });
    }
  });

  // News and Sentiment Analysis Endpoints (TWS-powered)
  app.get("/api/news", async (req, res) => {
    try {
      const { newsService } = await import('./services/newsService');
      const { symbol, timeframe = '24h' } = req.query;
      
      const symbols = symbol ? [symbol as string] : ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SPY', 'QQQ'];
      const news = await newsService.fetchFinancialNews(symbols, timeframe as string);
      
      res.json(news);
    } catch (error) {
      console.error("Failed to get TWS news:", error);
      res.status(500).json({ message: "Failed to retrieve news from TWS" });
    }
  });

  // TWS Market Data Endpoints
  app.get("/api/market-data/:symbols", async (req, res) => {
    try {
      const { ibkrService } = await import('./services/ibkr');
      const symbols = req.params.symbols.split(',');
      const data = await ibkrService.getMarketData(symbols);
      res.json(data);
    } catch (error) {
      console.error("Failed to get TWS market data:", error);
      res.status(500).json({ message: "Failed to retrieve market data from TWS" });
    }
  });

  app.get("/api/fundamentals/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      console.log(`Fetching fundamental data for ${symbol}`);
      
      // Generate comprehensive fundamental data 
      const fundamentalData = generateFundamentalData(symbol);
      
      res.json(fundamentalData);
    } catch (error) {
      console.error("Failed to get fundamental data:", error);
      res.status(500).json({ message: "Failed to retrieve fundamental data" });
    }
  });

  app.get("/api/economic-calendar", async (req, res) => {
    try {
      const { ibkrService } = await import('./services/ibkr');
      const { days = '7' } = req.query;
      const events = await ibkrService.getEconomicCalendar(parseInt(days as string));
      res.json(events);
    } catch (error) {
      console.error("Failed to get TWS economic calendar:", error);
      res.status(500).json({ message: "Failed to retrieve economic calendar from TWS" });
    }
  });

  app.get("/api/news/:timeframe/:filter", async (req, res) => {
    try {
      const { newsService } = await import('./services/newsService');
      const { timeframe, filter } = req.params;
      const { symbol } = req.query;
      
      const symbols = symbol ? [symbol as string] : ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SPY', 'QQQ'];
      let news = await newsService.fetchFinancialNews(symbols, timeframe);
      
      // Apply sentiment filter
      if (filter !== 'all') {
        news = news.filter(n => n.sentiment === filter);
      }
      
      res.json(news);
    } catch (error) {
      console.error("Failed to get filtered news:", error);
      res.status(500).json({ message: "Failed to retrieve filtered news" });
    }
  });

  app.get("/api/sentiment/analysis", async (req, res) => {
    try {
      const { newsService } = await import('./services/newsService');
      const symbols = ['NVDA', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'SPY', 'QQQ'];
      const analysis = await newsService.analyzeSentimentForSymbols(symbols);
      res.json(analysis);
    } catch (error) {
      console.error("Failed to get sentiment analysis:", error);
      res.status(500).json({ message: "Failed to retrieve sentiment analysis" });
    }
  });

  app.get("/api/sentiment/market-mood", async (req, res) => {
    try {
      const { newsService } = await import('./services/newsService');
      const mood = await newsService.getMarketMood();
      res.json(mood);
    } catch (error) {
      console.error("Failed to get market mood:", error);
      res.status(500).json({ message: "Failed to retrieve market mood" });
    }
  });

  // Risk Management endpoints
  app.get("/api/risk/status", async (req, res) => {
    try {
      const status = riskManager.getRiskStatus();
      res.json(status);
    } catch (error) {
      console.error("Failed to get risk status:", error);
      res.status(500).json({ message: "Failed to retrieve risk status" });
    }
  });

  app.post("/api/risk/emergency-stop", async (req, res) => {
    try {
      riskManager.activateEmergencyStop();
      wsService.broadcastRiskAlert({
        type: 'emergency_stop',
        message: 'Emergency stop activated - all trading halted',
        severity: 'critical',
      });
      res.json({ message: "Emergency stop activated" });
    } catch (error) {
      console.error("Failed to activate emergency stop:", error);
      res.status(500).json({ message: "Failed to activate emergency stop" });
    }
  });

  app.post("/api/risk/pause-trading", async (req, res) => {
    try {
      riskManager.pauseTrading();
      wsService.broadcastRiskAlert({
        type: 'trading_paused',
        message: 'Trading has been paused',
        severity: 'warning',
      });
      res.json({ message: "Trading paused" });
    } catch (error) {
      console.error("Failed to pause trading:", error);
      res.status(500).json({ message: "Failed to pause trading" });
    }
  });

  app.post("/api/risk/resume-trading", async (req, res) => {
    try {
      riskManager.resumeTrading();
      wsService.broadcastRiskAlert({
        type: 'trading_resumed',
        message: 'Trading has been resumed',
        severity: 'info',
      });
      res.json({ message: "Trading resumed" });
    } catch (error) {
      console.error("Failed to resume trading:", error);
      res.status(500).json({ message: "Failed to resume trading" });
    }
  });

  app.get("/api/risk/parameters", async (req, res) => {
    try {
      const params = await storage.getRiskParameters();
      res.json(params);
    } catch (error) {
      console.error("Failed to get risk parameters:", error);
      res.status(500).json({ message: "Failed to retrieve risk parameters" });
    }
  });

  app.post("/api/risk/parameters", async (req, res) => {
    try {
      const params = await storage.createRiskParameters(req.body);
      res.json(params);
    } catch (error) {
      console.error("Failed to update risk parameters:", error);
      res.status(500).json({ message: "Failed to update risk parameters" });
    }
  });

  // Portfolio Management endpoints
  app.get("/api/portfolios", async (req, res) => {
    try {
      // Get IBKR account info for paper trading synchronization
      const accountInfo = await ibkrService.getAccountInfo();
      
      if (!accountInfo) {
        return res.status(503).json({ message: "IBKR connection not available" });
      }

      // For demo, create a simplified portfolio response from IBKR account data
      const portfolio = {
        id: "paper-trading-portfolio",
        userId: "demo-user",
        name: "Paper Trading Portfolio",
        description: "IBKR Paper Trading Account Integration",
        type: "paper",
        ibkrAccountId: accountInfo.accountId,
        riskProfile: "moderate",
        performance: {
          totalValue: accountInfo.netLiquidation,
          dayPnL: accountInfo.realizedPnL + accountInfo.unrealizedPnL,
          totalPnL: accountInfo.unrealizedPnL,
          percentChange: accountInfo.netLiquidation > 0 
            ? ((accountInfo.unrealizedPnL / accountInfo.netLiquidation) * 100) 
            : 0,
          positionCount: 0
        },
        syncedAt: new Date().toISOString()
      };

      res.json([portfolio]);
    } catch (error) {
      console.error("Failed to get portfolios:", error);
      res.status(500).json({ message: "Failed to retrieve portfolios" });
    }
  });

  app.get("/api/portfolios/:id", async (req, res) => {
    try {
      if (req.params.id !== "paper-trading-portfolio") {
        return res.status(404).json({ message: "Portfolio not found" });
      }

      // Get detailed IBKR account info and positions
      const [accountInfo, positions] = await Promise.all([
        ibkrService.getAccountInfo(),
        ibkrService.getPositions()
      ]);

      if (!accountInfo) {
        return res.status(503).json({ message: "IBKR connection not available" });
      }

      const portfolio = {
        id: req.params.id,
        userId: "demo-user", 
        name: "Paper Trading Portfolio",
        description: "IBKR Paper Trading Account Integration",
        type: "paper",
        ibkrAccountId: accountInfo.accountId,
        performance: {
          totalValue: accountInfo.netLiquidation,
          dayPnL: accountInfo.realizedPnL + accountInfo.unrealizedPnL,
          totalPnL: accountInfo.unrealizedPnL,
          percentChange: accountInfo.netLiquidation > 0 
            ? ((accountInfo.unrealizedPnL / accountInfo.netLiquidation) * 100) 
            : 0,
          positionCount: positions?.length || 0
        },
        positions: positions || [],
        accountDetails: {
          netLiquidation: accountInfo.netLiquidation,
          totalCashValue: accountInfo.totalCashValue,
          settledCash: accountInfo.settledCash,
          availableFunds: accountInfo.availableFunds,
          buyingPower: accountInfo.buyingPower,
          grossPositionValue: accountInfo.grossPositionValue,
          realizedPnL: accountInfo.realizedPnL,
          unrealizedPnL: accountInfo.unrealizedPnL
        },
        lastSync: new Date().toISOString()
      };

      res.json(portfolio);
    } catch (error) {
      console.error("Failed to get portfolio details:", error);
      res.status(500).json({ message: "Failed to retrieve portfolio details" });
    }
  });

  app.post("/api/portfolios/:id/sync", async (req, res) => {
    try {
      const { PortfolioManager } = await import('./services/portfolioManager');
      const portfolioManager = new PortfolioManager();
      
      const result = await portfolioManager.syncPortfolioWithIBKR(req.params.id);
      
      if (result.success) {
        wsService.broadcastPortfolioUpdate(req.params.id);
        res.json({
          message: "Portfolio synchronized successfully",
          result
        });
      } else {
        res.status(400).json({
          message: "Portfolio synchronization failed",
          errors: result.errors
        });
      }
    } catch (error) {
      console.error("Failed to sync portfolio:", error);
      res.status(500).json({ message: "Failed to synchronize portfolio" });
    }
  });

  // Account information
  app.get("/api/account", async (req, res) => {
    try {
      const accountInfo = await ibkrService.getAccountInfo();
      res.json(accountInfo);
    } catch (error) {
      console.error("Failed to get account info:", error);
      res.status(500).json({ message: "Failed to retrieve account information" });
    }
  });

  // System health
  app.get("/api/system/health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      
      // Update service statuses
      await storage.updateSystemHealth('IBKR TWS', {
        status: ibkrService.isConnected() ? 'connected' : 'disconnected',
        latency: 12,
      });

      const processingStats = signalProcessor.getProcessingStats();
      await storage.updateSystemHealth('Signal Processor', {
        status: processingStats.isProcessing ? 'active' : 'idle',
        metadata: processingStats,
      });

      const wsStats = wsService.getStats();
      await storage.updateSystemHealth('WebSocket', {
        status: 'active',
        metadata: wsStats,
      });

      const updatedHealth = await storage.getSystemHealth();
      res.json(updatedHealth);
    } catch (error) {
      console.error("Failed to get system health:", error);
      res.status(500).json({ message: "Failed to retrieve system health" });
    }
  });

  // Market data
  app.get("/api/market/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const marketData = await storage.getMarketData(symbol.toUpperCase());
      
      if (!marketData) {
        return res.status(404).json({ message: "Market data not found" });
      }
      
      res.json(marketData);
    } catch (error) {
      console.error("Failed to get market data:", error);
      res.status(500).json({ message: "Failed to retrieve market data" });
    }
  });

  // Processing statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = {
        signals: {
          total: (await storage.getTradingSignals()).length,
          pending: (await storage.getTradingSignals()).filter(s => s.status === 'pending').length,
          approved: (await storage.getTradingSignals()).filter(s => s.status === 'approved').length,
          executed: (await storage.getTradingSignals()).filter(s => s.status === 'executed').length,
        },
        positions: {
          total: (await storage.getAllPositions()).length,
          open: (await storage.getAllPositions()).filter(p => p.status === 'open').length,
          closed: (await storage.getAllPositions()).filter(p => p.status === 'closed').length,
        },
        processing: signalProcessor.getProcessingStats(),
        websocket: wsService.getStats(),
        ibkr: ibkrService.getConnectionStats(),
        unusualWhales: uwService.getRequestStats(),
        risk: riskManager.getRiskStatus(),
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Failed to get statistics:", error);
      res.status(500).json({ message: "Failed to retrieve statistics" });
    }
  });

  // Historical Data endpoints
  app.get("/api/historical/:dataType", async (req, res) => {
    try {
      const { dataType } = req.params;
      const { symbol, timeframe = '1d', startDate, endDate, limit } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "startDate and endDate are required" });
      }

      const params = {
        dataType,
        symbol: symbol as string | undefined,
        timeframe: timeframe as string,
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const historicalData = await storage.getHistoricalData(params);
      res.json(historicalData);
    } catch (error) {
      console.error("Failed to get historical data:", error);
      res.status(500).json({ message: "Failed to retrieve historical data" });
    }
  });

  app.post("/api/historical", async (req, res) => {
    try {
      const historicalData = await storage.createHistoricalData(req.body);
      res.json(historicalData);
    } catch (error) {
      console.error("Failed to create historical data:", error);
      res.status(500).json({ message: "Failed to create historical data" });
    }
  });

  // Alerts endpoints
  app.get("/api/alerts", async (req, res) => {
    try {
      const { userId } = req.query;
      const alerts = await storage.getAlerts(userId as string | undefined);
      res.json(alerts);
    } catch (error) {
      console.error("Failed to get alerts:", error);
      res.status(500).json({ message: "Failed to retrieve alerts" });
    }
  });

  app.get("/api/alerts/unread/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const alerts = await storage.getUnreadAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Failed to get unread alerts:", error);
      res.status(500).json({ message: "Failed to retrieve unread alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alert = await storage.createAlert(req.body);
      // Broadcast alert to connected clients
      wsService.broadcast('alert_created', alert);
      res.json(alert);
    } catch (error) {
      console.error("Failed to create alert:", error);
      res.status(500).json({ message: "Failed to create alert" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.markAlertAsRead(id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.acknowledgeAlert(id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // Account Alerts endpoints
  app.get("/api/account-alerts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const alerts = await storage.getAccountAlerts(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Failed to get account alerts:", error);
      res.status(500).json({ message: "Failed to retrieve account alerts" });
    }
  });

  app.post("/api/account-alerts", async (req, res) => {
    try {
      const alert = await storage.createAccountAlert(req.body);
      res.json(alert);
    } catch (error) {
      console.error("Failed to create account alert:", error);
      res.status(500).json({ message: "Failed to create account alert" });
    }
  });

  app.patch("/api/account-alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.updateAccountAlert(id, req.body);
      if (!alert) {
        return res.status(404).json({ message: "Account alert not found" });
      }
      res.json(alert);
    } catch (error) {
      console.error("Failed to update account alert:", error);
      res.status(500).json({ message: "Failed to update account alert" });
    }
  });

  app.delete("/api/account-alerts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAccountAlert(id);
      if (!deleted) {
        return res.status(404).json({ message: "Account alert not found" });
      }
      res.json({ message: "Account alert deleted successfully" });
    } catch (error) {
      console.error("Failed to delete account alert:", error);
      res.status(500).json({ message: "Failed to delete account alert" });
    }
  });

  // Comprehensive Trade Tracking Endpoints
  
  // Get all trades with optional filtering
  app.get("/api/trades", async (req, res) => {
    try {
      const { ticker, signalId, status } = req.query;
      let trades: Trade[];
      
      if (ticker) {
        trades = await storage.getTradesByTicker(ticker as string);
      } else if (signalId) {
        trades = await storage.getTradesBySignal(signalId as string);
      } else {
        trades = await storage.getAllTrades();
      }
      
      // Filter by status if provided
      if (status) {
        trades = trades.filter(trade => trade.status === status);
      }
      
      res.json(trades);
    } catch (error) {
      console.error("Failed to get trades:", error);
      res.status(500).json({ message: "Failed to retrieve trades" });
    }
  });

  // Get specific trade with assessments
  app.get("/api/trades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const trade = await storage.getTrade(id);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      // Get associated assessments
      const assessments = await storage.getTradeAssessments(id);
      
      res.json({
        ...trade,
        assessments
      });
    } catch (error) {
      console.error("Failed to get trade:", error);
      res.status(500).json({ message: "Failed to retrieve trade" });
    }
  });

  // Create new trade
  app.post("/api/trades", async (req, res) => {
    try {
      const validatedData = insertTradeSchema.parse(req.body);
      const trade = await storage.createTrade(validatedData);
      
      // Broadcast trade creation via WebSocket
      wsService.broadcast({
        type: 'trade_created',
        data: trade
      });
      
      res.status(201).json(trade);
    } catch (error) {
      console.error("Failed to create trade:", error);
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  // Update trade (e.g., close trade, update P&L)
  app.patch("/api/trades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const trade = await storage.updateTrade(id, req.body);
      if (!trade) {
        return res.status(404).json({ message: "Trade not found" });
      }
      
      // Broadcast trade update via WebSocket
      wsService.broadcast({
        type: 'trade_updated',
        data: trade
      });
      
      res.json(trade);
    } catch (error) {
      console.error("Failed to update trade:", error);
      res.status(500).json({ message: "Failed to update trade" });
    }
  });

  // Delete trade
  app.delete("/api/trades/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTrade(id);
      if (!deleted) {
        return res.status(404).json({ message: "Trade not found" });
      }
      res.json({ message: "Trade deleted successfully" });
    } catch (error) {
      console.error("Failed to delete trade:", error);
      res.status(500).json({ message: "Failed to delete trade" });
    }
  });

  // Trade Assessment Endpoints
  
  // Get assessments for a specific trade
  app.get("/api/trades/:tradeId/assessments", async (req, res) => {
    try {
      const { tradeId } = req.params;
      const assessments = await storage.getTradeAssessments(tradeId);
      res.json(assessments);
    } catch (error) {
      console.error("Failed to get trade assessments:", error);
      res.status(500).json({ message: "Failed to retrieve trade assessments" });
    }
  });

  // Create trade assessment
  app.post("/api/trades/:tradeId/assessments", async (req, res) => {
    try {
      const { tradeId } = req.params;
      const assessmentData = {
        ...req.body,
        tradeId
      };
      const validatedData = insertTradeAssessmentSchema.parse(assessmentData);
      const assessment = await storage.createTradeAssessment(validatedData);
      res.status(201).json(assessment);
    } catch (error) {
      console.error("Failed to create trade assessment:", error);
      res.status(500).json({ message: "Failed to create trade assessment" });
    }
  });

  // Update trade assessment
  app.patch("/api/assessments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const assessment = await storage.updateTradeAssessment(id, req.body);
      if (!assessment) {
        return res.status(404).json({ message: "Trade assessment not found" });
      }
      res.json(assessment);
    } catch (error) {
      console.error("Failed to update trade assessment:", error);
      res.status(500).json({ message: "Failed to update trade assessment" });
    }
  });

  // Performance Analytics Endpoints
  
  // Get performance metrics
  app.get("/api/performance", async (req, res) => {
    try {
      const { period, startDate, endDate } = req.query;
      const params: any = {};
      
      if (period) params.period = period as string;
      if (startDate) params.startDate = new Date(startDate as string);
      if (endDate) params.endDate = new Date(endDate as string);
      
      const metrics = await storage.getPerformanceMetrics(params);
      res.json(metrics);
    } catch (error) {
      console.error("Failed to get performance metrics:", error);
      res.status(500).json({ message: "Failed to retrieve performance metrics" });
    }
  });

  // Calculate and create performance metrics for a specific period
  app.post("/api/performance/calculate", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const metrics = await storage.calculatePerformanceMetrics(
        new Date(startDate),
        new Date(endDate)
      );
      res.status(201).json(metrics);
    } catch (error) {
      console.error("Failed to calculate performance metrics:", error);
      res.status(500).json({ message: "Failed to calculate performance metrics" });
    }
  });

  // Trade Statistics Summary
  app.get("/api/trades/statistics", async (req, res) => {
    try {
      const allTrades = await storage.getAllTrades();
      const openTrades = allTrades.filter(t => t.status === 'open');
      const closedTrades = allTrades.filter(t => t.status === 'closed');
      
      const totalPnl = closedTrades.reduce((sum, trade) => 
        sum + parseFloat(trade.realizedPnl || '0'), 0
      );
      
      const winningTrades = closedTrades.filter(t => 
        parseFloat(t.realizedPnl || '0') > 0
      );
      
      const winRate = closedTrades.length > 0 ? 
        (winningTrades.length / closedTrades.length) * 100 : 0;
      
      const totalCommissions = allTrades.reduce((sum, trade) => 
        sum + parseFloat(trade.commission || '0'), 0
      );

      const unrealizedPnl = openTrades.reduce((sum, trade) => 
        sum + parseFloat(trade.unrealizedPnl || '0'), 0
      );

      res.json({
        totalTrades: allTrades.length,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
        winningTrades: winningTrades.length,
        winRate: Math.round(winRate * 100) / 100,
        totalRealizedPnl: Math.round(totalPnl * 100) / 100,
        totalUnrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        netPnl: Math.round((totalPnl - totalCommissions) * 100) / 100
      });
    } catch (error) {
      console.error("Failed to get trade statistics:", error);
      res.status(500).json({ message: "Failed to retrieve trade statistics" });
    }
  });

  // Advanced Charting Endpoints
  app.get("/api/charts/data", async (req, res) => {
    try {
      const { symbol, timeframe } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ message: "Symbol is required" });
      }
      
      // Get chart data from IBKR TWS
      const chartData = await ibkrService.getHistoricalData(
        symbol as string,
        timeframe as string || '1D'
      );
      
      res.json(chartData);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      res.status(500).json({ message: "Failed to fetch chart data" });
    }
  });

  app.get("/api/charts/options-chain", async (req, res) => {
    try {
      const { symbol } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ message: "Symbol is required" });
      }
      
      // Get options chain data from IBKR TWS
      const optionsData = await ibkrService.getOptionsChain(symbol as string);
      
      res.json(optionsData);
    } catch (error) {
      console.error("Failed to fetch options chain:", error);
      res.status(500).json({ message: "Failed to fetch options chain" });
    }
  });

  app.get("/api/charts/gamma-exposure", async (req, res) => {
    try {
      const { symbol } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ message: "Symbol is required" });
      }
      
      // Get gamma exposure data from Unusual Whales API
      const gammaData = await uwService.getGammaExposure(symbol as string);
      
      res.json(gammaData);
    } catch (error) {
      console.error("Failed to fetch gamma exposure:", error);
      res.status(500).json({ message: "Failed to fetch gamma exposure" });
    }
  });

  app.get("/api/charts/technical-indicators", async (req, res) => {
    try {
      const { symbol, indicators } = req.query;
      
      if (!symbol) {
        return res.status(400).json({ message: "Symbol is required" });
      }
      
      const indicatorList = indicators ? (indicators as string).split(',') : ['SMA20', 'SMA50', 'RSI'];
      
      // Calculate technical indicators from chart data
      const technicalData = await ibkrService.getTechnicalIndicators(
        symbol as string,
        indicatorList
      );
      
      res.json(technicalData);
    } catch (error) {
      console.error("Failed to fetch technical indicators:", error);
      res.status(500).json({ message: "Failed to fetch technical indicators" });
    }
  });

  // Reporting and Analytics endpoints
  app.get("/api/reports/performance", async (req, res) => {
    try {
      const { reportingEngine } = await import('./services/reportingEngine');
      const report = await reportingEngine.generatePerformanceReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to generate performance report:", error);
      res.status(500).json({ message: "Failed to generate performance report" });
    }
  });

  app.get("/api/reports/risk", async (req, res) => {
    try {
      const { reportingEngine } = await import('./services/reportingEngine');
      const report = await reportingEngine.generateRiskReport();
      res.json(report);
    } catch (error) {
      console.error("Failed to generate risk report:", error);
      res.status(500).json({ message: "Failed to generate risk report" });
    }
  });

  app.get("/api/reports/trade/:id", async (req, res) => {
    try {
      const { reportingEngine } = await import('./services/reportingEngine');
      const { id } = req.params;
      const report = await reportingEngine.generateDetailedTradeReport(id);
      
      if (!report) {
        return res.status(404).json({ message: "Trade not found or not closed" });
      }
      
      res.json(report);
    } catch (error) {
      console.error("Failed to generate detailed trade report:", error);
      res.status(500).json({ message: "Failed to generate detailed trade report" });
    }
  });

  app.get("/api/reports/export", async (req, res) => {
    try {
      const { format = 'pdf', period = '1M' } = req.query;
      const { reportingEngine } = await import('./services/reportingEngine');
      const report = await reportingEngine.generatePerformanceReport();
      
      // For now, return JSON - would implement PDF/Excel export in production
      res.json({
        format,
        period,
        data: report,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Failed to export report:", error);
      res.status(500).json({ message: "Failed to export report" });
    }
  });

  // Data Import and Watchlist Management endpoints
  // File upload endpoint for web interface
  app.post("/api/data/upload", async (req, res) => {
    try {
      // In production, you'd use multer or similar for file uploads
      // For now, we'll handle file path uploads
      const { fileName, fileContent, dataType } = req.body;
      
      if (!fileName || !fileContent) {
        return res.status(400).json({ message: "File name and content are required" });
      }

      const fs = require('fs');
      const path = require('path');
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Ensure uploads directory exists
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filePath = path.join(uploadsDir, fileName);
      fs.writeFileSync(filePath, fileContent);
      
      // Auto-detect data type from filename or use provided type
      let importResult;
      const { dataImporter } = await import('./services/dataImporter');
      
      if (dataType === 'options' || fileName.includes('options')) {
        importResult = await dataImporter.importOptionsDataFromCSV(filePath);
      } else if (dataType === 'watchlist' || fileName.includes('watchlist')) {
        importResult = await dataImporter.importWatchlistFromCSV(filePath);
      } else {
        importResult = await dataImporter.importHistoricalDataFromCSV(filePath);
      }
      
      res.json({
        message: "File uploaded and imported successfully",
        fileName,
        filePath,
        importResult
      });
      
    } catch (error) {
      console.error("Failed to upload and import file:", error);
      res.status(500).json({ message: "Failed to upload and import file" });
    }
  });

  app.post("/api/data/import/historical", async (req, res) => {
    try {
      const { dataImporter } = await import('./services/dataImporter');
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const result = await dataImporter.importHistoricalDataFromCSV(filePath);
      res.json(result);
    } catch (error) {
      console.error("Failed to import historical data:", error);
      res.status(500).json({ message: "Failed to import historical data" });
    }
  });

  app.post("/api/data/import/options", async (req, res) => {
    try {
      const { dataImporter } = await import('./services/dataImporter');
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const result = await dataImporter.importOptionsDataFromCSV(filePath);
      res.json(result);
    } catch (error) {
      console.error("Failed to import options data:", error);
      res.status(500).json({ message: "Failed to import options data" });
    }
  });

  app.post("/api/data/import/watchlist", async (req, res) => {
    try {
      const { dataImporter } = await import('./services/dataImporter');
      const { filePath } = req.body;
      
      if (!filePath) {
        return res.status(400).json({ message: "File path is required" });
      }
      
      const result = await dataImporter.importWatchlistFromCSV(filePath);
      res.json(result);
    } catch (error) {
      console.error("Failed to import watchlist:", error);
      res.status(500).json({ message: "Failed to import watchlist" });
    }
  });

  app.get("/api/data/barchart-instructions", async (req, res) => {
    try {
      const { dataImporter } = await import('./services/dataImporter');
      const { symbols, startDate, endDate } = req.query;
      
      const symbolList = Array.isArray(symbols) ? symbols as string[] : [symbols as string];
      const instructionsPath = await dataImporter.downloadBarchartData(
        symbolList, 
        startDate as string || '2023-01-01', 
        endDate as string || new Date().toISOString().split('T')[0]
      );
      
      const instructions = require('fs').readFileSync(instructionsPath, 'utf8');
      res.json({ instructions, filePath: instructionsPath });
    } catch (error) {
      console.error("Failed to generate instructions:", error);
      res.status(500).json({ message: "Failed to generate Barchart instructions" });
    }
  });

  // Watchlist endpoints
  app.get("/api/watchlist", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      const watchlist = gexTracker.getWatchlist();
      res.json(watchlist);
    } catch (error) {
      console.error("Failed to get watchlist:", error);
      res.status(500).json({ message: "Failed to get watchlist" });
    }
  });

  app.post("/api/watchlist/add", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      const { symbols, options } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ message: "Symbols array is required" });
      }
      
      await gexTracker.addToWatchlist(symbols, options);
      res.json({ message: `Added ${symbols.length} symbols to watchlist` });
    } catch (error) {
      console.error("Failed to add to watchlist:", error);
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/remove", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      const { symbols } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ message: "Symbols array is required" });
      }
      
      await gexTracker.removeFromWatchlist(symbols);
      res.json({ message: `Removed ${symbols.length} symbols from watchlist` });
    } catch (error) {
      console.error("Failed to remove from watchlist:", error);
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // ML and Transformer endpoints
  app.get("/api/ml/status", async (req, res) => {
    try {
      const { mlPatternRecognition } = await import('./services/mlPatternRecognition');
      const stats = mlPatternRecognition.getModelMetrics();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get ML status:", error);
      res.status(500).json({ message: "Failed to get ML status" });
    }
  });

  app.post("/api/ml/enable-transformer", async (req, res) => {
    try {
      const { mlPatternRecognition } = await import('./services/mlPatternRecognition');
      const { enable } = req.body;
      
      mlPatternRecognition.enableTransformer(enable !== false);
      res.json({ 
        message: `Transformer model ${enable !== false ? 'enabled' : 'disabled'}`,
        transformerEnabled: enable !== false
      });
    } catch (error) {
      console.error("Failed to toggle transformer:", error);
      res.status(500).json({ message: "Failed to toggle transformer" });
    }
  });

  app.post("/api/ml/analyze-with-transformer", async (req, res) => {
    try {
      const { mlPatternRecognition } = await import('./services/mlPatternRecognition');
      const { signal } = req.body;
      
      if (!signal) {
        return res.status(400).json({ message: "Signal data is required" });
      }
      
      const analysis = await mlPatternRecognition.analyzeWithTransformer(signal);
      res.json(analysis);
    } catch (error) {
      console.error("Failed to analyze with transformer:", error);
      res.status(500).json({ message: "Failed to analyze with transformer" });
    }
  });

  app.post("/api/ml/train-transformer", async (req, res) => {
    try {
      const { transformerML } = await import('./services/transformerML');
      const { marketSequences } = req.body;
      
      if (!marketSequences || !Array.isArray(marketSequences)) {
        return res.status(400).json({ message: "Market sequences data is required" });
      }
      
      await transformerML.trainTransformer(marketSequences);
      res.json({ message: "Transformer training completed" });
    } catch (error) {
      console.error("Failed to train transformer:", error);
      res.status(500).json({ message: "Failed to train transformer" });
    }
  });

  app.get("/api/ml/transformer-stats", async (req, res) => {
    try {
      const { transformerML } = await import('./services/transformerML');
      const stats = transformerML.getModelStats();
      res.json(stats);
    } catch (error) {
      console.error("Failed to get transformer stats:", error);
      res.status(500).json({ message: "Failed to get transformer stats" });
    }
  });

  // Fundamentals Analysis endpoints
  app.get("/api/fundamentals/:symbol", async (req, res) => {
    try {
      const { fundamentalsAnalyzer } = await import('./services/fundamentalsAnalyzer');
      const { symbol } = req.params;
      const fundamentals = await fundamentalsAnalyzer.getFundamentals(symbol.toUpperCase());
      res.json(fundamentals);
    } catch (error) {
      console.error(`Failed to get fundamentals for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to get fundamentals" });
    }
  });

  app.get("/api/fundamentals/:symbol/score", async (req, res) => {
    try {
      const { fundamentalsAnalyzer } = await import('./services/fundamentalsAnalyzer');
      const { symbol } = req.params;
      const score = await fundamentalsAnalyzer.calculateFundamentalScore(symbol.toUpperCase());
      res.json(score);
    } catch (error) {
      console.error(`Failed to get fundamental score for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to get fundamental score" });
    }
  });

  app.post("/api/fundamentals/batch", async (req, res) => {
    try {
      const { fundamentalsAnalyzer } = await import('./services/fundamentalsAnalyzer');
      const { symbols } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ message: "Symbols array is required" });
      }
      
      const fundamentalsMap = await fundamentalsAnalyzer.getWatchlistFundamentals(
        symbols.map((s: string) => s.toUpperCase())
      );
      
      const result = Object.fromEntries(fundamentalsMap);
      res.json(result);
    } catch (error) {
      console.error("Failed to get batch fundamentals:", error);
      res.status(500).json({ message: "Failed to get batch fundamentals" });
    }
  });

  app.get("/api/news/:symbol", async (req, res) => {
    try {
      const { newsAggregator } = await import('./services/newsAggregator');
      const { symbol } = req.params;
      const { hours = 24 } = req.query;
      
      const articles = newsAggregator.getArticlesForSymbol(
        symbol.toUpperCase(), 
        parseInt(hours as string) || 24
      );
      
      res.json(articles);
    } catch (error) {
      console.error(`Failed to get news for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to get news" });
    }
  });

  app.get("/api/sentiment/:symbol", async (req, res) => {
    try {
      const { newsAggregator } = await import('./services/newsAggregator');
      const { symbol } = req.params;
      const { hours = 24 } = req.query;
      
      const sentiment = await newsAggregator.getSymbolSentiment(
        symbol.toUpperCase(), 
        parseInt(hours as string) || 24
      );
      
      res.json(sentiment);
    } catch (error) {
      console.error(`Failed to get sentiment for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to get sentiment" });
    }
  });

  app.post("/api/news/aggregate", async (req, res) => {
    try {
      const { newsAggregator } = await import('./services/newsAggregator');
      const { symbols } = req.body;
      
      if (!symbols || !Array.isArray(symbols)) {
        return res.status(400).json({ message: "Symbols array is required" });
      }
      
      const articles = await newsAggregator.aggregateAllNews(
        symbols.map((s: string) => s.toUpperCase())
      );
      
      res.json(articles);
    } catch (error) {
      console.error("Failed to aggregate news:", error);
      res.status(500).json({ message: "Failed to aggregate news" });
    }
  });

  // Macroeconomic Data endpoints
  app.get("/api/macro/data", async (req, res) => {
    try {
      const { macroeconomicDataService } = await import('./services/macroeconomicData');
      const macroData = await macroeconomicDataService.getMacroeconomicData();
      res.json(macroData);
    } catch (error) {
      console.error("Failed to get macroeconomic data:", error);
      res.status(500).json({ message: "Failed to get macroeconomic data" });
    }
  });

  app.get("/api/macro/analysis", async (req, res) => {
    try {
      const { macroeconomicDataService } = await import('./services/macroeconomicData');
      const analysis = await macroeconomicDataService.analyzeMacroeconomicConditions();
      res.json(analysis);
    } catch (error) {
      console.error("Failed to get macroeconomic analysis:", error);
      res.status(500).json({ message: "Failed to get macroeconomic analysis" });
    }
  });

  app.get("/api/macro/fear-greed", async (req, res) => {
    try {
      const { macroeconomicDataService } = await import('./services/macroeconomicData');
      const macroData = await macroeconomicDataService.getMacroeconomicData();
      res.json({
        index: macroData.fearGreedComponents.overallFearGreed,
        components: macroData.fearGreedComponents,
        interpretation: macroData.fearGreedComponents.overallFearGreed > 75 ? 'Extreme Greed' :
                       macroData.fearGreedComponents.overallFearGreed > 55 ? 'Greed' :
                       macroData.fearGreedComponents.overallFearGreed > 45 ? 'Neutral' :
                       macroData.fearGreedComponents.overallFearGreed > 25 ? 'Fear' : 'Extreme Fear',
        timestamp: macroData.timestamp
      });
    } catch (error) {
      console.error("Failed to get Fear & Greed Index:", error);
      res.status(500).json({ message: "Failed to get Fear & Greed Index" });
    }
  });

  app.get("/api/macro/yield-curve", async (req, res) => {
    try {
      const { macroeconomicDataService } = await import('./services/macroeconomicData');
      const macroData = await macroeconomicDataService.getMacroeconomicData();
      res.json({
        treasuryRates: macroData.treasuryRates,
        yieldCurve: macroData.yieldCurve,
        federalRates: macroData.federalRates,
        timestamp: macroData.timestamp
      });
    } catch (error) {
      console.error("Failed to get yield curve data:", error);
      res.status(500).json({ message: "Failed to get yield curve data" });
    }
  });

  app.get("/api/macro/trends/:days", async (req, res) => {
    try {
      const { macroeconomicDataService } = await import('./services/macroeconomicData');
      const { days } = req.params;
      const trends = await macroeconomicDataService.getHistoricalTrends(parseInt(days) || 30);
      res.json(trends);
    } catch (error) {
      console.error("Failed to get macroeconomic trends:", error);
      res.status(500).json({ message: "Failed to get macroeconomic trends" });
    }
  });

  // Morning Update endpoints
  app.get("/api/morning-update", async (req, res) => {
    try {
      const { morningUpdateService } = await import('./services/morningUpdate');
      let morningUpdate = await morningUpdateService.getLatestMorningUpdate();
      
      if (!morningUpdate) {
        morningUpdate = await morningUpdateService.generateManualMorningUpdate();
      }
      
      res.json(morningUpdate);
    } catch (error) {
      console.error("Failed to get morning update:", error);
      res.status(500).json({ message: "Failed to get morning update" });
    }
  });

  app.post("/api/morning-update/generate", async (req, res) => {
    try {
      const { morningUpdateService } = await import('./services/morningUpdate');
      const morningUpdate = await morningUpdateService.generateManualMorningUpdate();
      res.json(morningUpdate);
    } catch (error) {
      console.error("Failed to generate morning update:", error);
      res.status(500).json({ message: "Failed to generate morning update" });
    }
  });

  app.get("/api/morning-update/summary", async (req, res) => {
    try {
      const { morningUpdateService } = await import('./services/morningUpdate');
      const morningUpdate = await morningUpdateService.getLatestMorningUpdate();
      
      if (!morningUpdate) {
        return res.status(404).json({ message: "No morning update available" });
      }
      
      const summary = await morningUpdateService.generateMorningUpdateSummary(morningUpdate);
      res.json(summary);
    } catch (error) {
      console.error("Failed to get morning update summary:", error);
      res.status(500).json({ message: "Failed to get morning update summary" });
    }
  });

  // Market Intelligence endpoints
  app.get("/api/intelligence/:symbol", async (req, res) => {
    try {
      const { marketIntelligence } = await import('./services/marketIntelligence');
      const { symbol } = req.params;
      const summary = await marketIntelligence.getMarketIntelligenceSummary(symbol.toUpperCase());
      res.json(summary);
    } catch (error) {
      console.error(`Failed to get market intelligence for ${req.params.symbol}:`, error);
      res.status(500).json({ message: "Failed to get market intelligence" });
    }
  });

  app.get("/api/intelligence/alerts", async (req, res) => {
    try {
      const { marketIntelligence } = await import('./services/marketIntelligence');
      const { symbol, acknowledged } = req.query;
      
      const alerts = await marketIntelligence.getMarketAlerts(
        symbol as string,
        acknowledged !== undefined ? acknowledged === 'true' : undefined
      );
      
      res.json(alerts);
    } catch (error) {
      console.error("Failed to get market alerts:", error);
      res.status(500).json({ message: "Failed to get market alerts" });
    }
  });

  app.post("/api/intelligence/alerts/:id/acknowledge", async (req, res) => {
    try {
      const { marketIntelligence } = await import('./services/marketIntelligence');
      const { id } = req.params;
      const success = await marketIntelligence.acknowledgeAlert(id);
      
      if (success) {
        res.json({ message: "Alert acknowledged" });
      } else {
        res.status(404).json({ message: "Alert not found" });
      }
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
      res.status(500).json({ message: "Failed to acknowledge alert" });
    }
  });

  // GEX and levels endpoints
  app.get("/api/gex/levels", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      const { symbol } = req.query;
      
      if (symbol) {
        const levels = await gexTracker.getGEXLevels(symbol as string);
        res.json(levels);
      } else {
        const allLevels = await gexTracker.getAllGEXLevels();
        res.json(allLevels);
      }
    } catch (error) {
      console.error("Failed to get GEX levels:", error);
      res.status(500).json({ message: "Failed to get GEX levels" });
    }
  });

  app.post("/api/gex/force-update", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      await gexTracker.forceUpdate();
      res.json({ message: "GEX update completed" });
    } catch (error) {
      console.error("Failed to force GEX update:", error);
      res.status(500).json({ message: "Failed to force GEX update" });
    }
  });

  app.get("/api/gex/update-history", async (req, res) => {
    try {
      const { gexTracker } = await import('./services/gexTracker');
      const history = await gexTracker.getUpdateHistory();
      res.json(history);
    } catch (error) {
      console.error("Failed to get update history:", error);
      res.status(500).json({ message: "Failed to get update history" });
    }
  });

  // Portfolio Management API Endpoints
  app.get("/api/portfolios", async (req, res) => {
    try {
      const { userId } = req.query;
      const portfolios = await storage.getPortfoliosByUser(userId as string || 'default-user');
      res.json(portfolios);
    } catch (error) {
      console.error("Failed to get portfolios:", error);
      res.status(500).json({ message: "Failed to get portfolios" });
    }
  });

  app.get("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Failed to get portfolio:", error);
      res.status(500).json({ message: "Failed to get portfolio" });
    }
  });

  app.post("/api/portfolios", async (req, res) => {
    try {
      const portfolioData = {
        userId: req.body.userId || 'default-user',
        name: req.body.name,
        description: req.body.description,
        type: req.body.type || 'paper',
        ibkrAccountId: req.body.ibkrAccountId,
        riskProfile: req.body.riskProfile || 'moderate'
      };
      
      const portfolio = await storage.createPortfolio(portfolioData);
      res.json(portfolio);
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      res.status(500).json({ message: "Failed to create portfolio" });
    }
  });

  app.put("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolio = await storage.updatePortfolio(req.params.id, req.body);
      if (!portfolio) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json(portfolio);
    } catch (error) {
      console.error("Failed to update portfolio:", error);
      res.status(500).json({ message: "Failed to update portfolio" });
    }
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      const success = await storage.deletePortfolio(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Portfolio not found" });
      }
      res.json({ message: "Portfolio deleted successfully" });
    } catch (error) {
      console.error("Failed to delete portfolio:", error);
      res.status(500).json({ message: "Failed to delete portfolio" });
    }
  });

  // Portfolio positions endpoints
  app.get("/api/portfolios/:id/positions", async (req, res) => {
    try {
      const positions = await storage.getPortfolioPositions(req.params.id);
      res.json(positions);
    } catch (error) {
      console.error("Failed to get portfolio positions:", error);
      res.status(500).json({ message: "Failed to get portfolio positions" });
    }
  });

  // Portfolio transactions endpoints
  app.get("/api/portfolios/:id/transactions", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const transactions = await storage.getPortfolioTransactions(req.params.id, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Failed to get portfolio transactions:", error);
      res.status(500).json({ message: "Failed to get portfolio transactions" });
    }
  });

  app.post("/api/portfolios/:id/transactions", async (req, res) => {
    try {
      const transactionData = {
        portfolioId: req.params.id,
        symbol: req.body.symbol,
        action: req.body.action,
        quantity: req.body.quantity,
        price: req.body.price,
        fees: req.body.fees || '0',
        contractDetails: req.body.contractDetails || { secType: 'STK', currency: 'USD' },
        executionTime: req.body.executionTime ? new Date(req.body.executionTime) : new Date()
      };
      
      const { portfolioManager } = await import('./services/portfolioManager');
      const transaction = await portfolioManager.recordTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Failed to record transaction:", error);
      res.status(500).json({ message: "Failed to record transaction" });
    }
  });

  // Portfolio sync endpoints
  app.post("/api/portfolios/:id/sync", async (req, res) => {
    try {
      const { portfolioManager } = await import('./services/portfolioManager');
      const result = await portfolioManager.syncPortfolioData(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Failed to sync portfolio:", error);
      res.status(500).json({ message: "Failed to sync portfolio" });
    }
  });

  app.post("/api/portfolios/:id/auto-sync", async (req, res) => {
    try {
      const { portfolioManager } = await import('./services/portfolioManager');
      const { enabled, intervalMinutes } = req.body;
      
      if (enabled) {
        portfolioManager.startAutoSync(req.params.id, intervalMinutes || 5);
        res.json({ message: "Auto-sync enabled" });
      } else {
        portfolioManager.stopAutoSync(req.params.id);
        res.json({ message: "Auto-sync disabled" });
      }
    } catch (error) {
      console.error("Failed to configure auto-sync:", error);
      res.status(500).json({ message: "Failed to configure auto-sync" });
    }
  });

  // Multi-Agent Trading System Routes
  app.use("/api", agentRoutes);
  app.use("/api/short-expiry", shortExpiryRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/fda", fdaRoutes);
  app.use("/api/visual-transformer", visualTransformerRoutes);
  app.use("/api/sentiment", sentimentRoutes);

  // Import watchlist from CSV endpoint
  app.post("/api/watchlist/import-csv", async (req, res) => {
    try {
      const fs = require('fs');
      const path = require('path');
      const csv = require('fast-csv');
      
      const csvPath = path.join(process.cwd(), 'data', 'ai-watchlist-intraday.csv');
      const symbols: any[] = [];
      
      if (!fs.existsSync(csvPath)) {
        return res.status(404).json({ message: "CSV file not found" });
      }
      
      fs.createReadStream(csvPath)
        .pipe(csv.parse({ headers: true }))
        .on('data', (row: any) => {
          if (row.Symbol && row.Symbol !== 'Symbol') {
            const sector = getSectorForSymbol(row.Symbol);
            symbols.push({
              symbol: row.Symbol,
              name: row.Name,
              sector: sector,
              enabled: true,
              gexTracking: !['VIX'].includes(row.Symbol),
              lastPrice: parseFloat(row.Last) || 0,
              change: parseFloat(row.Change?.replace(/[^-0-9.]/g, '')) || 0,
              changePercent: parseFloat(row['%Chg']?.replace(/[^-0-9.]/g, '')) || 0,
              volume: parseInt(row.Volume?.replace(/,/g, '')) || 0,
              lastUpdated: new Date().toISOString()
            });
          }
        })
        .on('end', async () => {
          try {
            // Clear existing watchlist and add new symbols
            await storage.clearWatchlist();
            for (const symbol of symbols) {
              await storage.addToWatchlist(symbol);
            }
            
            console.log(`✅ Imported ${symbols.length} symbols from CSV to watchlist`);
            res.json({ 
              message: `Successfully imported ${symbols.length} symbols from CSV`,
              symbols: symbols.map(s => s.symbol)
            });
          } catch (error) {
            console.error('Failed to import symbols:', error);
            res.status(500).json({ message: "Failed to import symbols to watchlist" });
          }
        })
        .on('error', (error: any) => {
          console.error('CSV parsing error:', error);
          res.status(500).json({ message: "Failed to parse CSV file" });
        });
    } catch (error) {
      console.error("Failed to import CSV:", error);
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });

  // Initialize routes last
  app.use('/api/options', optionsScreenerRoutes);
  
  // Options heatmap routes
  const { default: optionsHeatmapRoutes } = await import('./routes/optionsHeatmap');
  app.use('/api/options', optionsHeatmapRoutes);
  
  // Options radar routes
  const { default: optionsRadarRoutes } = await import('./routes/optionsRadar');
  app.use('/api/options', optionsRadarRoutes);

  return httpServer;
}

function getSectorForSymbol(symbol: string): string {
  const sectorMap: { [key: string]: string } = {
    'AAPL': 'Technology', 'AMD': 'Technology', 'AMZN': 'Consumer Discretionary', 'ARM': 'Technology',
    'AVGO': 'Technology', 'BA': 'Industrials', 'BAC': 'Financials', 'C': 'Financials',
    'COIN': 'Financials', 'CRM': 'Technology', 'DIS': 'Communication Services', 'FCX': 'Materials',
    'GM': 'Consumer Discretionary', 'HOOD': 'Financials', 'INTC': 'Technology', 'JPM': 'Financials',
    'LRCX': 'Technology', 'META': 'Technology', 'MRVL': 'Technology', 'MS': 'Financials',
    'MSTR': 'Technology', 'MU': 'Technology', 'NFLX': 'Communication Services', 'NKE': 'Consumer Discretionary',
    'NVDA': 'Technology', 'ORCL': 'Technology', 'PLTR': 'Technology', 'PYPL': 'Financials',
    'QCOM': 'Technology', 'RBLX': 'Communication Services', 'SHOP': 'Technology', 'SNOW': 'Technology',
    'TSLA': 'Consumer Discretionary', 'TSM': 'Technology', 'UBER': 'Technology', 'VRT': 'Industrials',
    'WFC': 'Financials', 'QQQ': 'ETF', 'SMH': 'ETF', 'XLI': 'ETF'
  };
  return sectorMap[symbol] || 'Technology';
}
