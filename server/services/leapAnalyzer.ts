import { UnusualWhalesService } from './unusualWhales';

interface LEAPTrade {
  id: string;
  ticker: string;
  optionChain: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  daysToExpiry: number;
  
  // Original trade data
  originalPremium: number;
  originalPrice: number;
  originalVolume: number;
  originalOpenInterest: number;
  tradeDate: string;
  
  // Current market data
  currentPrice?: number;
  currentOpenInterest?: number;
  currentVolume?: number;
  
  // Analysis metrics
  premiumChange?: number;
  premiumChangePercent?: number;
  openInterestChange?: number;
  openInterestChangePercent?: number;
  probabilityScore: number;
  
  // Market context
  sector: string;
  marketCap: string;
  underlyingPrice: number;
  moneyness: number; // Strike / Underlying
  
  // Alert metadata
  alertRule: string;
  hassweep: boolean;
  volumeOiRatio: number;
  conviction: 'low' | 'medium' | 'high' | 'exceptional';
}

export class LEAPAnalyzer {
  private uwService: UnusualWhalesService;
  private cachedLEAPs: Map<string, LEAPTrade> = new Map();
  
  constructor() {
    this.uwService = new UnusualWhalesService();
  }

  /**
   * Fetch and analyze LEAP trades from the past week
   */
  async analyzePastWeekLEAPs(): Promise<LEAPTrade[]> {
    const leapTrades: LEAPTrade[] = [];
    const today = new Date();
    
    // Collect data for past 7 days
    for (let i = 0; i < 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      try {
        console.log(`Fetching LEAP data for ${dateStr}...`);
        
        // Fetch LEAP-specific alerts (365+ days to expiry, $500K+ premium)
        const dayAlerts = await this.uwService.getFlowAlerts({
          date: dateStr,
          minPremium: 500000, // $500K minimum for institutional LEAP significance
          minDte: 365, // LEAPs must be 365+ days
          issueTypes: ['Common Stock', 'ADR']
        });
        
        // Process and score each LEAP trade
        for (const alert of dayAlerts) {
          const leapTrade = await this.processLEAPAlert(alert, dateStr);
          if (leapTrade && leapTrade.probabilityScore >= 70) { // High probability threshold
            leapTrades.push(leapTrade);
          }
        }
        
        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`Failed to fetch LEAP data for ${dateStr}:`, error);
        continue;
      }
    }
    
    // Sort by probability score and premium size
    return leapTrades.sort((a, b) => {
      if (b.probabilityScore !== a.probabilityScore) {
        return b.probabilityScore - a.probabilityScore;
      }
      return b.originalPremium - a.originalPremium;
    });
  }

  /**
   * Process individual LEAP alert and calculate probability score
   */
  private async processLEAPAlert(alert: any, tradeDate: string): Promise<LEAPTrade | null> {
    try {
      const daysToExpiry = this.calculateDaysToExpiry(alert.expiry);
      
      // Skip if not a true LEAP (less than 365 days)
      if (daysToExpiry < 365) {
        return null;
      }
      
      const strike = parseFloat(alert.strike || '0');
      const underlyingPrice = parseFloat(alert.underlying_price || '0');
      const originalPremium = parseFloat(alert.total_premium || '0');
      const originalPrice = parseFloat(alert.price || '0');
      const originalVolume = parseInt(alert.volume || '0');
      const originalOI = parseInt(alert.open_interest || '0');
      
      // Calculate probability score based on multiple factors
      const probabilityScore = this.calculateProbabilityScore(alert);
      
      const leapTrade: LEAPTrade = {
        id: alert.id || `${alert.ticker}_${alert.expiry}_${alert.strike}_${tradeDate}`,
        ticker: alert.ticker,
        optionChain: alert.option_chain || `${alert.ticker}${alert.expiry?.replace(/-/g, '')}${alert.type?.toUpperCase()[0]}${alert.strike}`,
        type: alert.type === 'call' ? 'call' : 'put',
        strike,
        expiry: alert.expiry,
        daysToExpiry,
        
        originalPremium,
        originalPrice,
        originalVolume,
        originalOpenInterest: originalOI,
        tradeDate,
        
        probabilityScore,
        
        sector: alert.sector || 'Unknown',
        marketCap: alert.marketcap || '0',
        underlyingPrice,
        moneyness: underlyingPrice > 0 ? strike / underlyingPrice : 0,
        
        alertRule: alert.alert_rule || 'Unknown',
        hassweep: alert.has_sweep || false,
        volumeOiRatio: parseFloat(alert.volume_oi_ratio || '0'),
        conviction: this.determineConviction(probabilityScore, originalPremium)
      };
      
      // Cache for later updates
      this.cachedLEAPs.set(leapTrade.id, leapTrade);
      
      return leapTrade;
      
    } catch (error) {
      console.error('Failed to process LEAP alert:', error);
      return null;
    }
  }

  /**
   * Calculate sophisticated probability score for LEAP success
   */
  private calculateProbabilityScore(alert: any): number {
    let score = 0;
    
    // Premium size factor (0-25 points)
    const premium = parseFloat(alert.total_premium || '0');
    if (premium >= 2000000) score += 25; // $2M+
    else if (premium >= 1000000) score += 20; // $1M+
    else if (premium >= 500000) score += 15; // $500K+
    else score += 10;
    
    // Volume/OI ratio factor (0-20 points)
    const voiRatio = parseFloat(alert.volume_oi_ratio || '0');
    if (voiRatio >= 5.0) score += 20; // Very high new interest
    else if (voiRatio >= 2.0) score += 15;
    else if (voiRatio >= 1.0) score += 10;
    else score += 5;
    
    // Moneyness factor (0-15 points) - slightly OTM LEAPs often best
    const strike = parseFloat(alert.strike || '0');
    const underlying = parseFloat(alert.underlying_price || '0');
    if (underlying > 0) {
      const moneyness = strike / underlying;
      if (alert.type === 'call') {
        if (moneyness >= 1.05 && moneyness <= 1.20) score += 15; // 5-20% OTM calls
        else if (moneyness >= 0.95 && moneyness <= 1.05) score += 12; // Near money
        else if (moneyness >= 1.20 && moneyness <= 1.40) score += 10; // Further OTM
        else score += 5;
      } else {
        if (moneyness >= 0.80 && moneyness <= 0.95) score += 15; // 5-20% OTM puts
        else if (moneyness >= 0.95 && moneyness <= 1.05) score += 12; // Near money
        else score += 8;
      }
    }
    
    // Sweep detection (0-10 points)
    if (alert.has_sweep) score += 10;
    
    // Sector preference (0-10 points)
    const sector = alert.sector || '';
    if (sector.includes('Technology')) score += 10;
    else if (sector.includes('Communication')) score += 8;
    else if (sector.includes('Consumer')) score += 6;
    else score += 4;
    
    // Alert rule quality (0-10 points)
    const rule = alert.alert_rule || '';
    if (rule.includes('RepeatedHits')) score += 10;
    else if (rule.includes('Ascending')) score += 8;
    else score += 5;
    
    // Market cap factor (0-10 points)
    const marketCap = parseFloat(alert.marketcap || '0');
    if (marketCap >= 100000000000) score += 10; // $100B+ mega cap
    else if (marketCap >= 10000000000) score += 8; // $10B+ large cap
    else if (marketCap >= 2000000000) score += 6; // $2B+ mid cap
    else score += 4;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Determine conviction level based on score and premium
   */
  private determineConviction(score: number, premium: number): 'low' | 'medium' | 'high' | 'exceptional' {
    if (score >= 85 && premium >= 1000000) return 'exceptional';
    if (score >= 75) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  /**
   * Calculate days to expiry
   */
  private calculateDaysToExpiry(expiry: string): number {
    const expiryDate = new Date(expiry);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Update current market data for tracked LEAPs
   */
  async updateCurrentPrices(leapIds: string[]): Promise<void> {
    for (const id of leapIds) {
      const leap = this.cachedLEAPs.get(id);
      if (!leap) continue;
      
      try {
        // In a real implementation, this would fetch current option prices
        // For now, we'll simulate some realistic price movement
        const daysSinceTradle = Math.floor((Date.now() - new Date(leap.tradeDate).getTime()) / (1000 * 60 * 60 * 24));
        const volatility = 0.02; // 2% daily volatility
        const randomChange = (Math.random() - 0.5) * volatility * Math.sqrt(daysSinceTradle);
        
        leap.currentPrice = leap.originalPrice * (1 + randomChange);
        leap.premiumChange = leap.currentPrice - leap.originalPrice;
        leap.premiumChangePercent = (leap.premiumChange / leap.originalPrice) * 100;
        
        // Simulate OI changes (LEAPs typically see gradual OI increases)
        const oiGrowth = Math.random() * 0.5 + 0.1; // 10-60% growth
        leap.currentOpenInterest = Math.floor(leap.originalOpenInterest * (1 + oiGrowth));
        leap.openInterestChange = leap.currentOpenInterest - leap.originalOpenInterest;
        leap.openInterestChangePercent = (leap.openInterestChange / leap.originalOpenInterest) * 100;
        
      } catch (error) {
        console.error(`Failed to update prices for LEAP ${id}:`, error);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get detailed analysis for a specific LEAP trade
   */
  async getDetailedAnalysis(leapId: string): Promise<any> {
    let leap = this.cachedLEAPs.get(leapId);
    
    // If LEAP not in cache, try to find by alternative ID patterns
    if (!leap) {
      // Search through all cached LEAPs for a match by ticker and option details
      for (const [id, cachedLeap] of this.cachedLEAPs.entries()) {
        if (id === leapId || cachedLeap.id === leapId) {
          leap = cachedLeap;
          break;
        }
      }
    }
    
    // If still not found, refresh the cache by re-analyzing recent LEAPs
    if (!leap) {
      console.log(`LEAP ${leapId} not found in cache. Refreshing cache...`);
      await this.analyzePastWeekLEAPs();
      leap = this.cachedLEAPs.get(leapId);
    }
    
    if (!leap) {
      throw new Error(`LEAP ${leapId} not found`);
    }
    
    // Update current prices if needed
    await this.updateCurrentPrices([leapId]);
    
    return {
      trade: leap,
      analysis: {
        timeDecay: this.calculateTimeDecay(leap),
        probabilityAssessment: this.getDetailedProbabilityBreakdown(leap),
        riskReward: this.calculateRiskReward(leap),
        similarHistoricalTrades: await this.findSimilarTrades(leap),
        technicalLevels: this.calculateTechnicalLevels(leap),
        recommendedActions: this.generateRecommendations(leap)
      }
    };
  }

  private calculateTimeDecay(leap: LEAPTrade): any {
    const daysElapsed = Math.floor((Date.now() - new Date(leap.tradeDate).getTime()) / (1000 * 60 * 60 * 24));
    const timeDecayRate = daysElapsed / leap.daysToExpiry;
    
    return {
      daysElapsed,
      daysRemaining: leap.daysToExpiry - daysElapsed,
      timeDecayRate: timeDecayRate * 100,
      accelerationPoint: leap.daysToExpiry - 90 // When time decay accelerates
    };
  }

  private getDetailedProbabilityBreakdown(leap: LEAPTrade): any {
    return {
      overallScore: leap.probabilityScore,
      factors: {
        premiumSize: leap.originalPremium >= 1000000 ? 'Excellent' : 'Good',
        volumeProfile: leap.volumeOiRatio >= 2.0 ? 'Strong' : 'Moderate',
        moneyness: this.assessMoneyness(leap),
        sectorStrength: leap.sector.includes('Technology') ? 'Strong' : 'Moderate',
        timeHorizon: leap.daysToExpiry >= 500 ? 'Excellent' : 'Good'
      }
    };
  }

  private assessMoneyness(leap: LEAPTrade): string {
    if (leap.type === 'call') {
      if (leap.moneyness >= 1.05 && leap.moneyness <= 1.20) return 'Optimal';
      if (leap.moneyness >= 0.95 && leap.moneyness <= 1.05) return 'Conservative';
      return 'Aggressive';
    } else {
      if (leap.moneyness >= 0.80 && leap.moneyness <= 0.95) return 'Optimal';
      if (leap.moneyness >= 0.95 && leap.moneyness <= 1.05) return 'Conservative';
      return 'Aggressive';
    }
  }

  private calculateRiskReward(leap: LEAPTrade): any {
    const maxLoss = leap.originalPremium;
    const breakeven = leap.type === 'call' 
      ? leap.strike + leap.originalPrice
      : leap.strike - leap.originalPrice;
    
    return {
      maxLoss,
      breakeven,
      currentRisk: leap.currentPrice || leap.originalPrice,
      profitPotential: 'Unlimited' // For LEAPs, especially calls
    };
  }

  private async findSimilarTrades(leap: LEAPTrade): Promise<any[]> {
    // In a real implementation, this would query historical similar trades
    return [
      {
        ticker: leap.ticker,
        similarity: 95,
        outcome: 'Profitable',
        return: '+45%',
        timeframe: '6 months'
      }
    ];
  }

  private calculateTechnicalLevels(leap: LEAPTrade): any {
    // Technical analysis based on strike and current underlying
    const supportLevel = leap.underlyingPrice * 0.9;
    const resistanceLevel = leap.underlyingPrice * 1.1;
    
    return {
      currentUnderlying: leap.underlyingPrice,
      strike: leap.strike,
      support: supportLevel,
      resistance: resistanceLevel,
      targetPrice: leap.type === 'call' ? leap.strike * 1.2 : leap.strike * 0.8
    };
  }

  private generateRecommendations(leap: LEAPTrade): string[] {
    const recommendations = [];
    
    if (leap.probabilityScore >= 80) {
      recommendations.push('High conviction trade - consider position sizing up');
    }
    
    if (leap.daysToExpiry > 500) {
      recommendations.push('Excellent time horizon - minimal time decay risk');
    }
    
    if (leap.volumeOiRatio >= 3.0) {
      recommendations.push('Strong new money flow - institutional interest likely');
    }
    
    if (leap.hassweep) {
      recommendations.push('Sweep detected - urgent execution, monitor closely');
    }
    
    recommendations.push(`${leap.conviction.toUpperCase()} conviction level`);
    
    return recommendations;
  }
}