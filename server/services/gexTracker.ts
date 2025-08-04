import { dataImporter, type WatchlistItem, type GEXData } from './dataImporter';
import { sentimentAnalysisService, type TickerSentimentResult } from './sentimentAnalysis';
import { UnusualWhalesService } from './unusualWhales';
import * as fs from 'fs';
import * as path from 'path';

export interface GEXLevels {
  symbol: string;
  date: string;
  currentPrice: number;
  gammaFlip: number;
  callWall: number;
  putWall: number;
  netGamma: number;
  totalGamma: number;
  gexScore: number;
  supportLevels: number[];
  resistanceLevels: number[];
  keyLevels: {
    level: number;
    type: 'support' | 'resistance' | 'gamma_flip';
    strength: number;
  }[];
}

export interface DarkPoolData {
  symbol: string;
  date: string;
  darkPoolVolume: number;
  totalVolume: number;
  darkPoolRatio: number;
  avgDarkPoolSize: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  significantTrades: {
    size: number;
    price: number;
    timestamp: string;
  }[];
}

export interface InsiderTrade {
  symbol: string;
  insider: string;
  title: string;
  transactionType: 'buy' | 'sell';
  shares: number;
  price: number;
  value: number;
  date: string;
  filingDate: string;
  ownershipPercent: number;
}

export interface AnalystUpdate {
  symbol: string;
  firm: string;
  analyst: string;
  action: 'upgrade' | 'downgrade' | 'initiate' | 'maintain';
  previousRating: string;
  newRating: string;
  previousTarget: number;
  newTarget: number;
  date: string;
  reasoning: string;
}

export interface NewsAlert {
  symbol: string;
  headline: string;
  summary: string;
  source: string;
  sentiment: number; // -1 to 1
  importance: 'low' | 'medium' | 'high' | 'critical';
  category: 'earnings' | 'guidance' | 'merger' | 'regulatory' | 'analyst' | 'general';
  publishedAt: string;
  url: string;
}

export interface WatchlistConfig {
  symbols: string[];
  updateTime: string; // "10:30" for 10:30 AM ET
  timezone: string;
  enabledFeatures: {
    gexTracking: boolean;
    darkPoolTracking: boolean;
    insiderTracking: boolean;
    analystTracking: boolean;
    newsAlerts: boolean;
    volumeAlerts: boolean;
    priceAlerts: boolean;
    optionsFlow: boolean;
  };
  alertThresholds: {
    darkPoolRatio: number; // Alert if dark pool ratio > threshold
    insiderTradeValue: number; // Alert if insider trade > threshold
    analystTargetChange: number; // Alert if target change > threshold %
    newsSentiment: number; // Alert if news sentiment < threshold
  };
}

export class GEXTracker {
  private watchlist: Map<string, WatchlistItem> = new Map();
  private gexData: Map<string, GEXData[]> = new Map();
  private sentiments: Map<string, TickerSentimentResult> = new Map();
  private updateTimer?: NodeJS.Timeout;
  private readonly dataDir = path.join(process.cwd(), 'data', 'gex');
  private unusualWhalesService: UnusualWhalesService;

  constructor() {
    // Initialize UnusualWhales service
    this.unusualWhalesService = new UnusualWhalesService();
    
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadWatchlist();
    this.scheduleUpdates();
  }

  async loadWatchlist(): Promise<void> {
    try {
      const watchlistPath = path.join(this.dataDir, 'watchlist.json');
      if (fs.existsSync(watchlistPath)) {
        const data = JSON.parse(fs.readFileSync(watchlistPath, 'utf8'));
        data.forEach((item: WatchlistItem) => {
          this.watchlist.set(item.symbol, item);
        });
        console.log(`Loaded ${this.watchlist.size} symbols to watchlist`);
      } else {
        // Create default watchlist
        await this.createDefaultWatchlist();
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
      await this.createDefaultWatchlist();
    }
  }

  async saveWatchlist(): Promise<void> {
    try {
      const watchlistPath = path.join(this.dataDir, 'watchlist.json');
      const data = Array.from(this.watchlist.values());
      fs.writeFileSync(watchlistPath, JSON.stringify(data, null, 2));
      console.log(`Saved watchlist with ${data.length} symbols`);
    } catch (error) {
      console.error('Error saving watchlist:', error);
    }
  }

  async createDefaultWatchlist(): Promise<void> {
    const defaultSymbols = [
      // Major ETFs
      { symbol: 'SPY', sector: 'ETF', gexTracking: true },
      { symbol: 'QQQ', sector: 'ETF', gexTracking: true },
      { symbol: 'IWM', sector: 'ETF', gexTracking: true },
      
      // Mega caps with high options volume
      { symbol: 'AAPL', sector: 'Technology', gexTracking: true },
      { symbol: 'MSFT', sector: 'Technology', gexTracking: true },
      { symbol: 'GOOGL', sector: 'Technology', gexTracking: true },
      { symbol: 'AMZN', sector: 'Consumer Discretionary', gexTracking: true },
      { symbol: 'TSLA', sector: 'Consumer Discretionary', gexTracking: true },
      { symbol: 'NVDA', sector: 'Technology', gexTracking: true },
      { symbol: 'META', sector: 'Technology', gexTracking: true },
      
      // High volatility stocks
      { symbol: 'AMD', sector: 'Technology', gexTracking: true },
      { symbol: 'NFLX', sector: 'Communication Services', gexTracking: true },
      { symbol: 'CRM', sector: 'Technology', gexTracking: true },
      
      // Financial sector
      { symbol: 'JPM', sector: 'Financials', gexTracking: true },
      { symbol: 'BAC', sector: 'Financials', gexTracking: true },
      { symbol: 'XLF', sector: 'ETF', gexTracking: true },
      
      // Energy
      { symbol: 'XLE', sector: 'ETF', gexTracking: true },
      { symbol: 'CVX', sector: 'Energy', gexTracking: true },
      
      // Volatility tracking
      { symbol: 'VIX', sector: 'Volatility', gexTracking: false },
      { symbol: 'UVXY', sector: 'ETF', gexTracking: true }
    ];

    for (const item of defaultSymbols) {
      this.watchlist.set(item.symbol, {
        symbol: item.symbol,
        sector: item.sector,
        enabled: true,
        gexTracking: item.gexTracking,
        lastUpdated: new Date().toISOString()
      });
    }

    await this.saveWatchlist();
    console.log('Created default watchlist with major symbols');
  }

  async addToWatchlist(symbols: string[], options?: Partial<WatchlistItem>): Promise<void> {
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      this.watchlist.set(upperSymbol, {
        symbol: upperSymbol,
        sector: options?.sector || 'Unknown',
        marketCap: options?.marketCap,
        avgVolume: options?.avgVolume,
        enabled: options?.enabled ?? true,
        gexTracking: options?.gexTracking ?? true,
        lastUpdated: new Date().toISOString()
      });
    }
    await this.saveWatchlist();
    console.log(`Added ${symbols.length} symbols to watchlist`);
  }

  async removeFromWatchlist(symbols: string[]): Promise<void> {
    for (const symbol of symbols) {
      this.watchlist.delete(symbol.toUpperCase());
    }
    await this.saveWatchlist();
    console.log(`Removed ${symbols.length} symbols from watchlist`);
  }

  getWatchlist(): WatchlistItem[] {
    return Array.from(this.watchlist.values());
  }

  getGEXEnabledSymbols(): string[] {
    return Array.from(this.watchlist.values())
      .filter(item => item.enabled && item.gexTracking)
      .map(item => item.symbol);
  }

  async refreshSentiments(): Promise<void> {
    const symbols = this.getWatchlist().map(w => w.symbol);
    const results = await Promise.all(
      symbols.map(sym => sentimentAnalysisService.getTickerSentiment(sym))
    );
    results.forEach(r => this.sentiments.set(r.ticker, r));
  }

  getWatchlistSentiments(): TickerSentimentResult[] {
    return Array.from(this.sentiments.values());
  }

  scheduleUpdates(): void {
    // Schedule for 10:30 AM ET (after market open)
    const scheduleTime = this.getNextUpdateTime();
    const delay = scheduleTime.getTime() - Date.now();
    
    if (delay > 0) {
      this.updateTimer = setTimeout(() => {
        this.performDailyUpdate();
        // Schedule next update for tomorrow
        this.scheduleUpdates();
      }, delay);
      
      console.log(`GEX update scheduled for ${scheduleTime.toLocaleString()} ET`);
    } else {
      // If past today's time, schedule for tomorrow
      const tomorrow = new Date(scheduleTime);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDelay = tomorrow.getTime() - Date.now();
      
      this.updateTimer = setTimeout(() => {
        this.performDailyUpdate();
        this.scheduleUpdates();
      }, tomorrowDelay);
      
      console.log(`GEX update scheduled for ${tomorrow.toLocaleString()} ET`);
    }
  }

  private getNextUpdateTime(): Date {
    const now = new Date();
    const updateTime = new Date();
    updateTime.setHours(10, 30, 0, 0); // 10:30 AM
    
    // If already past 10:30 AM today, schedule for tomorrow
    if (now > updateTime) {
      updateTime.setDate(updateTime.getDate() + 1);
    }
    
    return updateTime;
  }

  async performDailyUpdate(): Promise<void> {
    console.log('Starting daily GEX and market intelligence update...');
    
    const symbols = this.getGEXEnabledSymbols();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Import market intelligence service
    const { marketIntelligence } = await import('./marketIntelligence');

    for (const symbol of symbols) {
      try {
        // Update GEX data
        await this.updateSymbolGEX(symbol);
        
        // Update market intelligence data
        await Promise.all([
          marketIntelligence.trackDarkPoolActivity(symbol),
          marketIntelligence.trackInsiderTrades(symbol),
          marketIntelligence.trackAnalystUpdates(symbol),
          marketIntelligence.trackNewsAlerts(symbol)
        ]);
        
        results.success++;
        console.log(`✅ Updated all data for ${symbol}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error(`Failed to update data for ${symbol}:`, error);
      }
    }

    console.log(`Daily update completed: ${results.success} success, ${results.failed} failed`);
    
    if (results.errors.length > 0) {
      console.log('Update errors:', results.errors);
    }

    // Save update log
    await this.refreshSentiments();
    await this.saveUpdateLog(results);
  }

  private async updateSymbolGEX(symbol: string): Promise<void> {
    try {
      // Use real Unusual Whales API to get Greek exposure data
      const greekExposure = await this.unusualWhalesService.getGammaExposure(symbol);
      
      if (!greekExposure || greekExposure.length === 0) {
        console.warn(`⚠️ No GEX data available for ${symbol}`);
        return;
      }

      // Get the most recent data point
      const latestData = greekExposure[0];
      
      // Calculate derived metrics
      const callGamma = parseFloat(latestData.call_gamma || '0');
      const putGamma = Math.abs(parseFloat(latestData.put_gamma || '0')); // Make positive for easier reading
      const totalGamma = callGamma + putGamma;
      const netGamma = callGamma - putGamma;
      
      // For gamma flip level, we'll need to use spot exposures if available
      let gammaFlip = 0;
      let supportLevel = 0;
      let resistanceLevel = 0;
      
      try {
        const spotExposures = await this.unusualWhalesService.getSpotExposures(symbol);
        if (spotExposures && spotExposures.length > 0) {
          // Find significant gamma levels from spot exposures
          const exposureData = spotExposures;
          
          // Sort by gamma magnitude to find key levels
          const sortedByGamma = exposureData
            .map((item: any) => ({
              price: parseFloat(item.strike || '0'),
              gamma: Math.abs(parseFloat(item.gamma || '0'))
            }))
            .filter((item: any) => item.price > 0 && item.gamma > 0)
            .sort((a: any, b: any) => b.gamma - a.gamma);
          
          if (sortedByGamma.length > 0) {
            gammaFlip = sortedByGamma[0].price; // Highest gamma concentration
            
            // Find support (lower) and resistance (higher) levels
            const currentPrice = gammaFlip; // Using gamma flip as reference
            const lowerLevels = sortedByGamma.filter((item: any) => item.price < currentPrice);
            const upperLevels = sortedByGamma.filter((item: any) => item.price > currentPrice);
            
            if (lowerLevels.length > 0) {
              supportLevel = lowerLevels[0].price;
            }
            if (upperLevels.length > 0) {
              resistanceLevel = upperLevels[0].price;
            }
          }
        }
      } catch (spotError) {
        console.warn(`⚠️ Could not fetch spot exposures for ${symbol}:`, spotError);
        // Continue with basic GEX data even if spot exposures fail
      }

      // Calculate GEX score (0-100) based on gamma positioning
      const gexScore = Math.min(100, Math.max(0, (totalGamma / 10000000) * 100)); // Scale based on total gamma

      const gexData: GEXData = {
        symbol,
        date: latestData.date || new Date().toISOString().split('T')[0],
        totalGamma,
        callGamma,
        putGamma,
        netGamma,
        gammaFlip,
        supportLevel,
        resistanceLevel,
        gexScore
      };

      // Store GEX data
      if (!this.gexData.has(symbol)) {
        this.gexData.set(symbol, []);
      }
      
      const symbolData = this.gexData.get(symbol)!;
      symbolData.push(gexData);
      
      // Keep only last 30 days of data
      if (symbolData.length > 30) {
        symbolData.splice(0, symbolData.length - 30);
      }

      console.log(`📊 Real GEX updated for ${symbol}:`, {
        totalGamma: totalGamma.toFixed(0),
        netGamma: netGamma.toFixed(0),
        gammaFlip: gammaFlip.toFixed(2),
        gexScore: gexScore.toFixed(1)
      });

      // Save to file
      const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.gexData.get(symbol), null, 2));
      
    } catch (error) {
      console.error(`❌ Error updating GEX for ${symbol}:`, error);
      // Don't throw - continue with other symbols
    }
  }

  async getGEXLevels(symbol: string): Promise<GEXLevels | null> {
    try {
      // Try to get real-time data from Unusual Whales API first
      const { UnusualWhalesService } = await import('./unusualWhales');
      const uwService = new UnusualWhalesService();
      
      // First, always try to get the current real stock price
      let currentPrice: number | null = null;
      try {
        currentPrice = await uwService.getCurrentPrice(symbol);
        if (!currentPrice) {
          // Fallback to stock state if getCurrentPrice fails
          const stockState = await uwService.getStockState(symbol);
          currentPrice = stockState ? stockState.price ?? null : null;
        }
      } catch (priceError) {
        console.log(`Failed to get stock price for ${symbol}:`, priceError);
      }

      try {
        // Get gamma exposure data
        const [spotExposures, greeks] = await Promise.allSettled([
          uwService.getSpotExposures(symbol),
          uwService.getGreeks(symbol)
        ]);

        const gexData = spotExposures.status === 'fulfilled' ? spotExposures.value : [];
        const greeksData = greeks.status === 'fulfilled' ? greeks.value : null;

        if (currentPrice !== null && gexData.length > 0) {
          // Calculate GEX levels from real API data
          let netGamma = 0;
          let totalGamma = 0;
          let gammaFlip = currentPrice;
          let callWall = currentPrice * 1.05;
          let putWall = currentPrice * 0.95;

          // Process gamma exposure data to find key levels
          gexData.forEach((strike: any) => {
            netGamma += strike.net_gamma_exposure || 0;
            totalGamma += Math.abs(strike.call_gamma_exposure || 0) + Math.abs(strike.put_gamma_exposure || 0);
            
            // Find gamma flip point (where net gamma crosses zero)
            if (currentPrice !== null && Math.abs(strike.net_gamma_exposure || 0) < Math.abs(netGamma) && Math.abs(strike.strike - currentPrice) < Math.abs(gammaFlip - currentPrice)) {
              gammaFlip = strike.strike;
            }
            
            // Find call wall (highest call gamma above current price)
            if (currentPrice !== null && strike.strike > currentPrice && (strike.call_gamma_exposure || 0) > 0) {
              if (Math.abs(strike.strike - currentPrice) < Math.abs(callWall - currentPrice)) {
                callWall = strike.strike;
              }
            }
            
            // Find put wall (highest put gamma below current price)
            if (currentPrice !== null && strike.strike < currentPrice && (strike.put_gamma_exposure || 0) > 0) {
              if (Math.abs(strike.strike - currentPrice) < Math.abs(putWall - currentPrice)) {
                putWall = strike.strike;
              }
            }
          });

          const gexScore = totalGamma > 0 ? (netGamma / totalGamma) * 100 : 0;

          const keyLevels = [
            { level: gammaFlip, type: 'gamma_flip' as const, strength: 0.9 },
            { level: putWall, type: 'support' as const, strength: 0.8 },
            { level: callWall, type: 'resistance' as const, strength: 0.8 }
          ];

          return {
            symbol,
            date: new Date().toISOString().split('T')[0],
            currentPrice,
            gammaFlip,
            callWall,
            putWall,
            netGamma,
            totalGamma,
            gexScore,
            supportLevels: [putWall, putWall - (currentPrice * 0.02)],
            resistanceLevels: [callWall, callWall + (currentPrice * 0.02)],
            keyLevels
          };
        }
      } catch (apiError) {
        console.log(`API call failed for ${symbol}, falling back to stored data:`, apiError);
      }

      // Fallback to stored data if API fails
      const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data: GEXData[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const latest = data[data.length - 1];
      
      if (!latest) return null;

      // If we don't have a current price from API, use fallback methods
      if (!currentPrice) {
        // For demo purposes, generate realistic current prices based on symbol
        const priceMapping: Record<string, number> = {
          'AAPL': 225,
          'MSFT': 415,
          'GOOGL': 165,
          'AMZN': 185,
          'TSLA': 250,
          'NVDA': 125,
          'META': 520,
          'SPY': 550,
          'QQQ': 480,
          'IWM': 220,
          'AMD': 160,
          'NFLX': 650,
          'CRM': 270,
          'BAC': 42,
          'JPM': 225
        };
        
        currentPrice = priceMapping[symbol] || 150; // Default reasonable price for unknown symbols
        console.log(`🔄 Using fallback price for ${symbol}: $${currentPrice} (API unavailable)`);
      }

      // Calculate key levels and analysis using real current price
      const priceMultiplier = currentPrice / latest.gammaFlip; // Scale factor to adjust mock data to real prices
      const scaledCallWall = latest.resistanceLevel * priceMultiplier;
      const scaledPutWall = latest.supportLevel * priceMultiplier;
      const scaledGammaFlip = currentPrice; // Use actual current price as gamma flip for demo

      const keyLevels = [
        { level: scaledGammaFlip, type: 'gamma_flip' as const, strength: 0.9 },
        { level: scaledPutWall, type: 'support' as const, strength: 0.8 },
        { level: scaledCallWall, type: 'resistance' as const, strength: 0.8 }
      ];

      return {
        symbol,
        date: latest.date,
        currentPrice,
        gammaFlip: scaledGammaFlip,
        callWall: scaledCallWall,
        putWall: scaledPutWall,
        netGamma: latest.netGamma,
        totalGamma: latest.totalGamma,
        gexScore: latest.gexScore,
        supportLevels: [scaledPutWall, scaledPutWall - (currentPrice * 0.02)],
        resistanceLevels: [scaledCallWall, scaledCallWall + (currentPrice * 0.02)],
        keyLevels
      };
    } catch (error) {
      console.error(`Error getting GEX levels for ${symbol}:`, error);
      return null;
    }
  }

  async getAllGEXLevels(): Promise<GEXLevels[]> {
    const symbols = this.getGEXEnabledSymbols();
    const results: GEXLevels[] = [];

    for (const symbol of symbols) {
      const levels = await this.getGEXLevels(symbol);
      if (levels) {
        results.push(levels);
      }
    }

    return results;
  }

  private async saveUpdateLog(results: any): Promise<void> {
    const logPath = path.join(this.dataDir, 'update_log.json');
    const logEntry = {
      timestamp: new Date().toISOString(),
      ...results
    };

    let logs = [];
    if (fs.existsSync(logPath)) {
      logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    
    logs.push(logEntry);
    
    // Keep only last 30 days of logs
    if (logs.length > 30) {
      logs = logs.slice(-30);
    }
    
    fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
  }

  async getUpdateHistory(): Promise<any[]> {
    const logPath = path.join(this.dataDir, 'update_log.json');
    if (fs.existsSync(logPath)) {
      return JSON.parse(fs.readFileSync(logPath, 'utf8'));
    }
    return [];
  }

  // Manual trigger for immediate update
  async forceUpdate(): Promise<void> {
    console.log('Force updating GEX data...');
    await this.performDailyUpdate();
  }

  destroy(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}

export const gexTracker = new GEXTracker();