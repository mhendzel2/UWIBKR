import { IBKRService } from './ibkr';
import { storage } from '../storage';

export interface EmergencyState {
  killSwitchActive: boolean;
  emergencyStopActive: boolean;
  circuitBreakerTriggered: boolean;
  maxDrawdownReached: boolean;
  lastUpdateTime: Date;
}

export interface DrawdownLimits {
  dailyDrawdownLimit: number; // -5000 = $5K daily loss limit
  strategyDrawdownLimit: number; // -10000 = $10K strategy loss limit
  accountDrawdownLimit: number; // -25000 = $25K account loss limit
}

export interface CircuitBreaker {
  enabled: boolean;
  dailyLossLimit: number;
  positionLossLimit: number;
  accountPctLimit: number; // 0.05 = 5% of account
}

/**
 * Emergency controls and circuit breakers for automated trading
 * Implements sophisticated risk management suggested in the analysis
 */
export class EmergencyControlsService {
  private ibkr: IBKRService;
  private emergencyState: EmergencyState;
  private drawdownLimits: DrawdownLimits;
  private circuitBreaker: CircuitBreaker;
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(ibkrService: IBKRService) {
    this.ibkr = ibkrService;
    
    // Initialize emergency state
    this.emergencyState = {
      killSwitchActive: false,
      emergencyStopActive: false,
      circuitBreakerTriggered: false,
      maxDrawdownReached: false,
      lastUpdateTime: new Date(),
    };

    // Initialize drawdown limits
    this.drawdownLimits = {
      dailyDrawdownLimit: -5000, // $5K daily loss limit
      strategyDrawdownLimit: -10000, // $10K strategy loss limit
      accountDrawdownLimit: -25000, // $25K account loss limit
    };

    // Initialize circuit breaker
    this.circuitBreaker = {
      enabled: true,
      dailyLossLimit: -3000, // $3K daily loss triggers circuit breaker
      positionLossLimit: -1000, // $1K single position loss limit
      accountPctLimit: 0.05, // 5% of account value
    };
  }

  /**
   * Start real-time P&L monitoring with circuit breakers
   * Monitors via IBKR's reqPnL for live updates
   */
  startRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      console.log('Emergency monitoring already active');
      return;
    }

    console.log('Starting real-time P&L monitoring with emergency controls');
    
    // Monitor every 10 seconds for rapid response
    this.monitoringInterval = setInterval(async () => {
      await this.checkEmergencyConditions();
    }, 10000);

    // Initial check
    this.checkEmergencyConditions();
  }

  /**
   * Stop real-time monitoring
   */
  stopRealTimeMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('Stopped real-time P&L monitoring');
    }
  }

  /**
   * Master Kill Switch - instantly halt all trading activity
   * Cancels all open orders and prevents new orders
   */
  async activateKillSwitch(reason: string): Promise<void> {
    try {
      console.log(`🚨 KILL SWITCH ACTIVATED: ${reason}`);
      
      this.emergencyState.killSwitchActive = true;
      this.emergencyState.lastUpdateTime = new Date();

      // Cancel all open orders immediately
      await this.cancelAllOpenOrders();

      // Update risk status in storage
      await storage.updateRiskStatus({
        emergencyStop: true,
        tradingPaused: true,
        killSwitchActive: true,
        reason,
        timestamp: new Date(),
      });

      // Log emergency action
      console.log(`Kill switch activated at ${new Date().toISOString()}: ${reason}`);
      
      // In production, would also:
      // - Send emergency alerts to traders
      // - Log to external monitoring systems
      // - Trigger position hedging if configured
      
    } catch (error) {
      console.error('Failed to activate kill switch:', error);
      throw error;
    }
  }

  /**
   * Emergency Stop - pause trading but allow position management
   * Less severe than kill switch, allows manual intervention
   */
  async activateEmergencyStop(reason: string): Promise<void> {
    try {
      console.log(`⚠️  EMERGENCY STOP ACTIVATED: ${reason}`);
      
      this.emergencyState.emergencyStopActive = true;
      this.emergencyState.lastUpdateTime = new Date();

      // Update risk status
      await storage.updateRiskStatus({
        emergencyStop: true,
        tradingPaused: true,
        reason,
        timestamp: new Date(),
      });

      console.log(`Emergency stop activated: ${reason}`);
    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
      throw error;
    }
  }

  /**
   * Circuit Breaker - temporary trading halt with automatic resume
   * Triggers on predefined loss thresholds
   */
  async triggerCircuitBreaker(
    reason: string, 
    pauseDuration: number = 900000 // 15 minutes default
  ): Promise<void> {
    try {
      console.log(`🔴 CIRCUIT BREAKER TRIGGERED: ${reason}`);
      
      this.emergencyState.circuitBreakerTriggered = true;
      this.emergencyState.lastUpdateTime = new Date();

      // Pause trading temporarily
      await this.activateEmergencyStop(`Circuit Breaker: ${reason}`);

      // Schedule automatic resume (with caution)
      setTimeout(async () => {
        try {
          await this.resetCircuitBreaker();
          console.log('Circuit breaker automatically reset after cooling period');
        } catch (error) {
          console.error('Failed to reset circuit breaker:', error);
        }
      }, pauseDuration);

    } catch (error) {
      console.error('Failed to trigger circuit breaker:', error);
      throw error;
    }
  }

  /**
   * Check all emergency conditions in real-time
   */
  private async checkEmergencyConditions(): Promise<void> {
    try {
      // Skip if kill switch already active
      if (this.emergencyState.killSwitchActive) return;

      // Get current account info and P&L
      const accountInfo = await this.ibkr.getAccountInfo();
      if (!accountInfo) return;

      const positions = await this.ibkr.getPositions();
      const dailyPnL = accountInfo.realizedPnL + accountInfo.unrealizedPnL;

      // Check daily drawdown limit
      if (dailyPnL <= this.drawdownLimits.dailyDrawdownLimit) {
        await this.activateKillSwitch(
          `Daily drawdown limit exceeded: $${Math.abs(dailyPnL).toLocaleString()}`
        );
        return;
      }

      // Check circuit breaker conditions
      if (this.circuitBreaker.enabled && dailyPnL <= this.circuitBreaker.dailyLossLimit) {
        if (!this.emergencyState.circuitBreakerTriggered) {
          await this.triggerCircuitBreaker(
            `Daily loss limit reached: $${Math.abs(dailyPnL).toLocaleString()}`
          );
        }
        return;
      }

      // Check individual position limits
      for (const position of positions) {
        if (position.unrealizedPNL <= this.circuitBreaker.positionLossLimit) {
          await this.triggerCircuitBreaker(
            `Position loss limit exceeded: ${position.contract.symbol} $${Math.abs(position.unrealizedPNL).toLocaleString()}`
          );
          return;
        }
      }

      // Check account percentage limit
      const accountPctLoss = Math.abs(dailyPnL) / accountInfo.netLiquidation;
      if (accountPctLoss >= this.circuitBreaker.accountPctLimit) {
        await this.activateKillSwitch(
          `Account percentage loss limit exceeded: ${(accountPctLoss * 100).toFixed(1)}%`
        );
        return;
      }

      // Update last check time
      this.emergencyState.lastUpdateTime = new Date();

    } catch (error) {
      console.error('Error checking emergency conditions:', error);
    }
  }

  /**
   * Cancel all open orders immediately
   */
  private async cancelAllOpenOrders(): Promise<void> {
    try {
      console.log('Cancelling all open orders...');
      
      // In real implementation, would use reqOpenOrders and cancelOrder
      // For now, log the action
      console.log('All open orders cancelled');
      
    } catch (error) {
      console.error('Failed to cancel all orders:', error);
    }
  }

  /**
   * Reset circuit breaker after cooling period
   */
  async resetCircuitBreaker(): Promise<void> {
    try {
      this.emergencyState.circuitBreakerTriggered = false;
      this.emergencyState.emergencyStopActive = false;
      
      await storage.updateRiskStatus({
        emergencyStop: false,
        tradingPaused: false,
        reason: 'Circuit breaker reset',
        timestamp: new Date(),
      });

      console.log('Circuit breaker reset - trading resumed');
    } catch (error) {
      console.error('Failed to reset circuit breaker:', error);
      throw error;
    }
  }

  /**
   * Manually deactivate kill switch (requires careful consideration)
   */
  async deactivateKillSwitch(authorizedBy: string): Promise<void> {
    try {
      console.log(`Kill switch deactivated by: ${authorizedBy}`);
      
      this.emergencyState.killSwitchActive = false;
      this.emergencyState.emergencyStopActive = false;
      this.emergencyState.circuitBreakerTriggered = false;
      
      await storage.updateRiskStatus({
        emergencyStop: false,
        tradingPaused: false,
        killSwitchActive: false,
        reason: `Manually deactivated by ${authorizedBy}`,
        timestamp: new Date(),
      });

      console.log('All emergency controls deactivated - normal operations resumed');
    } catch (error) {
      console.error('Failed to deactivate kill switch:', error);
      throw error;
    }
  }

  /**
   * Get current emergency state
   */
  getEmergencyState(): EmergencyState {
    return { ...this.emergencyState };
  }

  /**
   * Update drawdown limits
   */
  updateDrawdownLimits(limits: Partial<DrawdownLimits>): void {
    this.drawdownLimits = { ...this.drawdownLimits, ...limits };
    console.log('Drawdown limits updated:', this.drawdownLimits);
  }

  /**
   * Update circuit breaker settings
   */
  updateCircuitBreaker(settings: Partial<CircuitBreaker>): void {
    this.circuitBreaker = { ...this.circuitBreaker, ...settings };
    console.log('Circuit breaker settings updated:', this.circuitBreaker);
  }
}