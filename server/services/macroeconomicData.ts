// @ts-nocheck
import OpenAI from 'openai';

// Create OpenAI instance directly for macroeconomic analysis
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface MacroeconomicIndicators {
  timestamp: Date;
  
  // Interest Rates & Treasury Data
  treasuryRates: {
    oneMonth: number;
    threeMonth: number;
    sixMonth: number;
    oneYear: number;
    twoYear: number;
    fiveYear: number;
    tenYear: number;
    twentyYear: number;
    thirtyYear: number;
  };
  
  // Federal Reserve Rates
  federalRates: {
    federalFundsRate: number;
    discountRate: number;
    primeRate: number;
  };
  
  // Economic Indicators
  economicData: {
    cpi: number; // Consumer Price Index
    ppi: number; // Producer Price Index
    unemploymentRate: number;
    gdpGrowth: number;
    retailSales: number;
    housingStarts: number;
    industrialProduction: number;
    consumerConfidence: number;
  };
  
  // Market Sentiment Indicators
  sentimentIndicators: {
    vix: number;
    putCallRatio: number;
    yieldCurveSpread: number; // 10Y-2Y spread
    dollarIndex: number; // DXY
    goldPrice: number;
    oilPrice: number;
  };
  
  // Fear & Greed Components
  fearGreedComponents: {
    marketMomentum: number; // S&P 500 vs 125-day MA
    stockPriceStrength: number; // 52-week highs vs lows
    stockPriceBreadth: number; // Volume of rising vs declining stocks
    putCallOptions: number; // Put/Call ratio
    marketVolatility: number; // VIX level
    safeHavenDemand: number; // Treasury vs stock demand
    junkBondDemand: number; // High-yield spreads
    overallFearGreed: number; // Calculated index (0-100)
  };
  
  // Yield Curve Analysis
  yieldCurve: {
    shape: 'normal' | 'inverted' | 'flat' | 'humped';
    steepness: number;
    inversionPoints: string[];
    riskSignal: 'low' | 'medium' | 'high';
  };
}

export interface MacroAnalysis {
  marketRegime: 'growth' | 'recession' | 'expansion' | 'contraction' | 'transition';
  inflationTrend: 'rising' | 'falling' | 'stable';
  monetaryPolicy: 'accommodative' | 'neutral' | 'restrictive';
  economicHealth: number; // 0-100 score
  riskLevel: 'low' | 'medium' | 'high';
  keySignals: string[];
  tradingImplications: string[];
  timeframe: string;
}

export class MacroeconomicDataService {
  private dataCache: Map<string, MacroeconomicIndicators> = new Map();
  private analysisCache: Map<string, MacroAnalysis> = new Map();
  private fredApiKey: string | null = null;

  constructor() {
    this.fredApiKey = process.env.FRED_API_KEY || null;
    // Update data every 30 minutes
    setInterval(() => this.updateMacroData(), 30 * 60 * 1000);
  }

  // Fetch data from FRED API (Federal Reserve Economic Data)
  async fetchFredData(seriesId: string, limit: number = 1): Promise<number | null> {
    if (!this.fredApiKey) {
      console.log('FRED API key not configured');
      return null;
    }

    try {
      const url = `https://api.stlouisfed.org/fred/series/observations`;
      const params = new URLSearchParams({
        series_id: seriesId,
        api_key: this.fredApiKey,
        file_type: 'json',
        limit: limit.toString(),
        sort_order: 'desc'
      });

      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.observations && data.observations.length > 0) {
        const latestValue = data.observations[0].value;
        return latestValue === '.' ? null : parseFloat(latestValue);
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch FRED data for ${seriesId}:`, error);
      return null;
    }
  }

  // Fetch treasury rates from multiple sources
  async fetchTreasuryRates(): Promise<MacroeconomicIndicators['treasuryRates']> {
    const treasurySeries = {
      oneMonth: 'DGS1MO',
      threeMonth: 'DGS3MO',
      sixMonth: 'DGS6MO',
      oneYear: 'DGS1',
      twoYear: 'DGS2',
      fiveYear: 'DGS5',
      tenYear: 'DGS10',
      twentyYear: 'DGS20',
      thirtyYear: 'DGS30'
    };

    const rates: any = {};
    
    for (const [period, seriesId] of Object.entries(treasurySeries)) {
      rates[period] = await this.fetchFredData(seriesId) || 0;
      // Rate limiting - FRED allows 120 calls/minute
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return rates;
  }

  // Fetch Federal Reserve rates
  async fetchFederalRates(): Promise<MacroeconomicIndicators['federalRates']> {
    const [federalFundsRate, discountRate, primeRate] = await Promise.all([
      this.fetchFredData('FEDFUNDS'),
      this.fetchFredData('INTDSRUSM193N'),
      this.fetchFredData('DPRIME')
    ]);

    return {
      federalFundsRate: federalFundsRate || 0,
      discountRate: discountRate || 0,
      primeRate: primeRate || 0
    };
  }

  // Fetch economic indicators
  async fetchEconomicData(): Promise<MacroeconomicIndicators['economicData']> {
    const economicSeries = {
      cpi: 'CPIAUCSL',
      ppi: 'PPIACO',
      unemploymentRate: 'UNRATE',
      gdpGrowth: 'A191RL1Q225SBEA',
      retailSales: 'RSAFS',
      housingStarts: 'HOUST',
      industrialProduction: 'INDPRO',
      consumerConfidence: 'UMCSENT'
    };

    const data: any = {};
    
    for (const [indicator, seriesId] of Object.entries(economicSeries)) {
      data[indicator] = await this.fetchFredData(seriesId) || 0;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return data;
  }

  // Fetch market sentiment indicators from TWS and external sources
  async fetchSentimentIndicators(): Promise<MacroeconomicIndicators['sentimentIndicators']> {
    try {
      // Get VIX and other market data from TWS
      const { ibkrService } = await import('./ibkrService');
      
      const [vixData, dxyData, goldData, oilData] = await Promise.allSettled([
        ibkrService.getMarketData('VIX'),
        ibkrService.getMarketData('DXY'),
        ibkrService.getMarketData('GLD'),
        ibkrService.getMarketData('USO')
      ]);

      // Calculate put/call ratio from options flow
      const putCallRatio = await this.calculatePutCallRatio();
      
      // Get treasury data for yield curve
      const tenYear = await this.fetchFredData('DGS10') || 0;
      const twoYear = await this.fetchFredData('DGS2') || 0;
      const yieldCurveSpread = tenYear - twoYear;

      return {
        vix: vixData.status === 'fulfilled' ? vixData.value?.price || 0 : 0,
        putCallRatio,
        yieldCurveSpread,
        dollarIndex: dxyData.status === 'fulfilled' ? dxyData.value?.price || 0 : 0,
        goldPrice: goldData.status === 'fulfilled' ? goldData.value?.price || 0 : 0,
        oilPrice: oilData.status === 'fulfilled' ? oilData.value?.price || 0 : 0
      };
    } catch (error) {
      console.error('Failed to fetch sentiment indicators:', error);
      return {
        vix: 0,
        putCallRatio: 0,
        yieldCurveSpread: 0,
        dollarIndex: 0,
        goldPrice: 0,
        oilPrice: 0
      };
    }
  }

  // Calculate Fear & Greed Index components
  async calculateFearGreedComponents(): Promise<MacroeconomicIndicators['fearGreedComponents']> {
    try {
      const { ibkrService } = await import('./ibkrService');
      
      // 1. Market Momentum (S&P 500 vs 125-day MA)
      const spyData = await ibkrService.getHistoricalData('SPY', '6M');
      const marketMomentum = this.calculateMarketMomentum(spyData);
      
      // 2. Stock Price Strength (52-week highs vs lows)
      const stockPriceStrength = await this.calculateStockPriceStrength();
      
      // 3. Stock Price Breadth (volume analysis)
      const stockPriceBreadth = await this.calculateStockPriceBreadth();
      
      // 4. Put/Call Options ratio
      const putCallOptions = await this.calculatePutCallRatio();
      
      // 5. Market Volatility (VIX)
      const vixData = await ibkrService.getMarketData('VIX');
      const marketVolatility = this.normalizeVIX(vixData?.price || 20);
      
      // 6. Safe Haven Demand (Treasury vs Stock demand)
      const safeHavenDemand = await this.calculateSafeHavenDemand();
      
      // 7. Junk Bond Demand (High-yield spreads)
      const junkBondDemand = await this.calculateJunkBondDemand();
      
      // Calculate overall Fear & Greed Index (0-100)
      const components = [
        marketMomentum,
        stockPriceStrength,
        stockPriceBreadth,
        putCallOptions,
        marketVolatility,
        safeHavenDemand,
        junkBondDemand
      ];
      
      const overallFearGreed = components.reduce((sum, comp) => sum + comp, 0) / components.length;
      
      return {
        marketMomentum,
        stockPriceStrength,
        stockPriceBreadth,
        putCallOptions,
        marketVolatility,
        safeHavenDemand,
        junkBondDemand,
        overallFearGreed: Math.round(overallFearGreed)
      };
    } catch (error) {
      console.error('Failed to calculate Fear & Greed components:', error);
      return {
        marketMomentum: 50,
        stockPriceStrength: 50,
        stockPriceBreadth: 50,
        putCallOptions: 50,
        marketVolatility: 50,
        safeHavenDemand: 50,
        junkBondDemand: 50,
        overallFearGreed: 50
      };
    }
  }

  // Analyze yield curve shape and implications
  analyzeYieldCurve(treasuryRates: MacroeconomicIndicators['treasuryRates']): MacroeconomicIndicators['yieldCurve'] {
    const { twoYear, fiveYear, tenYear, thirtyYear } = treasuryRates;
    
    // Determine curve shape
    let shape: MacroeconomicIndicators['yieldCurve']['shape'] = 'normal';
    const inversionPoints: string[] = [];
    
    if (twoYear > tenYear) {
      shape = 'inverted';
      inversionPoints.push('2Y-10Y');
    }
    
    if (fiveYear > tenYear) {
      inversionPoints.push('5Y-10Y');
    }
    
    if (tenYear > thirtyYear) {
      inversionPoints.push('10Y-30Y');
    }
    
    // Calculate steepness (10Y - 2Y spread)
    const steepness = tenYear - twoYear;
    
    if (Math.abs(steepness) < 0.5) {
      shape = 'flat';
    }
    
    // Determine risk signal
    let riskSignal: 'low' | 'medium' | 'high' = 'low';
    if (inversionPoints.length > 0) {
      riskSignal = 'high';
    } else if (Math.abs(steepness) < 1.0) {
      riskSignal = 'medium';
    }
    
    return {
      shape,
      steepness,
      inversionPoints,
      riskSignal
    };
  }

  // Get comprehensive macroeconomic data
  async getMacroeconomicData(): Promise<MacroeconomicIndicators> {
    const cacheKey = 'macro_data';
    
    // Return cached data if recent (15 minutes)
    if (this.dataCache.has(cacheKey)) {
      const cached = this.dataCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp.getTime() < 15 * 60 * 1000) {
        return cached;
      }
    }

    console.log('Fetching comprehensive macroeconomic data...');
    
    try {
      // Fetch all data in parallel where possible
      const [treasuryRates, federalRates, economicData, sentimentIndicators, fearGreedComponents] = await Promise.allSettled([
        this.fetchTreasuryRates(),
        this.fetchFederalRates(),
        this.fetchEconomicData(),
        this.fetchSentimentIndicators(),
        this.calculateFearGreedComponents()
      ]);

      const treasuryData = treasuryRates.status === 'fulfilled' ? treasuryRates.value : this.getDefaultTreasuryRates();
      const yieldCurve = this.analyzeYieldCurve(treasuryData);

      const macroData: MacroeconomicIndicators = {
        timestamp: new Date(),
        treasuryRates: treasuryData,
        federalRates: federalRates.status === 'fulfilled' ? federalRates.value : this.getDefaultFederalRates(),
        economicData: economicData.status === 'fulfilled' ? economicData.value : this.getDefaultEconomicData(),
        sentimentIndicators: sentimentIndicators.status === 'fulfilled' ? sentimentIndicators.value : this.getDefaultSentimentIndicators(),
        fearGreedComponents: fearGreedComponents.status === 'fulfilled' ? fearGreedComponents.value : this.getDefaultFearGreedComponents(),
        yieldCurve
      };

      // Cache the result
      this.dataCache.set(cacheKey, macroData);
      
      console.log('Macroeconomic data fetched successfully');
      return macroData;

    } catch (error) {
      console.error('Failed to fetch macroeconomic data:', error);
      throw error;
    }
  }

  // Quantitative macroeconomic analysis (IBKR data-driven)
  async analyzeMacroeconomicConditions(): Promise<MacroAnalysis> {
    const cacheKey = 'macro_analysis';
    
    if (this.analysisCache.has(cacheKey)) {
      const cached = this.analysisCache.get(cacheKey)!;
      // Cache analysis for 1 hour
      if (Date.now() - new Date(cached.timeframe).getTime() < 60 * 60 * 1000) {
        return cached;
      }
    }

    const macroData = await this.getMacroeconomicData();
    
    try {
      // Perform quantitative analysis using IBKR market data
      const analysis = this.performQuantitativeAnalysis(macroData);
      
      const macroAnalysis: MacroAnalysis = {
        marketRegime: analysis.marketRegime,
        inflationTrend: analysis.inflationTrend,
        monetaryPolicy: analysis.monetaryPolicy,
        economicHealth: analysis.economicHealth,
        riskLevel: analysis.riskLevel,
        keySignals: analysis.keySignals,
        tradingImplications: analysis.tradingImplications,
        timeframe: new Date().toISOString()
      };

      this.analysisCache.set(cacheKey, macroAnalysis);
      return macroAnalysis;

    } catch (error) {
      console.error('Failed to analyze macroeconomic conditions:', error);
      return this.getDefaultAnalysis();
    }
  }

  private performQuantitativeAnalysis(macroData: MacroeconomicIndicators): MacroAnalysis {
    // Quantitative analysis based on economic indicators
    const yieldSpread = macroData.yieldCurve.steepness;
    const vix = macroData.sentimentIndicators.vix;
    const unemploymentRate = macroData.economicData.unemploymentRate;
    const gdpGrowth = macroData.economicData.gdpGrowth;
    const fearGreed = macroData.fearGreedComponents.overallFearGreed;
    const fedRate = macroData.federalRates.federalFundsRate;

    // Market regime analysis based on yield curve and GDP
    let marketRegime: MacroAnalysis['marketRegime'] = 'expansion';
    if (yieldSpread < -0.5) marketRegime = 'contraction';
    else if (gdpGrowth < -1) marketRegime = 'recession';
    else if (gdpGrowth > 3.5) marketRegime = 'growth';
    else if (vix > 30 || Math.abs(yieldSpread) < 0.2) marketRegime = 'transition';

    // Inflation trend analysis based on Fed policy
    let inflationTrend: MacroAnalysis['inflationTrend'] = 'stable';
    if (fedRate > 5.0) inflationTrend = 'falling';
    else if (fedRate < 2.5 && unemploymentRate < 4.5) inflationTrend = 'rising';

    // Monetary policy assessment
    let monetaryPolicy: MacroAnalysis['monetaryPolicy'] = 'neutral';
    if (fedRate < 2.5) monetaryPolicy = 'accommodative';
    else if (fedRate > 4.5) monetaryPolicy = 'restrictive';

    // Economic health score (0-100) based on multiple indicators
    let economicHealth = 50;
    economicHealth += (6 - unemploymentRate) * 8; // Lower unemployment = better (max +16)
    economicHealth += Math.min(gdpGrowth * 8, 24); // GDP growth contribution (max +24)
    economicHealth += (fearGreed - 50) * 0.2; // Fear/Greed minor contribution (±10)
    economicHealth = Math.max(0, Math.min(100, economicHealth));

    // Risk level assessment
    let riskLevel: MacroAnalysis['riskLevel'] = 'medium';
    if (vix > 35 || yieldSpread < -1.0 || unemploymentRate > 6.5) riskLevel = 'high';
    else if (vix < 15 && yieldSpread > 1.5 && unemploymentRate < 4.0) riskLevel = 'low';

    // Key signals based on quantitative thresholds
    const keySignals: string[] = [];
    if (yieldSpread < -0.5) keySignals.push('Inverted yield curve - recession risk elevated');
    if (vix > 30) keySignals.push('High volatility regime - market stress present');
    if (unemploymentRate < 4.0) keySignals.push('Tight labor market - inflationary pressures possible');
    if (fedRate > 5.0) keySignals.push('Restrictive monetary policy - growth headwinds');
    if (fearGreed > 80) keySignals.push('Extreme market optimism - potential overheating');
    else if (fearGreed < 20) keySignals.push('Extreme market pessimism - oversold conditions');
    if (Math.abs(yieldSpread) < 0.1) keySignals.push('Flat yield curve - economic uncertainty');

    // Trading implications based on regime
    const tradingImplications: string[] = [];
    if (riskLevel === 'high') {
      tradingImplications.push('Increase defensive positioning and cash allocation');
      tradingImplications.push('Consider put protection and volatility strategies');
      tradingImplications.push('Reduce exposure to growth and speculative assets');
    } else if (riskLevel === 'low') {
      tradingImplications.push('Favorable environment for risk asset allocation');
      tradingImplications.push('Consider call strategies on growth sectors');
      tradingImplications.push('Reduce defensive hedging positions');
    } else {
      tradingImplications.push('Balanced approach with selective positioning');
      tradingImplications.push('Monitor key economic data for regime changes');
    }
    
    if (monetaryPolicy === 'restrictive') {
      tradingImplications.push('Monitor interest-sensitive sectors and REITs');
    } else if (monetaryPolicy === 'accommodative') {
      tradingImplications.push('Growth sectors may outperform defensive plays');
    }

    if (marketRegime === 'transition') {
      tradingImplications.push('Increased focus on volatility and momentum strategies');
    }

    return {
      marketRegime,
      inflationTrend,
      monetaryPolicy,
      economicHealth: Math.round(economicHealth),
      riskLevel,
      keySignals: keySignals.slice(0, 5), // Limit to 5 most important
      tradingImplications: tradingImplications.slice(0, 5), // Limit to 5 most important
      timeframe: `Quantitative analysis based on current economic indicators (${new Date().toLocaleDateString()})`
    };
  }

  // Helper methods for Fear & Greed calculations
  private calculateMarketMomentum(historicalData: any[]): number {
    if (!historicalData || historicalData.length < 125) return 50;
    
    const currentPrice = historicalData[0].close;
    const sma125 = historicalData.slice(0, 125).reduce((sum, day) => sum + day.close, 0) / 125;
    
    const momentumPercent = ((currentPrice - sma125) / sma125) * 100;
    
    // Normalize to 0-100 scale (assume ±10% is extreme)
    return Math.max(0, Math.min(100, 50 + (momentumPercent * 5)));
  }

  private async calculateStockPriceStrength(): Promise<number> {
    try {
      // This would require NYSE market breadth data
      // For now, return neutral value
      return 50;
    } catch {
      return 50;
    }
  }

  private async calculateStockPriceBreadth(): Promise<number> {
    try {
      // This would require volume analysis of advancing vs declining stocks
      // For now, return neutral value
      return 50;
    } catch {
      return 50;
    }
  }

  private async calculatePutCallRatio(): Promise<number> {
    try {
      // Calculate from options flow data
      const { db } = await import('../db');
      const { optionsFlow } = await import('../../shared/schema');
      const { sql } = await import('drizzle-orm');
      
      const result = await db.select({
        puts: sql<number>`sum(case when type = 'P' then volume else 0 end)`,
        calls: sql<number>`sum(case when type = 'C' then volume else 0 end)`
      }).from(optionsFlow)
        .where(sql`timestamp >= NOW() - INTERVAL '1 DAY'`);
      
      if (result.length > 0 && result[0].calls > 0) {
        const ratio = result[0].puts / result[0].calls;
        // Normalize: ratio of 1.0 = neutral (50), higher ratio = more fear
        return Math.max(0, Math.min(100, 50 + ((ratio - 1) * 50)));
      }
      
      return 50;
    } catch {
      return 50;
    }
  }

  private normalizeVIX(vix: number): number {
    // VIX normalization: 10 = extreme greed (100), 50 = extreme fear (0)
    return Math.max(0, Math.min(100, 100 - ((vix - 10) * 2.5)));
  }

  private async calculateSafeHavenDemand(): Promise<number> {
    try {
      // Compare Treasury ETF (TLT) vs SPY performance
      const { ibkrService } = await import('./ibkrService');
      const [tltData, spyData] = await Promise.all([
        ibkrService.getHistoricalData('TLT', '1M'),
        ibkrService.getHistoricalData('SPY', '1M')
      ]);
      
      if (tltData && spyData && tltData.length > 0 && spyData.length > 0) {
        const tltReturn = (tltData[0].close - tltData[tltData.length - 1].close) / tltData[tltData.length - 1].close;
        const spyReturn = (spyData[0].close - spyData[spyData.length - 1].close) / spyData[spyData.length - 1].close;
        
        const relativePerformance = tltReturn - spyReturn;
        // Normalize: positive relative performance of bonds = more fear
        return Math.max(0, Math.min(100, 50 - (relativePerformance * 100)));
      }
      
      return 50;
    } catch {
      return 50;
    }
  }

  private async calculateJunkBondDemand(): Promise<number> {
    try {
      // Compare high-yield bond spreads
      const tenYearTreasury = await this.fetchFredData('DGS10') || 4.0;
      const highYieldSpread = await this.fetchFredData('BAMLH0A0HYM2') || 4.0;
      
      // Normalize spread: narrow spreads = greed, wide spreads = fear
      const normalizedSpread = Math.max(0, Math.min(100, 100 - ((highYieldSpread - 2) * 10)));
      return normalizedSpread;
    } catch {
      return 50;
    }
  }

  // Default data methods
  private getDefaultTreasuryRates(): MacroeconomicIndicators['treasuryRates'] {
    return {
      oneMonth: 5.0,
      threeMonth: 5.2,
      sixMonth: 5.1,
      oneYear: 4.8,
      twoYear: 4.5,
      fiveYear: 4.3,
      tenYear: 4.2,
      twentyYear: 4.4,
      thirtyYear: 4.3
    };
  }

  private getDefaultFederalRates(): MacroeconomicIndicators['federalRates'] {
    return {
      federalFundsRate: 5.25,
      discountRate: 5.5,
      primeRate: 8.5
    };
  }

  private getDefaultEconomicData(): MacroeconomicIndicators['economicData'] {
    return {
      cpi: 3.2,
      ppi: 2.8,
      unemploymentRate: 3.7,
      gdpGrowth: 2.4,
      retailSales: 0.2,
      housingStarts: 1.3,
      industrialProduction: 0.1,
      consumerConfidence: 104.5
    };
  }

  private getDefaultSentimentIndicators(): MacroeconomicIndicators['sentimentIndicators'] {
    return {
      vix: 18.5,
      putCallRatio: 0.95,
      yieldCurveSpread: -0.3,
      dollarIndex: 103.2,
      goldPrice: 2050.0,
      oilPrice: 75.8
    };
  }

  private getDefaultFearGreedComponents(): MacroeconomicIndicators['fearGreedComponents'] {
    return {
      marketMomentum: 45,
      stockPriceStrength: 52,
      stockPriceBreadth: 48,
      putCallOptions: 42,
      marketVolatility: 35,
      safeHavenDemand: 58,
      junkBondDemand: 47,
      overallFearGreed: 47
    };
  }

  private getDefaultAnalysis(): MacroAnalysis {
    return {
      marketRegime: 'transition',
      inflationTrend: 'stable',
      monetaryPolicy: 'neutral',
      economicHealth: 65,
      riskLevel: 'medium',
      keySignals: ['Yield curve monitoring required', 'VIX levels elevated', 'Consumer confidence stable'],
      tradingImplications: ['Consider defensive positions', 'Monitor interest rate changes', 'Focus on high-quality names'],
      timeframe: new Date().toISOString()
    };
  }

  // Update macroeconomic data periodically
  private async updateMacroData(): Promise<void> {
    try {
      await this.getMacroeconomicData();
      console.log('Macroeconomic data updated successfully');
    } catch (error) {
      console.error('Failed to update macroeconomic data:', error);
    }
  }

  // Get historical macroeconomic trends
  async getHistoricalTrends(days: number = 30): Promise<MacroeconomicIndicators[]> {
    // This would fetch historical data for trend analysis
    // For now, return current data
    const currentData = await this.getMacroeconomicData();
    return [currentData];
  }

  // Clean old cache data
  private cleanCache(): void {
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
    let cleaned = 0;
    
    this.dataCache.forEach((value, key) => {
      if (value.timestamp < cutoffTime) {
        this.dataCache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} old macro data entries from cache`);
    }
  }
}

export const macroeconomicDataService = new MacroeconomicDataService();