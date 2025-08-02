import { EventEmitter } from 'events';
import { storage } from '../storage';

export interface FlowAlert {
  id: string;
  ticker: string;
  total_premium: number;
  total_size: number;
  open_interest: number;
  ask_side_percentage: number;
  dte: number;
  strike: string;
  underlying_price: number;
  type: 'call' | 'put';
  expiry: string;
  alert_rule: string;
  created_at: string;
  sector?: string;
  volume_oi_ratio?: number;
}

export interface ProcessedAlert {
  id: string;
  ticker: string;
  strategy: 'swing' | 'leap';
  total_premium: number;
  conviction_score: number;
  moneyness_perc: number;
  trade_horizon: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  institutional_confidence: number;
  alert_reason: string;
  underlying_price: number;
  strike: number;
  type: 'call' | 'put';
  expiry: string;
  created_at: string;
}

export class AlertProcessor extends EventEmitter {
  private processingActive: boolean = false;

  constructor() {
    super();
  }

  /**
   * Process raw flow alerts using sophisticated filtering for swing and LEAP opportunities
   */
  async processFlowAlerts(rawAlerts: FlowAlert[]): Promise<ProcessedAlert[]> {
    if (!rawAlerts || rawAlerts.length === 0) {
      return [];
    }

    try {
      // Apply sophisticated filtering using native JavaScript for high-conviction, long-term signals
      const filteredAlerts = rawAlerts.filter(alert => {
        // Rule 1: Significant monetary value ($500K+ premium)
        if (alert.total_premium < 500_000) return false;
        
        // Rule 2: Likely opening trade (size > open interest)
        if (alert.total_size <= alert.open_interest) return false;
        
        // Rule 3: Strong buying aggression (80%+ ask side)
        if (alert.ask_side_percentage <= 0.80) return false;
        
        // Rule 4: Focus on swing (45+ days) and LEAP (365+ days) timeframes
        if (alert.dte < 45) return false;
        
        // Rule 5: Filter out obvious hedging (valid underlying price)
        if (alert.underlying_price <= 0) return false;
        
        return true;
      });

      // Feature engineering and enrichment
      const processedData = filteredAlerts.map(alert => {
        const strike = parseFloat(alert.strike);
        
        // Feature: Moneyness percentage (how far OTM/ITM)
        const moneyness_perc = (strike / alert.underlying_price) - 1;
        
        // Feature: Trade horizon categorization
        const trade_horizon = alert.dte > 365 ? 'LEAP' : 'Swing';
        
        // Feature: Institutional confidence score (0-100)
        const volumeOiRatio = alert.volume_oi_ratio || 1;
        const institutional_confidence = Math.min(100, 
          alert.ask_side_percentage * 100 + (volumeOiRatio * 10)
        );
        
        // Feature: Conviction score based on multiple factors
        const premiumWeight = Math.min(1, alert.total_premium / 1_000_000) * 0.4; // 40% weight
        const aggressionWeight = alert.ask_side_percentage * 0.3; // 30% weight
        const openingWeight = alert.total_size > (alert.open_interest * 2) ? 0.3 : 0.1; // 30% weight for strong opening
        const conviction_score = Math.min(100, (premiumWeight + aggressionWeight + openingWeight) * 100);
        
        return {
          ...alert,
          moneyness_perc,
          trade_horizon,
          institutional_confidence: Math.round(institutional_confidence),
          conviction_score: Math.round(conviction_score)
        };
      });

      // Sort by total premium (highest first)
      processedData.sort((a, b) => b.total_premium - a.total_premium);

      // Transform to ProcessedAlert format with additional analysis
      const processedAlerts: ProcessedAlert[] = processedData.map((record: any) => {
        const moneyness = Math.abs(record.moneyness_perc);
        const riskLevel = this.calculateRiskLevel(record.conviction_score, moneyness, record.dte);
        
        return {
          id: record.id,
          ticker: record.ticker,
          strategy: record.dte > 365 ? 'leap' : 'swing',
          total_premium: record.total_premium,
          conviction_score: record.conviction_score,
          moneyness_perc: record.moneyness_perc,
          trade_horizon: record.trade_horizon,
          risk_level: riskLevel,
          institutional_confidence: record.institutional_confidence,
          alert_reason: this.generateAlertReason(record),
          underlying_price: record.underlying_price,
          strike: parseFloat(record.strike),
          type: record.type,
          expiry: record.expiry,
          created_at: record.created_at
        };
      });

      // Log processing results
      console.log(`Alert Processor: Filtered ${rawAlerts.length} raw alerts to ${processedAlerts.length} high-conviction opportunities`);

      // Emit processed alerts for downstream consumption
      this.emit('alerts_processed', processedAlerts);

      return processedAlerts;

    } catch (error) {
      console.error('Alert processing failed:', error);
      throw error;
    }
  }

  private calculateRiskLevel(convictionScore: number, moneyness: number, dte: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Higher conviction and longer time = lower risk
    // Very OTM options = higher risk
    if (convictionScore > 70 && moneyness < 0.15 && dte > 180) {
      return 'LOW';
    } else if (convictionScore > 50 && moneyness < 0.30) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  private generateAlertReason(record: any): string {
    const reasons = [];
    
    if (record.total_premium > 1_000_000) {
      reasons.push('$1M+ premium');
    }
    
    if (record.ask_side_percentage > 0.90) {
      reasons.push('aggressive buying');
    }
    
    if (record.total_size > record.open_interest * 3) {
      reasons.push('major opening position');
    }
    
    if (record.dte > 365) {
      reasons.push('LEAP timeframe');
    }
    
    return reasons.join(', ') || 'institutional flow detected';
  }

  /**
   * Start alert processing with continuous monitoring
   */
  startProcessing(): void {
    this.processingActive = true;
    console.log('Alert Processor: Started continuous alert monitoring');
  }

  /**
   * Stop alert processing
   */
  stopProcessing(): void {
    this.processingActive = false;
    console.log('Alert Processor: Stopped alert monitoring');
  }

  isProcessing(): boolean {
    return this.processingActive;
  }
}

export const alertProcessor = new AlertProcessor();