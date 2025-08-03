// @ts-nocheck
import { dataImporter, type WatchlistItem, type GEXData } from './dataImporter';
import { sentimentAnalysisService, type TickerSentimentResult } from './sentimentAnalysis';
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

  constructor() {
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

  async clearWatchlist(): Promise<void> {
    this.watchlist.clear();
    await this.saveWatchlist();
    console.log('Cleared watchlist');
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
        results.errors.push(`${symbol}: ${error.message}`);
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
    // In a real implementation, this would fetch current options data
    // For now, we'll simulate GEX calculation with placeholder logic
    
    const gexData: GEXData = {
      symbol,
      date: new Date().toISOString().split('T')[0],
      totalGamma: Math.random() * 1000000, // Placeholder
      callGamma: Math.random() * 600000,
      putGamma: Math.random() * 400000,
      netGamma: (Math.random() - 0.5) * 200000,
      gammaFlip: 400 + Math.random() * 100, // Placeholder price level
      supportLevel: 390 + Math.random() * 20,
      resistanceLevel: 420 + Math.random() * 20,
      gexScore: Math.random() * 100
    };

    // Store GEX data
    if (!this.gexData.has(symbol)) {
      this.gexData.set(symbol, []);
    }
    
    const symbolData = this.gexData.get(symbol)!;
    symbolData.push(gexData);
    
    // Keep only last 30 days
    if (symbolData.length > 30) {
      symbolData.splice(0, symbolData.length - 30);
    }

    // Save to file
    const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
    fs.writeFileSync(filePath, JSON.stringify(symbolData, null, 2));
    
    console.log(`Updated GEX data for ${symbol}`);
  }

  async getGEXLevels(symbol: string): Promise<GEXLevels | null> {
    try {
      const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data: GEXData[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const latest = data[data.length - 1];
      
      if (!latest) return null;

      // Calculate key levels and analysis
      const keyLevels = [
        { level: latest.gammaFlip, type: 'gamma_flip' as const, strength: 0.9 },
        { level: latest.supportLevel, type: 'support' as const, strength: 0.8 },
        { level: latest.resistanceLevel, type: 'resistance' as const, strength: 0.8 }
      ];

      return {
        symbol,
        date: latest.date,
        currentPrice: latest.gammaFlip + (Math.random() - 0.5) * 10, // Placeholder
        gammaFlip: latest.gammaFlip,
        callWall: latest.resistanceLevel,
        putWall: latest.supportLevel,
        netGamma: latest.netGamma,
        totalGamma: latest.totalGamma,
        gexScore: latest.gexScore,
        supportLevels: [latest.supportLevel, latest.supportLevel - 10],
        resistanceLevels: [latest.resistanceLevel, latest.resistanceLevel + 10],
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