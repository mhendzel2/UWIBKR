import { UnusualWhalesService } from './unusualWhales';
import { IBKRService } from './ibkr';

export interface TechnicalContext {
  trend: 'bullish' | 'bearish' | 'neutral';
  support: number;
  resistance: number;
  rsi: number;
  volume: number;
  averageVolume: number;
  volatility: number;
}

export interface GEXContext {
  netGamma: number;
  regime: 'suppression' | 'acceleration' | 'neutral';
  zeroGammaLevel: number;
  callWall: number;
  putWall: number;
}

export interface DarkPoolActivity {
  volume: number;
  averagePrice: number;
  timestamp: Date;
  direction: 'buying' | 'selling';
}

export interface SignalConfluence {
  technicalScore: number;
  gexScore: number;
  darkPoolScore: number;
  flowScore: number;
  overallScore: number;
  confluenceLevel: 'low' | 'medium' | 'high' | 'exceptional';
}

/**
 * Sophisticated signal processing with confluence analysis
 * Implements advanced filtering suggested in the architectural analysis
 */
export class SophisticatedFilteringService {
  private unusualWhales: UnusualWhalesService;
  private ibkr: IBKRService;

  constructor(unusualWhalesService: UnusualWhalesService, ibkrService: IBKRService) {
    this.unusualWhales = unusualWhalesService;
    this.ibkr = ibkrService;
  }

  /**
   * Analyze technical confluence with options flow
   * Large call sweep during breakout > sweep into resistance
   */
  async analyzeTechnicalConfluence(
    symbol: string,
    flowData: any
  ): Promise<TechnicalContext> {
    try {
      // In real implementation, fetch historical data from IBKR
      // const historicalData = await this.ibkr.getHistoricalData(symbol, '1d', 20);
      
      // Mock technical analysis for demonstration
      const currentPrice = flowData.underlying_price || 150;
      
      // Calculate key technical levels
      const support = currentPrice * 0.95; // 5% below current
      const resistance = currentPrice * 1.05; // 5% above current
      
      // Determine trend based on flow characteristics
      let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (flowData.option_type === 'call' && flowData.ask_side_percentage > 80) {
        trend = 'bullish';
      } else if (flowData.option_type === 'put' && flowData.ask_side_percentage > 80) {
        trend = 'bearish';
      }

      // Mock additional technical indicators
      const rsi = 45 + Math.random() * 20; // 45-65 range
      const volume = flowData.total_size || 1000;
      const averageVolume = volume * (0.8 + Math.random() * 0.4); // ±20%
      const volatility = 0.25 + Math.random() * 0.15; // 25-40% IV

      return {
        trend,
        support,
        resistance,
        rsi,
        volume,
        averageVolume,
        volatility,
      };
    } catch (error) {
      console.error('Failed to analyze technical confluence:', error);
      throw error;
    }
  }

  /**
   * Analyze Gamma Exposure (GEX) context
   * High positive GEX suppresses volatility, negative GEX accelerates moves
   */
  async analyzeGEXContext(symbol: string): Promise<GEXContext> {
    try {
      const gexData = await this.unusualWhales.getSpotExposures(symbol);
      
      if (!gexData.length) {
        // Return neutral GEX if no data available
        return {
          netGamma: 0,
          regime: 'neutral',
          zeroGammaLevel: 150, // Mock value
          callWall: 155,
          putWall: 145,
        };
      }

      // Calculate net gamma exposure
      const netGamma = gexData.reduce((sum, level) => 
        sum + level.net_gamma_exposure, 0
      );

      // Determine volatility regime
      let regime: 'suppression' | 'acceleration' | 'neutral' = 'neutral';
      if (netGamma > 1000000) { // $1M+ positive GEX
        regime = 'suppression';
      } else if (netGamma < -500000) { // $500K+ negative GEX
        regime = 'acceleration';
      }

      // Find key levels
      const zeroGammaLevel = this.findZeroGammaLevel(gexData);
      const callWall = this.findCallWall(gexData);
      const putWall = this.findPutWall(gexData);

      return {
        netGamma,
        regime,
        zeroGammaLevel,
        callWall,
        putWall,
      };
    } catch (error) {
      console.error('Failed to analyze GEX context:', error);
      // Return default values on error
      return {
        netGamma: 0,
        regime: 'neutral',
        zeroGammaLevel: 150,
        callWall: 155,
        putWall: 145,
      };
    }
  }

  /**
   * Correlate dark pool activity with options flow
   * Large block purchase + aggressive call buying = strong confluence
   */
  async analyzeDarkPoolCorrelation(
    symbol: string,
    timeWindow: number = 3600000 // 1 hour in ms
  ): Promise<DarkPoolActivity[]> {
    try {
      const apiUrl = process.env.DARK_POOL_API_URL;
      if (!apiUrl) {
        throw new Error('DARK_POOL_API_URL not configured');
      }

      const response = await fetch(`${apiUrl}?symbol=${symbol}&window=${timeWindow}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dark pool data');
      }

      const json = await response.json();
      const activities = (json || []).map((a: any) => ({
        ...a,
        timestamp: new Date(a.timestamp)
      })) as DarkPoolActivity[];
      return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to analyze dark pool correlation:', error);
      return [];
    }
  }

  /**
   * Calculate overall signal confluence score
   * Combines technical, GEX, dark pool, and flow analysis
   */
  async calculateSignalConfluence(
    symbol: string,
    flowData: any
  ): Promise<SignalConfluence> {
    try {
      // Gather all confluence data
      const [technical, gex, darkPool] = await Promise.all([
        this.analyzeTechnicalConfluence(symbol, flowData),
        this.analyzeGEXContext(symbol),
        this.analyzeDarkPoolCorrelation(symbol),
      ]);

      // Score technical confluence (0-100)
      let technicalScore = 50; // Base score
      
      if (technical.trend === 'bullish' && flowData.option_type === 'call') {
        technicalScore += 20;
      } else if (technical.trend === 'bearish' && flowData.option_type === 'put') {
        technicalScore += 20;
      }
      
      // RSI momentum alignment
      if ((technical.rsi < 30 && flowData.option_type === 'call') ||
          (technical.rsi > 70 && flowData.option_type === 'put')) {
        technicalScore += 15;
      }

      // Volume confirmation
      if (technical.volume > technical.averageVolume * 1.5) {
        technicalScore += 10;
      }

      // Score GEX context (0-100)
      let gexScore = 50;
      
      if (gex.regime === 'acceleration' && flowData.ask_side_percentage > 80) {
        gexScore += 25; // Aggressive flow in acceleration regime
      } else if (gex.regime === 'suppression') {
        gexScore -= 15; // Less favorable in suppression regime
      }

      // Score dark pool correlation (0-100)
      let darkPoolScore = 50;
      const recentBuying = darkPool.filter(dp => 
        dp.direction === 'buying' && 
        Date.now() - dp.timestamp.getTime() < 1800000 // 30 minutes
      );
      
      if (recentBuying.length > 0 && flowData.option_type === 'call') {
        darkPoolScore += 20;
      }

      // Score flow characteristics (0-100)
      let flowScore = 0;
      
      // Premium size
      if (flowData.total_premium > 1000000) flowScore += 25; // $1M+
      else if (flowData.total_premium > 500000) flowScore += 15; // $500K+
      
      // Aggressiveness
      if (flowData.ask_side_percentage > 90) flowScore += 25;
      else if (flowData.ask_side_percentage > 80) flowScore += 15;
      
      // DTE appropriateness
      if (flowData.dte >= 45 && flowData.dte <= 365) flowScore += 20;
      else if (flowData.dte > 365) flowScore += 25; // LEAPs
      
      // Repeated hits
      if (flowData.alert_rule?.includes('RepeatedHits')) flowScore += 15;

      // Calculate overall score (weighted average)
      const overallScore = (
        technicalScore * 0.3 +
        gexScore * 0.25 +
        darkPoolScore * 0.2 +
        flowScore * 0.25
      );

      // Determine confluence level
      let confluenceLevel: 'low' | 'medium' | 'high' | 'exceptional' = 'low';
      if (overallScore >= 85) confluenceLevel = 'exceptional';
      else if (overallScore >= 75) confluenceLevel = 'high';
      else if (overallScore >= 60) confluenceLevel = 'medium';

      return {
        technicalScore: Math.round(technicalScore),
        gexScore: Math.round(gexScore),
        darkPoolScore: Math.round(darkPoolScore),
        flowScore: Math.round(flowScore),
        overallScore: Math.round(overallScore),
        confluenceLevel,
      };
    } catch (error) {
      console.error('Failed to calculate signal confluence:', error);
      return {
        technicalScore: 50,
        gexScore: 50,
        darkPoolScore: 50,
        flowScore: 50,
        overallScore: 50,
        confluenceLevel: 'low',
      };
    }
  }

  /**
   * Filter signals based on confluence requirements
   * Only passes signals with medium+ confluence
   */
  async filterByConfluence(
    signals: any[],
    minConfluenceLevel: 'medium' | 'high' | 'exceptional' = 'medium'
  ): Promise<any[]> {
    const filteredSignals = [];
    
    for (const signal of signals) {
      try {
        const confluence = await this.calculateSignalConfluence(
          signal.ticker,
          signal
        );
        
        const levelOrder = { medium: 1, high: 2, exceptional: 3 };
        
        if (levelOrder[confluence.confluenceLevel] >= levelOrder[minConfluenceLevel]) {
          signal.confluence = confluence;
          filteredSignals.push(signal);
        }
      } catch (error) {
        console.error(`Failed to filter signal for ${signal.ticker}:`, error);
      }
    }

    console.log(`Filtered ${signals.length} signals to ${filteredSignals.length} with ${minConfluenceLevel}+ confluence`);
    return filteredSignals;
  }

  // Helper methods for GEX analysis
  private findZeroGammaLevel(gexData: any[]): number {
    // Find strike where net gamma exposure crosses zero
    for (let i = 0; i < gexData.length - 1; i++) {
      const current = gexData[i];
      const next = gexData[i + 1];
      
      if ((current.net_gamma_exposure >= 0 && next.net_gamma_exposure < 0) ||
          (current.net_gamma_exposure < 0 && next.net_gamma_exposure >= 0)) {
        return (current.strike + next.strike) / 2;
      }
    }
    return gexData[Math.floor(gexData.length / 2)]?.strike || 150;
  }

  private findCallWall(gexData: any[]): number {
    // Find strike with highest call gamma exposure
    let maxCallGamma = 0;
    let callWall = 150;
    
    for (const level of gexData) {
      if (level.call_gamma_exposure > maxCallGamma) {
        maxCallGamma = level.call_gamma_exposure;
        callWall = level.strike;
      }
    }
    
    return callWall;
  }

  private findPutWall(gexData: any[]): number {
    // Find strike with highest put gamma exposure (most negative)
    let maxPutGamma = 0;
    let putWall = 150;
    
    for (const level of gexData) {
      if (Math.abs(level.put_gamma_exposure) > maxPutGamma) {
        maxPutGamma = Math.abs(level.put_gamma_exposure);
        putWall = level.strike;
      }
    }
    
    return putWall;
  }
}