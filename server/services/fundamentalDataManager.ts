import { UnusualWhalesService } from './unusualWhales';
import { WatchlistManager } from './watchlistManager';
import fs from 'fs';
import path from 'path';

interface FundamentalData {
  ticker: string;
  fundamentals: any;
  financials: any;
  analystEstimates: any;
  institutionalHoldings: any[];
  insiderTrades: any[];
  dividendHistory: any[];
  socialSentiment: any;
  technicalIndicators: any;
  supportResistance: any;
  correlation: any;
  beta: any;
  lastUpdated: Date;
}

interface WatchlistFundamentals {
  watchlistName: string;
  tickers: string[];
  fundamentalData: Map<string, FundamentalData>;
  lastBulkUpdate: Date;
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const FUNDAMENTALS_FILE = path.join(DATA_DIR, 'fundamentals.json');

export class FundamentalDataManager {
  private unusualWhales: UnusualWhalesService;
  private watchlistManager: WatchlistManager;
  private fundamentalCache = new Map<string, FundamentalData>();
  private watchlistCache = new Map<string, WatchlistFundamentals>();
  private updateInterval = 6 * 60 * 60 * 1000; // 6 hours
  private isUpdating = false;

  constructor() {
    this.unusualWhales = new UnusualWhalesService();
    this.watchlistManager = new WatchlistManager();
    this.loadFundamentalCache();
    this.startWeeklyUpdates();
  }

  private loadFundamentalCache() {
    if (fs.existsSync(FUNDAMENTALS_FILE)) {
      const data = fs.readFileSync(FUNDAMENTALS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      this.fundamentalCache = new Map(parsed.map((item: any) => [item.ticker, item]));
      console.log('📂 Loaded fundamental data from disk.');
    }
  }

  private saveFundamentalCache() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = Array.from(this.fundamentalCache.values());
    fs.writeFileSync(FUNDAMENTALS_FILE, JSON.stringify(data, null, 2));
    console.log('💾 Saved fundamental data to disk.');
  }

  private startWeeklyUpdates() {
    const now = new Date();
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7));
    nextMonday.setHours(0, 0, 0, 0);

    const delay = nextMonday.getTime() - now.getTime();
    setTimeout(() => {
      this.updateActiveWatchlistFundamentals();
      setInterval(() => this.updateActiveWatchlistFundamentals(), 7 * 24 * 60 * 60 * 1000); // Weekly
    }, delay);
  }

  private startPeriodicUpdates() {
    // Update fundamentals every 6 hours
    setInterval(async () => {
      if (!this.isUpdating) {
        await this.updateActiveWatchlistFundamentals();
      }
    }, this.updateInterval);

    // Initial update after 30 seconds to allow server startup
    setTimeout(async () => {
      await this.updateActiveWatchlistFundamentals();
    }, 30000);
  }

  async getTickerFundamentals(ticker: string, forceRefresh: boolean = false): Promise<FundamentalData | null> {
    const cached = this.fundamentalCache.get(ticker);
    
    // Return cached data if fresh and not forcing refresh
    if (cached && !forceRefresh) {
      const age = Date.now() - cached.lastUpdated.getTime();
      if (age < this.updateInterval) {
        console.log(`📊 Returning cached fundamentals for ${ticker} (age: ${Math.round(age/1000/60)} minutes)`);
        return cached;
      }
    }

    try {
      console.log(`🔍 Fetching fresh fundamental data for ${ticker}...`);
      
      // Fetch all fundamental data in parallel with rate limiting
      const [
        fundamentals,
        financials,
        analystEstimates,
        institutionalHoldings,
        insiderTrades,
        dividendHistory,
        socialSentiment,
        technicalIndicators,
        supportResistance,
        beta
      ] = await Promise.allSettled([
        this.unusualWhales.getTickerFundamentals(ticker),
        this.unusualWhales.getTickerFinancials(ticker),
        this.unusualWhales.getAnalystEstimates(ticker),
        this.unusualWhales.getInstitutionalHoldings(ticker),
        this.unusualWhales.getInsiderTrades(ticker, 20),
        this.unusualWhales.getDividendHistory(ticker),
        this.unusualWhales.getSocialSentiment(ticker),
        this.unusualWhales.getTechnicalIndicators(ticker),
        this.unusualWhales.getSupportResistanceLevels(ticker),
        this.unusualWhales.getBetaAnalysis(ticker)
      ]);

      const fundamentalData: FundamentalData = {
        ticker,
        fundamentals: fundamentals.status === 'fulfilled' ? fundamentals.value : null,
        financials: financials.status === 'fulfilled' ? financials.value : null,
        analystEstimates: analystEstimates.status === 'fulfilled' ? analystEstimates.value : null,
        institutionalHoldings: institutionalHoldings.status === 'fulfilled' ? institutionalHoldings.value : [],
        insiderTrades: insiderTrades.status === 'fulfilled' ? insiderTrades.value : [],
        dividendHistory: dividendHistory.status === 'fulfilled' ? dividendHistory.value : [],
        socialSentiment: socialSentiment.status === 'fulfilled' ? socialSentiment.value : null,
        technicalIndicators: technicalIndicators.status === 'fulfilled' ? technicalIndicators.value : null,
        supportResistance: supportResistance.status === 'fulfilled' ? supportResistance.value : null,
        correlation: null, // Will be calculated separately for watchlist correlations
        beta: beta.status === 'fulfilled' ? beta.value : null,
        lastUpdated: new Date()
      };

      // Cache the data
      this.fundamentalCache.set(ticker, fundamentalData);
      
      // Store in persistent storage for ML training
      await this.storeFundamentalData(fundamentalData);
      
      console.log(`✅ Fundamental data cached for ${ticker}`);
      return fundamentalData;

    } catch (error) {
      console.error(`❌ Failed to fetch fundamental data for ${ticker}:`, error);
      return cached || null;
    }
  }

  async updateActiveWatchlistFundamentals(): Promise<void> {
    if (this.isUpdating) {
      console.log('⏳ Fundamental update already in progress...');
      return;
    }

    this.isUpdating = true;
    
    try {
      console.log('🔄 Starting bulk fundamental data update for active watchlists...');
      
      // Get active watchlist from watchlist manager
      const currentWatchlist = await this.watchlistManager.getCurrentWatchlist();
      
      if (!currentWatchlist || currentWatchlist.symbols.length === 0) {
        console.log('No active watchlist found or watchlist is empty');
        return;
      }

      const tickers = currentWatchlist.symbols.map((item: any) => item.symbol || item.ticker || item);
      console.log(`📋 Updating fundamentals for ${tickers.length} symbols in watchlist: ${currentWatchlist.name}`);
      
      // Update fundamentals for each ticker with staggered requests
      const batchSize = 3; // Process 3 tickers at a time to respect rate limits
      
      for (let i = 0; i < tickers.length; i += batchSize) {
        const batch = tickers.slice(i, i + batchSize);
        console.log(`📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(tickers.length/batchSize)}: ${batch.join(', ')}`);
        
        // Process batch in parallel
        const batchPromises = batch.map((ticker: string) => 
          this.getTickerFundamentals(ticker, false).catch((error: any) => {
            console.error(`Failed to update fundamentals for ${ticker}:`, error);
            return null;
          })
        );
        
        await Promise.allSettled(batchPromises);
        
        // Wait between batches to respect rate limits
        if (i + batchSize < tickers.length) {
          console.log('⏳ Waiting 2s before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Calculate correlation matrix for the watchlist
      if (tickers.length > 1) {
        try {
          console.log('📈 Calculating correlation matrix...');
          const correlationMatrix = await this.unusualWhales.getCorrelationMatrix(tickers, '30d');
          
          // Update correlation data for each ticker
          for (const ticker of tickers) {
            const cached = this.fundamentalCache.get(ticker);
            if (cached) {
              cached.correlation = correlationMatrix;
              this.fundamentalCache.set(ticker, cached);
            }
          }
        } catch (error) {
          console.error('Failed to calculate correlation matrix:', error);
        }
      }

      // Cache watchlist data
      const validFundamentals = tickers
        .map((ticker: string) => {
          const data = this.fundamentalCache.get(ticker);
          return data ? [ticker, data] as [string, FundamentalData] : null;
        })
        .filter((entry): entry is [string, FundamentalData] => entry !== null);
      
      const watchlistFundamentals: WatchlistFundamentals = {
        watchlistName: currentWatchlist.name,
        tickers: tickers,
        fundamentalData: new Map(validFundamentals),
        lastBulkUpdate: new Date()
      };
      
      this.watchlistCache.set(currentWatchlist.name, watchlistFundamentals);
      
      console.log(`✅ Bulk fundamental update completed for ${tickers.length} tickers`);
      
    } catch (error) {
      console.error('❌ Failed to update watchlist fundamentals:', error);
    } finally {
      this.isUpdating = false;
    }
  }

  private async storeFundamentalData(data: FundamentalData): Promise<void> {
    try {
      // Store in JSON format for ML training data
      const fundamentalRecord = {
        ticker: data.ticker,
        timestamp: data.lastUpdated.toISOString(),
        data: {
          fundamentals: data.fundamentals,
          financials: data.financials,
          analystEstimates: data.analystEstimates,
          institutionalOwnership: data.institutionalHoldings?.length || 0,
          insiderActivity: {
            recentTrades: data.insiderTrades?.length || 0,
            netBuying: data.insiderTrades?.filter(trade => trade.activity === 'buy')?.length || 0,
            netSelling: data.insiderTrades?.filter(trade => trade.activity === 'sell')?.length || 0
          },
          socialMetrics: data.socialSentiment,
          technicalIndicators: data.technicalIndicators,
          supportResistance: data.supportResistance,
          beta: data.beta,
          dividendYield: data.dividendHistory?.[0]?.yield || 0
        }
      };

      // Store to intelligence folder for ML training
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const intelligenceDir = path.join(process.cwd(), 'data', 'intelligence');
      const fundamentalsDir = path.join(intelligenceDir, 'fundamentals');
      
      // Ensure directory exists
      await fs.mkdir(fundamentalsDir, { recursive: true });
      
      // Store individual ticker file
      const filename = `${data.ticker}_fundamentals_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(fundamentalsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(fundamentalRecord, null, 2));
      
      console.log(`💾 Stored fundamental data: ${filename}`);
      
    } catch (error) {
      console.error('Failed to store fundamental data:', error);
    }
  }

  async getWatchlistFundamentals(watchlistName?: string): Promise<WatchlistFundamentals | null> {
    if (watchlistName) {
      return this.watchlistCache.get(watchlistName) || null;
    }
    
    // Return current watchlist fundamentals
    const currentWatchlist = await this.watchlistManager.getCurrentWatchlist();
    
    if (!currentWatchlist) {
      return null;
    }
    
    return this.watchlistCache.get(currentWatchlist.name) || null;
  }

  async getFundamentalSummary(): Promise<any> {
    const activeWatchlistData = await this.getWatchlistFundamentals();
    
    if (!activeWatchlistData) {
      return {
        totalTickers: 0,
        cachedTickers: 0,
        lastUpdate: null,
        cacheHitRate: 0
      };
    }
    
    const cached = Array.from(this.fundamentalCache.values());
    const recentlyUpdated = cached.filter(data => 
      Date.now() - data.lastUpdated.getTime() < this.updateInterval
    );
    
    return {
      totalTickers: activeWatchlistData.tickers.length,
      cachedTickers: activeWatchlistData.fundamentalData.size,
      recentlyUpdated: recentlyUpdated.length,
      lastBulkUpdate: activeWatchlistData.lastBulkUpdate,
      cacheHitRate: Math.round((activeWatchlistData.fundamentalData.size / activeWatchlistData.tickers.length) * 100),
      requestStats: this.unusualWhales.getRequestStats()
    };
  }

  // Clear cache when watchlist changes
  async onWatchlistChange(newActiveWatchlist: string): Promise<void> {
    console.log(`🔄 Watchlist changed to: ${newActiveWatchlist}, updating fundamentals...`);
    await this.updateActiveWatchlistFundamentals();
  }
}

// Export singleton instance
export const fundamentalDataManager = new FundamentalDataManager();
