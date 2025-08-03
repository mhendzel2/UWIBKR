import { mlPatternRecognition } from './mlPatternRecognition';
import * as stats from 'simple-statistics';

export interface EnhancedSignal {
  id: string;
  originalSignal: any;
  mlEnhancement: {
    confidence: number;
    expectedReturn: number;
    riskScore: number;
    patternType: string;
    timeHorizon: number;
    enhancedScore: number;
    recommendation: string;
  };
  technicalIndicators: {
    momentum: number;
    volumeProfile: string;
    supportResistance: number;
    trendStrength: number;
  };
  riskMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    profitFactor: number;
  };
  timestamp: number;
}

export class SignalEnhancer {
  private historicalData: Map<string, number[]> = new Map();
  private enhancedSignals: EnhancedSignal[] = [];

  constructor() {
    void this.initializeHistoricalData();
  }

  private async initializeHistoricalData(): Promise<void> {
    const commonTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'NFLX'];

    for (const ticker of commonTickers) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const json = await response.json();
        const result = json.chart?.result?.[0];
        const closes = result?.indicators?.quote?.[0]?.close || [];
        this.historicalData.set(ticker, closes);
      } catch (error) {
        console.warn(`Failed to fetch historical data for ${ticker}:`, error);
      }
    }
  }

  public async enhanceSignal(signal: any): Promise<EnhancedSignal> {
    // Get ML enhancement
    const mlEnhancedSignal = await mlPatternRecognition.enhanceSignal(signal);
    
    // Calculate technical indicators
    const technicalIndicators = this.calculateTechnicalIndicators(signal);
    
    // Calculate risk metrics
    const riskMetrics = this.calculateRiskMetrics(signal);
    
    const enhancedSignal: EnhancedSignal = {
      id: signal.id || this.generateId(),
      originalSignal: signal,
      mlEnhancement: mlEnhancedSignal.mlEnhancement,
      technicalIndicators,
      riskMetrics,
      timestamp: Date.now()
    };

    this.enhancedSignals.push(enhancedSignal);
    
    // Keep only last 1000 enhanced signals
    if (this.enhancedSignals.length > 1000) {
      this.enhancedSignals = this.enhancedSignals.slice(-1000);
    }

    return enhancedSignal;
  }

  private calculateTechnicalIndicators(signal: any): EnhancedSignal['technicalIndicators'] {
    const prices = this.historicalData.get(signal.ticker) || [];
    
    if (prices.length < 20) {
      return {
        momentum: 0,
        volumeProfile: 'NEUTRAL',
        supportResistance: 0.5,
        trendStrength: 0
      };
    }

    // Calculate momentum (20-day price change)
    const momentum = prices.length >= 20 ? 
      (prices[prices.length - 1] - prices[prices.length - 20]) / prices[prices.length - 20] : 0;

    // Calculate moving averages for trend
    const sma20 = stats.mean(prices.slice(-20));
    const sma50 = prices.length >= 50 ? stats.mean(prices.slice(-50)) : sma20;
    
    // Trend strength based on MA relationship
    const trendStrength = Math.abs(sma20 - sma50) / sma50;
    
    // Volume profile based on recent volume patterns
    const volumeProfile = this.classifyVolumeProfile(signal);
    
    // Support/resistance level (simplified)
    const currentPrice = prices[prices.length - 1];
    const recentHigh = Math.max(...prices.slice(-20));
    const recentLow = Math.min(...prices.slice(-20));
    const supportResistance = (currentPrice - recentLow) / (recentHigh - recentLow);

    return {
      momentum: Math.max(-1, Math.min(1, momentum * 10)), // normalize to -1 to 1
      volumeProfile,
      supportResistance: Math.max(0, Math.min(1, supportResistance)),
      trendStrength: Math.max(0, Math.min(1, trendStrength * 100))
    };
  }

  private classifyVolumeProfile(signal: any): string {
    const volume = signal.volume || 0;
    const avgVolume = signal.avgVolume || volume;
    
    const volumeRatio = volume / Math.max(avgVolume, 1);
    
    if (volumeRatio > 2) return 'HIGH';
    if (volumeRatio > 1.5) return 'ABOVE_AVERAGE';
    if (volumeRatio < 0.5) return 'LOW';
    return 'NORMAL';
  }

  private calculateRiskMetrics(signal: any): EnhancedSignal['riskMetrics'] {
    const prices = this.historicalData.get(signal.ticker) || [];
    
    if (prices.length < 30) {
      return {
        sharpeRatio: 0,
        maxDrawdown: 0.1,
        winRate: 0.5,
        profitFactor: 1.0
      };
    }

    // Calculate daily returns
    const returns = prices.slice(1).map((price, i) => 
      (price - prices[i]) / prices[i]
    );

    // Sharpe ratio (simplified, assuming risk-free rate = 0)
    const avgReturn = stats.mean(returns);
    const returnStd = stats.standardDeviation(returns);
    const sharpeRatio = returnStd > 0 ? (avgReturn * Math.sqrt(252)) / (returnStd * Math.sqrt(252)) : 0;

    // Maximum drawdown
    const cumulativeReturns = returns.reduce((acc, ret, i) => {
      acc.push((acc[i] || 1) * (1 + ret));
      return acc;
    }, [1]);
    
    let maxDrawdown = 0;
    let peak = cumulativeReturns[0];
    
    for (const value of cumulativeReturns) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    // Win rate (simplified estimation based on positive returns)
    const winRate = returns.filter(r => r > 0).length / returns.length;

    // Profit factor (simplified)
    const positiveReturns = returns.filter(r => r > 0);
    const negativeReturns = returns.filter(r => r < 0);
    const avgPositive = positiveReturns.length > 0 ? stats.mean(positiveReturns) : 0;
    const avgNegative = negativeReturns.length > 0 ? Math.abs(stats.mean(negativeReturns)) : 1;
    const profitFactor = avgNegative > 0 ? avgPositive / avgNegative : 1;

    return {
      sharpeRatio: Math.max(-3, Math.min(3, sharpeRatio)),
      maxDrawdown: Math.max(0, Math.min(1, maxDrawdown)),
      winRate: Math.max(0, Math.min(1, winRate)),
      profitFactor: Math.max(0, Math.min(5, profitFactor))
    };
  }

  private generateId(): string {
    return `enhanced_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async enhanceSignalBatch(signals: any[]): Promise<EnhancedSignal[]> {
    const enhanced = await Promise.all(
      signals.map(signal => this.enhanceSignal(signal))
    );
    
    return enhanced.sort((a, b) => b.mlEnhancement.enhancedScore - a.mlEnhancement.enhancedScore);
  }

  public getTopSignals(limit: number = 10): EnhancedSignal[] {
    return this.enhancedSignals
      .sort((a, b) => b.mlEnhancement.enhancedScore - a.mlEnhancement.enhancedScore)
      .slice(0, limit);
  }

  public getSignalsByPattern(patternType: string): EnhancedSignal[] {
    return this.enhancedSignals.filter(signal => 
      signal.mlEnhancement.patternType === patternType
    );
  }

  public getPerformanceMetrics(): any {
    if (this.enhancedSignals.length === 0) {
      return {
        totalSignals: 0,
        avgConfidence: 0,
        avgExpectedReturn: 0,
        avgRiskScore: 0,
        patternDistribution: {}
      };
    }

    const signals = this.enhancedSignals;
    const confidences = signals.map(s => s.mlEnhancement.confidence);
    const expectedReturns = signals.map(s => s.mlEnhancement.expectedReturn);
    const riskScores = signals.map(s => s.mlEnhancement.riskScore);

    // Pattern distribution
    const patternCounts: Record<string, number> = {};
    signals.forEach(signal => {
      const pattern = signal.mlEnhancement.patternType;
      patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    });

    return {
      totalSignals: signals.length,
      avgConfidence: stats.mean(confidences),
      avgExpectedReturn: stats.mean(expectedReturns),
      avgRiskScore: stats.mean(riskScores),
      patternDistribution: patternCounts,
      lastUpdated: Date.now()
    };
  }

  public async trainFromHistoricalData(): Promise<void> {
    console.log('Training ML models from historical signal data...');
    
    // Generate synthetic training data based on enhanced signals
    const trainingData = this.enhancedSignals.slice(-200).map(signal => {
      const outcome = this.simulateTradeOutcome(signal);
      
      return {
        features: {
          volumeToOIRatio: signal.originalSignal.volume / Math.max(signal.originalSignal.openInterest, 1),
          premiumSize: Math.log(signal.originalSignal.premium / 100000),
          askSidePercentage: signal.originalSignal.askSidePercentage / 100,
          timeDecay: Math.max(0, (signal.originalSignal.daysToExpiry || 30) / 365),
          moneyness: signal.technicalIndicators.supportResistance,
          volatilityRank: signal.originalSignal.impliedVolatility || 0.3,
          historicalSuccess: signal.riskMetrics.winRate
        },
        outcome
      };
    });

    if (trainingData.length >= 50) {
      await mlPatternRecognition.trainModel(trainingData);
    }
  }

  private simulateTradeOutcome(signal: EnhancedSignal): any {
    // Simulate trade outcome based on enhanced signal metrics
    const successProbability = signal.mlEnhancement.confidence * 0.7 + 
                              signal.riskMetrics.winRate * 0.3;
    
    const success = Math.random() < successProbability;
    const baseReturn = signal.mlEnhancement.expectedReturn;
    const volatility = signal.riskMetrics.maxDrawdown * 2;
    
    return {
      success,
      return: success ? 
        Math.abs(baseReturn) + (Math.random() * 0.5) : 
        -(Math.abs(baseReturn) * 0.5 + (Math.random() * 0.3)),
      maxDrawdown: Math.random() * signal.riskMetrics.maxDrawdown,
      daysToTarget: Math.max(1, Math.min(signal.mlEnhancement.timeHorizon, 
        signal.mlEnhancement.timeHorizon * (0.5 + Math.random())))
    };
  }
}

export const signalEnhancer = new SignalEnhancer();