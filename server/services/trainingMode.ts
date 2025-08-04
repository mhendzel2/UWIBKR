/**
 * Training Mode Configuration and Management
 * Enables automated trade execution for ML training data collection
 */

export interface TrainingModeConfig {
  enabled: boolean;
  autoExecuteTrades: boolean;
  restrictToWatchlist: boolean;
  maxPositionSize: number;
  maxDailyTrades: number;
  riskPerTrade: number; // Percentage of portfolio
  enabledStrategies: string[];
  minConfidenceThreshold: number;
  geminiUsage: 'sentiment_only' | 'disabled' | 'full';
  dataCollection: {
    captureMarketConditions: boolean;
    capturePreTradeAnalysis: boolean;
    capturePostTradeAssessment: boolean;
    trackPerformanceMetrics: boolean;
  };
}

export const DEFAULT_TRAINING_CONFIG: TrainingModeConfig = {
  enabled: true, // Default enabled
  autoExecuteTrades: true,
  restrictToWatchlist: true,
  maxPositionSize: 1000, // $1000 max per trade in training
  maxDailyTrades: 10,
  riskPerTrade: 0.5, // 0.5% of portfolio per trade
  enabledStrategies: ['swing', 'leap'],
  minConfidenceThreshold: 0.7, // 70% minimum confidence
  geminiUsage: 'sentiment_only', // Only use Gemini for market sentiment
  dataCollection: {
    captureMarketConditions: true,
    capturePreTradeAnalysis: true,
    capturePostTradeAssessment: true,
    trackPerformanceMetrics: true,
  }
};

export class TrainingModeManager {
  private config: TrainingModeConfig;
  private trainingStats = {
    tradesExecuted: 0,
    dailyTradeCount: 0,
    totalPnl: 0,
    lastResetDate: new Date(),
  };

  constructor(config: TrainingModeConfig = DEFAULT_TRAINING_CONFIG) {
    this.config = { ...config };
    console.log('🎯 Training Mode Manager initialized:', this.config.enabled ? 'ENABLED' : 'DISABLED');
  }

  /**
   * Check if training mode is active
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Toggle training mode on/off
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`🎯 Training Mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      console.log('📊 Training mode active - all trades will be executed for ML data collection');
      console.log('🔒 Gemini usage restricted to:', this.config.geminiUsage);
    } else {
      console.log('⏸️ Training mode disabled - manual approval required for trades');
    }
  }

  /**
   * Update training mode configuration
   */
  updateConfig(newConfig: Partial<TrainingModeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Training mode configuration updated');
  }

  /**
   * Get current configuration
   */
  getConfig(): TrainingModeConfig {
    return { ...this.config };
  }

  /**
   * Check if a trade should be executed in training mode
   */
  shouldExecuteTrade(signal: any, watchlistSymbols: string[]): {
    execute: boolean;
    reason: string;
  } {
    if (!this.config.enabled || !this.config.autoExecuteTrades) {
      return { execute: false, reason: 'Training mode disabled or auto-execution disabled' };
    }

    // Reset daily count if new day
    this.resetDailyCountIfNeeded();

    // Check daily trade limit
    if (this.trainingStats.dailyTradeCount >= this.config.maxDailyTrades) {
      return { execute: false, reason: `Daily trade limit reached (${this.config.maxDailyTrades})` };
    }

    // Check if restricted to watchlist
    if (this.config.restrictToWatchlist && !watchlistSymbols.includes(signal.ticker)) {
      return { execute: false, reason: 'Symbol not in watchlist (training mode restricted to watchlist)' };
    }

    // Check confidence threshold
    if (signal.confidence < this.config.minConfidenceThreshold) {
      return { execute: false, reason: `Confidence ${signal.confidence} below threshold ${this.config.minConfidenceThreshold}` };
    }

    // Check strategy is enabled
    if (!this.config.enabledStrategies.includes(signal.strategy)) {
      return { execute: false, reason: `Strategy ${signal.strategy} not enabled in training mode` };
    }

    return { execute: true, reason: 'All training mode criteria met' };
  }

  /**
   * Calculate position size for training mode
   */
  calculateTrainingPositionSize(portfolioValue: number, signal: any): number {
    const riskAmount = portfolioValue * (this.config.riskPerTrade / 100);
    const maxPosition = Math.min(riskAmount, this.config.maxPositionSize);
    
    // Adjust based on confidence
    const confidenceMultiplier = signal.confidence; // Scale by confidence
    return Math.floor(maxPosition * confidenceMultiplier);
  }

  /**
   * Record training trade execution
   */
  recordTradeExecution(trade: any): void {
    this.trainingStats.tradesExecuted++;
    this.trainingStats.dailyTradeCount++;
    
    console.log(`📈 Training trade executed: ${trade.ticker} (${this.trainingStats.dailyTradeCount}/${this.config.maxDailyTrades} daily)`);
  }

  /**
   * Update training P&L for tracking
   */
  updateTrainingPnl(pnl: number): void {
    this.trainingStats.totalPnl += pnl;
  }

  /**
   * Get training statistics
   */
  getTrainingStats() {
    return {
      ...this.trainingStats,
      config: this.config,
      isEnabled: this.config.enabled,
    };
  }

  /**
   * Reset daily counters if new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date();
    const lastReset = this.trainingStats.lastResetDate;
    
    if (today.toDateString() !== lastReset.toDateString()) {
      this.trainingStats.dailyTradeCount = 0;
      this.trainingStats.lastResetDate = today;
      console.log('🔄 Daily training trade count reset for new day');
    }
  }

  /**
   * Check if Gemini should be used for this request
   */
  shouldUseGemini(requestType: 'sentiment' | 'analysis' | 'signal_generation'): boolean {
    if (this.config.geminiUsage === 'disabled') {
      return false;
    }
    
    if (this.config.geminiUsage === 'sentiment_only') {
      return requestType === 'sentiment';
    }
    
    return true; // full usage
  }

  /**
   * Generate training mode status report
   */
  generateStatusReport(): string {
    const stats = this.getTrainingStats();
    return `
🎯 TRAINING MODE STATUS:
- Enabled: ${stats.isEnabled ? '✅ YES' : '❌ NO'}
- Auto Execute: ${stats.config.autoExecuteTrades ? '✅ YES' : '❌ NO'}
- Trades Today: ${stats.dailyTradeCount}/${stats.config.maxDailyTrades}
- Total Trades: ${stats.tradesExecuted}
- Training P&L: $${stats.totalPnl.toFixed(2)}
- Gemini Usage: ${stats.config.geminiUsage.toUpperCase()}
- Watchlist Only: ${stats.config.restrictToWatchlist ? '✅ YES' : '❌ NO'}
- Min Confidence: ${(stats.config.minConfidenceThreshold * 100).toFixed(0)}%
- Max Position: $${stats.config.maxPositionSize}
- Risk Per Trade: ${stats.config.riskPerTrade}%
    `.trim();
  }
}

// Global training mode manager instance
export const trainingModeManager = new TrainingModeManager();
