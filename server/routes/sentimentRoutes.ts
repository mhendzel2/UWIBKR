import { Router } from 'express';
import { marketSentimentService } from '../services/marketSentimentService';
import { sentimentAnalysisService } from '../services/sentimentAnalysis';
import { gexTracker } from '../services/gexTracker';
import { comprehensiveMarketSentimentService } from '../services/comprehensiveMarketSentiment';
import { historicalSentimentService } from '../services/historicalSentimentService';

const router = Router();

// Get comprehensive market sentiment analysis with historical tracking
router.get('/market', async (req, res) => {
  try {
    console.log('📊 Fetching comprehensive market sentiment...');
    
    // Get comprehensive sentiment data
    const sentimentData = await comprehensiveMarketSentimentService.getComprehensiveMarketSentiment();
    
    // Store historical record
    await historicalSentimentService.storeCurrentSentiment(sentimentData);
    
    res.json({
      success: true,
      data: sentimentData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching market sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market sentiment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Historical sentiment data for charts
router.get('/historical/:timeframe', async (req, res) => {
  try {
    const { timeframe } = req.params;
    const validTimeframes = ['1h', '4h', '24h', '7d', '30d'];
    
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Use: 1h, 4h, 24h, 7d, 30d'
      });
    }
    
    console.log(`📈 Fetching ${timeframe} historical sentiment data...`);
    
    const historicalData = await historicalSentimentService.getHistoricalData(timeframe as any);
    
    res.json({
      success: true,
      data: historicalData,
      timeframe,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching historical sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch historical sentiment data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sentiment statistics and trends
router.get('/stats/:timeframe?', async (req, res) => {
  try {
    const { timeframe = '7d' } = req.params;
    const validTimeframes = ['7d', '30d'];
    
    if (!validTimeframes.includes(timeframe)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timeframe. Use: 7d, 30d'
      });
    }
    
    console.log(`📊 Calculating sentiment statistics for ${timeframe}...`);
    
    const stats = await historicalSentimentService.getSentimentStats(timeframe as any);
    
    res.json({
      success: true,
      data: stats,
      timeframe,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error calculating sentiment stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate sentiment statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Latest sentiment snapshot
router.get('/latest', async (req, res) => {
  try {
    console.log('📊 Fetching latest sentiment snapshot...');
    
    const latestSentiment = await historicalSentimentService.getLatestSentiment();
    
    res.json({
      success: true,
      data: latestSentiment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching latest sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch latest sentiment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Data collection status and health
router.get('/collection/status', async (req, res) => {
  try {
    const { sentimentDataCollectorService } = await import('../services/sentimentDataCollectorService');
    
    const status = sentimentDataCollectorService.getStatus();
    const healthCheck = await sentimentDataCollectorService.healthCheck();
    const recentHistory = await sentimentDataCollectorService.getCollectionHistory(5);
    
    res.json({
      success: true,
      data: {
        ...status,
        health: healthCheck,
        recentCollections: recentHistory
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching collection status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch collection status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Force data collection
router.post('/collection/force', async (req, res) => {
  try {
    const { sentimentDataCollectorService } = await import('../services/sentimentDataCollectorService');
    
    console.log('🔄 Forcing sentiment data collection...');
    await sentimentDataCollectorService.forceCollection();
    
    res.json({
      success: true,
      message: 'Sentiment data collection forced successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error forcing data collection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to force data collection',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get Trump communication alerts specifically
router.get('/trump-alerts', async (req, res) => {
  try {
    const alerts = await marketSentimentService.getTrumpAlerts();
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching Trump alerts:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Trump alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get ticker-specific sentiment
router.get('/ticker/:symbol', async (req, res) => {
  try {
    const data = await sentimentAnalysisService.getTickerSentiment(req.params.symbol);
    res.json(data);
  } catch (error) {
    console.error('Error fetching ticker sentiment:', error);
    res.status(500).json({
      error: 'Failed to fetch ticker sentiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get market sentiment using SPY as proxy
router.get('/market-proxy', async (_req, res) => {
  try {
    const data = await sentimentAnalysisService.getMarketSentiment();
    res.json(data);
  } catch (error) {
    console.error('Error fetching market sentiment proxy:', error);
    res.status(500).json({
      error: 'Failed to fetch market sentiment proxy',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get market sentiment using direct market tide data
router.get('/market-tide', async (_req, res) => {
  try {
    const data = await sentimentAnalysisService.getMarketSentimentDirect();
    res.json(data);
  } catch (error) {
    console.error('Error fetching market tide:', error);
    res.status(500).json({
      error: 'Failed to fetch market tide',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sector sentiment using sector ETF proxy
router.get('/sector/:sector', async (req, res) => {
  try {
    const data = await sentimentAnalysisService.getSectorSentiment(req.params.sector);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sector sentiment:', error);
    res.status(500).json({
      error: 'Failed to fetch sector sentiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get sentiment for all watchlist tickers
router.get('/watchlist', async (_req, res) => {
  try {
    await gexTracker.refreshSentiments();
    res.json(gexTracker.getWatchlistSentiments());
  } catch (error) {
    console.error('Error fetching watchlist sentiment:', error);
    res.status(500).json({
      error: 'Failed to fetch watchlist sentiment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific sentiment component
router.get('/:component', async (req, res) => {
  try {
    const { component } = req.params;
    const sentiment = await marketSentimentService.getMarketSentiment();
    
    switch (component) {
      case 'crypto':
        res.json(sentiment.crypto);
        break;
      case 'commodities':
        res.json(sentiment.commodities);
        break;
      case 'trump':
        res.json(sentiment.trumpCommunications);
        break;
      case 'overall':
        res.json(sentiment.overallSentiment);
        break;
      default:
        res.status(400).json({ error: 'Invalid component' });
    }
  } catch (error) {
    console.error('Error fetching sentiment component:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sentiment component',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
