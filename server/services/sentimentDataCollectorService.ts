import { comprehensiveMarketSentimentService } from './comprehensiveMarketSentiment';
import { historicalSentimentService } from './historicalSentimentService';

export class SentimentDataCollectorService {
  private collectionInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly COLLECTION_INTERVAL = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('🔄 Initializing Sentiment Data Collector Service...');
    
    // Collect initial data point
    await this.collectSentimentData();
    
    // Start regular collection
    this.startCollection();
  }

  public startCollection(): void {
    if (this.isRunning) {
      console.log('⚠️ Sentiment data collection is already running');
      return;
    }

    console.log(`📊 Starting sentiment data collection every ${this.COLLECTION_INTERVAL / 60000} minutes...`);
    
    this.collectionInterval = setInterval(async () => {
      try {
        await this.collectSentimentData();
      } catch (error) {
        console.error('❌ Error in scheduled sentiment data collection:', error);
      }
    }, this.COLLECTION_INTERVAL);

    this.isRunning = true;
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
      this.isRunning = false;
      console.log('⏹️ Stopped sentiment data collection');
    }
  }

  public async collectSentimentData(): Promise<void> {
    try {
      console.log('📊 Collecting current sentiment data for historical tracking...');
      
      // Get comprehensive sentiment data
      const sentimentData = await comprehensiveMarketSentimentService.getComprehensiveMarketSentiment();
      
      if (!sentimentData) {
        console.log('⚠️ No sentiment data received, skipping historical storage');
        return;
      }

      // Store in historical database
      await historicalSentimentService.storeCurrentSentiment(sentimentData);
      
      console.log('✅ Successfully collected and stored sentiment data point');
      
    } catch (error) {
      console.error('❌ Failed to collect sentiment data:', error);
      throw error;
    }
  }

  public async forceCollection(): Promise<void> {
    console.log('🔄 Force collecting sentiment data...');
    await this.collectSentimentData();
  }

  public getStatus(): {
    isRunning: boolean;
    collectionInterval: number;
    nextCollection: string | null;
  } {
    const nextCollection = this.isRunning 
      ? new Date(Date.now() + this.COLLECTION_INTERVAL).toISOString()
      : null;

    return {
      isRunning: this.isRunning,
      collectionInterval: this.COLLECTION_INTERVAL,
      nextCollection
    };
  }

  public async getCollectionHistory(limit: number = 10): Promise<any[]> {
    try {
      // Get recent historical records to show collection activity
      const historicalData = await historicalSentimentService.getHistoricalData('24h');
      
      if (!historicalData || !historicalData.timestamps) {
        return [];
      }

      // Return recent collection timestamps
      return historicalData.timestamps
        .slice(-limit)
        .map((timestamp, index) => ({
          timestamp,
          overallSentiment: historicalData.overallSentiment?.[historicalData.overallSentiment.length - limit + index],
          fearGreedIndex: historicalData.fearGreedIndex?.[historicalData.fearGreedIndex.length - limit + index],
          vixLevel: historicalData.vixLevel?.[historicalData.vixLevel.length - limit + index]
        }));
        
    } catch (error) {
      console.error('❌ Failed to get collection history:', error);
      return [];
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
    lastCollection?: string;
    dataPoints?: number;
  }> {
    try {
      const history = await this.getCollectionHistory(5);
      
      if (history.length === 0) {
        return {
          status: 'warning',
          message: 'No historical data points found'
        };
      }

      const lastCollection = history[history.length - 1]?.timestamp;
      const lastCollectionTime = lastCollection ? new Date(lastCollection).getTime() : 0;
      const timeSinceLastCollection = Date.now() - lastCollectionTime;
      
      // If last collection was more than 30 minutes ago, flag as warning
      if (timeSinceLastCollection > 30 * 60 * 1000) {
        return {
          status: 'warning',
          message: 'Last data collection was more than 30 minutes ago',
          lastCollection,
          dataPoints: history.length
        };
      }

      return {
        status: 'healthy',
        message: 'Sentiment data collection is running normally',
        lastCollection,
        dataPoints: history.length
      };
      
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const sentimentDataCollectorService = new SentimentDataCollectorService();
