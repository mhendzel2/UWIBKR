import { createCompletion } from '../geminiService';
import { storeTrade } from '../mlStore';

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
  type: 'leap' | 'screener';
}

export class StringencyOptimizer {
  private performanceHistory: Map<number, StringencyMetrics[]> = new Map();
  private tradeOutcomes: TradeOutcome[] = [];

  constructor() {
    this.loadHistoricalData();
  }

  private loadHistoricalData(): void {
    // Initialize with baseline metrics for each stringency level
    for (let level = 1; level <= 10; level++) {
      this.performanceHistory.set(level, [{
        stringencyLevel: level,
        successRate: 50 + (level * 3), // Higher stringency = higher base success rate
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
    storeTrade(trade);
    
    if (trade.exitDate && trade.exitPrice) {
      // Calculate performance metrics
      await this.updateMetrics(trade.stringencyUsed);
    }
  }

  private async updateMetrics(stringencyLevel: number): Promise<void> {
    const recentTrades = this.getTradesForStringency(stringencyLevel, 30); // Last 30 days
    
    if (recentTrades.length < 10) return; // Need minimum trades for reliable metrics

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
    
    // Keep only last 50 records per stringency level
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
      // Get recent performance data for all stringency levels
      const allMetrics: StringencyMetrics[] = [];
      
      for (let level = 1; level <= 10; level++) {
        const history = this.performanceHistory.get(level) || [];
        if (history.length > 0) {
          allMetrics.push(history[history.length - 1]); // Most recent metrics
        }
      }

      if (allMetrics.length === 0) {
        return 5; // Default fallback
      }

      // Use AI to analyze optimal stringency based on multiple factors
      const prompt = `Analyze the following stringency performance metrics to recommend the optimal stringency level for ${type} trades:

${allMetrics.map(m => `
Stringency ${m.stringencyLevel}:
- Success Rate: ${m.successRate.toFixed(1)}%
- Average Return: ${(m.avgReturn * 100).toFixed(1)}%
- Profit Factor: ${m.profitFactor.toFixed(2)}
- Sharpe Ratio: ${m.sharpeRatio.toFixed(2)}
- Max Drawdown: ${(m.maxDrawdown * 100).toFixed(1)}%
- Win Rate: ${m.winRate.toFixed(1)}%
- Trades Generated: ${m.tradesGenerated}
`).join('\n')}

Consider:
1. Risk-adjusted returns (Sharpe ratio)
2. Consistency (success rate and win rate)
3. Trade frequency (balance between quality and quantity)
4. Maximum drawdown protection
5. Recent performance trends

Respond with JSON: {"recommendedStringency": number, "reasoning": "explanation", "confidence": number}`;

      const responseText = await createCompletion(prompt);
      const analysis = JSON.parse(responseText || '{}');
      
      return Math.max(1, Math.min(10, analysis.recommendedStringency || 5));
    } catch (error) {
      console.error('Error calculating optimal stringency:', error);
      return 5; // Safe default
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
      const allMetrics = this.getAllMetrics();
      const currentMetrics = this.getMetricsForStringency(currentStringency);
      
      const prompt = `Current stringency level ${currentStringency} for ${type} trading shows:
- Recent Success Rate: ${recentPerformance.successRate.toFixed(1)}%
- Recent Average Return: ${(recentPerformance.avgReturn * 100).toFixed(1)}%

Historical performance across all stringency levels:
${Array.from(allMetrics.entries()).map(([level, metrics]) => `
Level ${level}: Success Rate ${metrics.successRate.toFixed(1)}%, Avg Return ${(metrics.avgReturn * 100).toFixed(1)}%, Sharpe ${metrics.sharpeRatio.toFixed(2)}
`).join('')}

Based on recent performance vs historical data, should we:
1. Increase stringency (if performance is poor, reduce noise)
2. Decrease stringency (if too restrictive, missing opportunities)
3. Maintain current level (if performing well)

Respond with JSON: {"recommendedStringency": number, "reasoning": "detailed explanation", "confidence": number}`;

      const responseText = await createCompletion(prompt);
      return JSON.parse(responseText || '{}');
    } catch (error) {
      return {
        recommendedStringency: currentStringency,
        reasoning: 'Unable to analyze performance data',
        confidence: 50
      };
    }
  }

  enableTrainingMode(): void {
    console.log('🎯 Training mode enabled: Collecting performance data for stringency optimization');
  }

  getTrainingModeStatus(): { active: boolean; tradesCollected: number; recommendationsGenerated: number } {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentTrades = this.tradeOutcomes.filter(t => t.entryDate >= last30Days);
    
    return {
      active: true,
      tradesCollected: recentTrades.length,
      recommendationsGenerated: this.performanceHistory.size
    };
  }
}

export const stringencyOptimizer = new StringencyOptimizer();