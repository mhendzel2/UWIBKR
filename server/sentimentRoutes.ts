import { Router } from 'express';
// Gemini-based AI analysis should be implemented here if needed

const router = Router();

interface SentimentData {
  symbol: string;
  sector: string;
  sentiment: number; // -1 to 1
  volume: number;
  volatility: number;
  priceChange: number;
  momentum: number;
  strength: number;
  timestamp: string;
}

interface SectorStats {
  sector: string;
  avgSentiment: number;
  totalVolume: number;
  stockCount: number;
  topGainer: string;
  topLoser: string;
}

// Market sectors and their representative stocks
const marketSectors = {
  'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'NFLX', 'CRM', 'ORCL'],
  'Healthcare': ['JNJ', 'UNH', 'PFE', 'ABT', 'TMO', 'MRK', 'ABBV', 'MDT', 'DHR', 'BMY'],
  'Financial Services': ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'BLK', 'SPGI', 'CB'],
  'Consumer Cyclical': ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'LOW', 'TJX', 'F', 'GM'],
  'Communication Services': ['META', 'GOOGL', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'CHTR', 'TMUS', 'NXPI'],
  'Industrials': ['BA', 'CAT', 'GE', 'HON', 'UPS', 'RTX', 'LMT', 'DE', 'MMM', 'FDX'],
  'Consumer Defensive': ['PG', 'KO', 'PEP', 'WMT', 'COST', 'CL', 'KMB', 'GIS', 'K', 'CPB'],
  'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'PSX', 'VLO', 'MPC', 'OXY', 'HAL'],
  'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED'],
  'Real Estate': ['AMT', 'PLD', 'CCI', 'EQIX', 'PSA', 'WELL', 'DLR', 'O', 'SBAC', 'EXR']
};

// Cache for sentiment data
let sentimentCache: Map<string, SentimentData[]> = new Map();
let lastUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Get heatmap data for sentiment visualization
router.get('/heatmap', async (req, res) => {
  try {
    const { timeframe = '1D', viewMode = 'sentiment' } = req.query;
    const cacheKey = `${timeframe}_${viewMode}`;
    
    console.log(`📊 Generating sentiment heatmap for ${timeframe} timeframe, ${viewMode} view`);
    
    // Check cache
    const now = Date.now();
    if (sentimentCache.has(cacheKey) && (now - lastUpdate) < CACHE_DURATION) {
      console.log(`📦 Returning cached sentiment data for ${cacheKey}`);
      return res.json(sentimentCache.get(cacheKey));
    }
    
    // Generate sentiment data for all stocks
    const sentimentData = await generateMarketSentimentData(timeframe as string, viewMode as string);
    
    // Update cache
    sentimentCache.set(cacheKey, sentimentData);
    lastUpdate = now;
    
    console.log(`✅ Generated sentiment data for ${sentimentData.length} stocks`);
    
    res.json(sentimentData);
    
  } catch (error) {
    console.error('❌ Error generating sentiment heatmap:', error);
    res.status(500).json({ error: 'Failed to generate sentiment heatmap' });
  }
});

// Get sector statistics
router.get('/sectors', async (req, res) => {
  try {
    const { timeframe = '1D' } = req.query;
    
    console.log(`📈 Calculating sector statistics for ${timeframe}`);
    
    const sectorStats = await calculateSectorStatistics(timeframe as string);
    
    console.log(`✅ Calculated statistics for ${sectorStats.length} sectors`);
    
    res.json(sectorStats);
    
  } catch (error) {
    console.error('❌ Error calculating sector statistics:', error);
    res.status(500).json({ error: 'Failed to calculate sector statistics' });
  }
});

// Analyze sentiment for specific symbol
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, text, source = 'manual' } = req.body;
    
    if (!symbol || !text) {
      return res.status(400).json({ error: 'Symbol and text are required' });
    }
    
    console.log(`🧠 Analyzing sentiment for ${symbol} from ${source}`);
    
    const sentimentAnalysis = await analyzeSentimentWithAI(text, symbol);
    
    console.log(`✅ Sentiment analysis complete for ${symbol}: ${sentimentAnalysis.sentiment}`);
    
    res.json({
      success: true,
      symbol,
      source,
      analysis: sentimentAnalysis,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Real-time sentiment updates via WebSocket would be implemented here
router.get('/stream', async (req, res) => {
  try {
    // This would typically establish a WebSocket connection
    // For now, return current sentiment snapshot
    const currentSentiment = await generateMarketSentimentData('1D', 'sentiment');
    
    res.json({
      type: 'sentiment_update',
      data: currentSentiment,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error streaming sentiment:', error);
    res.status(500).json({ error: 'Failed to stream sentiment' });
  }
});

async function generateMarketSentimentData(timeframe: string, viewMode: string): Promise<SentimentData[]> {
  const allStocks: SentimentData[] = [];
  
  for (const [sector, stocks] of Object.entries(marketSectors)) {
    for (const symbol of stocks) {
      const sentimentData = generateStockSentiment(symbol, sector, timeframe, viewMode);
      allStocks.push(sentimentData);
    }
  }
  
  // Sort by sentiment strength for better visualization
  return allStocks.sort((a, b) => Math.abs(b.sentiment) - Math.abs(a.sentiment));
}

function generateStockSentiment(symbol: string, sector: string, timeframe: string, viewMode: string): SentimentData {
  // Generate realistic sentiment data based on sector characteristics
  const sectorBias = getSectorSentimentBias(sector);
  const timeBias = getTimeframeBias(timeframe);
  
  // Base sentiment with some randomness
  const baseSentiment = (Math.random() - 0.5) * 2; // -1 to 1
  const sentiment = Math.max(-1, Math.min(1, baseSentiment * 0.7 + sectorBias * 0.3));
  
  // Generate correlated metrics
  const volume = generateVolume(symbol, sector);
  const volatility = generateVolatility(sentiment, sector);
  const priceChange = sentiment * 0.05 + (Math.random() - 0.5) * 0.02; // -7% to +7%
  const momentum = sentiment * 0.8 + (Math.random() - 0.5) * 0.4;
  const strength = Math.abs(sentiment) * (0.7 + Math.random() * 0.3);
  
  return {
    symbol,
    sector,
    sentiment,
    volume,
    volatility,
    priceChange,
    momentum,
    strength,
    timestamp: new Date().toISOString()
  };
}

function getSectorSentimentBias(sector: string): number {
  // Sector-specific sentiment biases
  const sectorBiases: Record<string, number> = {
    'Technology': 0.15, // Generally bullish
    'Healthcare': 0.05,
    'Financial Services': -0.05,
    'Consumer Cyclical': 0.1,
    'Communication Services': 0.08,
    'Industrials': 0.02,
    'Consumer Defensive': -0.02,
    'Energy': -0.1, // Often bearish
    'Utilities': -0.05,
    'Real Estate': 0.03
  };
  
  return sectorBiases[sector] || 0;
}

function getTimeframeBias(timeframe: string): number {
  // Timeframe-specific adjustments
  switch (timeframe) {
    case '1D': return 0;
    case '1W': return 0.05; // Slightly more optimistic over week
    case '1M': return 0.1; // More optimistic over month
    case '3M': return 0.15; // Long-term optimism
    default: return 0;
  }
}

function generateVolume(symbol: string, sector: string): number {
  // Base volumes by sector (in millions)
  const sectorBaseVolumes: Record<string, number> = {
    'Technology': 15000000,
    'Healthcare': 8000000,
    'Financial Services': 12000000,
    'Consumer Cyclical': 10000000,
    'Communication Services': 9000000,
    'Industrials': 5000000,
    'Consumer Defensive': 6000000,
    'Energy': 7000000,
    'Utilities': 3000000,
    'Real Estate': 4000000
  };
  
  const baseVolume = sectorBaseVolumes[sector] || 5000000;
  
  // Add symbol-specific and random variation
  const symbolMultiplier = getSymbolMultiplier(symbol);
  const randomVariation = 0.5 + Math.random() * 1.0; // 0.5x to 1.5x
  
  return Math.floor(baseVolume * symbolMultiplier * randomVariation);
}

function generateVolatility(sentiment: number, sector: string): number {
  // Base volatility by sector
  const sectorVolatilities: Record<string, number> = {
    'Technology': 0.025,
    'Healthcare': 0.018,
    'Financial Services': 0.022,
    'Consumer Cyclical': 0.024,
    'Communication Services': 0.026,
    'Industrials': 0.019,
    'Consumer Defensive': 0.015,
    'Energy': 0.032,
    'Utilities': 0.012,
    'Real Estate': 0.020
  };
  
  const baseVolatility = sectorVolatilities[sector] || 0.020;
  
  // Higher sentiment uncertainty increases volatility
  const sentimentEffect = Math.abs(sentiment) * 0.01;
  const randomVariation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
  
  return Math.max(0.005, baseVolatility + sentimentEffect) * randomVariation;
}

function getSymbolMultiplier(symbol: string): number {
  // High-volume stocks get higher multipliers
  const highVolumeStocks = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL'];
  const mediumVolumeStocks = ['JPM', 'JNJ', 'UNH', 'HD', 'PG', 'BAC', 'XOM'];
  
  if (highVolumeStocks.includes(symbol)) return 1.5 + Math.random() * 0.5;
  if (mediumVolumeStocks.includes(symbol)) return 1.0 + Math.random() * 0.3;
  return 0.7 + Math.random() * 0.4;
}

async function calculateSectorStatistics(timeframe: string): Promise<SectorStats[]> {
  const sectorStats: SectorStats[] = [];
  
  for (const [sector, stocks] of Object.entries(marketSectors)) {
    const sectorData = stocks.map(symbol => 
      generateStockSentiment(symbol, sector, timeframe, 'sentiment')
    );
    
    const avgSentiment = sectorData.reduce((sum, stock) => sum + stock.sentiment, 0) / sectorData.length;
    const totalVolume = sectorData.reduce((sum, stock) => sum + stock.volume, 0);
    
    // Find top gainer and loser
    const sortedByChange = sectorData.sort((a, b) => b.priceChange - a.priceChange);
    const topGainer = sortedByChange[0]?.symbol || 'N/A';
    const topLoser = sortedByChange[sortedByChange.length - 1]?.symbol || 'N/A';
    
    sectorStats.push({
      sector,
      avgSentiment,
      totalVolume,
      stockCount: stocks.length,
      topGainer,
      topLoser
    });
  }
  
  return sectorStats.sort((a, b) => b.avgSentiment - a.avgSentiment);
}

async function analyzeSentimentWithAI(text: string, symbol: string): Promise<any> {
  try {
    const prompt = `Analyze the sentiment of the following text about ${symbol}:

"${text}"

Provide a JSON response with:
- sentiment: number between -1 (very negative) and 1 (very positive)
- confidence: number between 0 and 1
- key_phrases: array of important phrases that influenced the sentiment
- reasoning: brief explanation of the analysis

Respond only with valid JSON.`;

    // Removed OpenAI logic
    
  } catch (error) {
    console.error('Error in AI sentiment analysis:', error);
    
    // Fallback simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'bullish', 'strong', 'growth', 'profit'];
    const negativeWords = ['bad', 'terrible', 'negative', 'bearish', 'weak', 'decline', 'loss', 'drop'];
    
    const words = text.toLowerCase().split(/\s+/);
    let sentiment = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pos => word.includes(pos))) sentiment += 0.1;
      if (negativeWords.some(neg => word.includes(neg))) sentiment -= 0.1;
    });
    
    return {
      sentiment: Math.max(-1, Math.min(1, sentiment)),
      confidence: 0.3,
      key_phrases: [],
      reasoning: 'Fallback keyword-based analysis',
      model_used: 'keyword_fallback'
    };
  }
}

export default router;