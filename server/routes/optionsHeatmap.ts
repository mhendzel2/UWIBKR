import { Router } from 'express';
import { z } from 'zod';
import { UnusualWhalesService } from '../services/unusualWhales';
import { webSocketService } from '../services/websocketService'; // Import WebSocket service

const router = Router();
const unusualWhales = new UnusualWhalesService();

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

// Test endpoint
router.get('/test', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Options heatmap module is working!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI-Powered Options Heat Map Data
router.get('/heatmap', async (req, res) => {
  try {
    const filters = HeatMapFiltersSchema.parse(req.query);
    
    // Fetch real data using the enhanced UnusualWhales service
    const flowAlerts = await unusualWhales.getFlowAlerts({
      minPremium: filters.minPremium,
      // Add other filters based on your schema
    });

    // Map API snake_case to local camelCase for FlowAlert
    const mappedFlowAlerts = Array.isArray(flowAlerts)
      ? flowAlerts.map((alert: any) => ({
          ticker: alert.ticker_symbol || alert.ticker || '',
          sector: alert.sector || 'Unknown',
          premium: alert.total_premium ?? 0,
          volume: alert.total_volume ?? 0,
          netFlow: alert.net_premium ?? 0,
          sentiment: 0, // Placeholder for sentiment analysis
          conviction: 'medium', // Placeholder
          price: alert.underlying_price ?? 0,
          change: 0, // Placeholder
          changePercent: 0, // Placeholder
          heatScore: 0, // Placeholder
          aiConfidence: 0, // Placeholder
          darkPool: false, // Placeholder
          unusual: true,
          sweep: alert.is_sweep ?? false,
          institutional: alert.is_institutional ?? false,
          alerts: [{
            type: alert.rule_name || '',
            message: `${alert.option_type || ''} ${alert.strike_price ?? ''} ${alert.expiry_date ?? ''}`,
            severity: 'medium'
          }]
        }))
      : [];

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: mappedFlowAlerts,
      metadata: {
        totalTickers: mappedFlowAlerts.length,
        totalPremium: mappedFlowAlerts.reduce((sum, cell) => sum + (cell.premium || 0), 0),
        avgConfidence: 0,
        lastUpdated: new Date().toISOString(),
        filters: filters
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
router.get('/overview', async (req, res) => {
  try {
    // Fetch real market overview data
    const [
        marketTide,
        totalVolume,
        sectorETFs
    ] = await Promise.all([
        unusualWhales.getMarketTide(),
        unusualWhales.getTotalOptionsVolumeEnhanced(),
        unusualWhales.getSectorETFsEnhanced()
    ]);

    const overview = {
      marketSentiment: marketTide?.market_sentiment_index / 100 || 0.5,
      totalPremium: totalVolume?.total_premium || 0,
      totalVolume: totalVolume?.total_volume || 0,
      putCallRatio: totalVolume?.put_call_ratio || 0,
      vix: 0, // VIX data needs another source or endpoint
      topSectors: sectorETFs.slice(0, 5).map((etf: any) => ({
          name: etf.sector,
          flow: etf.total_premium,
          sentiment: etf.sentiment, // Assuming sentiment is available
      }))
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

// WebSocket endpoint for clients to connect
// This would typically be handled in a separate file (e.g., websocketRoutes.ts)
// but adding here for simplicity to show integration.
// Sector Performance endpoint
router.get('/sector-performance', async (req, res) => {
  try {
    // Fetch sector performance data from UnusualWhales or calculate from flow data
    // const sectorData = await unusualWhales.getSectorPerformance();
    
    // Mock data structure for now - replace with real implementation
    const sectorPerformance = [
      {
        sector: 'Technology',
        performance: 2.3,
        volume: 1250000,
        sentiment: 'bullish',
        topTickers: ['AAPL', 'MSFT', 'GOOGL'],
        flowStrength: 85
      },
      {
        sector: 'Finance',
        performance: -0.8,
        volume: 890000,
        sentiment: 'bearish',
        topTickers: ['JPM', 'BAC', 'WFC'],
        flowStrength: 62
      },
      {
        sector: 'Healthcare',
        performance: 1.2,
        volume: 720000,
        sentiment: 'neutral',
        topTickers: ['JNJ', 'PFE', 'UNH'],
        flowStrength: 71
      },
      {
        sector: 'Energy',
        performance: 3.1,
        volume: 650000,
        sentiment: 'bullish',
        topTickers: ['XOM', 'CVX', 'COP'],
        flowStrength: 78
      }
    ];

    res.json(sectorPerformance);
  } catch (error) {
    console.error('❌ Error fetching sector performance:', error);
    res.status(500).json({ error: 'Failed to fetch sector performance data' });
  }
});

// Market Overview endpoint
router.get('/market-overview', async (req, res) => {
  try {
    // Fetch market overview data from multiple sources
    const marketOverview = {
      marketSentiment: 'bullish',
      fearGreedIndex: 72,
      vixLevel: 18.5,
      vixTrend: 'falling',
      majorIndices: {
        spy: { price: 445.20, change: 1.2, changePercent: 0.27 },
        qqq: { price: 375.80, change: 2.1, changePercent: 0.56 },
        iwm: { price: 198.40, change: -0.3, changePercent: -0.15 }
      },
      optionsMetrics: {
        totalVolume: 28500000,
        putCallRatio: 0.78,
        unusualActivity: 145,
        largestTrades: [
          { symbol: 'AAPL', premium: 2500000, type: 'call', sentiment: 'bullish' },
          { symbol: 'TSLA', premium: 1800000, type: 'put', sentiment: 'bearish' },
          { symbol: 'NVDA', premium: 3200000, type: 'call', sentiment: 'bullish' }
        ]
      },
      sectorRotation: {
        inflows: ['Technology', 'Energy'],
        outflows: ['Utilities', 'Real Estate'],
        neutral: ['Healthcare', 'Consumer Staples']
      },
      newsFlow: {
        bullishStories: 12,
        bearishStories: 7,
        neutralStories: 15,
        totalStories: 34
      }
    };

    res.json(marketOverview);
  } catch (error) {
    console.error('❌ Error fetching market overview:', error);
    res.status(500).json({ error: 'Failed to fetch market overview data' });
  }
});

export const upgradeHeatmapSocket = (ws: any, req: any) => {
    console.log('Client connected to heatmap updates');
    
    // Set up interval to send updates every 5 seconds
    const updateInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ 
                type: 'heatmap_update', 
                timestamp: new Date().toISOString(),
                data: 'Live heatmap data would go here'
            }));
        }
    }, 5000);

    ws.on('close', () => {
        console.log('Client disconnected from heatmap');
        clearInterval(updateInterval);
    });
};

export default router;