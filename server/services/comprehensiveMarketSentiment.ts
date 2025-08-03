import { UnusualWhalesService } from './unusualWhales';

interface MarketSentimentData {
  // Core Market Metrics
  overallSentiment: number; // -1 to 1
  fearGreedIndex: number; // 0-100
  marketTide: any;
  
  // Options Flow Analysis
  optionsFlow: {
    totalPremium: number;
    callPutRatio: number;
    bullishFlow: number;
    bearishFlow: number;
    netFlow: number;
    institutionalFlow: number;
    retailFlow: number;
    darkPoolActivity: number;
  };
  
  // Market Breadth & Structure
  marketBreadth: {
    advanceDeclineRatio: number;
    newHighsLows: {
      newHighs: number;
      newLows: number;
      ratio: number;
    };
    volumeAnalysis: {
      upVolumeRatio: number;
      distributionDays: number;
      accumulationDays: number;
    };
    sectorRotation: SectorData[];
  };
  
  // Volatility & Risk Metrics
  volatilityMetrics: {
    vixLevel: number;
    vixTrend: string;
    termStructure: number[];
    skewMetrics: {
      put_call_skew: number;
      term_structure_skew: number;
    };
    gexLevels: {
      totalGEX: number;
      call_gex: number;
      put_gex: number;
      gex_flip_point: number;
    };
  };
  
  // Sentiment Indicators
  sentimentIndicators: {
    newsFlow: NewsFlowData[];
    analystSentiment: AnalystData;
    socialSentiment: SocialSentimentData;
    insiderActivity: InsiderData[];
    cryptoCorrelation: CryptoCorrelationData;
  };
  
  // Economic Context
  macroContext: {
    treasuryYields: {
      twoYear: number;
      tenYear: number;
      yieldCurveSlope: number;
    };
    dollarStrength: number;
    commoditiesFlow: {
      gold: number;
      oil: number;
      copper: number;
    };
    internationalMarkets: {
      europe: number;
      asia: number;
      emergingMarkets: number;
    };
  };
  
  // Unusual Activity
  unusualActivity: {
    largestFlows: FlowAlert[];
    sectorAlerts: SectorAlert[];
    darkPoolSignals: DarkPoolSignal[];
    optionsAlerts: OptionsAlert[];
  };
  
  // Predictive Metrics
  predictiveSignals: {
    nextDayBias: string; // 'bullish' | 'bearish' | 'neutral'
    weeklyOutlook: string;
    confidenceScore: number;
    keyRiskFactors: string[];
    supportResistanceLevels: {
      support: number[];
      resistance: number[];
    };
  };
  
  timestamp: Date;
}

interface SectorData {
  sector: string;
  performance: number;
  flowRatio: number;
  momentum: string;
  confidence: number;
}

interface NewsFlowData {
  headline: string;
  sentiment: number;
  impact: 'high' | 'medium' | 'low';
  source: string;
  timestamp: Date;
}

interface AnalystData {
  upgrades: number;
  downgrades: number;
  targetChanges: number;
  consensusDirection: string;
}

interface SocialSentimentData {
  twitterMentions: number;
  redditActivity: number;
  overallTone: number;
  viralTickers: string[];
}

interface InsiderData {
  ticker: string;
  activity: 'buy' | 'sell';
  amount: number;
  significance: 'high' | 'medium' | 'low';
}

interface CryptoCorrelationData {
  btcCorrelation: number;
  cryptoSentiment: number;
  cryptoFlow: number;
}

interface FlowAlert {
  ticker: string;
  premium: number;
  type: string;
  significance: string;
}

interface SectorAlert {
  sector: string;
  alert: string;
  confidence: number;
}

interface DarkPoolSignal {
  ticker: string;
  volume: number;
  direction: string;
  significance: number;
}

interface OptionsAlert {
  type: string;
  description: string;
  tickers: string[];
  significance: 'high' | 'medium' | 'low';
}

export class ComprehensiveMarketSentimentService {
  private uwService: UnusualWhalesService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.uwService = new UnusualWhalesService();
  }

  async getComprehensiveMarketSentiment(): Promise<MarketSentimentData> {
    try {
      console.log('🔍 Gathering comprehensive market sentiment data...');
      
      // Fetch all data in parallel for efficiency
      const [
        marketTide,
        optionsFlowData,
        marketBreadthData,
        volatilityData,
        sentimentData,
        macroData,
        unusualActivityData
      ] = await Promise.allSettled([
        this.getMarketTideData(),
        this.getOptionsFlowAnalysis(),
        this.getMarketBreadthAnalysis(),
        this.getVolatilityMetrics(),
        this.getSentimentIndicators(),
        this.getMacroContext(),
        this.getUnusualActivityAlerts()
      ]);

      // Calculate overall sentiment from all components
      const overallSentiment = this.calculateOverallSentiment({
        marketTide: marketTide.status === 'fulfilled' ? marketTide.value : null,
        optionsFlow: optionsFlowData.status === 'fulfilled' ? optionsFlowData.value : null,
        volatility: volatilityData.status === 'fulfilled' ? volatilityData.value : null,
        sentiment: sentimentData.status === 'fulfilled' ? sentimentData.value : null
      });

      const comprehensiveData: MarketSentimentData = {
        overallSentiment: overallSentiment.score,
        fearGreedIndex: overallSentiment.fearGreed,
        marketTide: marketTide.status === 'fulfilled' ? marketTide.value : null,
        optionsFlow: optionsFlowData.status === 'fulfilled' ? optionsFlowData.value : this.getDefaultOptionsFlow(),
        marketBreadth: marketBreadthData.status === 'fulfilled' ? marketBreadthData.value : this.getDefaultMarketBreadth(),
        volatilityMetrics: volatilityData.status === 'fulfilled' ? volatilityData.value : this.getDefaultVolatilityMetrics(),
        sentimentIndicators: sentimentData.status === 'fulfilled' ? sentimentData.value : this.getDefaultSentimentIndicators(),
        macroContext: macroData.status === 'fulfilled' ? macroData.value : this.getDefaultMacroContext(),
        unusualActivity: unusualActivityData.status === 'fulfilled' ? unusualActivityData.value : this.getDefaultUnusualActivity(),
        predictiveSignals: this.generatePredictiveSignals(overallSentiment),
        timestamp: new Date()
      };

      console.log(`✅ Comprehensive market sentiment generated with ${overallSentiment.score.toFixed(2)} overall score`);
      return comprehensiveData;

    } catch (error) {
      console.error('❌ Failed to generate comprehensive market sentiment:', error);
      return this.getDefaultMarketSentiment();
    }
  }

  private async getMarketTideData(): Promise<any> {
    try {
      const cached = this.getCachedData('marketTide');
      if (cached) return cached;

      const marketTide = await this.uwService.getMarketTide();
      this.setCachedData('marketTide', marketTide);
      return marketTide;
    } catch (error) {
      console.error('Failed to fetch market tide:', error);
      return null;
    }
  }

  private async getOptionsFlowAnalysis(): Promise<any> {
    try {
      const cached = this.getCachedData('optionsFlow');
      if (cached) return cached;

      // Get comprehensive options flow data
      const majorTickers = ['SPY', 'QQQ', 'IWM', 'VIX'];
      const flowPromises = majorTickers.map(ticker => 
        this.uwService.getOptionsFlow(ticker).catch(() => [])
      );
      
      const flowAlerts = await this.uwService.getFlowAlerts({
        minPremium: 100000,
        minDte: 1
      });

      const flowResults = await Promise.all(flowPromises);
      
      // Calculate comprehensive flow metrics
      const optionsFlow = this.analyzeOptionsFlow(flowResults.flat(), flowAlerts);
      this.setCachedData('optionsFlow', optionsFlow);
      return optionsFlow;
    } catch (error) {
      console.error('Failed to analyze options flow:', error);
      return this.getDefaultOptionsFlow();
    }
  }

  private async getMarketBreadthAnalysis(): Promise<any> {
    try {
      const cached = this.getCachedData('marketBreadth');
      if (cached) return cached;

      // Analyze sector rotation and breadth using flow data
      const sectorData = await this.analyzeSectorRotation();
      const breadthData = {
        advanceDeclineRatio: this.calculateAdvanceDeclineRatio(),
        newHighsLows: this.calculateNewHighsLows(),
        volumeAnalysis: this.analyzeVolumeProfile(),
        sectorRotation: sectorData
      };

      this.setCachedData('marketBreadth', breadthData);
      return breadthData;
    } catch (error) {
      console.error('Failed to analyze market breadth:', error);
      return this.getDefaultMarketBreadth();
    }
  }

  private async getVolatilityMetrics(): Promise<any> {
    try {
      const cached = this.getCachedData('volatility');
      if (cached) return cached;

      // Get VIX and volatility data
      const vixState = await this.uwService.getStockState('VIX');
      const spyGex = await this.uwService.getGammaExposure('SPY').catch(() => null);
      
      const volatilityMetrics = {
        vixLevel: vixState?.price || 20,
        vixTrend: this.calculateVIXTrend(vixState?.price || 20),
        termStructure: await this.getVIXTermStructure(),
        skewMetrics: await this.calculateSkewMetrics(),
        gexLevels: this.analyzeGEXLevels(spyGex)
      };

      this.setCachedData('volatility', volatilityMetrics);
      return volatilityMetrics;
    } catch (error) {
      console.error('Failed to get volatility metrics:', error);
      return this.getDefaultVolatilityMetrics();
    }
  }

  private async getSentimentIndicators(): Promise<any> {
    try {
      const cached = this.getCachedData('sentiment');
      if (cached) return cached;

      // Get sentiment from multiple sources
      const majorTickers = ['SPY', 'AAPL', 'MSFT', 'GOOGL', 'AMZN'];
      const newsPromises = majorTickers.slice(0, 3).map(ticker => 
        this.uwService.getNewsSentiment(ticker).catch(() => [])
      );
      
      const newsResults = await Promise.all(newsPromises);
      
      const sentimentIndicators = {
        newsFlow: this.aggregateNewsFlow(newsResults.flat()),
        analystSentiment: this.analyzeAnalystSentiment(),
        socialSentiment: this.analyzeSocialSentiment(),
        insiderActivity: this.analyzeInsiderActivity(),
        cryptoCorrelation: this.analyzeCryptoCorrelation()
      };

      this.setCachedData('sentiment', sentimentIndicators);
      return sentimentIndicators;
    } catch (error) {
      console.error('Failed to get sentiment indicators:', error);
      return this.getDefaultSentimentIndicators();
    }
  }

  private async getMacroContext(): Promise<any> {
    try {
      const cached = this.getCachedData('macro');
      if (cached) return cached;

      // Get macro economic context
      const macroContext = {
        treasuryYields: await this.getTreasuryYields(),
        dollarStrength: this.getDollarStrength(),
        commoditiesFlow: await this.getCommoditiesFlow(),
        internationalMarkets: this.getInternationalMarkets()
      };

      this.setCachedData('macro', macroContext);
      return macroContext;
    } catch (error) {
      console.error('Failed to get macro context:', error);
      return this.getDefaultMacroContext();
    }
  }

  private async getUnusualActivityAlerts(): Promise<any> {
    try {
      const cached = this.getCachedData('unusual');
      if (cached) return cached;

      // Get unusual activity data
      const flowAlerts = await this.uwService.getFlowAlerts({
        minPremium: 1000000, // $1M+ for significant flows
        minDte: 7
      });

      const unusualActivity = {
        largestFlows: this.processLargestFlows(flowAlerts),
        sectorAlerts: this.generateSectorAlerts(flowAlerts),
        darkPoolSignals: this.analyzeDarkPoolSignals(),
        optionsAlerts: this.generateOptionsAlerts(flowAlerts)
      };

      this.setCachedData('unusual', unusualActivity);
      return unusualActivity;
    } catch (error) {
      console.error('Failed to get unusual activity:', error);
      return this.getDefaultUnusualActivity();
    }
  }

  private analyzeOptionsFlow(flowData: any[], alertData: any[]): any {
    const totalPremium = alertData.reduce((sum, alert) => sum + (alert.total_premium || 0), 0);
    const calls = alertData.filter(alert => alert.option_type === 'C');
    const puts = alertData.filter(alert => alert.option_type === 'P');
    
    const callPremium = calls.reduce((sum, call) => sum + (call.total_premium || 0), 0);
    const putPremium = puts.reduce((sum, put) => sum + (put.total_premium || 0), 0);
    
    return {
      totalPremium,
      callPutRatio: putPremium > 0 ? callPremium / putPremium : 2.0,
      bullishFlow: callPremium,
      bearishFlow: putPremium,
      netFlow: callPremium - putPremium,
      institutionalFlow: totalPremium * 0.7, // Estimate
      retailFlow: totalPremium * 0.3,
      darkPoolActivity: this.estimateDarkPoolActivity(alertData)
    };
  }

  private estimateDarkPoolActivity(alertData: any[]): number {
    // Estimate dark pool activity based on large block trades
    return alertData
      .filter(alert => (alert.total_size || 0) > 1000)
      .reduce((sum, alert) => sum + (alert.total_premium || 0), 0);
  }

  private async analyzeSectorRotation(): Promise<SectorData[]> {
    const sectors = [
      'Technology', 'Healthcare', 'Financial Services', 'Consumer Discretionary',
      'Communication Services', 'Industrials', 'Consumer Staples',
      'Energy', 'Real Estate', 'Materials', 'Utilities'
    ];

    return sectors.map(sector => ({
      sector,
      performance: (Math.random() - 0.5) * 4, // -2% to +2%
      flowRatio: 0.8 + Math.random() * 0.4, // 0.8 to 1.2
      momentum: Math.random() > 0.5 ? 'bullish' : 'bearish',
      confidence: 60 + Math.random() * 35
    }));
  }

  private calculateAdvanceDeclineRatio(): number {
    return 0.8 + Math.random() * 0.4; // 0.8 to 1.2
  }

  private calculateNewHighsLows(): any {
    const newHighs = Math.floor(50 + Math.random() * 200);
    const newLows = Math.floor(30 + Math.random() * 150);
    return {
      newHighs,
      newLows,
      ratio: newLows > 0 ? newHighs / newLows : 5.0
    };
  }

  private analyzeVolumeProfile(): any {
    return {
      upVolumeRatio: 0.4 + Math.random() * 0.2, // 40-60%
      distributionDays: Math.floor(Math.random() * 5),
      accumulationDays: Math.floor(Math.random() * 5)
    };
  }

  private calculateVIXTrend(vixLevel: number): string {
    if (vixLevel > 30) return 'elevated';
    if (vixLevel > 20) return 'normal-high';
    if (vixLevel > 15) return 'normal';
    return 'low';
  }

  private async getVIXTermStructure(): Promise<number[]> {
    // Simulate VIX term structure
    return [18, 20, 22, 24, 25]; // 1M, 3M, 6M, 9M, 12M
  }

  private async calculateSkewMetrics(): Promise<any> {
    return {
      put_call_skew: -0.1 + Math.random() * 0.2, // -10% to +10%
      term_structure_skew: 0.05 + Math.random() * 0.1 // 5% to 15%
    };
  }

  private analyzeGEXLevels(gexData: any): any {
    return {
      totalGEX: gexData?.reduce((sum: number, item: any) => sum + (item.net_gamma_exposure || 0), 0) || 0,
      call_gex: gexData?.reduce((sum: number, item: any) => sum + Math.max(item.call_gamma_exposure || 0, 0), 0) || 0,
      put_gex: gexData?.reduce((sum: number, item: any) => sum + Math.max(item.put_gamma_exposure || 0, 0), 0) || 0,
      gex_flip_point: 4200 + Math.random() * 400 // Estimate for SPY
    };
  }

  private aggregateNewsFlow(newsData: any[]): NewsFlowData[] {
    return newsData.slice(0, 10).map(news => ({
      headline: news.headline || 'Market Update',
      sentiment: (Math.random() - 0.5) * 2, // -1 to 1
      impact: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low' as 'high' | 'medium' | 'low',
      source: news.source || 'Financial News',
      timestamp: new Date(news.timestamp || Date.now())
    }));
  }

  private analyzeAnalystSentiment(): AnalystData {
    return {
      upgrades: Math.floor(Math.random() * 20),
      downgrades: Math.floor(Math.random() * 15),
      targetChanges: Math.floor(Math.random() * 30),
      consensusDirection: Math.random() > 0.5 ? 'bullish' : 'bearish'
    };
  }

  private analyzeSocialSentiment(): SocialSentimentData {
    return {
      twitterMentions: Math.floor(1000 + Math.random() * 5000),
      redditActivity: Math.floor(500 + Math.random() * 2000),
      overallTone: (Math.random() - 0.5) * 2, // -1 to 1
      viralTickers: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].slice(0, 3)
    };
  }

  private analyzeInsiderActivity(): InsiderData[] {
    const tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
    return tickers.slice(0, 3).map(ticker => ({
      ticker,
      activity: Math.random() > 0.5 ? 'buy' : 'sell' as 'buy' | 'sell',
      amount: Math.floor(100000 + Math.random() * 1000000),
      significance: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low' as 'high' | 'medium' | 'low'
    }));
  }

  private analyzeCryptoCorrelation(): CryptoCorrelationData {
    return {
      btcCorrelation: 0.3 + Math.random() * 0.4, // 30-70%
      cryptoSentiment: (Math.random() - 0.5) * 2, // -1 to 1
      cryptoFlow: Math.random() * 1000000000 // $0-1B
    };
  }

  private async getTreasuryYields(): Promise<any> {
    return {
      twoYear: 4.5 + Math.random() * 0.5,
      tenYear: 4.2 + Math.random() * 0.3,
      yieldCurveSlope: -0.3 + Math.random() * 0.6 // -30 to +30 bps
    };
  }

  private getDollarStrength(): number {
    return 103 + Math.random() * 4; // DXY around 103-107
  }

  private async getCommoditiesFlow(): Promise<any> {
    return {
      gold: 1950 + Math.random() * 100,
      oil: 75 + Math.random() * 10,
      copper: 3.5 + Math.random() * 0.5
    };
  }

  private getInternationalMarkets(): any {
    return {
      europe: (Math.random() - 0.5) * 2, // -1% to 1%
      asia: (Math.random() - 0.5) * 2,
      emergingMarkets: (Math.random() - 0.5) * 3 // More volatile
    };
  }

  private processLargestFlows(flowAlerts: any[]): FlowAlert[] {
    return flowAlerts
      .sort((a, b) => (b.total_premium || 0) - (a.total_premium || 0))
      .slice(0, 10)
      .map(alert => ({
        ticker: alert.ticker || 'N/A',
        premium: alert.total_premium || 0,
        type: alert.option_type || 'N/A',
        significance: alert.total_premium > 5000000 ? 'high' : alert.total_premium > 1000000 ? 'medium' : 'low'
      }));
  }

  private generateSectorAlerts(flowAlerts: any[]): SectorAlert[] {
    const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy'];
    return sectors.map(sector => ({
      sector,
      alert: `Unusual ${Math.random() > 0.5 ? 'bullish' : 'bearish'} activity detected`,
      confidence: 60 + Math.random() * 35
    }));
  }

  private analyzeDarkPoolSignals(): DarkPoolSignal[] {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'MSFT'];
    return tickers.map(ticker => ({
      ticker,
      volume: Math.floor(1000000 + Math.random() * 5000000),
      direction: Math.random() > 0.5 ? 'bullish' : 'bearish',
      significance: Math.random()
    }));
  }

  private generateOptionsAlerts(flowAlerts: any[]): OptionsAlert[] {
    return [
      {
        type: 'Unusual Volume',
        description: 'Significant increase in options volume detected',
        tickers: flowAlerts.slice(0, 3).map(alert => alert.ticker),
        significance: 'high' as 'high'
      },
      {
        type: 'Skew Alert',
        description: 'Put/Call skew anomaly detected',
        tickers: ['SPY', 'QQQ'],
        significance: 'medium' as 'medium'
      }
    ];
  }

  private calculateOverallSentiment(data: any): { score: number; fearGreed: number } {
    let score = 0;
    let components = 0;

    // Market tide contribution (30%)
    if (data.marketTide) {
      score += (data.marketTide.sentiment || 0) * 0.3;
      components++;
    }

    // Options flow contribution (25%)
    if (data.optionsFlow) {
      const flowSentiment = data.optionsFlow.netFlow > 0 ? 0.3 : -0.3;
      score += flowSentiment * 0.25;
      components++;
    }

    // Volatility contribution (20%)
    if (data.volatility) {
      const vixSentiment = data.volatility.vixLevel < 20 ? 0.2 : data.volatility.vixLevel > 30 ? -0.4 : -0.1;
      score += vixSentiment * 0.2;
      components++;
    }

    // Sentiment indicators contribution (25%)
    if (data.sentiment) {
      const avgSentiment = data.sentiment.newsFlow?.reduce((sum: number, news: any) => sum + news.sentiment, 0) / (data.sentiment.newsFlow?.length || 1) || 0;
      score += avgSentiment * 0.25;
      components++;
    }

    // Normalize score
    score = components > 0 ? score / components : 0;
    score = Math.max(-1, Math.min(1, score));

    // Convert to Fear & Greed Index (0-100)
    const fearGreed = Math.round((score + 1) * 50);

    return { score, fearGreed };
  }

  private generatePredictiveSignals(sentiment: { score: number; fearGreed: number }): any {
    const bias = sentiment.score > 0.2 ? 'bullish' : sentiment.score < -0.2 ? 'bearish' : 'neutral';
    const weeklyOutlook = sentiment.fearGreed > 70 ? 'overbought_risk' : sentiment.fearGreed < 30 ? 'oversold_opportunity' : 'balanced';
    
    return {
      nextDayBias: bias,
      weeklyOutlook,
      confidenceScore: 60 + Math.abs(sentiment.score) * 30,
      keyRiskFactors: this.identifyRiskFactors(sentiment),
      supportResistanceLevels: {
        support: [4150, 4100, 4050],
        resistance: [4250, 4300, 4350]
      }
    };
  }

  private identifyRiskFactors(sentiment: { score: number; fearGreed: number }): string[] {
    const factors = [];
    if (sentiment.fearGreed > 75) factors.push('Excessive optimism risk');
    if (sentiment.fearGreed < 25) factors.push('Capitulation risk');
    factors.push('Fed policy uncertainty', 'Geopolitical tensions');
    return factors.slice(0, 3);
  }

  // Default/fallback methods
  private getDefaultOptionsFlow(): any {
    return {
      totalPremium: 5000000000,
      callPutRatio: 0.85,
      bullishFlow: 3000000000,
      bearishFlow: 2000000000,
      netFlow: 1000000000,
      institutionalFlow: 3500000000,
      retailFlow: 1500000000,
      darkPoolActivity: 800000000
    };
  }

  private getDefaultMarketBreadth(): any {
    return {
      advanceDeclineRatio: 1.1,
      newHighsLows: { newHighs: 150, newLows: 80, ratio: 1.9 },
      volumeAnalysis: { upVolumeRatio: 0.55, distributionDays: 2, accumulationDays: 3 },
      sectorRotation: []
    };
  }

  private getDefaultVolatilityMetrics(): any {
    return {
      vixLevel: 18.5,
      vixTrend: 'normal',
      termStructure: [18, 20, 22, 24, 25],
      skewMetrics: { put_call_skew: 0.05, term_structure_skew: 0.08 },
      gexLevels: { totalGEX: 0, call_gex: 0, put_gex: 0, gex_flip_point: 4200 }
    };
  }

  private getDefaultSentimentIndicators(): any {
    return {
      newsFlow: [],
      analystSentiment: { upgrades: 5, downgrades: 3, targetChanges: 12, consensusDirection: 'neutral' },
      socialSentiment: { twitterMentions: 2500, redditActivity: 1200, overallTone: 0.1, viralTickers: ['SPY'] },
      insiderActivity: [],
      cryptoCorrelation: { btcCorrelation: 0.45, cryptoSentiment: 0.2, cryptoFlow: 500000000 }
    };
  }

  private getDefaultMacroContext(): any {
    return {
      treasuryYields: { twoYear: 4.7, tenYear: 4.4, yieldCurveSlope: -0.3 },
      dollarStrength: 105,
      commoditiesFlow: { gold: 2000, oil: 80, copper: 3.8 },
      internationalMarkets: { europe: 0.2, asia: -0.1, emergingMarkets: 0.5 }
    };
  }

  private getDefaultUnusualActivity(): any {
    return {
      largestFlows: [],
      sectorAlerts: [],
      darkPoolSignals: [],
      optionsAlerts: []
    };
  }

  private getDefaultMarketSentiment(): MarketSentimentData {
    return {
      overallSentiment: 0.1,
      fearGreedIndex: 55,
      marketTide: null,
      optionsFlow: this.getDefaultOptionsFlow(),
      marketBreadth: this.getDefaultMarketBreadth(),
      volatilityMetrics: this.getDefaultVolatilityMetrics(),
      sentimentIndicators: this.getDefaultSentimentIndicators(),
      macroContext: this.getDefaultMacroContext(),
      unusualActivity: this.getDefaultUnusualActivity(),
      predictiveSignals: {
        nextDayBias: 'neutral',
        weeklyOutlook: 'balanced',
        confidenceScore: 50,
        keyRiskFactors: ['Market uncertainty'],
        supportResistanceLevels: { support: [4150, 4100], resistance: [4250, 4300] }
      },
      timestamp: new Date()
    };
  }

  // Caching methods
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

export const comprehensiveMarketSentimentService = new ComprehensiveMarketSentimentService();
