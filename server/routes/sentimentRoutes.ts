import { Router } from 'express';
import { marketSentimentService } from '../services/marketSentimentService';
import { sentimentAnalysisService } from '../services/sentimentAnalysis';
import { gexTracker } from '../services/gexTracker';

const router = Router();

// Get comprehensive market sentiment analysis
router.get('/market', async (req, res) => {
  try {
    const sentiment = await marketSentimentService.getMarketSentiment();
    res.json(sentiment);
  } catch (error) {
    console.error('Error fetching market sentiment:', error);
    res.status(500).json({ 
      error: 'Failed to fetch market sentiment',
      message: error instanceof Error ? error.message : 'Unknown error'
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

// Get sector/ETF tide and net flow expiry sentiment
router.get('/sector/:sector/tide-expiry', async (req, res) => {
  try {
    const data = await sentimentAnalysisService.getSectorTideExpirySentiment(req.params.sector);
    res.json(data);
  } catch (error) {
    console.error('Error fetching sector tide expiry sentiment:', error);
    res.status(500).json({
      error: 'Failed to fetch sector tide expiry sentiment',
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
