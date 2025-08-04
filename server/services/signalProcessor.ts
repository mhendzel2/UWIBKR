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
      
      // Fetch alerts with our sophisticated filters
      const rawAlerts = await this.unusualWhales.getFlowAlerts({
        minPremium: 500000, // $500K+ for institutional significance
        minDte: 45, // 45+ days minimum
        issueTypes: ['Common Stock', 'ADR']
      });

      if (rawAlerts.length === 0) {
        console.log('No sophisticated flow alerts found this cycle');
        return;
      }

      console.log(`Found ${rawAlerts.length} raw alerts, processing...`);

      // Transform rawAlerts to match expected FlowAlert interface
      const transformedAlerts = rawAlerts.map(alert => ({
        ...alert,
        id: `alert_${Date.now()}_${Math.random()}`,
        type: (alert.strike > alert.underlying_price ? 'call' : 'put') as 'call' | 'put',
        strike: alert.strike.toString(),
        created_at: new Date().toISOString()
      }));

      // Process through our sophisticated alert processor
      const processedAlerts = await alertProcessor.processFlowAlerts(transformedAlerts);

      console.log(`Processed ${processedAlerts.length} high-conviction alerts`);

    } catch (error) {
      console.error('Failed to poll flow alerts:', error);
    }
  }

  /**
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