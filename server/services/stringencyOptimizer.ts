import { analyzeOptionsFlow } from './gemini';

interface StringencyMetrics {
  stringencyLevel: number;
  successRate: number;
  avgReturn: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWinDuration: number;
  avgLossDuration: number;
  tradesGenerated: number;
  timestamp: Date;
}

interface TradeOutcome {
  id: string;
  ticker: string;
  entryDate: Date;
  exitDate?: Date;
  entryPrice: number;
  exitPrice?: number;
  returnPercent?: number;
  stringencyUsed: number;
  success?: boolean;
  duration?: number;
}

class StringencyOptimizer {
  private performanceHistory: Map<number, StringencyMetrics[]> = new Map();
  private tradeOutcomes: TradeOutcome[] = [];

  constructor() {
    // Initialize with baseline metrics for each stringency level
    for (let level = 1; level <= 10; level++) {
      this.performanceHistory.set(level, [{
        stringencyLevel: level,
        successRate: 50 + (level * 3),
        avgReturn: 0.1 + (level * 0.02),
        profitFactor: 1.0 + (level * 0.1),
        sharpeRatio: 0.5 + (level * 0.05),
        maxDrawdown: 0.2 - (level * 0.01),
        winRate: 45 + (level * 2),
        avgWinDuration: 14 - level,
        avgLossDuration: 7 + level,
        tradesGenerated: 100 - (level * 8),
        timestamp: new Date()
      }]);
    }
  }

  async recordTradeOutcome(trade: TradeOutcome): Promise<void> {
    this.tradeOutcomes.push(trade);
    if (trade.exitDate && trade.exitPrice) {
      await this.updateMetrics(trade.stringencyUsed);
    }
  }

  private async updateMetrics(stringencyLevel: number): Promise<void> {
    const recentTrades = this.getTradesForStringency(stringencyLevel, 30);
    if (recentTrades.length < 10) return;
    const successfulTrades = recentTrades.filter(t => t.success);
    const returns = recentTrades.map(t => t.returnPercent || 0);
    const metrics: StringencyMetrics = {
      stringencyLevel,
      successRate: (successfulTrades.length / recentTrades.length) * 100,
      avgReturn: returns.reduce((a, b) => a + b, 0) / returns.length,
      profitFactor: this.calculateProfitFactor(returns),
      sharpeRatio: this.calculateSharpeRatio(returns),
      maxDrawdown: this.calculateMaxDrawdown(returns),
      winRate: (successfulTrades.length / recentTrades.length) * 100,
      avgWinDuration: this.calculateAvgDuration(successfulTrades),
      avgLossDuration: this.calculateAvgDuration(recentTrades.filter(t => !t.success)),
      tradesGenerated: recentTrades.length,
      timestamp: new Date()
    };
    const history = this.performanceHistory.get(stringencyLevel) || [];
    history.push(metrics);
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    this.performanceHistory.set(stringencyLevel, history);
  }

  private getTradesForStringency(stringencyLevel: number, days: number): TradeOutcome[] {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.tradeOutcomes.filter(t =>
      t.stringencyUsed === stringencyLevel &&
      t.entryDate >= cutoffDate &&
      t.exitDate
    );
  }

  private calculateProfitFactor(returns: number[]): number {
    const gains = returns.filter(r => r > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(returns.filter(r => r < 0).reduce((a, b) => a + b, 0));
    return losses === 0 ? gains : gains / losses;
  }

  private calculateSharpeRatio(returns: number[]): number {
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : avgReturn / stdDev;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let maxDrawdown = 0;
    let peak = 0;
    let runningReturn = 0;
    for (const ret of returns) {
      runningReturn += ret;
      if (runningReturn > peak) {
        peak = runningReturn;
      }
      const drawdown = (peak - runningReturn) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    return maxDrawdown;
  }

  private calculateAvgDuration(trades: TradeOutcome[]): number {
    const durations = trades
      .filter(t => t.duration)
      .map(t => t.duration!);
    return durations.length > 0 ?
      durations.reduce((a, b) => a + b, 0) / durations.length : 0;
  }

  async getOptimalStringency(type: 'leap' | 'screener'): Promise<number> {
    try {
      // Placeholder: implement AI logic as needed
      return 5;
    } catch (error) {
      console.error('Error calculating optimal stringency:', error);
      return 5;
    }
  }

  getMetricsForStringency(stringencyLevel: number): StringencyMetrics | null {
    const history = this.performanceHistory.get(stringencyLevel);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  getAllMetrics(): Map<number, StringencyMetrics> {
    const result = new Map<number, StringencyMetrics>();
    for (let level = 1; level <= 10; level++) {
      const metrics = this.getMetricsForStringency(level);
      if (metrics) {
        result.set(level, metrics);
      }
    }
    return result;
  }

  async getStringencyRecommendation(
    currentStringency: number,
    recentPerformance: { successRate: number; avgReturn: number },
    type: 'leap' | 'screener'
  ): Promise<{ recommendedStringency: number; reasoning: string; confidence: number }> {
    try {
      // Placeholder: implement AI logic as needed
      return {
        recommendedStringency: currentStringency,
        reasoning: 'Gemini-based recommendation not yet implemented',
        confidence: 50
      };
    } catch (error) {
      return {
        recommendedStringency: currentStringency,
        reasoning: 'Gemini-based recommendation not yet implemented',
        confidence: 50
      };
    }
  }
}

export const stringencyOptimizer = new StringencyOptimizer();