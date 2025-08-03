// @ts-nocheck
import { newsAggregator } from './newsAggregator';

export interface CompanyFundamentals {
  symbol: string;
  companyName: string;
  sector: string;
  industry: string;
  marketCap: number;
  lastUpdated: Date;
  
  // Financial Metrics
  financials: {
    revenue: number;
    revenueGrowth: number;
    netIncome: number;
    earningsPerShare: number;
    epsGrowth: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    returnOnEquity: number;
    returnOnAssets: number;
    debtToEquity: number;
    currentRatio: number;
    quickRatio: number;
    freeCashFlow: number;
    bookValuePerShare: number;
  };
  
  // Valuation Metrics
  valuation: {
    priceToEarnings: number;
    priceToBook: number;
    priceToSales: number;
    priceEarningsGrowth: number;
    enterpriseValue: number;
    evToRevenue: number;
    evToEbitda: number;
    dividendYield: number;
    payoutRatio: number;
  };
  
  // Trading Metrics
  trading: {
    beta: number;
    volatility: number;
    averageVolume: number;
    sharesOutstanding: number;
    floatShares: number;
    shortInterest: number;
    shortRatio: number;
    institutionalOwnership: number;
    insiderOwnership: number;
  };
  
  // Analyst Data
  analyst: {
    consensusRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
    priceTarget: number;
    priceTargetHigh: number;
    priceTargetLow: number;
    analystCount: number;
    upgrades: number;
    downgrades: number;
    earningsRevisions: number;
  };
  
  // Technical Indicators
  technical: {
    rsi: number;
    sma20: number;
    sma50: number;
    sma200: number;
    bollingerUpper: number;
    bollingerLower: number;
    macd: number;
    macdSignal: number;
    stochastic: number;
    support: number;
    resistance: number;
  };
  
  // Options Data
  options: {
    impliedVolatility: number;
    ivRank: number;
    ivPercentile: number;
    putCallRatio: number;
    maxPain: number;
    gammaExposure: number;
    darkPoolFlow: number;
    unusualActivity: number;
  };
  
  // Earnings & Events
  events: {
    nextEarningsDate: Date | null;
    lastEarningsDate: Date | null;
    lastEarningsSurprise: number;
    earningsGrowthEstimate: number;
    revenueGrowthEstimate: number;
    upcomingEvents: string[];
    lastDividendDate: Date | null;
    exDividendDate: Date | null;
  };
  
  // Risk Assessment
  risk: {
    overallRisk: 'Low' | 'Medium' | 'High';
    liquidityRisk: number;
    volatilityRisk: number;
    fundamentalRisk: number;
    technicalRisk: number;
    sentimentRisk: number;
    concentrationRisk: number;
  };
  
  // Sentiment & News
  sentiment: {
    overall: number; // -1 to 1
    confidence: number;
    newsCount: number;
    socialMentions: number;
    analystSentiment: number;
    insiderTrading: 'Buying' | 'Selling' | 'Neutral';
    institutionalFlow: 'Inflow' | 'Outflow' | 'Neutral';
  };
}

export interface FundamentalScore {
  overall: number; // 0-100
  financial: number;
  valuation: number;
  growth: number;
  quality: number;
  momentum: number;
  explanation: string[];
  warnings: string[];
  strengths: string[];
}

export class FundamentalsAnalyzer {
  private cache: Map<string, CompanyFundamentals> = new Map();
  private scoreCache: Map<string, FundamentalScore> = new Map();
  
  constructor() {
    // Clean cache every hour
    setInterval(() => this.cleanCache(), 60 * 60 * 1000);
  }

  // Get comprehensive fundamentals for a symbol
  async getFundamentals(symbol: string): Promise<CompanyFundamentals> {
    const cacheKey = `${symbol}_fundamentals`;
    
    // Return cached data if recent (30 minutes)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (Date.now() - cached.lastUpdated.getTime() < 30 * 60 * 1000) {
        return cached;
      }
    }

    console.log(`Fetching comprehensive fundamentals for ${symbol}...`);
    
    try {
      // Fetch from multiple sources in parallel
      const [twsData, alphaVantageData, newsData] = await Promise.allSettled([
        this.fetchTWSFundamentals(symbol),
        this.fetchAlphaVantageFundamentals(symbol),
        this.fetchNewsAndSentiment(symbol)
      ]);

      // Combine all data sources
      const fundamentals = await this.combineFundamentalData(
        symbol,
        twsData.status === 'fulfilled' ? twsData.value : null,
        alphaVantageData.status === 'fulfilled' ? alphaVantageData.value : null,
        newsData.status === 'fulfilled' ? newsData.value : null
      );

      // Cache the result
      this.cache.set(cacheKey, fundamentals);
      
      console.log(`Fundamentals analysis completed for ${symbol}`);
      return fundamentals;

    } catch (error) {
      console.error(`Failed to fetch fundamentals for ${symbol}:`, error);
      throw error;
    }
  }

  // Fetch fundamentals from TWS
  private async fetchTWSFundamentals(symbol: string): Promise<any> {
    try {
      const { ibkrService } = await import('./ibkrService');
      
      // Get comprehensive data from TWS
      const [
        fundamentalData,
        contractDetails,
        marketData,
        historicalData,
        optionsData
      ] = await Promise.allSettled([
        ibkrService.getFundamentalData(symbol),
        ibkrService.getContractDetails(symbol),
        ibkrService.getMarketData(symbol),
        ibkrService.getHistoricalData(symbol, '1Y'),
        ibkrService.getOptionsChain(symbol)
      ]);

      return {
        fundamental: fundamentalData.status === 'fulfilled' ? fundamentalData.value : null,
        contract: contractDetails.status === 'fulfilled' ? contractDetails.value : null,
        market: marketData.status === 'fulfilled' ? marketData.value : null,
        historical: historicalData.status === 'fulfilled' ? historicalData.value : null,
        options: optionsData.status === 'fulfilled' ? optionsData.value : null
      };

    } catch (error) {
      console.error(`TWS fundamentals fetch failed for ${symbol}:`, error);
      return null;
    }
  }

  // Fetch fundamentals from Alpha Vantage
  private async fetchAlphaVantageFundamentals(symbol: string): Promise<any> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) return null;

    try {
      // Get company overview, income statement, balance sheet
      const [overview, income, balance, cashFlow] = await Promise.allSettled([
        this.fetchAlphaVantageEndpoint('OVERVIEW', symbol, apiKey),
        this.fetchAlphaVantageEndpoint('INCOME_STATEMENT', symbol, apiKey),
        this.fetchAlphaVantageEndpoint('BALANCE_SHEET', symbol, apiKey),
        this.fetchAlphaVantageEndpoint('CASH_FLOW', symbol, apiKey)
      ]);

      return {
        overview: overview.status === 'fulfilled' ? overview.value : null,
        income: income.status === 'fulfilled' ? income.value : null,
        balance: balance.status === 'fulfilled' ? balance.value : null,
        cashFlow: cashFlow.status === 'fulfilled' ? cashFlow.value : null
      };

    } catch (error) {
      console.error(`Alpha Vantage fundamentals fetch failed for ${symbol}:`, error);
      return null;
    }
  }

  // Fetch specific Alpha Vantage endpoint
  private async fetchAlphaVantageEndpoint(func: string, symbol: string, apiKey: string): Promise<any> {
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Respect rate limits
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    return data;
  }

  // Fetch news and sentiment data
  private async fetchNewsAndSentiment(symbol: string): Promise<any> {
    try {
      const [articles, sentiment] = await Promise.all([
        newsAggregator.getArticlesForSymbol(symbol, 48), // Last 48 hours
        newsAggregator.getSymbolSentiment(symbol, 48)
      ]);

      return { articles, sentiment };
    } catch (error) {
      console.error(`News/sentiment fetch failed for ${symbol}:`, error);
      return null;
    }
  }

  // Combine data from all sources into comprehensive fundamentals
  private async combineFundamentalData(
    symbol: string,
    twsData: any,
    alphaVantageData: any,
    newsData: any
  ): Promise<CompanyFundamentals> {
    
    // Extract company basics
    const companyName = alphaVantageData?.overview?.Name || 
                       twsData?.contract?.longName || 
                       symbol;
    
    const sector = alphaVantageData?.overview?.Sector || 'Unknown';
    const industry = alphaVantageData?.overview?.Industry || 'Unknown';
    const marketCap = this.parseNumber(alphaVantageData?.overview?.MarketCapitalization) || 0;

    // Build comprehensive fundamentals object
    const fundamentals: CompanyFundamentals = {
      symbol,
      companyName,
      sector,
      industry,
      marketCap,
      lastUpdated: new Date(),
      
      financials: this.extractFinancials(alphaVantageData, twsData),
      valuation: this.extractValuation(alphaVantageData, twsData),
      trading: this.extractTrading(alphaVantageData, twsData),
      analyst: this.extractAnalyst(alphaVantageData, twsData),
      technical: this.extractTechnical(twsData),
      options: this.extractOptions(twsData),
      events: this.extractEvents(alphaVantageData, twsData),
      risk: this.calculateRisk(alphaVantageData, twsData, newsData),
      sentiment: this.extractSentiment(newsData, twsData)
    };

    return fundamentals;
  }

  // Extract financial metrics
  private extractFinancials(alphaData: any, twsData: any): CompanyFundamentals['financials'] {
    const overview = alphaData?.overview || {};
    const income = alphaData?.income?.annualReports?.[0] || {};
    
    return {
      revenue: this.parseNumber(income.totalRevenue) || 0,
      revenueGrowth: this.parseNumber(overview.RevenuePerShareTTM) || 0,
      netIncome: this.parseNumber(income.netIncome) || 0,
      earningsPerShare: this.parseNumber(overview.EPS) || 0,
      epsGrowth: this.parseNumber(overview.QuarterlyEarningsGrowthYOY) || 0,
      grossMargin: this.parseNumber(overview.GrossProfitTTM) || 0,
      operatingMargin: this.parseNumber(overview.OperatingMarginTTM) || 0,
      netMargin: this.parseNumber(overview.ProfitMargin) || 0,
      returnOnEquity: this.parseNumber(overview.ReturnOnEquityTTM) || 0,
      returnOnAssets: this.parseNumber(overview.ReturnOnAssetsTTM) || 0,
      debtToEquity: this.parseNumber(overview.DebtToEquityRatio) || 0,
      currentRatio: this.parseNumber(overview.CurrentRatio) || 0,
      quickRatio: this.parseNumber(overview.QuickRatio) || 0,
      freeCashFlow: this.parseNumber(income.operatingCashflow) || 0,
      bookValuePerShare: this.parseNumber(overview.BookValue) || 0
    };
  }

  // Extract valuation metrics
  private extractValuation(alphaData: any, twsData: any): CompanyFundamentals['valuation'] {
    const overview = alphaData?.overview || {};
    
    return {
      priceToEarnings: this.parseNumber(overview.PERatio) || 0,
      priceToBook: this.parseNumber(overview.PriceToBookRatio) || 0,
      priceToSales: this.parseNumber(overview.PriceToSalesRatioTTM) || 0,
      priceEarningsGrowth: this.parseNumber(overview.PEGRatio) || 0,
      enterpriseValue: this.parseNumber(overview.EnterpriseValue) || 0,
      evToRevenue: this.parseNumber(overview.EVToRevenue) || 0,
      evToEbitda: this.parseNumber(overview.EVToEBITDA) || 0,
      dividendYield: this.parseNumber(overview.DividendYield) || 0,
      payoutRatio: this.parseNumber(overview.PayoutRatio) || 0
    };
  }

  // Extract trading metrics
  private extractTrading(alphaData: any, twsData: any): CompanyFundamentals['trading'] {
    const overview = alphaData?.overview || {};
    
    return {
      beta: this.parseNumber(overview.Beta) || 1.0,
      volatility: this.calculateVolatility(twsData?.historical) || 0,
      averageVolume: this.parseNumber(overview.Volume) || 0,
      sharesOutstanding: this.parseNumber(overview.SharesOutstanding) || 0,
      floatShares: this.parseNumber(overview.SharesFloat) || 0,
      shortInterest: this.parseNumber(overview.ShortInterest) || 0,
      shortRatio: this.parseNumber(overview.ShortRatio) || 0,
      institutionalOwnership: this.parseNumber(overview.InstitutionPercent) || 0,
      insiderOwnership: this.parseNumber(overview.InsiderPercent) || 0
    };
  }

  // Extract analyst data
  private extractAnalyst(alphaData: any, twsData: any): CompanyFundamentals['analyst'] {
    const overview = alphaData?.overview || {};
    
    return {
      consensusRating: this.mapAnalystRating(overview.AnalystRatingStrongBuy || 0),
      priceTarget: this.parseNumber(overview.AnalystTargetPrice) || 0,
      priceTargetHigh: this.parseNumber(overview.AnalystTargetPriceHigh) || 0,
      priceTargetLow: this.parseNumber(overview.AnalystTargetPriceLow) || 0,
      analystCount: this.parseNumber(overview.AnalystCount) || 0,
      upgrades: 0, // Would need additional data source
      downgrades: 0,
      earningsRevisions: 0
    };
  }

  // Extract technical indicators
  private extractTechnical(twsData: any): CompanyFundamentals['technical'] {
    const historical = twsData?.historical || [];
    
    return {
      rsi: this.calculateRSI(historical),
      sma20: this.calculateSMA(historical, 20),
      sma50: this.calculateSMA(historical, 50),
      sma200: this.calculateSMA(historical, 200),
      bollingerUpper: 0, // Would calculate from historical data
      bollingerLower: 0,
      macd: 0,
      macdSignal: 0,
      stochastic: 0,
      support: this.findSupport(historical),
      resistance: this.findResistance(historical)
    };
  }

  // Extract options data
  private extractOptions(twsData: any): CompanyFundamentals['options'] {
    const options = twsData?.options || {};
    
    return {
      impliedVolatility: options.impliedVolatility || 0,
      ivRank: options.ivRank || 0,
      ivPercentile: options.ivPercentile || 0,
      putCallRatio: options.putCallRatio || 0,
      maxPain: options.maxPain || 0,
      gammaExposure: options.gammaExposure || 0,
      darkPoolFlow: options.darkPoolFlow || 0,
      unusualActivity: options.unusualActivity || 0
    };
  }

  // Extract events and earnings
  private extractEvents(alphaData: any, twsData: any): CompanyFundamentals['events'] {
    const overview = alphaData?.overview || {};
    
    return {
      nextEarningsDate: overview.QuarterlyEarningsDate ? new Date(overview.QuarterlyEarningsDate) : null,
      lastEarningsDate: overview.LastSplitDate ? new Date(overview.LastSplitDate) : null,
      lastEarningsSurprise: this.parseNumber(overview.QuarterlyRevenueGrowthYOY) || 0,
      earningsGrowthEstimate: this.parseNumber(overview.QuarterlyEarningsGrowthYOY) || 0,
      revenueGrowthEstimate: this.parseNumber(overview.QuarterlyRevenueGrowthYOY) || 0,
      upcomingEvents: [],
      lastDividendDate: overview.DividendDate ? new Date(overview.DividendDate) : null,
      exDividendDate: overview.ExDividendDate ? new Date(overview.ExDividendDate) : null
    };
  }

  // Calculate comprehensive risk assessment
  private calculateRisk(alphaData: any, twsData: any, newsData: any): CompanyFundamentals['risk'] {
    const overview = alphaData?.overview || {};
    const beta = this.parseNumber(overview.Beta) || 1.0;
    const volatility = this.calculateVolatility(twsData?.historical) || 0.2;
    
    const liquidityRisk = this.calculateLiquidityRisk(overview);
    const volatilityRisk = Math.min(100, volatility * 100);
    const fundamentalRisk = this.calculateFundamentalRisk(alphaData);
    const technicalRisk = this.calculateTechnicalRisk(twsData);
    const sentimentRisk = this.calculateSentimentRisk(newsData);
    const concentrationRisk = this.calculateConcentrationRisk(overview);
    
    const overallRiskScore = (liquidityRisk + volatilityRisk + fundamentalRisk + 
                             technicalRisk + sentimentRisk + concentrationRisk) / 6;
    
    return {
      overallRisk: overallRiskScore > 70 ? 'High' : overallRiskScore > 40 ? 'Medium' : 'Low',
      liquidityRisk,
      volatilityRisk,
      fundamentalRisk,
      technicalRisk,
      sentimentRisk,
      concentrationRisk
    };
  }

  // Extract sentiment data
  private extractSentiment(newsData: any, twsData: any): CompanyFundamentals['sentiment'] {
    const sentiment = newsData?.sentiment || {};
    const articles = newsData?.articles || [];
    
    return {
      overall: sentiment.overall_sentiment || 0,
      confidence: sentiment.confidence || 0,
      newsCount: articles.length,
      socialMentions: 0, // Would need social media API
      analystSentiment: 0, // Would calculate from analyst data
      insiderTrading: 'Neutral',
      institutionalFlow: 'Neutral'
    };
  }

  // Calculate fundamental score (0-100)
  async calculateFundamentalScore(symbol: string): Promise<FundamentalScore> {
    const cacheKey = `${symbol}_score`;
    
    if (this.scoreCache.has(cacheKey)) {
      return this.scoreCache.get(cacheKey)!;
    }

    const fundamentals = await this.getFundamentals(symbol);
    
    // Score different aspects
    const financialScore = this.scoreFinancials(fundamentals.financials);
    const valuationScore = this.scoreValuation(fundamentals.valuation);
    const growthScore = this.scoreGrowth(fundamentals.financials, fundamentals.events);
    const qualityScore = this.scoreQuality(fundamentals.financials, fundamentals.trading);
    const momentumScore = this.scoreMomentum(fundamentals.technical, fundamentals.sentiment);
    
    // Weighted overall score
    const overall = Math.round(
      financialScore * 0.25 +
      valuationScore * 0.20 +
      growthScore * 0.25 +
      qualityScore * 0.15 +
      momentumScore * 0.15
    );

    const score: FundamentalScore = {
      overall,
      financial: financialScore,
      valuation: valuationScore,
      growth: growthScore,
      quality: qualityScore,
      momentum: momentumScore,
      explanation: this.generateExplanation(fundamentals),
      warnings: this.generateWarnings(fundamentals),
      strengths: this.generateStrengths(fundamentals)
    };

    this.scoreCache.set(cacheKey, score);
    
    // Cache for 1 hour
    setTimeout(() => {
      this.scoreCache.delete(cacheKey);
    }, 60 * 60 * 1000);

    return score;
  }

  // Helper methods for calculations
  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private calculateVolatility(historical: any[]): number {
    if (!historical || historical.length < 20) return 0.2;
    
    const returns = historical.slice(1).map((day, i) => 
      Math.log(day.close / historical[i].close)
    );
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance * 252); // Annualized volatility
  }

  private calculateRSI(historical: any[]): number {
    if (!historical || historical.length < 14) return 50;
    
    const changes = historical.slice(1).map((day, i) => 
      day.close - historical[i].close
    );
    
    const gains = changes.filter(c => c > 0);
    const losses = changes.filter(c => c < 0).map(c => Math.abs(c));
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateSMA(historical: any[], period: number): number {
    if (!historical || historical.length < period) return 0;
    
    const prices = historical.slice(0, period).map(d => d.close);
    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  private findSupport(historical: any[]): number {
    if (!historical || historical.length < 20) return 0;
    
    const lows = historical.slice(0, 20).map(d => d.low);
    return Math.min(...lows);
  }

  private findResistance(historical: any[]): number {
    if (!historical || historical.length < 20) return 0;
    
    const highs = historical.slice(0, 20).map(d => d.high);
    return Math.max(...highs);
  }

  private mapAnalystRating(strongBuyCount: number): CompanyFundamentals['analyst']['consensusRating'] {
    if (strongBuyCount > 0.6) return 'Strong Buy';
    if (strongBuyCount > 0.3) return 'Buy';
    if (strongBuyCount > -0.3) return 'Hold';
    if (strongBuyCount > -0.6) return 'Sell';
    return 'Strong Sell';
  }

  // Risk calculation methods
  private calculateLiquidityRisk(overview: any): number {
    const volume = this.parseNumber(overview.Volume);
    const marketCap = this.parseNumber(overview.MarketCapitalization);
    
    if (volume < 100000) return 90;
    if (volume < 500000) return 70;
    if (marketCap < 1000000000) return 60;
    return 30;
  }

  private calculateFundamentalRisk(alphaData: any): number {
    const overview = alphaData?.overview || {};
    const debtRatio = this.parseNumber(overview.DebtToEquityRatio);
    const currentRatio = this.parseNumber(overview.CurrentRatio);
    
    let risk = 0;
    if (debtRatio > 1.5) risk += 30;
    if (currentRatio < 1.0) risk += 25;
    if (this.parseNumber(overview.PERatio) > 50) risk += 20;
    
    return Math.min(100, risk);
  }

  private calculateTechnicalRisk(twsData: any): number {
    // Would implement technical risk analysis
    return 30;
  }

  private calculateSentimentRisk(newsData: any): number {
    const sentiment = newsData?.sentiment?.overall_sentiment || 0;
    const confidence = newsData?.sentiment?.confidence || 0;
    
    if (sentiment < -0.5 && confidence > 0.7) return 80;
    if (sentiment < -0.2) return 60;
    if (sentiment > 0.5) return 20;
    return 40;
  }

  private calculateConcentrationRisk(overview: any): number {
    const institutionalOwnership = this.parseNumber(overview.InstitutionPercent);
    const insiderOwnership = this.parseNumber(overview.InsiderPercent);
    
    if (institutionalOwnership > 80) return 60;
    if (insiderOwnership > 50) return 70;
    return 30;
  }

  // Scoring methods
  private scoreFinancials(financials: CompanyFundamentals['financials']): number {
    let score = 50;
    
    if (financials.returnOnEquity > 15) score += 15;
    if (financials.returnOnAssets > 10) score += 10;
    if (financials.netMargin > 10) score += 10;
    if (financials.currentRatio > 1.5) score += 10;
    if (financials.debtToEquity < 0.5) score += 15;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreValuation(valuation: CompanyFundamentals['valuation']): number {
    let score = 50;
    
    if (valuation.priceToEarnings > 0 && valuation.priceToEarnings < 20) score += 20;
    if (valuation.priceToBook < 3) score += 15;
    if (valuation.priceEarningsGrowth < 1) score += 15;
    if (valuation.dividendYield > 2) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreGrowth(financials: CompanyFundamentals['financials'], events: CompanyFundamentals['events']): number {
    let score = 50;
    
    if (financials.revenueGrowth > 10) score += 20;
    if (financials.epsGrowth > 15) score += 20;
    if (events.earningsGrowthEstimate > 10) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreQuality(financials: CompanyFundamentals['financials'], trading: CompanyFundamentals['trading']): number {
    let score = 50;
    
    if (financials.grossMargin > 40) score += 15;
    if (financials.freeCashFlow > 0) score += 15;
    if (trading.institutionalOwnership > 50) score += 10;
    if (trading.beta < 1.2) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  private scoreMomentum(technical: CompanyFundamentals['technical'], sentiment: CompanyFundamentals['sentiment']): number {
    let score = 50;
    
    if (technical.rsi > 30 && technical.rsi < 70) score += 10;
    if (sentiment.overall > 0.2) score += 15;
    if (sentiment.analystSentiment > 0) score += 15;
    if (technical.sma20 > technical.sma50) score += 10;
    
    return Math.min(100, Math.max(0, score));
  }

  // Generate explanations and insights
  private generateExplanation(fundamentals: CompanyFundamentals): string[] {
    const explanations: string[] = [];
    
    if (fundamentals.financials.returnOnEquity > 15) {
      explanations.push("Strong return on equity indicates efficient use of shareholder capital");
    }
    
    if (fundamentals.valuation.priceToEarnings < 15) {
      explanations.push("Low P/E ratio suggests the stock may be undervalued");
    }
    
    if (fundamentals.financials.epsGrowth > 15) {
      explanations.push("Strong earnings growth indicates healthy business expansion");
    }
    
    return explanations;
  }

  private generateWarnings(fundamentals: CompanyFundamentals): string[] {
    const warnings: string[] = [];
    
    if (fundamentals.financials.debtToEquity > 1.5) {
      warnings.push("High debt-to-equity ratio indicates increased financial risk");
    }
    
    if (fundamentals.trading.beta > 1.8) {
      warnings.push("High beta indicates significant price volatility");
    }
    
    if (fundamentals.sentiment.overall < -0.5) {
      warnings.push("Negative sentiment could impact near-term performance");
    }
    
    return warnings;
  }

  private generateStrengths(fundamentals: CompanyFundamentals): string[] {
    const strengths: string[] = [];
    
    if (fundamentals.financials.grossMargin > 50) {
      strengths.push("High gross margins indicate strong pricing power");
    }
    
    if (fundamentals.trading.institutionalOwnership > 70) {
      strengths.push("High institutional ownership suggests professional confidence");
    }
    
    if (fundamentals.financials.freeCashFlow > 0) {
      strengths.push("Positive free cash flow supports dividend payments and growth");
    }
    
    return strengths;
  }

  // Clean old cache entries
  private cleanCache(): void {
    const cutoffTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours
    let cleaned = 0;
    
    this.cache.forEach((value, key) => {
      if (value.lastUpdated < cutoffTime) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    if (cleaned > 0) {
      console.log(`Cleaned ${cleaned} old fundamental entries from cache`);
    }
  }

  // Get fundamentals for multiple symbols (for watchlist)
  async getWatchlistFundamentals(symbols: string[]): Promise<Map<string, CompanyFundamentals>> {
    const results = new Map<string, CompanyFundamentals>();
    
    // Process in batches to respect API limits
    const batchSize = 3;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async symbol => {
        try {
          const fundamentals = await this.getFundamentals(symbol);
          return { symbol, fundamentals };
        } catch (error) {
          console.error(`Failed to get fundamentals for ${symbol}:`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(result.value.symbol, result.value.fundamentals);
        }
      });
      
      // Rate limiting between batches
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`Retrieved fundamentals for ${results.size}/${symbols.length} symbols`);
    return results;
  }
}

export const fundamentalsAnalyzer = new FundamentalsAnalyzer();