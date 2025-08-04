/**
 * Training Trade Executor
 * Executes trades automatically in training mode for ML data collection
 */

import { trainingModeManager } from './trainingMode';
import { watchlistManager } from './watchlistManager';
import { storage } from '../storage';
import { IBKRService } from './ibkr';
import { ComprehensiveMarketSentimentService } from './comprehensiveMarketSentiment';
import type { SwingLeapSignal } from './signalProcessor';

export interface TrainingTrade {
  id: string;
  signalId: string;
  ticker: string;
  strategy: string;
  entryPrice: number;
  quantity: number;
  positionSize: number;
  confidence: number;
  executionTime: Date;
  marketConditions: any;
  preTradeAnalysis: any;
  expectedOutcome: string;
  trainingMetadata: {
    trainingMode: boolean;
    autoExecuted: boolean;
    watchlistRestricted: boolean;
    portfolioRiskPct: number;
  };
}

export class TrainingTradeExecutor {
  private ibkrService: IBKRService;
  private marketSentiment: ComprehensiveMarketSentimentService;
  private portfolioValue = 100000; // Default $100K portfolio for training

  constructor() {
    this.ibkrService = new IBKRService();
    this.marketSentiment = new ComprehensiveMarketSentimentService();
  }

  /**
   * Process a signal and potentially execute it in training mode
   */
  async processSignalForTraining(signal: SwingLeapSignal): Promise<{
    executed: boolean;
    trade?: TrainingTrade;
    reason: string;
  }> {
    try {
      console.log(`🎯 Processing signal for training mode: ${signal.ticker} (${signal.strategy})`);

      // Check if training mode allows execution
      const watchlistSymbols = this.getWatchlistSymbols();
      const shouldExecute = trainingModeManager.shouldExecuteTrade(signal, watchlistSymbols);

      if (!shouldExecute.execute) {
        console.log(`❌ Training execution blocked: ${shouldExecute.reason}`);
        return { executed: false, reason: shouldExecute.reason };
      }

      // Execute the training trade
      const trade = await this.executeTrainingTrade(signal);
      
      console.log(`✅ Training trade executed: ${trade.ticker} - $${trade.positionSize}`);
      return { executed: true, trade, reason: 'Training trade executed successfully' };

    } catch (error) {
      console.error('❌ Failed to process signal for training:', error);
      return { executed: false, reason: `Execution failed: ${error}` };
    }
  }

  /**
   * Execute a trade in training mode
   */
  private async executeTrainingTrade(signal: SwingLeapSignal): Promise<TrainingTrade> {
    // Calculate position size for training
    const positionSize = trainingModeManager.calculateTrainingPositionSize(
      this.portfolioValue, 
      signal
    );

    // Calculate quantity (simplified for training)
    const quantity = Math.max(1, Math.floor(positionSize / signal.entryPrice));
    const actualPositionSize = quantity * signal.entryPrice;

    // Capture market conditions if enabled
    const marketConditions = await this.captureMarketConditions(signal.ticker);

    // Generate pre-trade analysis
    const preTradeAnalysis = await this.generatePreTradeAnalysis(signal, marketConditions);

    // Create training trade record
    const trade: TrainingTrade = {
      id: `training_${Date.now()}_${signal.ticker}`,
      signalId: signal.id,
      ticker: signal.ticker,
      strategy: signal.strategy,
      entryPrice: signal.entryPrice,
      quantity,
      positionSize: actualPositionSize,
      confidence: signal.confidence,
      executionTime: new Date(),
      marketConditions,
      preTradeAnalysis,
      expectedOutcome: this.generateExpectedOutcome(signal, preTradeAnalysis),
      trainingMetadata: {
        trainingMode: true,
        autoExecuted: true,
        watchlistRestricted: trainingModeManager.getConfig().restrictToWatchlist,
        portfolioRiskPct: trainingModeManager.getConfig().riskPerTrade
      }
    };

    // Store in database
    await this.storeTrainingTrade(trade, signal);

    // Update training statistics
    trainingModeManager.recordTradeExecution(trade);

    // Emit event for real-time updates
    console.log(`📊 Training trade data collected for ML: ${trade.ticker}`);

    return trade;
  }

  /**
   * Capture market conditions at trade execution
   */
  private async captureMarketConditions(ticker: string): Promise<any> {
    if (!trainingModeManager.getConfig().dataCollection.captureMarketConditions) {
      return null;
    }

    try {
      // Get comprehensive market sentiment (using Gemini only for sentiment if restricted)
      const sentiment = await this.marketSentiment.getComprehensiveMarketSentiment();
      
      return {
        timestamp: new Date(),
        ticker,
        marketSentiment: sentiment,
        vix: await this.getVIXLevel(),
        marketHours: this.getMarketHours(),
        dayOfWeek: new Date().getDay(),
        timeOfDay: new Date().getHours()
      };
    } catch (error) {
      console.error('Failed to capture market conditions:', error);
      return { error: 'Failed to capture market conditions' };
    }
  }

  /**
   * Generate pre-trade analysis
   */
  private async generatePreTradeAnalysis(signal: SwingLeapSignal, marketConditions: any): Promise<any> {
    if (!trainingModeManager.getConfig().dataCollection.capturePreTradeAnalysis) {
      return null;
    }

    return {
      signalStrength: signal.confidence,
      marketAlignment: this.assessMarketAlignment(signal, marketConditions),
      technicalFactors: {
        trend: signal.sentiment,
        volatility: marketConditions?.vix || 'unknown',
        timeDecay: signal.strategy === 'leap' ? 'low' : 'medium'
      },
      riskFactors: {
        positionSizing: 'training_mode',
        stopLoss: signal.maxRisk,
        timeHorizon: signal.strategy === 'leap' ? 'long' : 'medium'
      },
      expectedProbability: this.calculateWinProbability(signal, marketConditions)
    };
  }

  /**
   * Generate expected outcome for ML training
   */
  private generateExpectedOutcome(signal: SwingLeapSignal, analysis: any): string {
    const probabilities = analysis?.expectedProbability || {};
    const winProb = probabilities.win || signal.confidence;
    
    if (winProb > 0.8) return 'HIGH_CONFIDENCE_WIN';
    if (winProb > 0.6) return 'MODERATE_WIN';
    if (winProb > 0.4) return 'UNCERTAIN';
    return 'LIKELY_LOSS';
  }

  /**
   * Store training trade in database
   */
  private async storeTrainingTrade(trade: TrainingTrade, signal: SwingLeapSignal): Promise<void> {
    try {
      // Store as a trade record
      await storage.createTrade({
        signalId: signal.id,
        ticker: trade.ticker,
        strategy: trade.strategy,
        tradeType: 'BUY_TO_OPEN',
        quantity: trade.quantity,
        entryPrice: trade.entryPrice.toString(),
        commission: '1.00', // Flat training commission
        fees: '0.00',
        realizedPnl: null,
        unrealizedPnl: '0.00',
        status: 'open',
        fillPrice: trade.entryPrice.toString(),
        fillQuantity: trade.quantity,
        orderId: trade.id,
        executionTime: trade.executionTime,
        contractDetails: {
          trainingMode: true,
          originalSignal: signal,
          trainingMetadata: trade.trainingMetadata
        },
        marketConditions: trade.marketConditions
      });

      // Store pre-trade assessment
      if (trade.preTradeAnalysis) {
        await storage.createTradeAssessment({
          tradeId: trade.id,
          assessmentType: 'ai_pre_trade',
          assessor: 'training_system',
          confidence: trade.confidence.toString(),
          riskRating: this.assessRiskRating(trade),
          expectedOutcome: trade.expectedOutcome,
          keyFactors: trade.preTradeAnalysis,
          marketAnalysis: trade.marketConditions,
          notes: `Training mode trade - Auto-executed based on ${signal.strategy} signal`
        });
      }

      console.log(`💾 Training trade stored in database: ${trade.id}`);

    } catch (error) {
      console.error('Failed to store training trade:', error);
      throw error;
    }
  }

  /**
   * Get current watchlist symbols
   */
  private getWatchlistSymbols(): string[] {
    try {
      const currentWatchlist = watchlistManager.getCurrentWatchlist();
      return currentWatchlist?.symbols?.map(s => s.symbol) || [];
    } catch (error) {
      console.error('Failed to get watchlist symbols:', error);
      return [];
    }
  }

  /**
   * Assess market alignment with signal
   */
  private assessMarketAlignment(signal: SwingLeapSignal, marketConditions: any): string {
    if (!marketConditions?.marketSentiment) return 'unknown';
    
    const sentiment = marketConditions.marketSentiment.overall_score || 0;
    const signalBullish = signal.sentiment === 'bullish';
    
    if ((signalBullish && sentiment > 0.1) || (!signalBullish && sentiment < -0.1)) {
      return 'aligned';
    } else if (Math.abs(sentiment) < 0.1) {
      return 'neutral';
    } else {
      return 'contrarian';
    }
  }

  /**
   * Calculate win probability for training
   */
  private calculateWinProbability(signal: SwingLeapSignal, marketConditions: any): any {
    // Simplified probability calculation for training
    const baseProb = signal.confidence;
    const marketBonus = this.getMarketAlignmentBonus(signal, marketConditions);
    
    return {
      win: Math.min(0.95, baseProb + marketBonus),
      breakeven: 0.15,
      loss: Math.max(0.05, 1 - baseProb - marketBonus)
    };
  }

  /**
   * Get market alignment bonus/penalty
   */
  private getMarketAlignmentBonus(signal: SwingLeapSignal, marketConditions: any): number {
    const alignment = this.assessMarketAlignment(signal, marketConditions);
    
    switch (alignment) {
      case 'aligned': return 0.1;
      case 'contrarian': return -0.1;
      default: return 0;
    }
  }

  /**
   * Assess risk rating for trade
   */
  private assessRiskRating(trade: TrainingTrade): string {
    const riskPct = (trade.positionSize / this.portfolioValue) * 100;
    
    if (riskPct > 2) return 'HIGH';
    if (riskPct > 1) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Get current VIX level (simplified for training)
   */
  private async getVIXLevel(): Promise<number> {
    // In training mode, return simulated VIX level
    return 15 + Math.random() * 20; // 15-35 range
  }

  /**
   * Check if market is open
   */
  private getMarketHours(): string {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    // Simple market hours check (EST)
    if (day === 0 || day === 6) return 'closed_weekend';
    if (hour < 9 || hour > 16) return 'closed_afterhours';
    return 'open';
  }

  /**
   * Update portfolio value for position sizing
   */
  updatePortfolioValue(value: number): void {
    this.portfolioValue = value;
    console.log(`💰 Training portfolio value updated: $${value.toLocaleString()}`);
  }

  /**
   * Get training statistics
   */
  getTrainingStats() {
    return {
      portfolioValue: this.portfolioValue,
      trainingMode: trainingModeManager.getTrainingStats()
    };
  }
}

// Export singleton instance
export const trainingTradeExecutor = new TrainingTradeExecutor();
