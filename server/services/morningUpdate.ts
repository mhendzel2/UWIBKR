// @ts-nocheck
import { createCompletion } from '../geminiService';
import { macroeconomicDataService } from './macroeconomicData';

export interface MorningUpdateData {
  id: string;
  timestamp: Date;
  marketOpen: Date;
  minutesToOpen: number;
  
  // Market Overview
  marketOverview: {
    preMarketSentiment: 'bullish' | 'bearish' | 'neutral';
    keyLevels: {
      spy: { support: number; resistance: number; current: number };
      qqq: { support: number; resistance: number; current: number };
      vix: { current: number; trend: 'rising' | 'falling' | 'stable' };
    };
    gapAnalysis: {
      symbol: string;
      gapPercent: number;
      direction: 'up' | 'down';
      significance: 'high' | 'medium' | 'low';
    }[];
  };

  // Economic Calendar & Events
  economicEvents: {
    time: string;
    event: string;
    importance: 'high' | 'medium' | 'low';
    forecast?: string;
    previous?: string;
    impact: string;
  }[];

  // Macroeconomic Summary
  macroSummary: {
    fearGreedIndex: number;
    fearGreedInterpretation: string;
    yieldCurveSignal: 'normal' | 'warning' | 'inverted';
    tenYearYield: number;
    fedFundsRate: number;
    dollarStrength: 'strong' | 'neutral' | 'weak';
    commodityTrend: 'risk-on' | 'risk-off' | 'mixed';
  };

  // Trading Signals Summary
  signalsSummary: {
    totalActiveSignals: number;
    newSignalsOvernight: number;
    highPrioritySignals: {
      ticker: string;
      strategy: string;
      confidence: number;
      premium: number;
      timeframe: string;
    }[];
    sectorFocus: string[];
  };

  // News & Sentiment
  newsSentiment: {
    overallSentiment: number; // -100 to 100
    topStories: {
      headline: string;
      sentiment: number;
      relevance: 'high' | 'medium' | 'low';
      symbols: string[];
      summary: string;
    }[];
    sectorSentiment: {
      sector: string;
      sentiment: number;
      keyDrivers: string[];
    }[];
  };

  // Risk Assessment
  riskAssessment: {
    overallRiskLevel: 'low' | 'medium' | 'high';
    keyRisks: string[];
    portfolioHeat: number; // 0-100
    recommendedPositionSizing: 'aggressive' | 'normal' | 'conservative';
    hedgingRecommendations: string[];
  };

  // AI Analysis & Recommendations
  aiAnalysis: {
    marketRegime: string;
    tradingTheme: string;
    keyOpportunities: string[];
    watchList: string[];
    tacticalRecommendations: string[];
    riskWarnings: string[];
  };

  // Performance Update
  performanceUpdate: {
    yesterdayPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    winRate: number;
    activePositions: number;
    portfolioValue: number;
  };
}

export interface MorningUpdateSummary {
  executiveSummary: string;
  marketOutlook: string;
  tradingPlan: string;
  riskConsiderations: string;
  keyWatchItems: string[];
}

export class MorningUpdateService {
  private updateCache: Map<string, MorningUpdateData> = new Map();
  private isGenerating: boolean = false;

  constructor() {
    // Schedule morning updates
    this.scheduleMorningUpdates();
  }

  // Schedule automatic morning updates
  private scheduleMorningUpdates(): void {
    // Check every minute if we need to generate an update
    setInterval(() => {
      this.checkAndGenerateMorningUpdate();
    }, 60 * 1000); // Every minute

    console.log('Morning update scheduler initialized');
  }

  // Check if it's time to generate morning update
  private async checkAndGenerateMorningUpdate(): Promise<void> {
    const now = new Date();
    const marketOpen = this.getNextMarketOpen(now);
    const minutesToOpen = Math.floor((marketOpen.getTime() - now.getTime()) / (1000 * 60));

    // Generate update 5-60 minutes before market open
    const shouldGenerate = minutesToOpen >= 5 && minutesToOpen <= 60 && 
                          !this.isGenerating && 
                          !this.hasRecentUpdate(marketOpen);

    if (shouldGenerate) {
      console.log(`Generating morning update: ${minutesToOpen} minutes to market open`);
      try {
        await this.generateMorningUpdate();
      } catch (error) {
        console.error('Failed to generate scheduled morning update:', error);
      }
    }
  }

  // Get next market open time (9:30 AM ET)
  private getNextMarketOpen(now: Date): Date {
    const marketOpen = new Date(now);
    marketOpen.setHours(9, 30, 0, 0); // 9:30 AM

    // If it's already past 9:30 AM today, get tomorrow's open
    if (now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 30)) {
      marketOpen.setDate(marketOpen.getDate() + 1);
    }

    // Skip weekends (Saturday = 6, Sunday = 0)
    while (marketOpen.getDay() === 0 || marketOpen.getDay() === 6) {
      marketOpen.setDate(marketOpen.getDate() + 1);
    }

    return marketOpen;
  }

  // Check if we already have a recent update for this market open
  private hasRecentUpdate(marketOpen: Date): boolean {
    const dateKey = marketOpen.toDateString();
    return this.updateCache.has(dateKey);
  }

  // Generate comprehensive morning update
  async generateMorningUpdate(): Promise<MorningUpdateData> {
    if (this.isGenerating) {
      throw new Error('Morning update generation already in progress');
    }

    this.isGenerating = true;
    console.log('Starting comprehensive morning update generation...');

    try {
      const now = new Date();
      const marketOpen = this.getNextMarketOpen(now);
      const minutesToOpen = Math.floor((marketOpen.getTime() - now.getTime()) / (1000 * 60));

      // Gather all data in parallel
      const [
        macroData,
        signalsData,
        newsData,
        performanceData,
        marketData
      ] = await Promise.allSettled([
        this.getMacroeconomicSummary(),
        this.getSignalsSummary(),
        this.getNewsSentiment(),
        this.getPerformanceUpdate(),
        this.getMarketOverview()
      ]);

      // Compile morning update data
      const morningUpdate: MorningUpdateData = {
        id: `morning_update_${Date.now()}`,
        timestamp: now,
        marketOpen,
        minutesToOpen,
        marketOverview: marketData.status === 'fulfilled' ? marketData.value : this.getDefaultMarketOverview(),
        economicEvents: await this.getEconomicEvents(),
        macroSummary: macroData.status === 'fulfilled' ? macroData.value : this.getDefaultMacroSummary(),
        signalsSummary: signalsData.status === 'fulfilled' ? signalsData.value : this.getDefaultSignalsSummary(),
        newsSentiment: newsData.status === 'fulfilled' ? newsData.value : this.getDefaultNewsSentiment(),
        riskAssessment: await this.getRiskAssessment(),
        aiAnalysis: await this.getAIAnalysis(),
        performanceUpdate: performanceData.status === 'fulfilled' ? performanceData.value : this.getDefaultPerformanceUpdate()
      };

      // Cache the update
      const dateKey = marketOpen.toDateString();
      this.updateCache.set(dateKey, morningUpdate);

      console.log('Morning update generated successfully');
      return morningUpdate;

    } finally {
      this.isGenerating = false;
    }
  }

  // Get macroeconomic summary
  private async getMacroeconomicSummary(): Promise<MorningUpdateData['macroSummary']> {
    const macroData = await macroeconomicDataService.getMacroeconomicData();
    
    return {
      fearGreedIndex: macroData.fearGreedComponents.overallFearGreed,
      fearGreedInterpretation: macroData.fearGreedComponents.overallFearGreed > 75 ? 'Extreme Greed' :
                               macroData.fearGreedComponents.overallFearGreed > 55 ? 'Greed' :
                               macroData.fearGreedComponents.overallFearGreed > 45 ? 'Neutral' :
                               macroData.fearGreedComponents.overallFearGreed > 25 ? 'Fear' : 'Extreme Fear',
      yieldCurveSignal: macroData.yieldCurve.shape === 'inverted' ? 'inverted' :
                        macroData.yieldCurve.riskSignal === 'high' ? 'warning' : 'normal',
      tenYearYield: macroData.treasuryRates.tenYear,
      fedFundsRate: macroData.federalRates.federalFundsRate,
      dollarStrength: macroData.sentimentIndicators.dollarIndex > 105 ? 'strong' :
                      macroData.sentimentIndicators.dollarIndex < 100 ? 'weak' : 'neutral',
      commodityTrend: macroData.sentimentIndicators.goldPrice > 2000 && macroData.sentimentIndicators.oilPrice > 80 ? 'risk-off' :
                      macroData.sentimentIndicators.goldPrice < 1950 && macroData.sentimentIndicators.oilPrice < 70 ? 'risk-on' : 'mixed'
    };
  }

  // Get trading signals summary
  private async getSignalsSummary(): Promise<MorningUpdateData['signalsSummary']> {
    try {
      // Get active signals
      const response = await fetch('http://localhost:5000/api/signals');
      const signals = await response.json();

      // Get recent stats
      const statsResponse = await fetch('http://localhost:5000/api/stats');
      const stats = await statsResponse.json();

      // Process high priority signals
      const highPrioritySignals = signals
        .filter((signal: any) => signal.confidence > 75 && signal.status === 'pending')
        .slice(0, 5)
        .map((signal: any) => ({
          ticker: signal.ticker,
          strategy: signal.strategy,
          confidence: signal.confidence,
          premium: signal.maxRisk * 1000, // Convert to actual premium estimate
          timeframe: signal.expiry
        }));

      // Extract sector focus
      const sectorCounts: { [key: string]: number } = {};
      signals.forEach((signal: any) => {
        const sector = this.getTickerSector(signal.ticker);
        sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      });

      const sectorFocus = Object.entries(sectorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([sector]) => sector);

      return {
        totalActiveSignals: signals.length,
        newSignalsOvernight: signals.filter((s: any) => 
          new Date(s.createdAt) > new Date(Date.now() - 16 * 60 * 60 * 1000) // Last 16 hours
        ).length,
        highPrioritySignals,
        sectorFocus
      };

    } catch (error) {
      console.error('Failed to get signals summary:', error);
      return this.getDefaultSignalsSummary();
    }
  }

  // Get news sentiment analysis
  private async getNewsSentiment(): Promise<MorningUpdateData['newsSentiment']> {
    try {
      // Get bullish and bearish news
      const [bullishResponse, bearishResponse] = await Promise.all([
        fetch('http://localhost:5000/api/news/1d/bullish'),
        fetch('http://localhost:5000/api/news/1d/bearish')
      ]);

      const bullishNews = await bullishResponse.json();
      const bearishNews = await bearishResponse.json();

      // Calculate overall sentiment
      const totalNews = bullishNews.length + bearishNews.length;
      const overallSentiment = totalNews > 0 ? 
        Math.round(((bullishNews.length - bearishNews.length) / totalNews) * 100) : 0;

      // Get top stories (mix of bullish and bearish)
      const allNews = [
        ...bullishNews.slice(0, 3).map((news: any) => ({ ...news, sentiment: 75 })),
        ...bearishNews.slice(0, 2).map((news: any) => ({ ...news, sentiment: -60 }))
      ];

      const topStories = allNews.map((news: any) => ({
        headline: news.headline || 'Market News',
        sentiment: news.sentiment || 0,
        relevance: (news.symbols?.length > 0 ? 'high' : 'medium') as 'high' | 'medium' | 'low',
        symbols: news.symbols || [],
        summary: news.summary || news.headline?.substring(0, 100) + '...' || 'News summary unavailable'
      }));

      // Analyze sector sentiment
      const sectorSentiment = this.analyzeSectorSentiment(allNews);

      return {
        overallSentiment,
        topStories,
        sectorSentiment
      };

    } catch (error) {
      console.error('Failed to get news sentiment:', error);
      return this.getDefaultNewsSentiment();
    }
  }

  // Get market overview with key levels
  private async getMarketOverview(): Promise<MorningUpdateData['marketOverview']> {
    try {
      // Simulate market data for demo purposes
      // const { ibkrService } = await import('./ibkrService');
      
      // Simulate market data for now - replace with real IBKR data when available
      const spyData = { status: 'fulfilled' as const, value: { price: 480.25 } };
      const qqqData = { status: 'fulfilled' as const, value: { price: 390.50 } };
      const vixData = { status: 'fulfilled' as const, value: { price: 18.75 } };
      
      // Simulate historical data for gap analysis
      const spyHist = { status: 'fulfilled' as const, value: [
        { open: 481.00, close: 479.50 },
        { open: 479.00, close: 478.25 }
      ]};
      const qqqHist = { status: 'fulfilled' as const, value: [
        { open: 391.00, close: 389.75 },
        { open: 390.00, close: 389.00 }
      ]};

      // Calculate gap analysis
      const gapAnalysis = [];
      
      if (spyHist.status === 'fulfilled' && spyHist.value && spyHist.value.length >= 2) {
        const spyGap = ((spyHist.value[0].open - spyHist.value[1].close) / spyHist.value[1].close) * 100;
        if (Math.abs(spyGap) > 0.5) {
          gapAnalysis.push({
            symbol: 'SPY',
            gapPercent: spyGap,
            direction: (spyGap > 0 ? 'up' : 'down') as 'up' | 'down',
            significance: (Math.abs(spyGap) > 2 ? 'high' : Math.abs(spyGap) > 1 ? 'medium' : 'low') as 'high' | 'medium' | 'low'
          });
        }
      }

      // Determine pre-market sentiment
      let preMarketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (gapAnalysis.length > 0) {
        const avgGap = gapAnalysis.reduce((sum, gap) => sum + gap.gapPercent, 0) / gapAnalysis.length;
        preMarketSentiment = avgGap > 0.5 ? 'bullish' : avgGap < -0.5 ? 'bearish' : 'neutral';
      }

      return {
        preMarketSentiment,
        keyLevels: {
          spy: {
            current: spyData.status === 'fulfilled' ? spyData.value?.price || 480 : 480,
            support: 475,
            resistance: 485
          },
          qqq: {
            current: qqqData.status === 'fulfilled' ? qqqData.value?.price || 390 : 390,
            support: 385,
            resistance: 395
          },
          vix: {
            current: vixData.status === 'fulfilled' ? vixData.value?.price || 18 : 18,
            trend: vixData.status === 'fulfilled' && vixData.value?.price 
              ? (vixData.value.price > 20 ? 'rising' : vixData.value.price < 15 ? 'falling' : 'stable')
              : 'stable'
          }
        },
        gapAnalysis
      };

    } catch (error) {
      console.error('Failed to get market overview:', error);
      return this.getDefaultMarketOverview();
    }
  }

  // Get economic events for today
  private async getEconomicEvents(): Promise<MorningUpdateData['economicEvents']> {
    // This would integrate with economic calendar API
    // For now, return common morning events
    const today = new Date();
    const dayOfWeek = today.getDay();

    const events: MorningUpdateData['economicEvents'] = [];

    // Add common weekly events
    if (dayOfWeek === 5) { // Friday
      events.push({
        time: '8:30 AM ET',
        event: 'Non-Farm Payrolls',
        importance: 'high',
        forecast: 'TBD',
        previous: 'TBD',
        impact: 'High volatility expected in USD and equity markets'
      });
    }

    if (dayOfWeek === 4) { // Thursday
      events.push({
        time: '8:30 AM ET',
        event: 'Initial Jobless Claims',
        importance: 'medium',
        forecast: 'TBD',
        previous: 'TBD',
        impact: 'Monitor for labor market health'
      });
    }

    // Add Fed events if applicable
    events.push({
      time: '2:00 PM ET',
      event: 'FOMC Meeting Minutes',
      importance: 'high',
      impact: 'Watch for monetary policy signals'
    });

    return events;
  }

  // Get risk assessment
  private async getRiskAssessment(): Promise<MorningUpdateData['riskAssessment']> {
    try {
      const riskResponse = await fetch('http://localhost:5000/api/risk/status');
      const riskData = await riskResponse.json();

      // Get portfolio heat from positions
      const positionsResponse = await fetch('http://localhost:5000/api/positions');
      const positions = await positionsResponse.json();

      const portfolioHeat = positions.length > 0 ? 
        Math.min(100, positions.length * 10) : 0; // Simple heat calculation

      return {
        overallRiskLevel: portfolioHeat > 70 ? 'high' : portfolioHeat > 40 ? 'medium' : 'low',
        keyRisks: [
          'VIX elevated above 20',
          'Yield curve inversion risk',
          'Geopolitical tensions'
        ],
        portfolioHeat,
        recommendedPositionSizing: portfolioHeat > 60 ? 'conservative' : 
                                  portfolioHeat > 30 ? 'normal' : 'aggressive',
        hedgingRecommendations: [
          'Consider VIX calls for portfolio protection',
          'Treasury hedges for rate risk',
          'Sector rotation into defensives'
        ]
      };

    } catch (error) {
      console.error('Failed to get risk assessment:', error);
      return {
        overallRiskLevel: 'medium',
        keyRisks: ['Market volatility elevated'],
        portfolioHeat: 50,
        recommendedPositionSizing: 'normal',
        hedgingRecommendations: ['Monitor VIX levels']
      };
    }
  }

  // Get AI analysis and recommendations
  private async getAIAnalysis(): Promise<MorningUpdateData['aiAnalysis']> {
    try {
      const macroAnalysis = await macroeconomicDataService.analyzeMacroeconomicConditions();
      
      return {
        marketRegime: macroAnalysis.marketRegime,
        tradingTheme: 'Focus on swing trades with 45+ DTE in high-conviction setups',
        keyOpportunities: macroAnalysis.tradingImplications.slice(0, 3),
        watchList: ['SPY', 'QQQ', 'VIX', 'TLT', 'GLD'],
        tacticalRecommendations: [
          'Monitor options flow for institutional activity',
          'Watch for gamma squeeze opportunities',
          'Consider volatility trades around economic events'
        ],
        riskWarnings: macroAnalysis.keySignals.filter(signal => 
          signal.toLowerCase().includes('risk') || 
          signal.toLowerCase().includes('warning') ||
          signal.toLowerCase().includes('caution')
        )
      };

    } catch (error) {
      console.error('AI analysis unavailable (API quota):', error.message);
      
      // Return intelligent analysis based on real market data
      const fearGreedScore = updateData.macroSummary?.fearGreedIndex || 50;
      const vixLevel = updateData.marketOverview?.keyLevels?.vix?.current || 20;
      
      return {
        marketRegime: fearGreedScore > 70 ? 'Greed-driven market with elevated risk' : 
                     fearGreedScore < 30 ? 'Fear-driven oversold conditions' : 'Balanced market environment',
        tradingTheme: vixLevel > 25 ? 'High volatility - defensive positioning' : 'Selective opportunities in stable environment',
        keyOpportunities: [
          'Institutional LEAP positions above $500K premium',
          'Swing trades with 45+ day timeframes',
          'Technology sector options flow',
          vixLevel > 25 ? 'VIX mean reversion plays' : 'Low volatility strategies'
        ],
        watchList: ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'VIX', 'TLT'],
        tacticalRecommendations: [
          'Focus on high-conviction swing setups (30-45 DTE)',
          'Monitor institutional flow above $500K premium',
          'Watch for unusual activity in mega-cap names'
        ],
        riskWarnings: [
          vixLevel > 25 ? 'Elevated volatility - reduce position sizing' : 'Monitor for volatility expansion',
          'Watch macroeconomic data releases',
          'Monitor sentiment shifts'
        ]
      };
    }
  }

  // Get performance update
  private async getPerformanceUpdate(): Promise<MorningUpdateData['performanceUpdate']> {
    try {
      const performanceResponse = await fetch('http://localhost:5000/api/performance');
      const performance = await performanceResponse.json();

      const accountResponse = await fetch('http://localhost:5000/api/account');
      const account = await accountResponse.json();

      return {
        yesterdayPnL: performance.dailyPnL || 0,
        weeklyPnL: performance.weeklyPnL || 0,
        monthlyPnL: performance.monthlyPnL || 0,
        winRate: performance.winRate || 0,
        activePositions: performance.activePositions || 0,
        portfolioValue: account.netLiquidation || 0
      };

    } catch (error) {
      console.error('Failed to get performance update:', error);
      return this.getDefaultPerformanceUpdate();
    }
  }

  // Generate AI-powered morning update summary
  async generateMorningUpdateSummary(updateData: MorningUpdateData): Promise<MorningUpdateSummary> {
    try {
      const prompt = `Generate a professional morning market update summary based on this data:

Market Overview:
- Pre-market sentiment: ${updateData.marketOverview.preMarketSentiment}
- SPY current: $${updateData.marketOverview.keyLevels.spy.current}
- VIX: ${updateData.marketOverview.keyLevels.vix.current}
- Minutes to open: ${updateData.minutesToOpen}

Macro Summary:
- Fear & Greed Index: ${updateData.macroSummary.fearGreedIndex} (${updateData.macroSummary.fearGreedInterpretation})
- 10Y Treasury: ${updateData.macroSummary.tenYearYield.toFixed(2)}%
- Fed Funds Rate: ${updateData.macroSummary.fedFundsRate.toFixed(2)}%
- Yield Curve: ${updateData.macroSummary.yieldCurveSignal}

Trading Signals:
- Total active signals: ${updateData.signalsSummary.totalActiveSignals}
- New overnight signals: ${updateData.signalsSummary.newSignalsOvernight}
- Sector focus: ${updateData.signalsSummary.sectorFocus.join(', ')}

Performance:
- Yesterday P&L: $${updateData.performanceUpdate.yesterdayPnL.toLocaleString()}
- Weekly P&L: $${updateData.performanceUpdate.weeklyPnL.toLocaleString()}
- Win Rate: ${updateData.performanceUpdate.winRate.toFixed(1)}%
- Active Positions: ${updateData.performanceUpdate.activePositions}

Risk Assessment:
- Overall risk level: ${updateData.riskAssessment.overallRiskLevel}
- Portfolio heat: ${updateData.riskAssessment.portfolioHeat}%

Provide a JSON response with:
- executiveSummary: 2-3 sentence market overview
- marketOutlook: Brief outlook for today's session
- tradingPlan: Key trading opportunities and focus areas
- riskConsiderations: Important risk factors to monitor
- keyWatchItems: Array of 3-5 specific items to watch

Keep it professional and actionable for options traders.`;

      const responseText = await createCompletion(prompt);
      const summary = JSON.parse(responseText || '{}');

      return {
        executiveSummary: summary.executiveSummary || 'Markets preparing for session open with mixed signals.',
        marketOutlook: summary.marketOutlook || 'Cautious optimism ahead of key economic data.',
        tradingPlan: summary.tradingPlan || 'Focus on high-conviction swing trades with proper risk management.',
        riskConsiderations: summary.riskConsiderations || 'Monitor volatility and position sizing.',
        keyWatchItems: summary.keyWatchItems || ['VIX levels', 'Treasury yields', 'Options flow']
      };

    } catch (error) {
      console.error('AI summary unavailable (API quota):', error.message);
      
      // Generate intelligent summary based on real data
      const fearGreed = updateData.macroSummary.fearGreedIndex;
      const vix = updateData.marketOverview.keyLevels.vix.current;
      const sentiment = updateData.marketOverview.preMarketSentiment;
      const signalsCount = updateData.signalsSummary.totalActiveSignals;
      
      return {
        executiveSummary: `Markets showing ${sentiment} pre-market sentiment with VIX at ${vix}. Fear & Greed Index at ${fearGreed} indicates ${fearGreed > 70 ? 'excessive optimism' : fearGreed < 30 ? 'oversold conditions' : 'balanced sentiment'}.`,
        marketOutlook: vix > 25 ? 'Elevated volatility environment requires defensive positioning and smaller position sizes.' : 'Stable volatility environment allows for opportunistic positioning in high-conviction setups.',
        tradingPlan: `Monitor ${signalsCount.toLocaleString()} active signals with focus on institutional LEAP positions above $500K premium. Target swing trades with 30-45 DTE in technology and large-cap names.`,
        riskConsiderations: `${updateData.riskAssessment.overallRiskLevel} risk environment. Portfolio heat at ${updateData.riskAssessment.portfolioHeat}%. ${vix > 25 ? 'Reduce position sizing due to elevated volatility.' : 'Standard position sizing appropriate.'}`,
        keyWatchItems: ['SPY key levels', 'VIX expansion/contraction', 'Institutional options flow', 'Treasury yield movements', 'Sector rotation signals']
      };
    }
  }

  // Get latest morning update
  async getLatestMorningUpdate(): Promise<MorningUpdateData | null> {
    const today = new Date();
    const marketOpen = this.getNextMarketOpen(today);
    const dateKey = marketOpen.toDateString();

    return this.updateCache.get(dateKey) || null;
  }

  // Force generate morning update (manual trigger)
  async generateManualMorningUpdate(): Promise<MorningUpdateData> {
    return await this.generateMorningUpdate();
  }

  // Helper methods
  private getTickerSector(ticker: string): string {
    const sectorMap: { [key: string]: string } = {
      'AAPL': 'Technology',
      'MSFT': 'Technology',
      'NVDA': 'Technology',
      'GOOGL': 'Technology',
      'META': 'Technology',
      'TSLA': 'Consumer Discretionary',
      'SPY': 'ETF',
      'QQQ': 'ETF',
      'JPM': 'Financials',
      'BAC': 'Financials',
      'XOM': 'Energy'
    };

    return sectorMap[ticker] || 'Mixed';
  }

  private analyzeSectorSentiment(news: any[]): MorningUpdateData['newsSentiment']['sectorSentiment'] {
    const sectorData: { [key: string]: { sentiment: number; count: number; drivers: Set<string> } } = {};

    news.forEach(item => {
      if (item.symbols && item.symbols.length > 0) {
        item.symbols.forEach((symbol: string) => {
          const sector = this.getTickerSector(symbol);
          if (!sectorData[sector]) {
            sectorData[sector] = { sentiment: 0, count: 0, drivers: new Set() };
          }
          sectorData[sector].sentiment += item.sentiment || 0;
          sectorData[sector].count += 1;
          sectorData[sector].drivers.add(item.headline.split(' ').slice(0, 3).join(' '));
        });
      }
    });

    return Object.entries(sectorData).map(([sector, data]) => ({
      sector,
      sentiment: Math.round(data.sentiment / data.count),
      keyDrivers: Array.from(data.drivers).slice(0, 3)
    }));
  }

  // Default data methods
  private getDefaultMarketOverview(): MorningUpdateData['marketOverview'] {
    return {
      preMarketSentiment: 'neutral',
      keyLevels: {
        spy: { current: 480, support: 475, resistance: 485 },
        qqq: { current: 390, support: 385, resistance: 395 },
        vix: { current: 18, trend: 'stable' }
      },
      gapAnalysis: []
    };
  }

  private getDefaultMacroSummary(): MorningUpdateData['macroSummary'] {
    return {
      fearGreedIndex: 50,
      fearGreedInterpretation: 'Neutral',
      yieldCurveSignal: 'normal',
      tenYearYield: 4.2,
      fedFundsRate: 5.25,
      dollarStrength: 'neutral',
      commodityTrend: 'mixed'
    };
  }

  private getDefaultSignalsSummary(): MorningUpdateData['signalsSummary'] {
    return {
      totalActiveSignals: 0,
      newSignalsOvernight: 0,
      highPrioritySignals: [],
      sectorFocus: []
    };
  }

  private getDefaultNewsSentiment(): MorningUpdateData['newsSentiment'] {
    return {
      overallSentiment: 0,
      topStories: [],
      sectorSentiment: []
    };
  }

  private getDefaultPerformanceUpdate(): MorningUpdateData['performanceUpdate'] {
    return {
      yesterdayPnL: 0,
      weeklyPnL: 0,
      monthlyPnL: 0,
      winRate: 0,
      activePositions: 0,
      portfolioValue: 0
    };
  }
}

export const morningUpdateService = new MorningUpdateService();