// @ts-nocheck
import { storage } from '../storage';
import type { Trade } from '@shared/schema';

type TradeRecord = Trade & {
  exitPrice?: string | null;
  exitTime?: string | null;
  entryTime?: string;
  type?: string;
  strike?: number;
  sector?: string;
};

export interface PerformanceReport {
  overview: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    totalPnL: number;
    avgTradeReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    tradingDays: number;
  };
  monthlyPerformance: Array<{
    month: string;
    trades: number;
    pnl: number;
    winRate: number;
    avgReturn: number;
  }>;
  strategyPerformance: Array<{
    strategy: string;
    trades: number;
    winRate: number;
    avgReturn: number;
    totalPnL: number;
    sharpeRatio: number;
  }>;
  sectorAnalysis: Array<{
    sector: string;
    trades: number;
    winRate: number;
    avgReturn: number;
    totalPnL: number;
    allocation: number;
  }>;
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
    beta: number;
    alpha: number;
    correlation: number;
    volatility: number;
    informationRatio: number;
  };
  topPerformers: Array<{
    ticker: string;
    trades: number;
    totalReturn: number;
    winRate: number;
    avgReturn: number;
  }>;
  recentActivity: Array<{
    date: string;
    type: string;
    description: string;
    impact: number;
  }>;
}

export interface DetailedTradeReport {
  trade: any;
  performance: {
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    returnPct: number;
    holdingPeriod: number;
    maxGain: number;
    maxLoss: number;
  };
  riskAnalysis: {
    initialRisk: number;
    realizedRisk: number;
    riskAdjustedReturn: number;
    sharpeRatio: number;
  };
  marketContext: {
    marketCondition: string;
    volatilityRegime: string;
    sectorPerformance: number;
    marketBeta: number;
  };
}

export class ReportingEngine {
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
    if (returns.length === 0) return 0;
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    return stdDev === 0 ? 0 : (avgReturn - riskFreeRate / 252) / stdDev;
  }

  private calculateMaxDrawdown(equity: number[]): number {
    if (equity.length === 0) return 0;
    
    let maxDrawdown = 0;
    let peak = equity[0];
    
    for (const value of equity) {
      if (value > peak) peak = value;
      const drawdown = (peak - value) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
    
    return maxDrawdown;
  }

  async generatePerformanceReport(): Promise<PerformanceReport> {
    const trades = await storage.getTrades();
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exitPrice !== null);
    
    // Calculate overview metrics
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(t => (t.exitPrice! - t.entryPrice) > 0).length;
    const winRate = totalTrades > 0 ? winningTrades / totalTrades : 0;
    
    const returns = closedTrades.map(t => (t.exitPrice! - t.entryPrice) / t.entryPrice);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.exitPrice! - t.entryPrice) * t.quantity, 0);
    const avgTradeReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    
    const grossGains = closedTrades
      .filter(t => (t.exitPrice! - t.entryPrice) > 0)
      .reduce((sum, t) => sum + (t.exitPrice! - t.entryPrice) * t.quantity, 0);
    const grossLosses = Math.abs(closedTrades
      .filter(t => (t.exitPrice! - t.entryPrice) < 0)
      .reduce((sum, t) => sum + (t.exitPrice! - t.entryPrice) * t.quantity, 0));
    
    const profitFactor = grossLosses > 0 ? grossGains / grossLosses : grossGains > 0 ? grossGains : 0;
    
    // Calculate equity curve and drawdown
    let equity = 100000; // Starting equity
    const equityCurve = [equity];
    for (const trade of closedTrades) {
      equity += (trade.exitPrice! - trade.entryPrice) * trade.quantity;
      equityCurve.push(equity);
    }
    
    const maxDrawdown = this.calculateMaxDrawdown(equityCurve);
    const sharpeRatio = this.calculateSharpeRatio(returns);
    
    // Monthly performance
    const monthlyData = new Map<string, {trades: number, pnl: number, returns: number[]}>();
    closedTrades.forEach(trade => {
      const month = new Date(trade.entryTime).toISOString().substring(0, 7);
      if (!monthlyData.has(month)) {
        monthlyData.set(month, {trades: 0, pnl: 0, returns: []});
      }
      const data = monthlyData.get(month)!;
      data.trades++;
      data.pnl += (trade.exitPrice! - trade.entryPrice) * trade.quantity;
      data.returns.push((trade.exitPrice! - trade.entryPrice) / trade.entryPrice);
    });

    const monthlyPerformance = Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      trades: data.trades,
      pnl: data.pnl,
      winRate: data.returns.filter(r => r > 0).length / data.returns.length,
      avgReturn: data.returns.reduce((sum, r) => sum + r, 0) / data.returns.length
    }));

    // Strategy performance
    const strategyData = new Map<string, {trades: number, returns: number[], pnl: number}>();
    closedTrades.forEach(trade => {
      const strategy = trade.strategy || 'default';
      if (!strategyData.has(strategy)) {
        strategyData.set(strategy, {trades: 0, returns: [], pnl: 0});
      }
      const data = strategyData.get(strategy)!;
      data.trades++;
      data.returns.push((trade.exitPrice! - trade.entryPrice) / trade.entryPrice);
      data.pnl += (trade.exitPrice! - trade.entryPrice) * trade.quantity;
    });

    const strategyPerformance = Array.from(strategyData.entries()).map(([strategy, data]) => ({
      strategy,
      trades: data.trades,
      winRate: data.returns.filter(r => r > 0).length / data.returns.length,
      avgReturn: data.returns.reduce((sum, r) => sum + r, 0) / data.returns.length,
      totalPnL: data.pnl,
      sharpeRatio: this.calculateSharpeRatio(data.returns)
    }));

    // Sector analysis
    const sectorData = new Map<string, {trades: number, returns: number[], pnl: number}>();
    closedTrades.forEach(trade => {
      const sector = trade.sector || 'Unknown';
      if (!sectorData.has(sector)) {
        sectorData.set(sector, {trades: 0, returns: [], pnl: 0});
      }
      const data = sectorData.get(sector)!;
      data.trades++;
      data.returns.push((trade.exitPrice! - trade.entryPrice) / trade.entryPrice);
      data.pnl += (trade.exitPrice! - trade.entryPrice) * trade.quantity;
    });

    const totalSectorPnL = Array.from(sectorData.values()).reduce(
      (sum: number, data: { trades: number; returns: number[]; pnl: number }) => sum + Math.abs(data.pnl),
      0
    );
    const sectorAnalysis = Array.from(sectorData.entries()).map(([sector, data]) => ({
      sector,
      trades: data.trades,
      winRate: data.returns.filter(r => r > 0).length / data.returns.length,
      avgReturn: data.returns.reduce((sum: number, r: number) => sum + r, 0) / data.returns.length,
      totalPnL: data.pnl,
      allocation: totalSectorPnL > 0 ? Math.abs(data.pnl) / totalSectorPnL : 0
    }));

    // Risk metrics (simplified calculations)
    const riskMetrics = {
      valueAtRisk: this.calculateVaR(returns, 0.05),
      expectedShortfall: this.calculateExpectedShortfall(returns, 0.05),
      beta: this.calculateBeta(returns),
      alpha: avgTradeReturn * 252 - 0.1 * this.calculateBeta(returns), // Simplified alpha
      correlation: 0.7, // Placeholder - would need market data
        volatility:
          returns.length > 0
            ? Math.sqrt(
                returns.reduce((sum: number, r: number) => sum + r * r, 0) /
                  returns.length
              ) * Math.sqrt(252)
            : 0,
      informationRatio: sharpeRatio // Simplified
    };

    // Top performers
    const tickerData = new Map<string, { trades: number; returns: number[]; totalReturn: number }>();
    closedTrades.forEach((trade: TradeRecord) => {
      if (!tickerData.has(trade.ticker)) {
        tickerData.set(trade.ticker, {trades: 0, returns: [], totalReturn: 0});
      }
      const data = tickerData.get(trade.ticker)!;
      data.trades++;
      const tradeReturn = (trade.exitPrice! - trade.entryPrice) / trade.entryPrice;
        data.returns.push(tradeReturn);
        data.totalReturn += tradeReturn;
    });

    const topPerformers = Array.from(tickerData.entries())
        .map(([ticker, data]) => ({
          ticker,
          trades: data.trades,
          totalReturn: data.totalReturn,
          winRate: data.returns.filter(r => r > 0).length / data.returns.length,
          avgReturn:
            data.returns.reduce((sum: number, r: number) => sum + r, 0) /
            data.returns.length
        }))
      .sort((a, b) => b.totalReturn - a.totalReturn)
      .slice(0, 10);

    // Recent activity
    const recentActivity = closedTrades
      .slice(-20)
      .map((trade: TradeRecord) => {
        const entryPrice = parseFloat(trade.entryPrice);
        const exitPrice = parseFloat(trade.exitPrice ?? trade.entryPrice);
        return {
          date: new Date((trade.exitTime || trade.entryTime) ?? '').toISOString().split('T')[0],
          type: 'Trade Closed',
          description: `${(trade.tradeType || '').toUpperCase()} ${trade.ticker} $${trade.strike ?? ''}`,
          impact: (exitPrice - entryPrice) * trade.quantity
        };
      });

    return {
      overview: {
        totalTrades,
        winRate,
        profitFactor,
        totalPnL,
        avgTradeReturn,
        sharpeRatio,
        maxDrawdown,
        tradingDays: this.calculateTradingDays(closedTrades)
      },
      monthlyPerformance,
      strategyPerformance,
      sectorAnalysis,
      riskMetrics,
      topPerformers,
      recentActivity
    };
  }

  private calculateVaR(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    return sorted[index] || 0;
  }

  private calculateExpectedShortfall(returns: number[], confidence: number): number {
    if (returns.length === 0) return 0;
    const sorted = [...returns].sort((a, b) => a - b);
    const cutoff = Math.floor((1 - confidence) * sorted.length);
    const tailReturns = sorted.slice(0, cutoff);
    return tailReturns.length > 0 ? tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length : 0;
  }

  private calculateBeta(returns: number[]): number {
    // Simplified beta calculation - would need market benchmark data
    return returns.length > 0 ? 1.2 : 1.0; // Placeholder
  }

  private calculateTradingDays(trades: any[]): number {
    if (trades.length === 0) return 0;
    const dates = new Set(trades.map(t => new Date(t.entryTime).toDateString()));
    return dates.size;
  }

  async generateDetailedTradeReport(tradeId: string): Promise<DetailedTradeReport | null> {
    const trades = await storage.getAllTrades();
    const trade = trades.find((t: TradeRecord) => t.id === tradeId);
    
    if (!trade || !trade.exitPrice) return null;

    const entryPrice = parseFloat(trade.entryPrice);
    const exitPrice = parseFloat(trade.exitPrice ?? trade.entryPrice);
    const pnl = (exitPrice - entryPrice) * trade.quantity;
    const returnPct = (exitPrice - entryPrice) / entryPrice;

    const entryTime = new Date(trade.executionTime);
    const exitTime = new Date(trade.closeTime || Date.now());
    const holdingPeriod = Math.floor((exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60 * 24));

    return {
      trade,
      performance: {
        entryPrice,
        exitPrice,
        pnl,
        returnPct,
        holdingPeriod,
        maxGain: returnPct > 0 ? returnPct * 1.2 : returnPct, // Simplified
        maxLoss: returnPct < 0 ? returnPct * 1.1 : 0 // Simplified
      },
      riskAnalysis: {
        initialRisk: entryPrice * trade.quantity * 0.02, // 2% risk
        realizedRisk: Math.abs(pnl),
        riskAdjustedReturn: Math.abs(returnPct) > 0 ? returnPct / Math.abs(returnPct) : 0,
        sharpeRatio: this.calculateSharpeRatio([returnPct])
      },
      marketContext: {
        marketCondition: this.determineMarketCondition(returnPct),
        volatilityRegime: Math.abs(returnPct) > 0.1 ? 'High' : 'Normal',
        sectorPerformance: returnPct * 0.8, // Simplified
        marketBeta: 1.2 // Placeholder
      }
    };
  }

  private determineMarketCondition(returnPct: number): string {
    if (returnPct > 0.05) return 'Bull Market';
    if (returnPct < -0.05) return 'Bear Market';
    return 'Neutral Market';
  }

  async generateRiskReport(): Promise<any> {
    const trades = await storage.getAllTrades();
    const openTrades = trades.filter((t: TradeRecord) => t.status === 'open');
    const positions = await storage.getAllPositions();

    const totalExposure = openTrades.reduce(
      (sum: number, trade: TradeRecord) => sum + parseFloat(trade.entryPrice) * trade.quantity,
      0
    );
    const maxPositionSize = Math.max(
      ...openTrades.map((t: TradeRecord) => parseFloat(t.entryPrice) * t.quantity)
    );
    const concentrationRisk = maxPositionSize / totalExposure;
    
    const sectorExposure = new Map<string, number>();
    openTrades.forEach((trade: TradeRecord) => {
      const sector = trade.sector || 'Unknown';
      sectorExposure.set(
        sector,
        (sectorExposure.get(sector) || 0) + parseFloat(trade.entryPrice) * trade.quantity
      );
    });

    return {
      totalExposure,
      maxPositionSize,
      concentrationRisk,
      sectorExposure: Array.from(sectorExposure.entries()).map(([sector, exposure]) => ({
        sector,
        exposure,
        percentage: exposure / totalExposure
      })),
      riskLimits: {
        maxPortfolioRisk: 0.02,
        maxPositionSize: 0.05,
        maxSectorConcentration: 0.25
      },
      compliance: {
        portfolioRiskOk: concentrationRisk <= 0.05,
        positionSizeOk: maxPositionSize / 1000000 <= 0.05, // Assuming $1M portfolio
        sectorConcentrationOk: Math.max(...Array.from(sectorExposure.values())) / totalExposure <= 0.25
      }
    };
  }
}

export const reportingEngine = new ReportingEngine();