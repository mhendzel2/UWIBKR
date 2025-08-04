import { EventEmitter } from 'events';
import { UnusualWhalesService } from './unusualWhales';
import { alertProcessor, ProcessedAlert } from './alertProcessor';
import { storage } from '../storage';
import { trainingModeManager } from './trainingMode';
import { trainingTradeExecutor } from './trainingTradeExecutor';

export interface SwingLeapSignal {
  id: string;
  ticker: string;
  strategy: 'swing' | 'leap';
  sentiment: 'bullish' | 'bearish';
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  maxRisk: number;
  expiry: string;
  reasoning: string;
  alertData: ProcessedAlert;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
}

export class SignalProcessor extends EventEmitter {
  private unusualWhales: UnusualWhalesService;
  private processing: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.unusualWhales = new UnusualWhalesService();
    
    // Listen for processed alerts from the alert processor
    alertProcessor.on('alerts_processed', (alerts: ProcessedAlert[]) => {
      this.generateSignalsFromAlerts(alerts);
    });
  }

  /**
   * Start the signal processing pipeline with alert-based approach
   */
  async startProcessing(): Promise<void> {
    if (this.processing) {
      console.log('Signal processor already running');
      return;
    }

    this.processing = true;
    console.log('Signal Processor: Starting alert-based swing/LEAP signal generation');

    // Start alert processor
    alertProcessor.startProcessing();

    // Set up periodic flow alert polling (every 2 minutes for swing/LEAP focus)
    this.intervalId = setInterval(async () => {
      await this.pollFlowAlerts();
    }, 120000); // 2 minutes - appropriate for longer-term strategies

    // Initial poll
    await this.pollFlowAlerts();
  }

  /**
   * Stop the signal processing pipeline
   */
  stopProcessing(): void {
    if (!this.processing) return;

    this.processing = false;
    alertProcessor.stopProcessing();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Signal Processor: Stopped alert-based processing');
  }

  /**
   * Get processing statistics for monitoring and health checks
   */
  getProcessingStats() {
    return {
      isProcessing: this.processing,
      lastPollTime: Date.now(),
      signalsGenerated: 0, // Would track in production
      alertsProcessed: 0,
      averageProcessingTime: 0,
      errorRate: 0,
    };
  }

  /**
   * Poll for sophisticated flow alerts and process them
   */
  private async pollFlowAlerts(): Promise<void> {
    try {
      console.log('Polling for sophisticated swing/LEAP flow alerts...');
      
      // Start with more permissive filters to ensure we get data
      const rawAlerts = await this.unusualWhales.getFlowAlerts({
        minPremium: 100000, // Reduced from 500K to 100K
        minDte: 7, // Reduced from 45 to 7 days to capture more opportunities
        issueTypes: ['Common Stock', 'ADR']
      });

      if (rawAlerts.length === 0) {
        console.log('⚠️ No flow alerts found - checking with even lower filters...');
        
        // Try with even more permissive filters as fallback
        const fallbackAlerts = await this.unusualWhales.getFlowAlerts({
          minPremium: 50000, // $50K minimum
          minDte: 1, // Any DTE
        });
        
        console.log(`Fallback search found ${fallbackAlerts.length} alerts`);
        
        if (fallbackAlerts.length === 0) {
          console.log('❌ No alerts found even with minimal filters');
          return;
        }
        
        // Use fallback alerts
        return this.processRawAlerts(fallbackAlerts);
      }

      console.log(`Found ${rawAlerts.length} raw alerts, processing...`);
      return this.processRawAlerts(rawAlerts);

    } catch (error) {
      console.error('❌ Failed to poll flow alerts:', error);
      // Log the specific error for debugging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
    }
  }

  /**
   * Process raw alerts from the API
   */
  private async processRawAlerts(rawAlerts: any[]): Promise<void> {
    try {
      // Transform rawAlerts to match expected FlowAlert interface
      const transformedAlerts = rawAlerts.map(alert => {
        // Calculate ask side percentage from premium data
        const totalPremium = parseFloat(alert.total_premium) || 0;
        const askSidePremium = parseFloat(alert.total_ask_side_prem) || 0;
        const bidSidePremium = parseFloat(alert.total_bid_side_prem) || 0;
        const askSidePercentage = totalPremium > 0 ? askSidePremium / totalPremium : 0;
        
        // Calculate DTE from expiry
        const dte = this.calculateDTE(alert.expiry);
        
        // Ensure we have all required fields
        const transformedAlert = {
          ...alert,
          id: alert.id || `alert_${Date.now()}_${Math.random()}`,
          type: this.determineOptionType(alert),
          strike: alert.strike?.toString() || '0',
          created_at: alert.created_at || new Date().toISOString(),
          total_premium: totalPremium,
          total_size: alert.total_size || alert.volume || 0,
          open_interest: alert.open_interest || 0,
          ask_side_percentage: askSidePercentage,
          dte: dte,
          underlying_price: parseFloat(alert.underlying_price) || 0,
          alert_rule: alert.alert_rule || 'Unknown',
          volume_oi_ratio: parseFloat(alert.volume_oi_ratio) || 0
        };
        
        console.log(`🔍 Transformed alert: ${alert.ticker} - $${(transformedAlert.total_premium/1000).toFixed(0)}K premium, ${transformedAlert.dte} DTE, ${(transformedAlert.ask_side_percentage*100).toFixed(1)}% ask`);
        return transformedAlert;
      });

      // Process through our sophisticated alert processor
      const processedAlerts = await alertProcessor.processFlowAlerts(transformedAlerts);

      console.log(`✅ Processed ${processedAlerts.length} high-conviction alerts from ${transformedAlerts.length} raw alerts`);

      // Generate trading signals from processed alerts
      for (const alert of processedAlerts) {
        try {
          const signal = await this.createSwingLeapSignal(alert);
          if (signal) {
            // Store the signal
            await storage.createTradingSignal({
              ticker: signal.ticker,
              strategy: signal.strategy,
              sentiment: signal.sentiment,
              confidence: signal.confidence.toString(),
              entryPrice: signal.entryPrice.toString(),
              targetPrice: signal.targetPrice?.toString(),
              maxRisk: signal.maxRisk.toString(),
              expiry: signal.expiry,
              reasoning: signal.reasoning,
              status: 'pending',
              aiAnalysis: {
                alertData: signal.alertData,
                convictionScore: alert.conviction_score,
                institutionalConfidence: alert.institutional_confidence
              }
            });

            // Check if training mode should auto-execute
            if (trainingModeManager.isEnabled()) {
              console.log(`🎯 Training mode active - processing signal for ${signal.ticker}`);
              
              const executionResult = await trainingTradeExecutor.processSignalForTraining(signal);
              
              if (executionResult.executed) {
                console.log(`✅ Training trade executed: ${signal.ticker} - ${executionResult.reason}`);
                
                // Update signal status to executed
                // Note: In production, you'd update the stored signal status
                signal.status = 'executed';
              } else {
                console.log(`⏸️ Training trade not executed: ${signal.ticker} - ${executionResult.reason}`);
              }
            }

            console.log(`💡 Generated signal: ${signal.ticker} ${signal.strategy} ${signal.sentiment} (confidence: ${signal.confidence})`);
          }
        } catch (error) {
          console.error(`❌ Failed to create signal for ${alert.ticker}:`, error);
        }
      }

    } catch (error) {
      console.error('❌ Failed to process raw alerts:', error);
    }
  }

  /**
   * Determine option type from alert data
   */
  private determineOptionType(alert: any): 'call' | 'put' {
    // Try multiple fields to determine option type
    if (alert.type) {
      return alert.type.toLowerCase() === 'call' ? 'call' : 'put';
    }
    if (alert.option_type) {
      return alert.option_type.toLowerCase() === 'call' ? 'call' : 'put';
    }
    // Fallback: compare strike to underlying price
    if (alert.strike && alert.underlying_price) {
      return alert.strike > alert.underlying_price ? 'call' : 'put';
    }
    return 'call'; // Default fallback
  }

  /**
   * Calculate days to expiration from expiry date
   */
  private calculateDTE(expiry: string | undefined): number {
    if (!expiry) {
      console.log('⚠️ No expiry provided, defaulting to 30 DTE');
      return 30;
    }

    try {
      // Handle different date formats
      let expiryDate: Date;
      
      if (expiry.includes('-')) {
        // Format: "2025-12-19" or "2025-12-19T..."
        expiryDate = new Date(expiry);
      } else {
        // Handle other formats if needed
        expiryDate = new Date(expiry);
      }
      
      if (isNaN(expiryDate.getTime())) {
        console.log(`⚠️ Invalid expiry date format: ${expiry}, defaulting to 30 DTE`);
        return 30;
      }

      const now = new Date();
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`📅 Calculated DTE: ${diffDays} days (expiry: ${expiry})`);
      return Math.max(0, diffDays); // Ensure non-negative
    } catch (error) {
      console.error(`❌ Error calculating DTE for expiry ${expiry}:`, error);
      return 30; // Default fallback
    }
  }  /**
   * Generate trading signals from processed alerts
   */
  private async generateSignalsFromAlerts(alerts: ProcessedAlert[]): Promise<void> {
    for (const alert of alerts) {
      try {
        const signal = await this.createSwingLeapSignal(alert);
        if (signal) {
          // Store the signal
          await storage.createTradingSignal({
            ticker: signal.ticker,
            strategy: signal.strategy,
            sentiment: signal.sentiment,
            confidence: signal.confidence.toString(),
            entryPrice: signal.entryPrice.toString(),
            targetPrice: signal.targetPrice?.toString(),
            maxRisk: signal.maxRisk.toString(),
            expiry: signal.expiry,
            reasoning: signal.reasoning,
            status: 'pending',
            aiAnalysis: {
              alertData: signal.alertData,
              convictionScore: alert.conviction_score,
              institutionalConfidence: alert.institutional_confidence
            }
          });

          // Check if training mode should auto-execute
          if (trainingModeManager.isEnabled()) {
            console.log(`🎯 Training mode active - processing signal for ${signal.ticker}`);
            
            const executionResult = await trainingTradeExecutor.processSignalForTraining(signal);
            
            if (executionResult.executed) {
              console.log(`✅ Training trade executed: ${signal.ticker} - ${executionResult.reason}`);
              
              // Update signal status to executed
              // Note: In production, you'd update the stored signal status
              signal.status = 'executed';
            } else {
              console.log(`❌ Training trade not executed: ${signal.ticker} - ${executionResult.reason}`);
            }
          }

          // Emit signal for real-time updates
          this.emit('signal_generated', signal);
          console.log(`Generated ${signal.strategy} signal for ${signal.ticker}: ${signal.reasoning}`);
        }
      } catch (error) {
        console.error(`Failed to generate signal from alert ${alert.id}:`, error);
      }
    }
  }

  /**
   * Create a sophisticated swing or LEAP signal from processed alert
   */
  private async createSwingLeapSignal(alert: ProcessedAlert): Promise<SwingLeapSignal | null> {
    try {
      // Determine sentiment based on option type and market context
      const sentiment = alert.type === 'call' ? 'bullish' : 'bearish';
      
      // Calculate sophisticated entry and target prices
      const entryPrice = alert.underlying_price;
      const moneyness = Math.abs(alert.moneyness_perc);
      
      // Calculate target based on strategy and moneyness
      let targetPrice: number;
      if (alert.strategy === 'leap') {
        // LEAPs: more conservative targets, longer time horizon
        targetPrice = sentiment === 'bullish' 
          ? entryPrice * (1 + Math.min(0.5, moneyness + 0.2)) // Up to 50% upside
          : entryPrice * (1 - Math.min(0.3, moneyness + 0.1)); // Up to 30% downside
      } else {
        // Swing: moderate targets for shorter timeframe
        targetPrice = sentiment === 'bullish'
          ? entryPrice * (1 + Math.min(0.25, moneyness + 0.1)) // Up to 25% upside
          : entryPrice * (1 - Math.min(0.20, moneyness + 0.05)); // Up to 20% downside
      }

      // Risk management: max 1% of portfolio per trade
      const maxRisk = 10000; // $10K default - should be calculated from account size

      // Generate sophisticated reasoning
      const reasoning = this.generateSophisticatedReasoning(alert);

      return {
        id: `signal_${Date.now()}_${alert.ticker}`,
        ticker: alert.ticker,
        strategy: alert.strategy,
        sentiment,
        confidence: alert.conviction_score,
        entryPrice,
        targetPrice,
        maxRisk,
        expiry: alert.expiry,
        reasoning,
        alertData: alert,
        status: 'pending',
        createdAt: new Date()
      };

    } catch (error) {
      console.error('Failed to create signal:', error);
      return null;
    }
  }

  /**
   * Generate sophisticated reasoning for the signal
   */
  private generateSophisticatedReasoning(alert: ProcessedAlert): string {
    const reasons = [];
    
    // Premium significance
    if (alert.total_premium > 1_000_000) {
      reasons.push(`$${(alert.total_premium / 1_000_000).toFixed(1)}M+ institutional flow`);
    } else {
      reasons.push(`$${(alert.total_premium / 1_000).toFixed(0)}K premium commitment`);
    }

    // Conviction indicators
    if (alert.conviction_score > 80) {
      reasons.push('very high conviction signal');
    } else if (alert.conviction_score > 60) {
      reasons.push('high conviction signal');
    }

    // Opening position indicators
    if (alert.institutional_confidence > 90) {
      reasons.push('strong institutional buying aggression');
    }

    // Time horizon
      if (alert.strategy === 'leap') {
        reasons.push(`LEAP position (${Math.round(alert.trade_horizon === 'LEAP' ? 365 : 90)} days)`);
      } else {
        reasons.push(`swing trade setup (90 days to expiry)`);
      }    // Moneyness context
    const moneyness = Math.abs(alert.moneyness_perc);
    if (moneyness < 0.05) {
      reasons.push('near-the-money positioning');
    } else if (moneyness < 0.15) {
      reasons.push('moderate OTM positioning');
    }

    return reasons.join(', ');
  }

  isProcessing(): boolean {
    return this.processing;
  }
}

export const signalProcessor = new SignalProcessor();