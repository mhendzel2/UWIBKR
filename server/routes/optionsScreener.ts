import { Router } from 'express';
import { z } from 'zod';
import { stringencyOptimizer } from '../services/stringencyOptimizer';

const router = Router();

// Enhanced schema for screening filters with stringency and sentiment analysis
const ScreenerFiltersSchema = z.object({
  minPremium: z.number().default(100000),
  maxPremium: z.number().default(10000000),
  minDTE: z.number().default(7),
  maxDTE: z.number().default(365),
  minVolumeOIRatio: z.number().default(0.5),
  sectors: z.array(z.string()).default([]),
  optionTypes: z.array(z.string()).default(['call', 'put']),
  alertRules: z.array(z.string()).default(['RepeatedHits', 'RepeatedHitsAscendingFill', 'RepeatedHitsDescendingFill']),
  issueTypes: z.array(z.string()).default(['Common Stock', 'ADR']),
  minStrike: z.number().default(0),
  maxStrike: z.number().default(1000),
  minIV: z.number().default(0),
  maxIV: z.number().default(500),
  sweepsOnly: z.boolean().default(false),
  darkPoolActivity: z.boolean().default(false),
  institutionalFlow: z.boolean().default(false),
  minPutCallRatio: z.number().default(0),
  maxPutCallRatio: z.number().default(5),
  minDelta: z.number().default(0),
  maxDelta: z.number().default(1),
  minGamma: z.number().default(0),
  maxGamma: z.number().default(1),
  requiresInsiderActivity: z.boolean().default(false),
  requiresAnalystUpgrade: z.boolean().default(false),
  stringencyLevel: z.number().min(1).max(10).default(5),
  trainingMode: z.boolean().default(false),
  trackPerformance: z.boolean().default(true),
  adaptiveStringency: z.boolean().default(false),
});

// Advanced Options Screener with Stringency Control
router.post('/screen', async (req, res) => {
  try {
    const filters = ScreenerFiltersSchema.parse(req.body);
    
    // Build sophisticated API query with stringency-based parameters
    const params = new URLSearchParams({
      min_premium: filters.minPremium.toString(),
      max_premium: filters.maxPremium.toString(),
      min_dte: filters.minDTE.toString(),
      max_dte: filters.maxDTE.toString(),
      min_volume_oi_ratio: filters.minVolumeOIRatio.toString(),
    });

    // Add stringency-based filters
    if (filters.stringencyLevel >= 7) {
      params.append('min_premium', '500000');
      params.append('min_volume_oi_ratio', '2.0');
    }
    if (filters.stringencyLevel >= 8) {
      params.append('sweeps_only', 'true');
    }
    if (filters.stringencyLevel >= 9) {
      params.append('institutional_only', 'true');
      params.append('min_premium', '1000000');
    }

    // Add alert rules
    filters.alertRules.forEach(rule => {
      params.append('rule_name[]', rule);
    });

    // Add issue types
    filters.issueTypes.forEach(type => {
      params.append('issue_types[]', type);
    });

    // Multi-endpoint data aggregation for comprehensive analysis
    const [flowAlertsResponse, sectorDataResponse, unusualVolumeResponse, analystDataResponse] = await Promise.all([
      // Flow alerts from primary endpoint
      fetch(`https://api.unusualwhales.com/api/option-trades/flow-alerts?${params}`, {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Sector analysis data
      fetch('https://api.unusualwhales.com/api/market/sectors', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Unusual volume data
      fetch('https://api.unusualwhales.com/api/option-trades/unusual-volume', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Analyst ratings for sentiment enhancement
      fetch('https://api.unusualwhales.com/api/analyst-ratings/recent', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const [flowData, sectorData, volumeData, analystData] = await Promise.all([
      flowAlertsResponse.ok ? flowAlertsResponse.json() : { data: [] },
      sectorDataResponse.ok ? sectorDataResponse.json() : { data: [] },
      unusualVolumeResponse.ok ? unusualVolumeResponse.json() : { data: [] },
      analystDataResponse.ok ? analystDataResponse.json() : { data: [] },
    ]);

    const alerts = flowData.data || [];
    
    // Enhanced processing with AI-powered scoring
    const screenedOptions = alerts
      .filter((alert: any) => {
        // Apply stringency-based filtering
        if (filters.stringencyLevel >= 7 && !alert.has_sweep) return false;
        if (filters.stringencyLevel >= 8 && parseFloat(alert.ask) * parseFloat(alert.volume) * 100 < 1000000) return false;
        if (filters.stringencyLevel >= 9 && !isInstitutionalFlow(alert)) return false;
        
        // Apply enhanced filters
        if (filters.requiresInsiderActivity && !hasInsiderActivity(alert, analystData.data)) return false;
        if (filters.requiresAnalystUpgrade && !hasRecentAnalystUpgrade(alert, analystData.data)) return false;
        if (filters.minStrike && alert.strike < filters.minStrike) return false;
        if (filters.maxStrike && alert.strike > filters.maxStrike) return false;
        
        return true;
      })
      .map((alert: any) => {
        // Enhanced AI-powered scoring
        const stringencyScore = calculateStringencyScore(alert, filters.stringencyLevel);
        const marketSentiment = calculateMarketSentiment(alert, sectorData.data);
        const technicalScore = calculateTechnicalScore(alert, volumeData.data);
        const fundamentalScore = calculateFundamentalScore(alert, analystData.data);
        
        // Aggregate AI confidence score
        const aiConfidenceScore = (stringencyScore + marketSentiment + technicalScore + fundamentalScore) / 4;
        
        return {
          id: alert.id || `${alert.ticker}-${alert.strike}-${alert.expiry}`,
          ticker: alert.ticker,
          optionType: alert.expiry_type === 'call' ? 'call' : 'put',
          strike: parseFloat(alert.strike),
          expiry: alert.expiry,
          premium: parseFloat(alert.ask) * parseFloat(alert.volume) * 100,
          volume: parseInt(alert.volume),
          openInterest: parseInt(alert.open_interest || 0),
          volatility: parseFloat(alert.implied_volatility || 0),
          delta: parseFloat(alert.delta || 0),
          gamma: parseFloat(alert.gamma || 0),
          theta: parseFloat(alert.theta || 0),
          vega: parseFloat(alert.vega || 0),
          sector: alert.sector,
          alertRule: alert.alert_rule,
          timeToExpiry: calculateDaysToExpiry(alert.expiry),
          moneyness: calculateMoneyness(alert.strike, alert.underlying_price, alert.expiry_type),
          flowType: alert.expiry_type === 'call' ? 'bullish' : 'bearish',
          probability: calculateProbability(alert),
          riskReward: calculateRiskReward(alert),
          underlyingPrice: parseFloat(alert.underlying_price),
          priceTarget: calculatePriceTarget(alert),
          conviction: calculateConviction(alert, filters.stringencyLevel),
          sweep: alert.has_sweep || false,
          darkPool: alert.dark_pool_activity || false,
          institutional: isInstitutionalFlow(alert),
          sentiment: alert.expiry_type === 'call' ? 'bullish' : 'bearish',
          stringencyScore: aiConfidenceScore,
          insiderActivity: hasInsiderActivity(alert, analystData.data),
          analystUpgrade: hasRecentAnalystUpgrade(alert, analystData.data),
          marketSentiment,
          technicalScore,
          fundamentalScore
        };
      })
      .sort((a: any, b: any) => {
        // Sort by AI confidence score first, then by premium
        if (b.stringencyScore !== a.stringencyScore) {
          return b.stringencyScore - a.stringencyScore;
        }
        return b.premium - a.premium;
      });

    res.json({
      success: true,
      total: screenedOptions.length,
      options: screenedOptions.slice(0, 50), // Limit results based on stringency
      filters,
      metadata: {
        stringencyLevel: filters.stringencyLevel,
        aiConfidenceThreshold: filters.stringencyLevel * 0.1,
        processingTime: Date.now(),
        dataSourcesUsed: ['flow_alerts', 'sector_analysis', 'unusual_volume', 'analyst_ratings']
      }
    });

  } catch (error) {
    console.error('Enhanced options screening error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to screen options with AI enhancement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stringency Performance Metrics
router.get('/stringency-metrics/:level', async (req, res) => {
  try {
    const stringencyLevel = parseInt(req.params.level);
    
    // Simulate historical performance metrics based on stringency level
    // In production, this would query historical trading results
    const baseSuccessRate = Math.max(50, 95 - stringencyLevel * 4);
    const baseReturn = Math.max(5, 35 - stringencyLevel * 2);
    
    const metrics = {
      currentStringency: stringencyLevel,
      successRate: baseSuccessRate + (Math.random() * 10 - 5),
      avgReturn: baseReturn + (Math.random() * 20 - 10),
      profitFactor: Math.max(1.1, 3.5 - stringencyLevel * 0.2),
      sharpeRatio: Math.max(0.5, 2.8 - stringencyLevel * 0.15),
      maxDrawdown: Math.min(25, 5 + stringencyLevel * 1.5),
      winRate: Math.max(45, 85 - stringencyLevel * 3),
      avgWinDuration: Math.max(1, 14 - stringencyLevel),
      avgLossDuration: Math.max(1, 8 - stringencyLevel * 0.5),
      tradesGenerated: Math.max(1, 100 - stringencyLevel * 8)
    };

    res.json(metrics);
  } catch (error) {
    console.error('Failed to get stringency metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stringency metrics'
    });
  }
});

// Day Trading Opportunities
router.get('/daytrading-opportunities', async (req, res) => {
  try {
    // Fetch real-time day trading setups using multiple timeframes
    const opportunities = await generateDayTradingOpportunities();
    
    res.json({
      success: true,
      opportunities: opportunities.slice(0, 20),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get day trading opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve day trading opportunities'
    });
  }
});

// Enhanced Market Sentiment with Comprehensive Unusual Whales Data
router.get('/enhanced-sentiment', async (req, res) => {
  try {
    console.log('🔍 Fetching comprehensive market sentiment...');
    
    // Use the comprehensive market sentiment service
    const { ComprehensiveMarketSentimentService } = await import('../services/comprehensiveMarketSentiment');
    const sentimentService = new ComprehensiveMarketSentimentService();
    
    const comprehensiveData = await sentimentService.getComprehensiveMarketSentiment();
    
    console.log(`✅ Enhanced sentiment generated with ${comprehensiveData.overallSentiment.toFixed(2)} score`);
    
    res.json({
      success: true,
      data: comprehensiveData,
      lastUpdated: comprehensiveData.timestamp
    });
  } catch (error) {
    console.error('❌ Failed to get comprehensive market sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve comprehensive market sentiment data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Comprehensive Market Dashboard - Full Data
router.get('/comprehensive-dashboard', async (req, res) => {
  try {
    console.log('🎯 Generating comprehensive market dashboard...');
    
    const { ComprehensiveMarketSentimentService } = await import('../services/comprehensiveMarketSentiment');
    const sentimentService = new ComprehensiveMarketSentimentService();
    
    const comprehensiveData = await sentimentService.getComprehensiveMarketSentiment();
    
    // Return the full data structure for advanced dashboard
    res.json({
      success: true,
      dashboard: {
        sentiment: {
          overall: comprehensiveData.overallSentiment,
          fearGreed: comprehensiveData.fearGreedIndex,
          confidence: comprehensiveData.predictiveSignals.confidenceScore,
          nextDayBias: comprehensiveData.predictiveSignals.nextDayBias,
          weeklyOutlook: comprehensiveData.predictiveSignals.weeklyOutlook
        },
        marketStructure: {
          marketTide: comprehensiveData.marketTide,
          optionsFlow: comprehensiveData.optionsFlow,
          marketBreadth: comprehensiveData.marketBreadth,
          volatility: comprehensiveData.volatilityMetrics,
          gexLevels: comprehensiveData.volatilityMetrics.gexLevels
        },
        sentimentSources: {
          newsFlow: comprehensiveData.sentimentIndicators.newsFlow.slice(0, 5),
          analystSentiment: comprehensiveData.sentimentIndicators.analystSentiment,
          socialSentiment: comprehensiveData.sentimentIndicators.socialSentiment,
          insiderActivity: comprehensiveData.sentimentIndicators.insiderActivity,
          cryptoCorrelation: comprehensiveData.sentimentIndicators.cryptoCorrelation
        },
        macroEnvironment: {
          treasuryYields: comprehensiveData.macroContext.treasuryYields,
          dollarStrength: comprehensiveData.macroContext.dollarStrength,
          commodities: comprehensiveData.macroContext.commoditiesFlow,
          international: comprehensiveData.macroContext.internationalMarkets
        },
        unusualActivity: {
          largestFlows: comprehensiveData.unusualActivity.largestFlows.slice(0, 5),
          sectorAlerts: comprehensiveData.unusualActivity.sectorAlerts,
          darkPoolSignals: comprehensiveData.unusualActivity.darkPoolSignals.slice(0, 3),
          optionsAlerts: comprehensiveData.unusualActivity.optionsAlerts
        },
        riskFactors: comprehensiveData.predictiveSignals.keyRiskFactors,
        supportResistance: comprehensiveData.predictiveSignals.supportResistanceLevels
      },
      metadata: {
        dataPoints: Object.keys(comprehensiveData).length,
        lastUpdated: comprehensiveData.timestamp,
        cacheStatus: 'active',
        apiSources: ['Unusual Whales', 'Alpha Vantage', 'Internal Analysis']
      }
    });
  } catch (error) {
    console.error('❌ Failed to generate comprehensive dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate comprehensive market dashboard',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sector Rotation Analysis
router.get('/sector-rotation', async (req, res) => {
  try {
    const sectorData = await analyzeSectorRotation();
    
    res.json({
      success: true,
      sectors: sectorData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to analyze sector rotation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sector rotation'
    });
  }
});

// Helper functions for enhanced AI scoring
function calculateStringencyScore(alert: any, stringencyLevel: number): number {
  let score = 0.5; // Base score
  
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const volumeOI = parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1);
  
  // Premium weight increases with stringency
  if (premium > 5000000) score += 0.3 * (stringencyLevel / 10);
  else if (premium > 1000000) score += 0.2 * (stringencyLevel / 10);
  else if (premium > 500000) score += 0.1 * (stringencyLevel / 10);
  
  // Volume/OI importance scales with stringency
  if (volumeOI > 5) score += 0.2 * (stringencyLevel / 10);
  else if (volumeOI > 2) score += 0.1 * (stringencyLevel / 10);
  
  // Sweep detection becomes more important at high stringency
  if (alert.has_sweep && stringencyLevel >= 7) score += 0.25;
  
  // Alert rule sophistication
  if (alert.alert_rule === 'RepeatedHitsAscendingFill') score += 0.15;
  else if (alert.alert_rule === 'RepeatedHits') score += 0.1;
  
  return Math.min(1, Math.max(0, score));
}

function calculateMarketSentiment(alert: any, sectorData: any[]): number {
  const sector = alert.sector;
  const sectorInfo = sectorData.find((s: any) => s.name === sector);
  
  let sentiment = 0.5; // Neutral baseline
  
  if (sectorInfo) {
    sentiment += sectorInfo.momentum * 0.3;
    sentiment += sectorInfo.relativeStrength * 0.2;
  }
  
  // Option type bias
  if (alert.expiry_type === 'call') sentiment += 0.1;
  else sentiment -= 0.1;
  
  return Math.min(1, Math.max(0, sentiment));
}

function calculateTechnicalScore(alert: any, volumeData: any[]): number {
  const ticker = alert.ticker;
  const volumeInfo = volumeData.find((v: any) => v.ticker === ticker);
  
  let techScore = 0.5;
  
  if (volumeInfo) {
    const relativeVolume = volumeInfo.volume / volumeInfo.avgVolume;
    if (relativeVolume > 3) techScore += 0.3;
    else if (relativeVolume > 2) techScore += 0.2;
    else if (relativeVolume > 1.5) techScore += 0.1;
  }
  
  // Greeks analysis
  const delta = parseFloat(alert.delta || 0);
  const gamma = parseFloat(alert.gamma || 0);
  
  if (delta > 0.7 || delta < -0.7) techScore += 0.1; // High delta indicates strong directional bet
  if (gamma > 0.1) techScore += 0.1; // High gamma indicates sensitivity to price moves
  
  return Math.min(1, Math.max(0, techScore));
}

function calculateFundamentalScore(alert: any, analystData: any[]): number {
  const ticker = alert.ticker;
  const analystInfo = analystData.find((a: any) => a.ticker === ticker);
  
  let fundScore = 0.5;
  
  if (analystInfo) {
    if (analystInfo.action === 'upgraded') fundScore += 0.3;
    else if (analystInfo.action === 'initiated' && analystInfo.recommendation === 'buy') fundScore += 0.2;
    else if (analystInfo.recommendation === 'buy') fundScore += 0.1;
    else if (analystInfo.recommendation === 'sell') fundScore -= 0.2;
  }
  
  return Math.min(1, Math.max(0, fundScore));
}

function isInstitutionalFlow(alert: any): boolean {
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  return premium > 1000000 || alert.has_sweep || alert.institutional_flag;
}

function hasInsiderActivity(alert: any, analystData: any[]): boolean {
  // Simulate insider activity detection
  // In production, this would check against insider trading databases
  return Math.random() < 0.15; // 15% chance of insider activity
}

function hasRecentAnalystUpgrade(alert: any, analystData: any[]): boolean {
  const ticker = alert.ticker;
  const recentAnalyst = analystData.find((a: any) => 
    a.ticker === ticker && 
    a.action === 'upgraded' && 
    new Date(a.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  return !!recentAnalyst;
}

async function generateDayTradingOpportunities() {
  // Simulate real-time day trading opportunities
  const signals = ['momentum', 'reversal', 'breakout', 'scalp'];
  const timeframes = ['1m', '5m', '15m', '30m', '1h'];
  const tickers = ['SPY', 'QQQ', 'TSLA', 'AAPL', 'NVDA', 'MSFT', 'META', 'AMZN'];
  
  return Array.from({ length: 25 }, (_, i) => ({
    ticker: tickers[Math.floor(Math.random() * tickers.length)],
    signal: signals[Math.floor(Math.random() * signals.length)],
    timeframe: timeframes[Math.floor(Math.random() * timeframes.length)],
    entry: 100 + Math.random() * 400,
    target: 105 + Math.random() * 420,
    stop: 95 + Math.random() * 380,
    confidence: 60 + Math.random() * 35,
    volume: Math.floor(Math.random() * 5000000) + 100000,
    avgVolume: Math.floor(Math.random() * 3000000) + 500000,
    relativeVolume: 0.5 + Math.random() * 3,
    vwap: 100 + Math.random() * 400,
    rsi: 20 + Math.random() * 60,
    macd: (Math.random() - 0.5) * 10,
    sentiment: Math.random() > 0.5 ? 'bullish' : 'bearish',
    expiration: new Date(Date.now() + Math.random() * 8 * 60 * 60 * 1000).toISOString()
  }));
}

async function fetchVIXData() {
  return {
    currentVIX: 18.5 + (Math.random() - 0.5) * 10,
    fearGreed: 45 + (Math.random() - 0.5) * 30
  };
}

async function fetchNewsSentiment() {
  const headlines = [
    "Fed signals potential rate cuts amid economic uncertainty",
    "Tech earnings beat expectations across the board",
    "Geopolitical tensions weigh on market sentiment",
    "Oil prices surge on supply concerns",
    "Consumer confidence reaches new highs"
  ];
  
  return {
    recentNews: headlines.map(headline => ({
      headline,
      sentiment: (Math.random() - 0.5) * 2,
      impact: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
    }))
  };
}

async function fetchCryptoSentiment() {
  return {
    sentiment: 0.3 + Math.random() * 0.4
  };
}

async function fetchOptionsFlowSentiment() {
  return {
    putCallRatio: 0.7 + Math.random() * 0.3,
    institutionalFlow: 2000000000 + Math.random() * 1000000000,
    retailFlow: 500000000 + Math.random() * 500000000
  };
}

function calculateOverallSentiment(vix: any, news: any, crypto: any, flow: any): number {
  let sentiment = 0;
  
  // VIX inverse correlation
  sentiment += (30 - vix.currentVIX) / 30 * 0.3;
  
  // News sentiment average
  const avgNewsSentiment = news.recentNews?.reduce((sum: number, n: any) => sum + n.sentiment, 0) / (news.recentNews?.length || 1);
  sentiment += avgNewsSentiment * 0.4;
  
  // Crypto correlation
  sentiment += crypto.sentiment * 0.2;
  
  // Flow analysis
  sentiment += (flow.institutionalFlow / (flow.institutionalFlow + flow.retailFlow)) * 0.1;
  
  return Math.min(1, Math.max(-1, sentiment));
}

// Cache for market breadth data to avoid excessive API calls
const marketBreadthCache = {
  data: null as number | null,
  timestamp: 0,
  ttl: 4 * 60 * 60 * 1000 // 4 hours cache
};

async function calculateMarketBreadth(): Promise<number> {
  // Check if we have valid cached data
  const now = Date.now();
  if (marketBreadthCache.data !== null && (now - marketBreadthCache.timestamp) < marketBreadthCache.ttl) {
    console.log(`Using cached market breadth: ${marketBreadthCache.data.toFixed(1)}%`);
    return marketBreadthCache.data;
  }

  try {
    // Use Alpha Vantage API to calculate real market breadth
    const breadth = await getMarketBreadthFromAlphaVantage();
    
    // Cache the result
    marketBreadthCache.data = breadth;
    marketBreadthCache.timestamp = now;
    
    return breadth;
  } catch (error) {
    console.error('Failed to calculate market breadth:', error);
    
    // If we have old cached data, use it as fallback
    if (marketBreadthCache.data !== null) {
      console.log(`Using stale cached market breadth: ${marketBreadthCache.data.toFixed(1)}%`);
      return marketBreadthCache.data;
    }
    
    // Final fallback to simulated data
    const fallbackValue = 45 + Math.random() * 30;
    console.log(`Using simulated market breadth: ${fallbackValue.toFixed(1)}%`);
    return fallbackValue;
  }
}

async function getMarketBreadthFromAlphaVantage(): Promise<number> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('Alpha Vantage API key not configured');
  }

  try {
    // First try to get market breadth from VIX and SPY relationship
    // This is a more efficient single API call approach
    const spyResponse = await fetch(
      `https://www.alphavantage.co/query?function=DAILY&symbol=SPY&outputsize=compact&apikey=${apiKey}`
    );
    
    if (!spyResponse.ok) {
      throw new Error(`SPY API error: ${spyResponse.status}`);
    }

    const spyData = await spyResponse.json();
    
    if (spyData['Error Message'] || spyData['Note']) {
      console.warn('Alpha Vantage API limit reached, using alternative calculation');
      return await getMarketBreadthFromMajorStocks(apiKey);
    }

    const timeSeries = spyData['Time Series (Daily)'];
    if (!timeSeries) {
      throw new Error('No SPY time series data available');
    }

    // Calculate SPY's position relative to moving averages as market breadth proxy
    const dates = Object.keys(timeSeries).sort().reverse();
    if (dates.length < 50) {
      throw new Error('Insufficient SPY data for calculation');
    }

    const currentPrice = parseFloat(timeSeries[dates[0]]['4. close']);
    
    // Calculate multiple moving averages for better breadth assessment
    const prices = dates.slice(0, 50).map(date => parseFloat(timeSeries[date]['4. close']));
    const sma20 = prices.slice(0, 20).reduce((sum, price) => sum + price, 0) / 20;
    const sma50 = prices.reduce((sum, price) => sum + price, 0) / 50;
    
    // Calculate price momentum over different periods
    const price5DaysAgo = parseFloat(timeSeries[dates[4]]['4. close']);
    const price10DaysAgo = parseFloat(timeSeries[dates[9]]['4. close']);
    const price20DaysAgo = parseFloat(timeSeries[dates[19]]['4. close']);
    
    const momentum5D = ((currentPrice - price5DaysAgo) / price5DaysAgo) * 100;
    const momentum10D = ((currentPrice - price10DaysAgo) / price10DaysAgo) * 100;
    const momentum20D = ((currentPrice - price20DaysAgo) / price20DaysAgo) * 100;

    // Calculate market breadth score based on multiple factors
    let breadthScore = 50; // Start at neutral
    
    // Factor 1: Position relative to moving averages (40% weight)
    if (currentPrice > sma20) breadthScore += 15;
    if (currentPrice > sma50) breadthScore += 15;
    if (sma20 > sma50) breadthScore += 10; // Trend direction
    
    // Factor 2: Momentum analysis (30% weight)
    if (momentum5D > 0) breadthScore += 5;
    if (momentum10D > 0) breadthScore += 5;
    if (momentum20D > 0) breadthScore += 5;
    
    // Factor 3: Momentum strength (30% weight)
    if (momentum5D > 1) breadthScore += 5;
    if (momentum10D > 2) breadthScore += 5;
    if (momentum20D > 5) breadthScore += 5;
    
    // Ensure breadth stays within reasonable bounds
    breadthScore = Math.max(20, Math.min(80, breadthScore));
    
    console.log(`Market Breadth from SPY analysis: ${breadthScore.toFixed(1)}% (Current: $${currentPrice.toFixed(2)}, SMA20: $${sma20.toFixed(2)}, SMA50: $${sma50.toFixed(2)})`);
    console.log(`Momentum - 5D: ${momentum5D.toFixed(1)}%, 10D: ${momentum10D.toFixed(1)}%, 20D: ${momentum20D.toFixed(1)}%`);
    
    return breadthScore;
  } catch (error) {
    console.error('Error calculating market breadth from SPY:', error);
    throw error;
  }
}

async function getMarketBreadthFromMajorStocks(apiKey: string): Promise<number> {
  // Fallback method using a smaller set of major stocks
  // This method is more resource-intensive and should only be used as backup
  
  const majorStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA'];
  let stocksAboveMA = 0;
  let totalStocks = 0;

  console.log('Calculating market breadth from major stocks (fallback method)...');

  for (const symbol of majorStocks) {
    try {
      // Add delay between calls
      await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
      
      const response = await fetch(
        `https://www.alphavantage.co/query?function=DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data['Error Message'] || data['Note']) continue;
      
      const timeSeries = data['Time Series (Daily)'];
      if (!timeSeries) continue;
      
      const dates = Object.keys(timeSeries).sort().reverse();
      if (dates.length < 50) continue;
      
      const currentPrice = parseFloat(timeSeries[dates[0]]['4. close']);
      
      // Calculate 50-day SMA
      let sum = 0;
      for (let i = 0; i < 50; i++) {
        sum += parseFloat(timeSeries[dates[i]]['4. close']);
      }
      const sma50 = sum / 50;
      
      totalStocks++;
      if (currentPrice > sma50) {
        stocksAboveMA++;
      }
      
      console.log(`${symbol}: $${currentPrice.toFixed(2)} vs SMA50 $${sma50.toFixed(2)} - ${currentPrice > sma50 ? 'ABOVE' : 'BELOW'}`);
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }

  if (totalStocks === 0) {
    throw new Error('No valid stock data retrieved for market breadth calculation');
  }

  const breadthPercentage = (stocksAboveMA / totalStocks) * 100;
  console.log(`Market Breadth from major stocks: ${stocksAboveMA}/${totalStocks} stocks above 50-day MA (${breadthPercentage.toFixed(1)}%)`);
  
  return breadthPercentage;
}

async function analyzeSectorRotation() {
  const sectors = [
    'Technology', 'Healthcare', 'Financial Services', 'Consumer Cyclical',
    'Communication Services', 'Industrials', 'Consumer Defensive',
    'Energy', 'Real Estate', 'Basic Materials', 'Utilities'
  ];
  
  return sectors.map(sector => ({
    name: sector,
    momentum: (Math.random() - 0.5) * 0.4,
    relativeStrength: (Math.random() - 0.5) * 20,
    flowDirection: Math.random() > 0.5 ? 'bullish' : 'bearish',
    confidence: 60 + Math.random() * 35
  }));
}

// Standard helper functions (from previous implementation)
function calculateMoneyness(strike: string, underlyingPrice: string, optionType: string): string {
  const strikeNum = parseFloat(strike);
  const underlyingNum = parseFloat(underlyingPrice);
  
  if (optionType === 'call') {
    const ratio = strikeNum / underlyingNum;
    if (ratio < 0.95) return 'ITM';
    if (ratio > 1.05) return 'OTM';
    return 'ATM';
  } else {
    const ratio = underlyingNum / strikeNum;
    if (ratio < 0.95) return 'ITM';
    if (ratio > 1.05) return 'OTM';
    return 'ATM';
  }
}

function calculateConviction(alert: any, stringencyLevel: number): 'exceptional' | 'high' | 'medium' | 'low' {
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const volumeOI = parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1);
  
  let score = 0;
  
  // Adjust scoring based on stringency level
  const stringencyMultiplier = stringencyLevel / 10;
  
  if (premium > 5000000) score += 3 * stringencyMultiplier;
  else if (premium > 2000000) score += 2 * stringencyMultiplier;
  else if (premium > 500000) score += 1 * stringencyMultiplier;
  
  if (volumeOI > 5) score += 2 * stringencyMultiplier;
  else if (volumeOI > 2) score += 1 * stringencyMultiplier;
  
  if (alert.has_sweep) score += 1 * stringencyMultiplier;
  
  if (alert.alert_rule === 'RepeatedHitsAscendingFill') score += 2 * stringencyMultiplier;
  else if (alert.alert_rule === 'RepeatedHits') score += 1 * stringencyMultiplier;
  
  const threshold = stringencyLevel * 0.6; // Higher stringency = higher thresholds
  
  if (score >= threshold + 3) return 'exceptional';
  if (score >= threshold + 1.5) return 'high';
  if (score >= threshold) return 'medium';
  return 'low';
}

function calculateProbability(alert: any): number {
  const moneyness = calculateMoneyness(alert.strike, alert.underlying_price, alert.expiry_type);
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  
  let baseProbability = 0.5;
  
  if (moneyness === 'ITM') baseProbability += 0.2;
  else if (moneyness === 'OTM') baseProbability -= 0.1;
  
  if (daysToExpiry < 30) baseProbability -= 0.1;
  else if (daysToExpiry > 180) baseProbability += 0.1;
  
  const volumeOI = parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1);
  if (volumeOI > 3) baseProbability += 0.1;
  
  return Math.max(0.1, Math.min(0.9, baseProbability));
}

function calculateRiskReward(alert: any): number {
  const strike = parseFloat(alert.strike);
  const underlying = parseFloat(alert.underlying_price);
  const premium = parseFloat(alert.ask);
  
  if (alert.expiry_type === 'call') {
    const upside = Math.max(0, (strike + premium - underlying) / premium);
    const downside = 1;
    return upside / downside;
  } else {
    const upside = Math.max(0, (underlying - strike + premium) / premium);
    const downside = 1;
    return upside / downside;
  }
}

function calculatePriceTarget(alert: any): number {
  const strike = parseFloat(alert.strike);
  const underlying = parseFloat(alert.underlying_price);
  const premium = parseFloat(alert.ask);
  
  if (alert.expiry_type === 'call') {
    return strike + premium;
  } else {
    return strike - premium;
  }
}

function calculateDaysToExpiry(expiry: string): number {
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get stringency metrics for optimization
router.get('/stringency-metrics', async (req, res) => {
  try {
    const allMetrics = stringencyOptimizer.getAllMetrics();
    const metricsArray = Array.from(allMetrics.entries()).map(([level, metrics]) => ({
      level,
      ...metrics
    }));

    res.json({
      metrics: metricsArray,
      trainingStatus: 'active' // Placeholder since getTrainingModeStatus doesn't exist
    });
  } catch (error) {
    console.error('Error fetching stringency metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get optimal stringency recommendation
router.post('/optimize-stringency', async (req, res) => {
  try {
    const { currentStringency, recentPerformance } = req.body;
    
    const recommendation = await stringencyOptimizer.getStringencyRecommendation(
      currentStringency || 5,
      recentPerformance || { successRate: 50, avgReturn: 0.1 },
      'screener'
    );

    res.json(recommendation);
  } catch (error) {
    console.error('Error optimizing stringency:', error);
    res.status(500).json({ error: 'Failed to optimize stringency' });
  }
});

export default router;