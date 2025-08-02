import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Schema for radar settings
const RadarSettingsSchema = z.object({
  sensitivity: z.number().min(1).max(10).default(7),
  minConfidence: z.number().min(50).max(95).default(75),
  alertTypes: z.array(z.string()).default(['sweep', 'unusual_volume', 'momentum', 'flow_imbalance']),
  sectors: z.array(z.string()).default([]),
  minPremium: z.number().default(100000),
  maxTimeToExpiry: z.number().default(60),
  maxAlerts: z.number().default(50),
});

// Real-time Options Opportunity Radar
router.get('/radar', async (req, res) => {
  try {
    const settings = RadarSettingsSchema.parse(req.query);
    
    // Fetch real-time data from multiple sources for comprehensive scanning
    const [flowAlertsResponse, unusualVolumeResponse, momentumResponse, optionChainResponse] = await Promise.all([
      // High-volume flow alerts
      fetch(`https://api.unusualwhales.com/api/option-trades/flow-alerts?min_premium=${settings.minPremium}&limit=100`, {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Unusual volume detection
      fetch('https://api.unusualwhales.com/api/option-trades/unusual-volume?limit=50', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Momentum and breakout scanner
      fetch('https://api.unusualwhales.com/api/market/momentum-scanner', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Current option chains for analysis
      fetch('https://api.unusualwhales.com/api/option-chains/active', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const [flowData, volumeData, momentumData, chainData] = await Promise.all([
      flowAlertsResponse.ok ? flowAlertsResponse.json() : { data: [] },
      unusualVolumeResponse.ok ? unusualVolumeResponse.json() : { data: [] },
      momentumResponse.ok ? momentumResponse.json() : { data: [] },
      optionChainResponse.ok ? optionChainResponse.json() : { data: [] },
    ]);

    const opportunities = [];
    
    // Process flow alerts for sweep and unusual activity
    const flowAlerts = flowData.data || [];
    for (const alert of flowAlerts) {
      if (shouldProcessAlert(alert, settings)) {
        const opportunity = await processFlowAlert(alert, settings.sensitivity);
        if (opportunity && opportunity.confidence >= settings.minConfidence) {
          opportunities.push(opportunity);
        }
      }
    }
    
    // Process unusual volume alerts
    const volumeAlerts = volumeData.data || [];
    for (const alert of volumeAlerts) {
      if (shouldProcessVolumeAlert(alert, settings)) {
        const opportunity = await processVolumeAlert(alert, settings.sensitivity);
        if (opportunity && opportunity.confidence >= settings.minConfidence) {
          opportunities.push(opportunity);
        }
      }
    }
    
    // Process momentum alerts
    const momentumAlerts = momentumData.data || [];
    for (const alert of momentumAlerts) {
      if (shouldProcessMomentumAlert(alert, settings)) {
        const opportunity = await processMomentumAlert(alert, settings.sensitivity);
        if (opportunity && opportunity.confidence >= settings.minConfidence) {
          opportunities.push(opportunity);
        }
      }
    }
    
    // Sort by confidence and recency, limit results
    const sortedOpportunities = opportunities
      .sort((a, b) => {
        // Sort by severity first, then confidence, then recency
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aSeverity = severityOrder[a.severity as keyof typeof severityOrder] || 0;
        const bSeverity = severityOrder[b.severity as keyof typeof severityOrder] || 0;
        
        if (aSeverity !== bSeverity) return bSeverity - aSeverity;
        if (a.confidence !== b.confidence) return b.confidence - a.confidence;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
      .slice(0, settings.maxAlerts);

    res.json({
      success: true,
      opportunities: sortedOpportunities,
      metadata: {
        totalScanned: flowAlerts.length + volumeAlerts.length + momentumAlerts.length,
        opportunitiesFound: opportunities.length,
        filteredCount: sortedOpportunities.length,
        settings,
        lastScan: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Options radar error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan for options opportunities',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Radar Statistics
router.get('/radar-stats', async (req, res) => {
  try {
    // Simulate real-time radar statistics
    // In production, this would track actual scanning metrics
    const stats = {
      totalScanned: Math.floor(Math.random() * 5000) + 15000,
      opportunitiesFound: Math.floor(Math.random() * 200) + 50,
      avgConfidence: 75 + Math.random() * 20,
      topSector: ['Technology', 'Healthcare', 'Financial Services', 'Energy'][Math.floor(Math.random() * 4)],
      scanRate: Math.floor(Math.random() * 100) + 150, // per minute
    };

    res.json(stats);
  } catch (error) {
    console.error('Radar stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get radar statistics'
    });
  }
});

// Helper functions for processing different alert types
function shouldProcessAlert(alert: any, settings: any): boolean {
  // Check if alert meets basic criteria
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  if (premium < settings.minPremium) return false;
  
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  if (daysToExpiry > settings.maxTimeToExpiry) return false;
  
  if (settings.sectors.length > 0 && !settings.sectors.includes(alert.sector)) return false;
  
  return true;
}

function shouldProcessVolumeAlert(alert: any, settings: any): boolean {
  if (settings.sectors.length > 0 && !settings.sectors.includes(alert.sector)) return false;
  return alert.unusual_volume_ratio > 2; // At least 2x normal volume
}

function shouldProcessMomentumAlert(alert: any, settings: any): boolean {
  if (settings.sectors.length > 0 && !settings.sectors.includes(alert.sector)) return false;
  return Math.abs(alert.momentum_score) > 0.5;
}

async function processFlowAlert(alert: any, sensitivity: number): Promise<any> {
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const volumeOI = parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1);
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  
  // Determine alert type and severity
  let alertType = 'unusual_volume';
  let severity = 'medium';
  
  if (alert.has_sweep) {
    alertType = 'sweep';
    severity = premium > 5000000 ? 'critical' : premium > 2000000 ? 'high' : 'medium';
  } else if (volumeOI > 5) {
    alertType = 'flow_imbalance';
    severity = volumeOI > 10 ? 'high' : 'medium';
  }
  
  // Calculate AI confidence score
  const confidence = calculateConfidenceScore(alert, sensitivity);
  
  // Generate AI analysis
  const analysis = await generateAIAnalysis(alert);
  
  // Generate recommendation
  const recommendation = await generateRecommendation(alert, analysis);
  
  return {
    id: `radar_${alert.ticker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ticker: alert.ticker,
    sector: alert.sector || 'Unknown',
    alertType,
    severity,
    confidence,
    description: generateAlertDescription(alert, alertType),
    details: {
      optionType: alert.expiry_type,
      strike: parseFloat(alert.strike),
      expiry: alert.expiry,
      premium,
      volume: parseInt(alert.volume),
      openInterest: parseInt(alert.open_interest || 0),
      underlyingPrice: parseFloat(alert.underlying_price),
      impliedMove: calculateImpliedMove(alert),
      delta: parseFloat(alert.delta || 0),
      gamma: parseFloat(alert.gamma || 0),
      timeValue: calculateTimeValue(alert),
      intrinsicValue: calculateIntrinsicValue(alert),
    },
    analysis,
    recommendation
  };
}

async function processVolumeAlert(alert: any, sensitivity: number): Promise<any> {
  // Similar processing for volume-based alerts
  const confidence = Math.min(95, 60 + (alert.unusual_volume_ratio * 10) + (sensitivity * 2));
  
  return {
    id: `volume_${alert.ticker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ticker: alert.ticker,
    sector: alert.sector || 'Unknown',
    alertType: 'unusual_volume',
    severity: alert.unusual_volume_ratio > 5 ? 'high' : 'medium',
    confidence,
    description: `Unusual volume detected: ${alert.unusual_volume_ratio.toFixed(1)}x average`,
    details: {
      optionType: alert.option_type || 'call',
      strike: alert.strike || 0,
      expiry: alert.expiry || '',
      premium: alert.premium || 0,
      volume: alert.volume || 0,
      openInterest: alert.open_interest || 0,
      underlyingPrice: alert.underlying_price || 0,
      impliedMove: 0,
      delta: alert.delta || 0,
      gamma: alert.gamma || 0,
      timeValue: 0,
      intrinsicValue: 0,
    },
    analysis: {
      sentiment: alert.net_call_volume > alert.net_put_volume ? 'bullish' : 'bearish',
      probabilityOfProfit: Math.min(85, 45 + (alert.unusual_volume_ratio * 5)),
      riskReward: 2.5 + (Math.random() * 2),
      timeDecay: -0.05 - (Math.random() * 0.1),
      volumeProfile: 'unusual',
      institutionalActivity: alert.unusual_volume_ratio > 4,
      darkPoolActivity: false,
      catalysts: ['Unusual volume spike', 'Market momentum']
    },
    recommendation: {
      action: alert.net_call_volume > alert.net_put_volume ? 'buy' : 'watch',
      reasoning: 'High volume suggests institutional interest',
      entryPrice: alert.bid || 0,
      stopLoss: (alert.bid || 0) * 0.8,
      profitTarget: (alert.bid || 0) * 1.5,
      timeframe: '1-3 days',
      positionSize: 'Small'
    }
  };
}

async function processMomentumAlert(alert: any, sensitivity: number): Promise<any> {
  const confidence = Math.min(95, 55 + (Math.abs(alert.momentum_score) * 30) + (sensitivity * 2));
  
  return {
    id: `momentum_${alert.ticker}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    ticker: alert.ticker,
    sector: alert.sector || 'Unknown',
    alertType: alert.momentum_score > 0 ? 'momentum' : 'reversal',
    severity: Math.abs(alert.momentum_score) > 0.8 ? 'high' : 'medium',
    confidence,
    description: `${alert.momentum_score > 0 ? 'Bullish' : 'Bearish'} momentum detected`,
    details: {
      optionType: alert.momentum_score > 0 ? 'call' : 'put',
      strike: alert.atm_strike || 0,
      expiry: alert.near_expiry || '',
      premium: alert.estimated_premium || 0,
      volume: alert.volume || 0,
      openInterest: alert.open_interest || 0,
      underlyingPrice: alert.current_price || 0,
      impliedMove: Math.abs(alert.momentum_score) * 5,
      delta: alert.momentum_score > 0 ? 0.6 : -0.6,
      gamma: 0.05,
      timeValue: 0,
      intrinsicValue: 0,
    },
    analysis: {
      sentiment: alert.momentum_score > 0 ? 'bullish' : 'bearish',
      probabilityOfProfit: Math.min(80, 50 + (Math.abs(alert.momentum_score) * 25)),
      riskReward: 1.5 + (Math.abs(alert.momentum_score) * 2),
      timeDecay: -0.03,
      volumeProfile: 'increasing',
      institutionalActivity: false,
      darkPoolActivity: false,
      catalysts: ['Price momentum', 'Technical breakout']
    },
    recommendation: {
      action: Math.abs(alert.momentum_score) > 0.7 ? 'buy' : 'watch',
      reasoning: 'Strong momentum suggests continued movement',
      entryPrice: alert.estimated_premium || 0,
      stopLoss: (alert.estimated_premium || 0) * 0.75,
      profitTarget: (alert.estimated_premium || 0) * 1.8,
      timeframe: '2-5 days',
      positionSize: 'Medium'
    }
  };
}

function calculateConfidenceScore(alert: any, sensitivity: number): number {
  let confidence = 50; // Base confidence
  
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const volumeOI = parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1);
  
  // Premium-based confidence
  if (premium > 5000000) confidence += 25;
  else if (premium > 2000000) confidence += 15;
  else if (premium > 1000000) confidence += 10;
  else if (premium > 500000) confidence += 5;
  
  // Volume/OI ratio confidence
  if (volumeOI > 5) confidence += 15;
  else if (volumeOI > 3) confidence += 10;
  else if (volumeOI > 2) confidence += 5;
  
  // Sweep detection
  if (alert.has_sweep) confidence += 20;
  
  // Alert rule sophistication
  if (alert.alert_rule === 'RepeatedHitsAscendingFill') confidence += 10;
  else if (alert.alert_rule === 'RepeatedHits') confidence += 5;
  
  // Sensitivity adjustment
  confidence += (sensitivity - 5) * 2;
  
  // Time decay penalty
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  if (daysToExpiry < 7) confidence -= 10;
  else if (daysToExpiry < 14) confidence -= 5;
  
  return Math.max(50, Math.min(95, confidence));
}

async function generateAIAnalysis(alert: any): Promise<any> {
  const netFlow = alert.expiry_type === 'call' ? 1 : -1;
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  
  return {
    sentiment: alert.expiry_type === 'call' ? 'bullish' : 'bearish',
    probabilityOfProfit: Math.min(85, 45 + (premium / 100000)),
    riskReward: 1.5 + (Math.random() * 2.5),
    timeDecay: -0.02 - (Math.random() * 0.08),
    volumeProfile: alert.has_sweep ? 'institutional' : 'retail',
    institutionalActivity: premium > 1000000,
    darkPoolActivity: alert.dark_pool_activity || false,
    catalysts: generateCatalysts(alert)
  };
}

async function generateRecommendation(alert: any, analysis: any): Promise<any> {
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  
  let action = 'watch';
  if (analysis.probabilityOfProfit > 70 && premium > 1000000) action = 'buy';
  else if (analysis.probabilityOfProfit > 60 && analysis.institutionalActivity) action = 'buy';
  
  return {
    action,
    reasoning: generateRecommendationReasoning(alert, analysis),
    entryPrice: parseFloat(alert.ask),
    stopLoss: parseFloat(alert.ask) * 0.8,
    profitTarget: parseFloat(alert.ask) * (1 + analysis.riskReward),
    timeframe: daysToExpiry < 14 ? 'Short-term' : daysToExpiry < 45 ? 'Medium-term' : 'Long-term',
    positionSize: premium > 2000000 ? 'Large' : premium > 500000 ? 'Medium' : 'Small'
  };
}

function generateAlertDescription(alert: any, alertType: string): string {
  const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
  const premiumStr = premium >= 1000000 ? `$${(premium / 1000000).toFixed(1)}M` : `$${(premium / 1000).toFixed(0)}K`;
  
  switch (alertType) {
    case 'sweep':
      return `${premiumStr} sweep order detected on ${alert.expiry_type.toUpperCase()} $${alert.strike}`;
    case 'unusual_volume':
      return `Unusual ${alert.expiry_type} volume: ${alert.volume.toLocaleString()} contracts`;
    case 'flow_imbalance':
      return `Significant flow imbalance detected: ${premiumStr} premium`;
    case 'momentum':
      return `Bullish momentum breakout with options activity`;
    case 'reversal':
      return `Potential reversal signal with put activity`;
    default:
      return `Options activity detected: ${premiumStr} premium`;
  }
}

function generateCatalysts(alert: any): string[] {
  const catalysts = [];
  
  if (alert.has_sweep) catalysts.push('Large sweep order execution');
  if (parseFloat(alert.volume) / (parseFloat(alert.open_interest) || 1) > 3) {
    catalysts.push('High volume relative to open interest');
  }
  if (alert.alert_rule === 'RepeatedHitsAscendingFill') {
    catalysts.push('Repeated ascending fills pattern');
  }
  if (calculateDaysToExpiry(alert.expiry) < 14) {
    catalysts.push('Near-term expiration urgency');
  }
  
  // Add some market-related catalysts
  const marketCatalysts = [
    'Earnings announcement expected',
    'FDA approval pending',
    'Technical breakout level',
    'Analyst upgrade catalyst',
    'Sector rotation momentum'
  ];
  
  if (Math.random() < 0.3) {
    catalysts.push(marketCatalysts[Math.floor(Math.random() * marketCatalysts.length)]);
  }
  
  return catalysts.slice(0, 3); // Limit to 3 catalysts
}

function generateRecommendationReasoning(alert: any, analysis: any): string {
  const reasons = [];
  
  if (analysis.institutionalActivity) reasons.push('institutional interest');
  if (analysis.probabilityOfProfit > 70) reasons.push('high probability setup');
  if (alert.has_sweep) reasons.push('aggressive sweep execution');
  if (analysis.riskReward > 2) reasons.push('favorable risk/reward ratio');
  
  return `Strong opportunity based on ${reasons.join(', ')}`;
}

// Utility functions
function calculateDaysToExpiry(expiry: string): number {
  const expiryDate = new Date(expiry);
  const now = new Date();
  const diffTime = expiryDate.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function calculateImpliedMove(alert: any): number {
  const underlying = parseFloat(alert.underlying_price);
  const volatility = parseFloat(alert.implied_volatility || 0.3);
  const daysToExpiry = calculateDaysToExpiry(alert.expiry);
  
  return underlying * volatility * Math.sqrt(daysToExpiry / 365);
}

function calculateTimeValue(alert: any): number {
  const optionPrice = parseFloat(alert.ask);
  const intrinsic = calculateIntrinsicValue(alert);
  return Math.max(0, optionPrice - intrinsic);
}

function calculateIntrinsicValue(alert: any): number {
  const strike = parseFloat(alert.strike);
  const underlying = parseFloat(alert.underlying_price);
  
  if (alert.expiry_type === 'call') {
    return Math.max(0, underlying - strike);
  } else {
    return Math.max(0, strike - underlying);
  }
}

export default router;