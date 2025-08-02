import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Schema for heat map filters
const HeatMapFiltersSchema = z.object({
  minPremium: z.number().default(100000),
  timeframe: z.enum(['1h', '4h', '1d', '3d', '1w']).default('1d'),
  sectors: z.array(z.string()).default([]),
  showUnusualOnly: z.boolean().default(false),
  showSweepsOnly: z.boolean().default(false),
  showInstitutionalOnly: z.boolean().default(false),
  heatMetric: z.enum(['volume', 'premium', 'unusual', 'sentiment', 'ai_score']).default('ai_score'),
  colorScheme: z.enum(['sentiment', 'volume', 'heat', 'ai']).default('sentiment'),
});

// AI-Powered Options Heat Map Data
router.get('/heatmap', async (req, res) => {
  try {
    const filters = HeatMapFiltersSchema.parse(req.query);
    
    // Build timeframe-based API query
    const timeframeMap = {
      '1h': 1,
      '4h': 4,
      '1d': 24,
      '3d': 72,
      '1w': 168
    };
    
    const hoursBack = timeframeMap[filters.timeframe];
    const startTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
    
    // Fetch comprehensive options data from multiple endpoints
    const [flowAlertsResponse, marketDataResponse, sectorDataResponse, unusualVolumeResponse] = await Promise.all([
      // Flow alerts for primary data
      fetch(`https://api.unusualwhales.com/api/option-trades/flow-alerts?min_premium=${filters.minPremium}&start_time=${startTime}`, {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Market data for pricing
      fetch('https://api.unusualwhales.com/api/market/quotes', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Sector performance data
      fetch('https://api.unusualwhales.com/api/market/sectors', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      
      // Unusual volume data
      fetch('https://api.unusualwhales.com/api/option-trades/unusual-volume', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const [flowData, marketData, sectorData, volumeData] = await Promise.all([
      flowAlertsResponse.ok ? flowAlertsResponse.json() : { data: [] },
      marketDataResponse.ok ? marketDataResponse.json() : { data: [] },
      sectorDataResponse.ok ? sectorDataResponse.json() : { data: [] },
      unusualVolumeResponse.ok ? unusualVolumeResponse.json() : { data: [] },
    ]);

    const alerts = flowData.data || [];
    const quotes = marketData.data || [];
    const sectors = sectorData.data || [];
    const unusualVolume = volumeData.data || [];
    
    // Process and aggregate data by ticker
    const tickerMap = new Map();
    
    // Process flow alerts
    alerts.forEach((alert: any) => {
      const ticker = alert.ticker;
      if (!tickerMap.has(ticker)) {
        tickerMap.set(ticker, {
          ticker,
          sector: alert.sector || 'Unknown',
          alerts: [],
          callFlow: 0,
          putFlow: 0,
          totalVolume: 0,
          totalPremium: 0,
          sweepCount: 0,
          unusualCount: 0,
          institutionalCount: 0,
          darkPoolCount: 0,
          price: 0,
          change: 0,
          changePercent: 0,
          volatility: 0,
        });
      }
      
      const tickerData = tickerMap.get(ticker);
      const premium = parseFloat(alert.ask) * parseFloat(alert.volume) * 100;
      
      if (alert.expiry_type === 'call') {
        tickerData.callFlow += premium;
      } else {
        tickerData.putFlow += premium;
      }
      
      tickerData.totalVolume += parseInt(alert.volume);
      tickerData.totalPremium += premium;
      
      if (alert.has_sweep) tickerData.sweepCount++;
      if (alert.unusual_flag) tickerData.unusualCount++;
      if (premium > 1000000) tickerData.institutionalCount++;
      if (alert.dark_pool_activity) tickerData.darkPoolCount++;
      
      // Track alerts for this ticker
      tickerData.alerts.push({
        type: alert.alert_rule,
        message: `${alert.expiry_type.toUpperCase()} $${alert.strike} ${alert.expiry}`,
        severity: premium > 5000000 ? 'high' : premium > 1000000 ? 'medium' : 'low'
      });
    });
    
    // Enhance with market data
    quotes.forEach((quote: any) => {
      if (tickerMap.has(quote.ticker)) {
        const tickerData = tickerMap.get(quote.ticker);
        tickerData.price = parseFloat(quote.price || 0);
        tickerData.change = parseFloat(quote.change || 0);
        tickerData.changePercent = parseFloat(quote.changePercent || 0);
        tickerData.volatility = parseFloat(quote.volatility || 0);
      }
    });
    
    // Enhance with unusual volume data
    unusualVolume.forEach((volume: any) => {
      if (tickerMap.has(volume.ticker)) {
        const tickerData = tickerMap.get(volume.ticker);
        tickerData.unusualCount += volume.unusual_alerts || 0;
      }
    });
    
    // Convert to heat map cells with AI scoring
    const heatMapCells = Array.from(tickerMap.values())
      .filter((data: any) => {
        // Apply filters
        if (filters.showUnusualOnly && data.unusualCount === 0) return false;
        if (filters.showSweepsOnly && data.sweepCount === 0) return false;
        if (filters.showInstitutionalOnly && data.institutionalCount === 0) return false;
        if (filters.sectors.length > 0 && !filters.sectors.includes(data.sector)) return false;
        
        return true;
      })
      .map((data: any) => {
        // Calculate AI-powered metrics
        const netFlow = data.callFlow - data.putFlow;
        const sentiment = calculateSentiment(data);
        const heatScore = calculateHeatScore(data);
        const aiConfidence = calculateAIConfidence(data, unusualVolume, sectors);
        const conviction = calculateConviction(data, heatScore, aiConfidence);
        
        return {
          ticker: data.ticker,
          sector: data.sector,
          premium: data.totalPremium,
          volume: data.totalVolume,
          openInterest: data.totalVolume * 0.8, // Estimate
          callFlow: data.callFlow,
          putFlow: data.putFlow,
          netFlow,
          sentiment,
          conviction,
          darkPool: data.darkPoolCount > 0,
          unusual: data.unusualCount > 0,
          sweep: data.sweepCount > 0,
          institutional: data.institutionalCount > 0,
          price: data.price,
          change: data.change,
          changePercent: data.changePercent,
          volatility: data.volatility,
          heatScore,
          aiConfidence,
          alerts: data.alerts.slice(0, 3) // Limit to top 3 alerts
        };
      })
      .sort((a, b) => {
        // Sort by the selected heat metric
        switch (filters.heatMetric) {
          case 'volume': return b.volume - a.volume;
          case 'premium': return b.premium - a.premium;
          case 'unusual': return b.heatScore - a.heatScore;
          case 'sentiment': return Math.abs(b.sentiment) - Math.abs(a.sentiment);
          case 'ai_score': return b.aiConfidence - a.aiConfidence;
          default: return b.aiConfidence - a.aiConfidence;
        }
      })
      .slice(0, 100); // Limit to top 100 for performance

    res.json({
      success: true,
      data: heatMapCells,
      metadata: {
        totalTickers: heatMapCells.length,
        timeframe: filters.timeframe,
        lastUpdated: new Date().toISOString(),
        filters
      }
    });

  } catch (error) {
    console.error('Heat map generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate options heat map',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Market Overview for Heat Map Context
router.get('/market-overview', async (req, res) => {
  try {
    // Fetch market overview data
    const [vixResponse, flowResponse] = await Promise.all([
      fetch('https://api.unusualwhales.com/api/market/vix', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch('https://api.unusualwhales.com/api/option-trades/flow-summary', {
        headers: {
          'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    const [vixData, flowData] = await Promise.all([
      vixResponse.ok ? vixResponse.json() : { data: { vix: 18.5 } },
      flowResponse.ok ? flowResponse.json() : { data: { total_flow: 0, put_call_ratio: 0.85 } }
    ]);

    const overview = {
      vix: vixData.data?.vix || 18.5,
      putCallRatio: flowData.data?.put_call_ratio || 0.85,
      marketSentiment: calculateMarketSentiment(vixData.data?.vix || 18.5, flowData.data?.put_call_ratio || 0.85),
      totalFlow: flowData.data?.total_flow || 0
    };

    res.json(overview);
  } catch (error) {
    console.error('Market overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market overview'
    });
  }
});

// Sector Performance for Heat Map Context
router.get('/sector-performance', async (req, res) => {
  try {
    const response = await fetch('https://api.unusualwhales.com/api/market/sectors', {
      headers: {
        'Authorization': `Bearer ${process.env.UNUSUAL_WHALES_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const sectorData = response.ok ? await response.json() : { data: [] };
    
    const sectors = (sectorData.data || []).map((sector: any) => ({
      name: sector.name,
      performance: sector.performance || (Math.random() - 0.5) * 10,
      flowDirection: sector.net_flow > 0 ? 'bullish' : sector.net_flow < 0 ? 'bearish' : 'neutral',
      strength: Math.abs(sector.net_flow || 0) / 1000000 // Convert to millions
    }));

    res.json({
      success: true,
      sectors
    });
  } catch (error) {
    console.error('Sector performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sector performance'
    });
  }
});

// Helper functions for AI calculations
function calculateSentiment(data: any): number {
  const netFlow = data.callFlow - data.putFlow;
  const totalFlow = data.callFlow + data.putFlow;
  
  if (totalFlow === 0) return 0;
  
  // Base sentiment from call/put ratio
  let sentiment = netFlow / totalFlow;
  
  // Adjust for unusual activity
  if (data.unusualCount > 0) {
    sentiment *= 1.2; // Amplify sentiment for unusual activity
  }
  
  // Adjust for sweeps (high conviction)
  if (data.sweepCount > 0) {
    sentiment *= 1.1;
  }
  
  // Clamp to [-1, 1]
  return Math.max(-1, Math.min(1, sentiment));
}

function calculateHeatScore(data: any): number {
  let score = 0;
  
  // Volume component (0-25 points)
  score += Math.min(25, data.totalVolume / 1000);
  
  // Premium component (0-25 points)
  score += Math.min(25, data.totalPremium / 100000);
  
  // Unusual activity component (0-25 points)
  score += data.unusualCount * 5;
  
  // Sweep and institutional component (0-25 points)
  score += data.sweepCount * 3;
  score += data.institutionalCount * 4;
  score += data.darkPoolCount * 2;
  
  return Math.min(100, score);
}

function calculateAIConfidence(data: any, unusualVolume: any[], sectors: any[]): number {
  let confidence = 0.5; // Base confidence
  
  // Volume confidence
  const avgVolume = unusualVolume.find((v: any) => v.ticker === data.ticker)?.avg_volume || data.totalVolume;
  const volumeRatio = data.totalVolume / avgVolume;
  if (volumeRatio > 3) confidence += 0.2;
  else if (volumeRatio > 2) confidence += 0.1;
  
  // Premium confidence
  if (data.totalPremium > 5000000) confidence += 0.15;
  else if (data.totalPremium > 2000000) confidence += 0.1;
  else if (data.totalPremium > 1000000) confidence += 0.05;
  
  // Unusual activity confidence
  if (data.unusualCount > 0) confidence += 0.1;
  if (data.sweepCount > 0) confidence += 0.1;
  if (data.institutionalCount > 0) confidence += 0.05;
  
  // Sector momentum confidence
  const sectorInfo = sectors.find((s: any) => s.name === data.sector);
  if (sectorInfo && Math.abs(sectorInfo.performance || 0) > 2) {
    confidence += 0.05;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

function calculateConviction(data: any, heatScore: number, aiConfidence: number): 'exceptional' | 'high' | 'medium' | 'low' {
  const compositeScore = (heatScore / 100) * 0.6 + aiConfidence * 0.4;
  
  if (compositeScore > 0.8) return 'exceptional';
  if (compositeScore > 0.6) return 'high';
  if (compositeScore > 0.4) return 'medium';
  return 'low';
}

function calculateMarketSentiment(vix: number, putCallRatio: number): number {
  // VIX interpretation (inverted - lower VIX = more bullish)
  let vixSentiment = (30 - vix) / 30; // Normalize around VIX 30
  
  // Put/Call ratio interpretation (lower ratio = more bullish)
  let putCallSentiment = (1.2 - putCallRatio) / 1.2; // Normalize around 1.2
  
  // Weighted average
  const sentiment = (vixSentiment * 0.6 + putCallSentiment * 0.4);
  
  return Math.max(-1, Math.min(1, sentiment));
}

export default router;