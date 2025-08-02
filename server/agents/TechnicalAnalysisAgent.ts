import { BaseAgent, AgentDecision, MarketAnalysisData } from './BaseAgent';

export class TechnicalAnalysisAgent extends BaseAgent {
  constructor() {
    super('technical_analysis', 'Chart Patterns & Technical Indicators');
  }

  async analyze(data: MarketAnalysisData): Promise<AgentDecision | null> {
    try {
      const { symbol, marketData, signals } = data;

      // Analyze technical patterns from available data
      const technicalAnalysis = this.analyzeTechnicalPatterns(symbol, marketData, signals);
      
      if (technicalAnalysis.confidence < 0.3) {
        return null; // Not enough technical signal
      }

      const riskScore = this.calculateRiskScore(
        technicalAnalysis.volatility,
        technicalAnalysis.trendStrength,
        technicalAnalysis.supportResistance
      );

      return {
        symbol,
        action: technicalAnalysis.action,
        confidence: technicalAnalysis.confidence,
        reasoning: `Technical analysis shows ${technicalAnalysis.trend} trend with ${technicalAnalysis.pattern} pattern. RSI: ${technicalAnalysis.rsi}, Support/Resistance: ${technicalAnalysis.supportResistance.toFixed(2)}`,
        supportingData: {
          technicalIndicators: technicalAnalysis.indicators,
          pattern: technicalAnalysis.pattern,
          trendStrength: technicalAnalysis.trendStrength,
          keyLevels: technicalAnalysis.keyLevels
        },
        riskAssessment: {
          riskScore,
          positionSize: this.calculatePositionSize(technicalAnalysis.confidence, riskScore),
          maxLoss: Math.floor(technicalAnalysis.stopLossDistance * 1000),
          probabilityOfSuccess: technicalAnalysis.confidence * 0.75
        }
      };

    } catch (error) {
      console.error('Technical Analysis Agent analysis failed:', error);
      return null;
    }
  }

  private analyzeTechnicalPatterns(symbol: string, marketData: any, signals: any[]) {
    // Simulate technical analysis based on available signals and market context
    const signalCount = signals.length;
    const recentSignals = signals.slice(-5); // Last 5 signals
    
    // Analyze signal momentum and patterns
    let bullishSignals = 0;
    let bearishSignals = 0;
    let avgConfidence = 0;

    recentSignals.forEach(signal => {
      const confidence = parseFloat(signal.confidence) || 50;
      avgConfidence += confidence;
      
      if (signal.sentiment === 'bullish') bullishSignals++;
      if (signal.sentiment === 'bearish') bearishSignals++;
    });

    avgConfidence = avgConfidence / Math.max(1, recentSignals.length);

    // Determine trend based on signal momentum
    let trend = 'sideways';
    let trendStrength = 0.5;
    
    if (bullishSignals > bearishSignals * 1.5) {
      trend = 'uptrend';
      trendStrength = Math.min(0.9, 0.6 + (bullishSignals / recentSignals.length) * 0.3);
    } else if (bearishSignals > bullishSignals * 1.5) {
      trend = 'downtrend';
      trendStrength = Math.min(0.9, 0.6 + (bearishSignals / recentSignals.length) * 0.3);
    }

    // Identify patterns based on signal distribution
    const pattern = this.identifyPattern(recentSignals);
    
    // Calculate technical indicators
    const rsi = this.simulateRSI(signals);
    const macd = this.simulateMACD(signals);
    const supportResistance = this.calculateSupportResistance(signals);

    // Determine action based on technical confluence
    const action = this.determineActionFromTechnicals(
      trend, 
      pattern, 
      rsi, 
      macd, 
      trendStrength
    );

    const confidence = this.calculateConfidence([
      trendStrength,
      avgConfidence / 100,
      this.getPatternReliability(pattern),
      this.getRSISignalStrength(rsi),
      this.getMACDSignalStrength(macd)
    ]);

    return {
      trend,
      pattern,
      action,
      confidence,
      trendStrength,
      volatility: this.estimateVolatility(signals),
      supportResistance,
      stopLossDistance: supportResistance * 0.02, // 2% stop loss
      indicators: {
        rsi,
        macd,
        movingAverages: this.calculateMovingAverages(signals)
      },
      keyLevels: {
        support: supportResistance * 0.98,
        resistance: supportResistance * 1.02
      }
    };
  }

  private identifyPattern(signals: any[]): string {
    if (signals.length < 3) return 'insufficient_data';

    const confidences = signals.map(s => parseFloat(s.confidence) || 50);
    const recent3 = confidences.slice(-3);

    // Simple pattern recognition
    if (recent3[0] < recent3[1] && recent3[1] < recent3[2]) {
      return 'ascending_triangle';
    } else if (recent3[0] > recent3[1] && recent3[1] > recent3[2]) {
      return 'descending_triangle';
    } else if (recent3[1] > recent3[0] && recent3[1] > recent3[2]) {
      return 'double_top';
    } else if (recent3[1] < recent3[0] && recent3[1] < recent3[2]) {
      return 'double_bottom';
    }

    return 'consolidation';
  }

  private simulateRSI(signals: any[]): number {
    // Simulate RSI based on signal sentiment distribution
    if (signals.length === 0) return 50;

    const recent10 = signals.slice(-10);
    let bullishCount = 0;
    let bearishCount = 0;

    recent10.forEach(signal => {
      if (signal.sentiment === 'bullish') bullishCount++;
      if (signal.sentiment === 'bearish') bearishCount++;
    });

    const total = bullishCount + bearishCount;
    if (total === 0) return 50;

    // Convert to RSI-like scale (0-100)
    const bullishRatio = bullishCount / total;
    return Math.round(bullishRatio * 100);
  }

  private simulateMACD(signals: any[]): { signal: number; histogram: number; line: number } {
    // Simulate MACD based on signal momentum
    const recent12 = signals.slice(-12);
    const recent26 = signals.slice(-26);

    const ema12 = this.calculateEMA(recent12.map(s => parseFloat(s.confidence) || 50), 12);
    const ema26 = this.calculateEMA(recent26.map(s => parseFloat(s.confidence) || 50), 26);

    const macdLine = ema12 - ema26;
    const signalLine = macdLine * 0.9; // Simplified signal line
    const histogram = macdLine - signalLine;

    return {
      line: macdLine,
      signal: signalLine,
      histogram
    };
  }

  private calculateEMA(values: number[], period: number): number {
    if (values.length === 0) return 50;
    
    const multiplier = 2 / (period + 1);
    let ema = values[0];

    for (let i = 1; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateSupportResistance(signals: any[]): number {
    // Calculate support/resistance based on signal price levels
    const priceLevels = signals
      .map(s => parseFloat(s.entryPrice) || 0)
      .filter(price => price > 0);

    if (priceLevels.length === 0) return 100; // Default level

    // Use median as support/resistance approximation
    priceLevels.sort((a, b) => a - b);
    const mid = Math.floor(priceLevels.length / 2);
    
    return priceLevels.length % 2 !== 0 
      ? priceLevels[mid] 
      : (priceLevels[mid - 1] + priceLevels[mid]) / 2;
  }

  private calculateMovingAverages(signals: any[]): { sma20: number; sma50: number; ema20: number } {
    const confidences = signals.map(s => parseFloat(s.confidence) || 50);
    
    return {
      sma20: this.calculateSMA(confidences.slice(-20)),
      sma50: this.calculateSMA(confidences.slice(-50)),
      ema20: this.calculateEMA(confidences.slice(-20), 20)
    };
  }

  private calculateSMA(values: number[]): number {
    if (values.length === 0) return 50;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private determineActionFromTechnicals(
    trend: string,
    pattern: string,
    rsi: number,
    macd: any,
    trendStrength: number
  ): string {
    
    // Strong uptrend signals
    if (trend === 'uptrend' && trendStrength > 0.7) {
      if (rsi < 70 && macd.histogram > 0) {
        return 'BUY_CALLS';
      }
    }

    // Strong downtrend signals
    if (trend === 'downtrend' && trendStrength > 0.7) {
      if (rsi > 30 && macd.histogram < 0) {
        return 'BUY_PUTS';
      }
    }

    // Pattern-based signals
    if (pattern === 'ascending_triangle' && rsi < 60) {
      return 'BUY_CALLS';
    }
    
    if (pattern === 'descending_triangle' && rsi > 40) {
      return 'BUY_PUTS';
    }

    // Oversold/Overbought conditions
    if (rsi < 30 && macd.histogram > 0) {
      return 'BUY_CALLS'; // Oversold bounce
    }
    
    if (rsi > 70 && macd.histogram < 0) {
      return 'BUY_PUTS'; // Overbought correction
    }

    return 'HOLD';
  }

  private getPatternReliability(pattern: string): number {
    const reliabilityMap: { [key: string]: number } = {
      'ascending_triangle': 0.8,
      'descending_triangle': 0.8,
      'double_top': 0.7,
      'double_bottom': 0.7,
      'consolidation': 0.5,
      'insufficient_data': 0.2
    };

    return reliabilityMap[pattern] || 0.5;
  }

  private getRSISignalStrength(rsi: number): number {
    if (rsi < 20 || rsi > 80) return 0.9; // Very strong signal
    if (rsi < 30 || rsi > 70) return 0.7; // Strong signal
    if (rsi < 40 || rsi > 60) return 0.5; // Moderate signal
    return 0.3; // Weak signal
  }

  private getMACDSignalStrength(macd: any): number {
    const histogramStrength = Math.abs(macd.histogram) / 10; // Normalize
    return Math.min(0.9, Math.max(0.1, histogramStrength));
  }

  private estimateVolatility(signals: any[]): number {
    if (signals.length < 5) return 5;

    const confidences = signals.slice(-10).map(s => parseFloat(s.confidence) || 50);
    const variance = this.calculateVariance(confidences);
    
    // Convert variance to volatility score (1-10)
    return Math.min(10, Math.max(1, Math.sqrt(variance) / 5));
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDifferences = values.map(val => Math.pow(val - mean, 2));
    return squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length;
  }
}