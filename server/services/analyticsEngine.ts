import { storage } from '../storage';
import { Trade, TradeAssessment, PerformanceMetrics } from '@shared/schema';

export interface AnalyticsReport {
  overview: PerformanceOverview;
  winRateAnalysis: WinRateAnalysis;
  profitFactorAnalysis: ProfitFactorAnalysis;
  drawdownAnalysis: DrawdownAnalysis;
  strategyPerformance: StrategyPerformance[];
  monthlyPerformance: MonthlyPerformance[];
  riskMetrics: RiskMetrics;
  tradingStatistics: TradingStatistics;
}

export interface PerformanceOverview {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  totalReturn: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryFactor: number;
}

export interface WinRateAnalysis {
  overall: number;
  byStrategy: { strategy: string; winRate: number; trades: number }[];
  byMonth: { month: string; winRate: number; trades: number }[];
  byDayOfWeek: { day: string; winRate: number; trades: number }[];
  trend: { period: string; winRate: number }[];
}

export interface ProfitFactorAnalysis {
  overall: number;
  byStrategy: { strategy: string; profitFactor: number; grossProfit: number; grossLoss: number }[];
  byTimeframe: { timeframe: string; profitFactor: number }[];
  trend: { period: string; profitFactor: number }[];
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownDuration: number;
  currentDrawdown: number;
  averageDrawdown: number;
  drawdownPeriods: { start: string; end: string; maxDrawdown: number; duration: number }[];
  recoveryTimes: number[];
}

export interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  averageHoldTime: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
}

export interface MonthlyPerformance {
  month: string;
  trades: number;
  pnl: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  return: number;
}

export interface RiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
  calmarRatio: number;
  sortinoRatio: number;
}

export interface TradingStatistics {
  averageHoldTime: number;
  averageTradesPerMonth: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  largestConsecutiveWinStreak: number;
  largestConsecutiveLossStreak: number;
  profitableMonths: number;
  unprofitableMonths: number;
  bestMonth: { month: string; pnl: number };
  worstMonth: { month: string; pnl: number };
}

export class AnalyticsEngine {
  constructor() {}

  async generateComprehensiveReport(): Promise<AnalyticsReport> {
    const trades = await storage.getAllTrades();
    const assessments = await this.getAllAssessments();
    
    if (trades.length === 0) {
      return this.getEmptyReport();
    }

    const overview = await this.calculatePerformanceOverview(trades);
    const winRateAnalysis = await this.calculateWinRateAnalysis(trades);
    const profitFactorAnalysis = await this.calculateProfitFactorAnalysis(trades);
    const drawdownAnalysis = await this.calculateDrawdownAnalysis(trades);
    const strategyPerformance = await this.calculateStrategyPerformance(trades);
    const monthlyPerformance = await this.calculateMonthlyPerformance(trades);
    const riskMetrics = await this.calculateRiskMetrics(trades);
    const tradingStatistics = await this.calculateTradingStatistics(trades);

    return {
      overview,
      winRateAnalysis,
      profitFactorAnalysis,
      drawdownAnalysis,
      strategyPerformance,
      monthlyPerformance,
      riskMetrics,
      tradingStatistics
    };
  }

  private async getAllAssessments(): Promise<TradeAssessment[]> {
    // This would get all assessments, for now return empty array
    return [];
  }

  private async calculatePerformanceOverview(trades: Trade[]): Promise<PerformanceOverview> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    
    if (closedTrades.length === 0) {
      return {
        totalTrades: trades.length,
        winningTrades: 0,
        losingTrades: 0,
        totalPnl: 0,
        totalReturn: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        recoveryFactor: 0
      };
    }

    const pnls = closedTrades.map(t => parseFloat(t.realizedPnl || '0'));
    const winningTrades = pnls.filter(p => p > 0);
    const losingTrades = pnls.filter(p => p < 0);
    
    const totalPnl = pnls.reduce((sum, pnl) => sum + pnl, 0);
    const totalInvested = closedTrades.reduce((sum, t) => sum + (parseFloat(t.entryPrice) * t.quantity), 0);
    
    const grossProfit = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));
    
    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnl: totalPnl,
      totalReturn: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
      averageWin: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades) : 0,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
      sharpeRatio: this.calculateSharpeRatio(pnls),
      maxDrawdown: this.calculateMaxDrawdown(pnls),
      recoveryFactor: 0 // Will implement based on drawdown
    };
  }

  private async calculateWinRateAnalysis(trades: Trade[]): Promise<WinRateAnalysis> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    
    // Overall win rate
    const overall = closedTrades.length > 0 ? 
      (closedTrades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length / closedTrades.length) * 100 : 0;

    // By strategy
    const strategyGroups = this.groupBy(closedTrades, 'strategy');
    const byStrategy = Object.entries(strategyGroups).map(([strategy, trades]) => {
      const wins = trades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length;
      return {
        strategy,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        trades: trades.length
      };
    });

    // By month
    const monthGroups = this.groupBy(closedTrades, trade => 
      new Date(trade.executionTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    );
    const byMonth = Object.entries(monthGroups).map(([month, trades]) => {
      const wins = trades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length;
      return {
        month,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        trades: trades.length
      };
    });

    // By day of week
    const dayGroups = this.groupBy(closedTrades, trade => 
      new Date(trade.executionTime).toLocaleDateString('en-US', { weekday: 'long' })
    );
    const byDayOfWeek = Object.entries(dayGroups).map(([day, trades]) => {
      const wins = trades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length;
      return {
        day,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        trades: trades.length
      };
    });

    return {
      overall,
      byStrategy,
      byMonth,
      byDayOfWeek,
      trend: [] // Will implement rolling win rate trend
    };
  }

  private async calculateProfitFactorAnalysis(trades: Trade[]): Promise<ProfitFactorAnalysis> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    
    const grossProfit = closedTrades
      .filter(t => parseFloat(t.realizedPnl || '0') > 0)
      .reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0);
    
    const grossLoss = Math.abs(closedTrades
      .filter(t => parseFloat(t.realizedPnl || '0') < 0)
      .reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0));

    const overall = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0;

    // By strategy
    const strategyGroups = this.groupBy(closedTrades, 'strategy');
    const byStrategy = Object.entries(strategyGroups).map(([strategy, trades]) => {
      const profit = trades
        .filter(t => parseFloat(t.realizedPnl || '0') > 0)
        .reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0);
      
      const loss = Math.abs(trades
        .filter(t => parseFloat(t.realizedPnl || '0') < 0)
        .reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0));

      return {
        strategy,
        profitFactor: loss > 0 ? profit / loss : profit > 0 ? 999 : 0,
        grossProfit: profit,
        grossLoss: loss
      };
    });

    return {
      overall,
      byStrategy,
      byTimeframe: [], // Will implement
      trend: [] // Will implement
    };
  }

  private async calculateDrawdownAnalysis(trades: Trade[]): Promise<DrawdownAnalysis> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    const pnls = closedTrades.map(t => parseFloat(t.realizedPnl || '0'));
    
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    
    for (const pnl of pnls) {
      runningTotal += pnl;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    currentDrawdown = peak - runningTotal;

    return {
      maxDrawdown,
      maxDrawdownDuration: 0, // Will implement
      currentDrawdown,
      averageDrawdown: 0, // Will implement
      drawdownPeriods: [], // Will implement
      recoveryTimes: [] // Will implement
    };
  }

  private async calculateStrategyPerformance(trades: Trade[]): Promise<StrategyPerformance[]> {
    const strategyGroups = this.groupBy(trades, 'strategy');
    
    return Object.entries(strategyGroups).map(([strategy, strategyTrades]) => {
      const closedTrades = strategyTrades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
      const pnls = closedTrades.map(t => parseFloat(t.realizedPnl || '0'));
      
      const winningTrades = pnls.filter(p => p > 0);
      const losingTrades = pnls.filter(p => p < 0);
      const grossProfit = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));
      
      return {
        strategy,
        totalTrades: strategyTrades.length,
        winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
        totalPnl: pnls.reduce((sum, pnl) => sum + pnl, 0),
        averageHoldTime: this.calculateAverageHoldTime(closedTrades),
        sharpeRatio: this.calculateSharpeRatio(pnls),
        maxDrawdown: this.calculateMaxDrawdown(pnls),
        bestTrade: pnls.length > 0 ? Math.max(...pnls) : 0,
        worstTrade: pnls.length > 0 ? Math.min(...pnls) : 0
      };
    });
  }

  private async calculateMonthlyPerformance(trades: Trade[]): Promise<MonthlyPerformance[]> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    const monthGroups = this.groupBy(closedTrades, trade => 
      new Date(trade.executionTime).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    );

    return Object.entries(monthGroups).map(([month, monthTrades]) => {
      const pnls = monthTrades.map(t => parseFloat(t.realizedPnl || '0'));
      const winningTrades = pnls.filter(p => p > 0);
      const losingTrades = pnls.filter(p => p < 0);
      const grossProfit = winningTrades.reduce((sum, pnl) => sum + pnl, 0);
      const grossLoss = Math.abs(losingTrades.reduce((sum, pnl) => sum + pnl, 0));
      
      return {
        month,
        trades: monthTrades.length,
        pnl: pnls.reduce((sum, pnl) => sum + pnl, 0),
        winRate: monthTrades.length > 0 ? (winningTrades.length / monthTrades.length) * 100 : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0,
        maxDrawdown: this.calculateMaxDrawdown(pnls),
        return: 0 // Will calculate based on account equity
      };
    });
  }

  private async calculateRiskMetrics(trades: Trade[]): Promise<RiskMetrics> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    const pnls = closedTrades.map(t => parseFloat(t.realizedPnl || '0'));
    
    return {
      valueAtRisk: this.calculateVaR(pnls),
      expectedShortfall: this.calculateES(pnls),
      beta: 0, // Requires market data
      alpha: 0, // Requires market data
      informationRatio: 0, // Requires benchmark
      treynorRatio: 0, // Requires beta
      calmarRatio: this.calculateCalmarRatio(pnls),
      sortinoRatio: this.calculateSortinoRatio(pnls)
    };
  }

  private async calculateTradingStatistics(trades: Trade[]): Promise<TradingStatistics> {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.realizedPnl !== null);
    
    return {
      averageHoldTime: this.calculateAverageHoldTime(closedTrades),
      averageTradesPerMonth: this.calculateTradesPerMonth(closedTrades),
      consecutiveWins: 0, // Will implement
      consecutiveLosses: 0, // Will implement
      largestConsecutiveWinStreak: 0, // Will implement
      largestConsecutiveLossStreak: 0, // Will implement
      profitableMonths: 0, // Will implement
      unprofitableMonths: 0, // Will implement
      bestMonth: { month: '', pnl: 0 }, // Will implement
      worstMonth: { month: '', pnl: 0 } // Will implement
    };
  }

  // Utility methods
  private groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    
    return stdDev > 0 ? mean / stdDev : 0;
  }

  private calculateMaxDrawdown(returns: number[]): number {
    let runningTotal = 0;
    let peak = 0;
    let maxDrawdown = 0;
    
    for (const ret of returns) {
      runningTotal += ret;
      if (runningTotal > peak) {
        peak = runningTotal;
      }
      
      const drawdown = (peak - runningTotal) / Math.max(peak, 1);
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
    
    return maxDrawdown * 100;
  }

  private calculateVaR(returns: number[], confidence: number = 0.05): number {
    if (returns.length === 0) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor(returns.length * confidence);
    return sorted[index] || 0;
  }

  private calculateES(returns: number[], confidence: number = 0.05): number {
    if (returns.length === 0) return 0;
    
    const sorted = [...returns].sort((a, b) => a - b);
    const cutoff = Math.floor(returns.length * confidence);
    const tailReturns = sorted.slice(0, cutoff);
    
    return tailReturns.length > 0 ? 
      tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  private calculateCalmarRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const annualReturn = returns.reduce((sum, r) => sum + r, 0) * 252 / returns.length;
    const maxDD = this.calculateMaxDrawdown(returns);
    
    return maxDD > 0 ? annualReturn / (maxDD / 100) : 0;
  }

  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const downside = returns.filter(r => r < 0);
    
    if (downside.length === 0) return mean > 0 ? 999 : 0;
    
    const downsideVariance = downside.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downside.length;
    const downsideStdDev = Math.sqrt(downsideVariance);
    
    return downsideStdDev > 0 ? mean / downsideStdDev : 0;
  }

  private calculateAverageHoldTime(trades: Trade[]): number {
    const tradesWithCloseTime = trades.filter(t => t.closeTime && t.executionTime);
    
    if (tradesWithCloseTime.length === 0) return 0;
    
    const totalHours = tradesWithCloseTime.reduce((sum, trade) => {
      const start = new Date(trade.executionTime).getTime();
      const end = new Date(trade.closeTime!).getTime();
      return sum + (end - start) / (1000 * 60 * 60); // Convert to hours
    }, 0);
    
    return totalHours / tradesWithCloseTime.length;
  }

  private calculateTradesPerMonth(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    
    const months = new Set(trades.map(t => 
      new Date(t.executionTime).toLocaleDateString('en-US', { year: 'numeric', month: 'numeric' })
    ));
    
    return trades.length / months.size;
  }

  private getEmptyReport(): AnalyticsReport {
    return {
      overview: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        totalPnl: 0,
        totalReturn: 0,
        averageWin: 0,
        averageLoss: 0,
        largestWin: 0,
        largestLoss: 0,
        winRate: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        recoveryFactor: 0
      },
      winRateAnalysis: {
        overall: 0,
        byStrategy: [],
        byMonth: [],
        byDayOfWeek: [],
        trend: []
      },
      profitFactorAnalysis: {
        overall: 0,
        byStrategy: [],
        byTimeframe: [],
        trend: []
      },
      drawdownAnalysis: {
        maxDrawdown: 0,
        maxDrawdownDuration: 0,
        currentDrawdown: 0,
        averageDrawdown: 0,
        drawdownPeriods: [],
        recoveryTimes: []
      },
      strategyPerformance: [],
      monthlyPerformance: [],
      riskMetrics: {
        valueAtRisk: 0,
        expectedShortfall: 0,
        beta: 0,
        alpha: 0,
        informationRatio: 0,
        treynorRatio: 0,
        calmarRatio: 0,
        sortinoRatio: 0
      },
      tradingStatistics: {
        averageHoldTime: 0,
        averageTradesPerMonth: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
        largestConsecutiveWinStreak: 0,
        largestConsecutiveLossStreak: 0,
        profitableMonths: 0,
        unprofitableMonths: 0,
        bestMonth: { month: '', pnl: 0 },
        worstMonth: { month: '', pnl: 0 }
      }
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();