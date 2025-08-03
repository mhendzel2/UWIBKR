import { storage } from '../storage';
import { RiskParameters, Position, TradingSignal } from '@shared/schema';

interface RiskAssessment {
  approved: boolean;
  reason: string;
  riskScore: number;
  warnings: string[];
}

interface PortfolioMetrics {
  totalExposure: number;
  maxDrawdown: number;
  dailyPnL: number;
  portfolioHeat: number;
  openPositions: number;
}

export class RiskManager {
  private isEmergencyStop = false;
  private isTradingPaused = false;
  private dailyLossLimit = 5000;
  private maxPositionSize = 15000;
  private maxDrawdownLimit = 0.05; // 5%
  private portfolioHeatLimit = 0.6; // 60%

  constructor() {
    console.log('Risk Manager initialized');
  }

  async assessTradeRisk(signal: TradingSignal, quantity: number): Promise<RiskAssessment> {
    const assessment: RiskAssessment = {
      approved: false,
      reason: '',
      riskScore: 0,
      warnings: [],
    };

    try {
      // Check emergency stop
      if (this.isEmergencyStop) {
        assessment.reason = 'Emergency stop activated - all trading halted';
        return assessment;
      }

      // Check trading pause
      if (this.isTradingPaused) {
        assessment.reason = 'Trading is currently paused';
        return assessment;
      }

      // Get current portfolio metrics
      const portfolioMetrics = await this.getPortfolioMetrics();
      
      // Calculate trade risk
      const tradeRisk = parseFloat(signal.maxRisk) * quantity;
      
      // Risk checks
      const checks = [
        this.checkPositionSize(tradeRisk),
        this.checkDailyLossLimit(portfolioMetrics.dailyPnL, tradeRisk),
        this.checkPortfolioHeat(portfolioMetrics.portfolioHeat, tradeRisk, portfolioMetrics.totalExposure),
        this.checkDrawdown(portfolioMetrics.maxDrawdown),
        this.checkParameterSanity(signal, quantity),
      ];

      // Evaluate all checks
      const failedChecks = checks.filter(check => !check.passed);
      
      if (failedChecks.length === 0) {
        assessment.approved = true;
        assessment.reason = 'Risk assessment passed';
        assessment.riskScore = this.calculateRiskScore(signal, quantity, portfolioMetrics);
      } else {
        assessment.approved = false;
        assessment.reason = failedChecks[0].reason;
        assessment.warnings = failedChecks.map(check => check.reason);
      }

      return assessment;
    } catch (error) {
      console.error('Risk assessment failed:', error);
      assessment.reason = 'Risk assessment system error';
      return assessment;
    }
  }

  private checkPositionSize(tradeRisk: number): { passed: boolean; reason: string } {
    if (tradeRisk > this.maxPositionSize) {
      return {
        passed: false,
        reason: `Trade risk $${tradeRisk.toFixed(2)} exceeds maximum position size $${this.maxPositionSize}`,
      };
    }
    return { passed: true, reason: '' };
  }

  private checkDailyLossLimit(currentDailyPnL: number, additionalRisk: number): { passed: boolean; reason: string } {
    const potentialLoss = Math.abs(Math.min(currentDailyPnL, 0)) + additionalRisk;
    
    if (potentialLoss > this.dailyLossLimit) {
      return {
        passed: false,
        reason: `Potential daily loss $${potentialLoss.toFixed(2)} exceeds limit $${this.dailyLossLimit}`,
      };
    }
    return { passed: true, reason: '' };
  }

  private checkPortfolioHeat(currentHeat: number, tradeRisk: number, totalExposure: number): { passed: boolean; reason: string } {
    const newHeat = (totalExposure + tradeRisk) / 125847.32; // Mock account equity
    
    if (newHeat > this.portfolioHeatLimit) {
      return {
        passed: false,
        reason: `Portfolio heat ${(newHeat * 100).toFixed(1)}% exceeds limit ${(this.portfolioHeatLimit * 100).toFixed(1)}%`,
      };
    }
    return { passed: true, reason: '' };
  }

  private checkDrawdown(currentDrawdown: number): { passed: boolean; reason: string } {
    if (Math.abs(currentDrawdown) > this.maxDrawdownLimit) {
      return {
        passed: false,
        reason: `Current drawdown ${(currentDrawdown * 100).toFixed(1)}% exceeds limit ${(this.maxDrawdownLimit * 100).toFixed(1)}%`,
      };
    }
    return { passed: true, reason: '' };
  }

  private checkParameterSanity(signal: TradingSignal, quantity: number): { passed: boolean; reason: string } {
    // Basic sanity checks
    if (quantity <= 0) {
      return { passed: false, reason: 'Quantity must be positive' };
    }

    if (quantity > 50) {
      return { passed: false, reason: 'Quantity exceeds maximum contracts per trade (50)' };
    }

    if (!signal.entryPrice || parseFloat(signal.entryPrice) <= 0) {
      return { passed: false, reason: 'Invalid entry price' };
    }

    if (!signal.maxRisk || parseFloat(signal.maxRisk) <= 0) {
      return { passed: false, reason: 'Invalid max risk' };
    }

    // Check expiration date
    const expiryDate = new Date(signal.expiry);
    const today = new Date();
    
    if (expiryDate <= today) {
      return { passed: false, reason: 'Expiration date must be in the future' };
    }

    return { passed: true, reason: '' };
  }

  private calculateRiskScore(signal: TradingSignal, quantity: number, metrics: PortfolioMetrics): number {
    // Risk score calculation (0-100, lower is better)
    let score = 0;
    
    const confidence = parseFloat(signal.confidence);
    const tradeRisk = parseFloat(signal.maxRisk) * quantity;
    
    // Confidence component (0-30 points)
    score += Math.max(0, 30 - (confidence * 0.3));
    
    // Position size component (0-25 points)
    score += (tradeRisk / this.maxPositionSize) * 25;
    
    // Portfolio heat component (0-25 points)
    score += metrics.portfolioHeat * 25;
    
    // Market condition component (0-20 points)
    score += Math.random() * 20; // Mock market volatility
    
    return Math.min(100, Math.max(0, score));
  }

  private async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    try {
      const positions = await storage.getAllPositions();
      
      let totalExposure = 0;
      let totalPnL = 0;
      let openPositions = 0;
      
      for (const position of positions) {
        if (position.status === 'open') {
          openPositions++;
          totalExposure += Math.abs(parseFloat(position.entryPrice) * position.quantity * 100);
          totalPnL += parseFloat(position.pnl ?? '0');
        }
      }
      
      return {
        totalExposure,
        maxDrawdown: -0.023, // Mock -2.3%
        dailyPnL: 2345.67, // Mock daily P&L
        portfolioHeat: totalExposure / 125847.32, // Mock account equity
        openPositions,
      };
    } catch (error) {
      console.error('Failed to calculate portfolio metrics:', error);
      return {
        totalExposure: 0,
        maxDrawdown: 0,
        dailyPnL: 0,
        portfolioHeat: 0,
        openPositions: 0,
      };
    }
  }

  activateEmergencyStop(): void {
    this.isEmergencyStop = true;
    console.warn('EMERGENCY STOP ACTIVATED - All trading halted');
  }

  deactivateEmergencyStop(): void {
    this.isEmergencyStop = false;
    console.log('Emergency stop deactivated');
  }

  pauseTrading(): void {
    this.isTradingPaused = true;
    console.log('Trading paused');
  }

  resumeTrading(): void {
    this.isTradingPaused = false;
    console.log('Trading resumed');
  }

  getRiskStatus() {
    return {
      emergencyStop: this.isEmergencyStop,
      tradingPaused: this.isTradingPaused,
      dailyLossLimit: this.dailyLossLimit,
      maxPositionSize: this.maxPositionSize,
      maxDrawdownLimit: this.maxDrawdownLimit,
      portfolioHeatLimit: this.portfolioHeatLimit,
    };
  }

  updateRiskParameters(params: Partial<RiskParameters>): void {
    if (params.maxDailyLoss) {
      this.dailyLossLimit = parseFloat(params.maxDailyLoss);
    }
    if (params.maxPositionSize) {
      this.maxPositionSize = parseFloat(params.maxPositionSize);
    }
    if (params.maxDrawdown) {
      this.maxDrawdownLimit = parseFloat(params.maxDrawdown);
    }
    if (params.portfolioHeatLimit) {
      this.portfolioHeatLimit = parseFloat(params.portfolioHeatLimit);
    }
    
    console.log('Risk parameters updated:', this.getRiskStatus());
  }
}
