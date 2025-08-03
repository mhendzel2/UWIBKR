import { storage } from '../storage';

export interface HistoricalSentimentRecord {
  id: string;
  timestamp: Date;
  
  // Overall metrics
  overallSentiment: number;
  fearGreedIndex: number;
  marketTide: any;
  
  // Options flow metrics
  optionsFlow: {
    totalPremium: number;
    callPutRatio: number;
    netFlow: number;
    institutionalFlow: number;
    retailFlow: number;
    darkPoolActivity: number;
  };
  
  // Market structure
  marketBreadth: {
    advanceDeclineRatio: number;
    newHighsLows: {
      newHighs: number;
      newLows: number;
      ratio: number;
    };
    volumeAnalysis: {
      upVolumeRatio: number;
      distributionDays: number;
      accumulationDays: number;
    };
  };
  
  // Volatility metrics
  volatilityMetrics: {
    vixLevel: number;
    vixTrend: string;
    gexLevels: {
      totalGEX: number;
      call_gex: number;
      put_gex: number;
      gex_flip_point: number;
    };
  };
  
  // Sentiment sources
  sentimentIndicators: {
    newsFlow: {
      avgSentiment: number;
      newsCount: number;
    };
    analystSentiment: {
      upgrades: number;
      downgrades: number;
      consensusDirection: string;
    };
    socialSentiment: {
      overallTone: number;
      twitterMentions: number;
      redditActivity: number;
    };
    cryptoCorrelation: {
      btcCorrelation: number;
      cryptoSentiment: number;
    };
  };
  
  // Macro context
  macroContext: {
    treasuryYields: {
      twoYear: number;
      tenYear: number;
      yieldCurveSlope: number;
    };
    dollarStrength: number;
    commodities: {
      gold: number;
      oil: number;
      copper: number;
    };
  };
  
  // Predictive signals
  predictiveSignals: {
    nextDayBias: string;
    weeklyOutlook: string;
    confidenceScore: number;
  };
}

export interface SentimentTimeSeriesData {
  timestamps: string[];
  overallSentiment: number[];
  fearGreedIndex: number[];
  vixLevel: number[];
  callPutRatio: number[];
  marketBreadth: number[];
  newsFlow: number[];
  cryptoCorrelation: number[];
  dollarStrength: number[];
  confidenceScore: number[];
}

export class HistoricalSentimentService {
  private collectionName = 'historical_sentiment';
  
  async storeCurrentSentiment(sentimentData: any): Promise<void> {
    try {
      const record: HistoricalSentimentRecord = {
        id: `sentiment_${Date.now()}`,
        timestamp: new Date(),
        overallSentiment: sentimentData.overallSentiment || 0,
        fearGreedIndex: sentimentData.fearGreedIndex || 50,
        marketTide: sentimentData.marketTide,
        optionsFlow: {
          totalPremium: this.parseNumber(sentimentData.optionsFlow?.totalPremium),
          callPutRatio: sentimentData.optionsFlow?.callPutRatio || 1.0,
          netFlow: sentimentData.optionsFlow?.netFlow || 0,
          institutionalFlow: this.parseNumber(sentimentData.optionsFlow?.institutionalFlow),
          retailFlow: this.parseNumber(sentimentData.optionsFlow?.retailFlow),
          darkPoolActivity: this.parseNumber(sentimentData.optionsFlow?.darkPoolActivity)
        },
        marketBreadth: {
          advanceDeclineRatio: sentimentData.marketBreadth?.advanceDeclineRatio || 1.0,
          newHighsLows: {
            newHighs: sentimentData.marketBreadth?.newHighsLows?.newHighs || 0,
            newLows: sentimentData.marketBreadth?.newHighsLows?.newLows || 0,
            ratio: sentimentData.marketBreadth?.newHighsLows?.ratio || 1.0
          },
          volumeAnalysis: {
            upVolumeRatio: sentimentData.marketBreadth?.volumeAnalysis?.upVolumeRatio || 0.5,
            distributionDays: sentimentData.marketBreadth?.volumeAnalysis?.distributionDays || 0,
            accumulationDays: sentimentData.marketBreadth?.volumeAnalysis?.accumulationDays || 0
          }
        },
        volatilityMetrics: {
          vixLevel: sentimentData.volatilityMetrics?.vixLevel || 20,
          vixTrend: sentimentData.volatilityMetrics?.vixTrend || 'normal',
          gexLevels: {
            totalGEX: sentimentData.volatilityMetrics?.gexLevels?.totalGEX || 0,
            call_gex: sentimentData.volatilityMetrics?.gexLevels?.call_gex || 0,
            put_gex: sentimentData.volatilityMetrics?.gexLevels?.put_gex || 0,
            gex_flip_point: sentimentData.volatilityMetrics?.gexLevels?.gex_flip_point || 4200
          }
        },
        sentimentIndicators: {
          newsFlow: {
            avgSentiment: this.calculateAvgNewsSentiment(sentimentData.sentimentIndicators?.newsFlow),
            newsCount: sentimentData.sentimentIndicators?.newsFlow?.length || 0
          },
          analystSentiment: {
            upgrades: sentimentData.sentimentIndicators?.analystSentiment?.upgrades || 0,
            downgrades: sentimentData.sentimentIndicators?.analystSentiment?.downgrades || 0,
            consensusDirection: sentimentData.sentimentIndicators?.analystSentiment?.consensusDirection || 'neutral'
          },
          socialSentiment: {
            overallTone: sentimentData.sentimentIndicators?.socialSentiment?.overallTone || 0,
            twitterMentions: sentimentData.sentimentIndicators?.socialSentiment?.twitterMentions || 0,
            redditActivity: sentimentData.sentimentIndicators?.socialSentiment?.redditActivity || 0
          },
          cryptoCorrelation: {
            btcCorrelation: sentimentData.sentimentIndicators?.cryptoCorrelation?.btcCorrelation || 0,
            cryptoSentiment: sentimentData.sentimentIndicators?.cryptoCorrelation?.cryptoSentiment || 0
          }
        },
        macroContext: {
          treasuryYields: {
            twoYear: sentimentData.macroContext?.treasuryYields?.twoYear || 4.5,
            tenYear: sentimentData.macroContext?.treasuryYields?.tenYear || 4.2,
            yieldCurveSlope: sentimentData.macroContext?.treasuryYields?.yieldCurveSlope || 0
          },
          dollarStrength: sentimentData.macroContext?.dollarStrength || 105,
          commodities: {
            gold: sentimentData.macroContext?.commoditiesFlow?.gold || 2000,
            oil: sentimentData.macroContext?.commoditiesFlow?.oil || 80,
            copper: sentimentData.macroContext?.commoditiesFlow?.copper || 3.8
          }
        },
        predictiveSignals: {
          nextDayBias: sentimentData.predictiveSignals?.nextDayBias || 'neutral',
          weeklyOutlook: sentimentData.predictiveSignals?.weeklyOutlook || 'balanced',
          confidenceScore: sentimentData.predictiveSignals?.confidenceScore || 50
        }
      };

      await storage.store(this.collectionName, record.id, record);
      console.log(`📊 Stored historical sentiment record: ${record.id}`);
      
      // Clean up old records (keep last 30 days)
      await this.cleanupOldRecords();
      
    } catch (error) {
      console.error('Failed to store historical sentiment:', error);
    }
  }

  async getHistoricalData(timeframe: '1h' | '4h' | '24h' | '7d' | '30d' = '24h'): Promise<SentimentTimeSeriesData> {
    try {
      const records = await storage.query(this.collectionName, {});
      
      if (!records || records.length === 0) {
        return this.getEmptyTimeSeriesData();
      }

      // Sort by timestamp
      const sortedRecords = records.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Filter by timeframe
      const filteredRecords = this.filterByTimeframe(sortedRecords, timeframe);
      
      // Convert to time series format
      return this.convertToTimeSeries(filteredRecords);
      
    } catch (error) {
      console.error('Failed to get historical sentiment data:', error);
      return this.getEmptyTimeSeriesData();
    }
  }

  async getLatestSentiment(): Promise<HistoricalSentimentRecord | null> {
    try {
      const records = await storage.query(this.collectionName, {});
      
      if (!records || records.length === 0) {
        return null;
      }

      // Get the most recent record
      return records.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
      
    } catch (error) {
      console.error('Failed to get latest sentiment:', error);
      return null;
    }
  }

  async getSentimentStats(timeframe: '7d' | '30d' = '7d'): Promise<{
    avgSentiment: number;
    sentimentVolatility: number;
    fearGreedTrend: 'increasing' | 'decreasing' | 'stable';
    vixTrend: 'increasing' | 'decreasing' | 'stable';
    marketRegime: 'bull' | 'bear' | 'sideways';
    confidenceTrend: 'increasing' | 'decreasing' | 'stable';
  }> {
    try {
      const records = await storage.query(this.collectionName, {});
      
      if (!records || records.length < 2) {
        return {
          avgSentiment: 0,
          sentimentVolatility: 0,
          fearGreedTrend: 'stable',
          vixTrend: 'stable',
          marketRegime: 'sideways',
          confidenceTrend: 'stable'
        };
      }

      const sortedRecords = records.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      const filteredRecords = this.filterByTimeframe(sortedRecords, timeframe);
      
      if (filteredRecords.length < 2) {
        return {
          avgSentiment: filteredRecords[0]?.overallSentiment || 0,
          sentimentVolatility: 0,
          fearGreedTrend: 'stable',
          vixTrend: 'stable',
          marketRegime: 'sideways',
          confidenceTrend: 'stable'
        };
      }

      // Calculate statistics
      const sentiments = filteredRecords.map(r => r.overallSentiment);
      const fearGreedValues = filteredRecords.map(r => r.fearGreedIndex);
      const vixValues = filteredRecords.map(r => r.volatilityMetrics.vixLevel);
      const confidenceValues = filteredRecords.map(r => r.predictiveSignals.confidenceScore);

      const avgSentiment = sentiments.reduce((sum, val) => sum + val, 0) / sentiments.length;
      const sentimentVolatility = this.calculateVolatility(sentiments);
      
      // Calculate trends
      const fearGreedTrend = this.calculateTrend(fearGreedValues);
      const vixTrend = this.calculateTrend(vixValues);
      const confidenceTrend = this.calculateTrend(confidenceValues);
      
      // Determine market regime
      const marketRegime = this.determineMarketRegime(filteredRecords);

      return {
        avgSentiment,
        sentimentVolatility,
        fearGreedTrend,
        vixTrend,
        marketRegime,
        confidenceTrend
      };
      
    } catch (error) {
      console.error('Failed to calculate sentiment stats:', error);
      return {
        avgSentiment: 0,
        sentimentVolatility: 0,
        fearGreedTrend: 'stable',
        vixTrend: 'stable',
        marketRegime: 'sideways',
        confidenceTrend: 'stable'
      };
    }
  }

  private parseNumber(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private calculateAvgNewsSentiment(newsFlow: any[]): number {
    if (!newsFlow || newsFlow.length === 0) return 0;
    const sum = newsFlow.reduce((total, news) => total + (news.sentiment || 0), 0);
    return sum / newsFlow.length;
  }

  private filterByTimeframe(records: any[], timeframe: string): any[] {
    const now = new Date();
    let cutoffTime: number;

    switch (timeframe) {
      case '1h':
        cutoffTime = now.getTime() - (1 * 60 * 60 * 1000);
        break;
      case '4h':
        cutoffTime = now.getTime() - (4 * 60 * 60 * 1000);
        break;
      case '24h':
        cutoffTime = now.getTime() - (24 * 60 * 60 * 1000);
        break;
      case '7d':
        cutoffTime = now.getTime() - (7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffTime = now.getTime() - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffTime = now.getTime() - (24 * 60 * 60 * 1000);
    }

    return records.filter(record => 
      new Date(record.timestamp).getTime() >= cutoffTime
    );
  }

  private convertToTimeSeries(records: any[]): SentimentTimeSeriesData {
    return {
      timestamps: records.map(r => r.timestamp),
      overallSentiment: records.map(r => r.overallSentiment),
      fearGreedIndex: records.map(r => r.fearGreedIndex),
      vixLevel: records.map(r => r.volatilityMetrics.vixLevel),
      callPutRatio: records.map(r => r.optionsFlow.callPutRatio),
      marketBreadth: records.map(r => r.marketBreadth.advanceDeclineRatio),
      newsFlow: records.map(r => r.sentimentIndicators.newsFlow.avgSentiment),
      cryptoCorrelation: records.map(r => r.sentimentIndicators.cryptoCorrelation.btcCorrelation),
      dollarStrength: records.map(r => r.macroContext.dollarStrength),
      confidenceScore: records.map(r => r.predictiveSignals.confidenceScore)
    };
  }

  private getEmptyTimeSeriesData(): SentimentTimeSeriesData {
    return {
      timestamps: [],
      overallSentiment: [],
      fearGreedIndex: [],
      vixLevel: [],
      callPutRatio: [],
      marketBreadth: [],
      newsFlow: [],
      cryptoCorrelation: [],
      dollarStrength: [],
      confidenceScore: []
    };
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) return 'stable';
    
    const first = values[0];
    const last = values[values.length - 1];
    const percentChange = ((last - first) / first) * 100;
    
    if (percentChange > 5) return 'increasing';
    if (percentChange < -5) return 'decreasing';
    return 'stable';
  }

  private determineMarketRegime(records: any[]): 'bull' | 'bear' | 'sideways' {
    if (records.length < 5) return 'sideways';
    
    const recentRecords = records.slice(-5);
    const avgSentiment = recentRecords.reduce((sum, r) => sum + r.overallSentiment, 0) / recentRecords.length;
    const avgFearGreed = recentRecords.reduce((sum, r) => sum + r.fearGreedIndex, 0) / recentRecords.length;
    
    if (avgSentiment > 0.2 && avgFearGreed > 60) return 'bull';
    if (avgSentiment < -0.2 && avgFearGreed < 40) return 'bear';
    return 'sideways';
  }

  private async cleanupOldRecords(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
      const allRecords = await storage.query(this.collectionName, {});
      
      if (!allRecords) return;
      
      const oldRecords = allRecords.filter((record: any) => 
        new Date(record.timestamp).getTime() < thirtyDaysAgo.getTime()
      );
      
      for (const record of oldRecords) {
        await storage.delete(this.collectionName, record.id);
      }
      
      if (oldRecords.length > 0) {
        console.log(`🧹 Cleaned up ${oldRecords.length} old sentiment records`);
      }
      
    } catch (error) {
      console.error('Failed to cleanup old sentiment records:', error);
    }
  }
}

export const historicalSentimentService = new HistoricalSentimentService();
