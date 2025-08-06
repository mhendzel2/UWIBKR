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
  // Support multiple named watchlists
  private watchlists: Map<string, Map<string, WatchlistItem>> = new Map();
  private activeWatchlist = 'default';
  private gexData: Map<string, GEXData[]> = new Map();
  private sentiments: Map<string, TickerSentimentResult> = new Map();
  private updateTimer?: NodeJS.Timeout;
  private readonly dataDir = path.join(process.cwd(), 'data', 'gex');

  constructor() {
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadWatchlists();
    this.performDailyUpdate().catch(err => console.error('Initial update failed', err));
    this.scheduleUpdates();
    this.startFundamentalUpdates();
  }

  private getWatchlistMap(name: string = 'default'): Map<string, WatchlistItem> {
    if (!this.watchlists.has(name)) {
      this.watchlists.set(name, new Map());
    }
    return this.watchlists.get(name)!;
  }

  async loadWatchlists(): Promise<void> {
    try {
      const multiPath = path.join(this.dataDir, 'watchlists.json');
      const legacyPath = path.join(this.dataDir, 'watchlist.json');
      if (fs.existsSync(multiPath)) {
        const raw = JSON.parse(fs.readFileSync(multiPath, 'utf8'));
        if (raw.lists) {
          Object.keys(raw.lists).forEach(listName => {
            const items: WatchlistItem[] = raw.lists[listName] || [];
            this.watchlists.set(listName, new Map(items.map(item => [item.symbol, item])));
          });
          this.activeWatchlist = raw.active || 'default';
        } else {
          Object.keys(raw).forEach(listName => {
            const items: WatchlistItem[] = raw[listName] || [];
            this.watchlists.set(listName, new Map(items.map(item => [item.symbol, item])));
          });
          this.activeWatchlist = 'default';
        }
        console.log(`Loaded watchlists: ${Array.from(this.watchlists.keys()).join(', ')}`);
      } else if (fs.existsSync(legacyPath)) {
        // Migrate legacy single watchlist
        const data: WatchlistItem[] = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
        this.watchlists.set('default', new Map(data.map(item => [item.symbol, item])));
        await this.saveWatchlists();
        fs.unlinkSync(legacyPath);
        console.log('Migrated legacy watchlist to watchlists.json');
      } else {
        await this.createDefaultWatchlist();
      }
    } catch (error) {
      console.error('Error loading watchlists:', error);
      await this.createDefaultWatchlist();
    }
  }

  async saveWatchlists(): Promise<void> {
    try {
      const watchlistPath = path.join(this.dataDir, 'watchlists.json');
      const data: Record<string, WatchlistItem[]> = {};
      for (const [name, map] of this.watchlists.entries()) {
        data[name] = Array.from(map.values());
      }
      const output = { active: this.activeWatchlist, lists: data };
      fs.writeFileSync(watchlistPath, JSON.stringify(output, null, 2));
      console.log(`Saved watchlists: ${Object.keys(data).join(', ')}`);
    } catch (error) {
      console.error('Error saving watchlists:', error);
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

    const map = this.getWatchlistMap('default');
    for (const item of defaultSymbols) {
      map.set(item.symbol, {
        symbol: item.symbol,
        sector: item.sector,
        enabled: true,
        gexTracking: item.gexTracking,
        lastUpdated: new Date().toISOString(),
      });
    }

    await this.saveWatchlists();
    console.log('Created default watchlist with major symbols');
  }

  async createWatchlist(name: string, symbols: string[] = []): Promise<void> {
    const list = this.getWatchlistMap(name);
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      list.set(upperSymbol, {
        symbol: upperSymbol,
        sector: 'Unknown',
        enabled: true,
        gexTracking: true,
        lastUpdated: new Date().toISOString(),
      });
    }
    await this.saveWatchlists();
  }

  async addToWatchlist(symbols: string[], options?: Partial<WatchlistItem>, listName: string = 'default'): Promise<void> {
    const list = this.getWatchlistMap(listName);
    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      list.set(upperSymbol, {
        symbol: upperSymbol,
        sector: options?.sector || 'Unknown',
        marketCap: options?.marketCap,
        avgVolume: options?.avgVolume,
        enabled: options?.enabled ?? true,
        gexTracking: options?.gexTracking ?? true,
        lastUpdated: new Date().toISOString(),
      });
    }
    await this.saveWatchlists();
    try {
      const { marketIntelligence } = await import('./marketIntelligence');
      for (const symbol of symbols) {
        marketIntelligence.trackFundamentalData(symbol).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to fetch fundamentals for new symbols:', err);
    }
    console.log(`Added ${symbols.length} symbols to watchlist ${listName}`);
  }

  async removeFromWatchlist(symbols: string[], listName: string = 'default'): Promise<void> {
    const list = this.getWatchlistMap(listName);
    for (const symbol of symbols) {
      const upper = symbol.toUpperCase();
      list.delete(upper);
      const fundamentalsPath = path.join(process.cwd(), 'data', 'intelligence', `${upper}_fundamentals.json`);
      if (fs.existsSync(fundamentalsPath)) {
        try {
          fs.unlinkSync(fundamentalsPath);
        } catch (err) {
          console.error('Failed to remove fundamentals file for', upper, err);
        }
      }
    }
    await this.saveWatchlists();
    console.log(`Removed ${symbols.length} symbols from watchlist ${listName}`);
  }

  async setSymbolEnabled(symbol: string, enabled: boolean, listName: string = 'default'): Promise<void> {
    const list = this.getWatchlistMap(listName);
    const item = list.get(symbol.toUpperCase());
    if (item) {
      item.enabled = enabled;
      item.lastUpdated = new Date().toISOString();
      await this.saveWatchlists();
      console.log(`Set ${symbol} ${enabled ? 'enabled' : 'disabled'} in watchlist ${listName}`);
    }
  }

  async clearWatchlist(listName: string = 'default'): Promise<void> {
    this.watchlists.set(listName, new Map());
    await this.saveWatchlists();
    console.log(`Cleared watchlist ${listName}`);
  }

  getWatchlist(listName: string = this.activeWatchlist): WatchlistItem[] {
    return Array.from(this.getWatchlistMap(listName).values());
  }

  getWatchlistNames(): string[] {
    return Array.from(this.watchlists.keys());
  }

  getActiveWatchlist(): string {
    return this.activeWatchlist;
  }

  setActiveWatchlist(name: string): void {
    if (this.watchlists.has(name)) {
      this.activeWatchlist = name;
      this.saveWatchlists();
    }
  }

  getGEXEnabledSymbols(listName: string = 'default'): string[] {
    return this.getWatchlist(listName)
      .filter(item => item.enabled && item.gexTracking)
      .map(item => item.symbol);
  }

  async refreshSentiments(listName: string = 'default'): Promise<void> {
    const symbols = this.getWatchlist(listName).map(w => w.symbol);
    const results = await Promise.all(
      symbols.map(sym => sentimentAnalysisService.getTickerSentiment(sym))
    );
    results.forEach(r => this.sentiments.set(r.ticker, r));
  }

  getWatchlistSentiments(): TickerSentimentResult[] {
    return Array.from(this.sentiments.values());
  }

  async updateWatchlistPrices(listName: string = 'default'): Promise<void> {
    const list = this.getWatchlistMap(listName);
    const { ibkrService } = await import('./ibkr');
    for (const item of list.values()) {
      if (!item.enabled) continue;
      try {
        const md = await ibkrService.getMarketData(item.symbol);
        const price =
          md?.lastPrice ||
          md?.close ||
          md?.price ||
          md?.regularMarketPrice ||
          md?.c ||
          null;
        if (price !== null) {
          item.lastPrice = price;
          item.lastUpdated = new Date().toISOString();
        }
      } catch (err) {
        console.error('Failed to update price for', item.symbol, err);
      }
      await new Promise(res => setTimeout(res, 100));
    }
    await this.saveWatchlists();
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

  private startFundamentalUpdates(): void {
    setInterval(async () => {
      try {
        const { marketIntelligence } = await import('./marketIntelligence');
        const symbols = new Set<string>();
        for (const map of this.watchlists.values()) {
          for (const item of map.values()) {
            symbols.add(item.symbol);
          }
        }
        for (const symbol of symbols) {
          await marketIntelligence.trackFundamentalData(symbol);
        }
      } catch (error) {
        console.error('Fundamentals background update failed:', error);
      }
    }, 60 * 60 * 1000); // hourly
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
    await this.updateWatchlistPrices();
    const items = this.getWatchlist().filter(w => w.enabled);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Import market intelligence service
    const { marketIntelligence } = await import('./marketIntelligence');

    for (const item of items) {
      try {
        // Update GEX data when enabled
        if (item.gexTracking) {
          await this.updateSymbolGEX(item.symbol);
        }

        // Update market intelligence data
        await Promise.all([
          marketIntelligence.trackDarkPoolActivity(item.symbol),
          marketIntelligence.trackInsiderTrades(item.symbol),
          marketIntelligence.trackAnalystUpdates(item.symbol),
          marketIntelligence.trackNewsAlerts(item.symbol),
          marketIntelligence.trackFundamentalData(item.symbol)
        ]);

        results.success++;
        console.log(`✅ Updated all data for ${item.symbol}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`${item.symbol}: ${error.message}`);
        console.error(`Failed to update data for ${item.symbol}:`, error);
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

  async updateSymbols(symbols: string[], listName: string = 'default'): Promise<void> {
    console.log(`Updating GEX data for ${symbols.length} symbols in ${listName} watchlist...`);
    const { marketIntelligence } = await import('./marketIntelligence');
    const results = { success: 0, failed: 0, errors: [] as string[] };
    const list = this.getWatchlistMap(listName);

    for (const symbol of symbols) {
      try {
        await this.updateSymbolGEX(symbol);
        await Promise.all([
          marketIntelligence.trackDarkPoolActivity(symbol),
          marketIntelligence.trackInsiderTrades(symbol),
          marketIntelligence.trackAnalystUpdates(symbol),
          marketIntelligence.trackNewsAlerts(symbol),
          marketIntelligence.trackFundamentalData(symbol),
        ]);
        const item = list.get(symbol);
        if (item) {
          item.lastUpdated = new Date().toISOString();
        }
        results.success++;
        console.log(`✅ Updated data for ${symbol}`);
      } catch (error) {
        results.failed++;
        results.errors.push(`${symbol}: ${error.message}`);
        console.error(`Failed to update data for ${symbol}:`, error);
      }
    }

    await this.saveWatchlists();

    if (results.errors.length > 0) {
      console.log('Update errors:', results.errors);
    }
  }

  private async updateSymbolGEX(symbol: string): Promise<void> {
    try {
      const { UnusualWhalesService } = await import('./unusualWhales');
      const uw = new UnusualWhalesService();
      let exposures = await uw.getSpotExposures(symbol);
      let dataDate = new Date();

      if (!exposures.length) {
        const lastFriday = this.getLastFriday();
        exposures = await uw.getSpotExposures(symbol, lastFriday);
        if (!exposures.length) {
          console.warn(`No GEX data available for ${symbol}`);
          return;
        }
        dataDate = new Date(lastFriday);
      }

      const totalGamma = exposures.reduce(
        (sum, e) =>
          sum + Math.abs(e.call_gamma_exposure) + Math.abs(e.put_gamma_exposure),
        0
      );
      const callGamma = exposures.reduce((sum, e) => sum + e.call_gamma_exposure, 0);
      const putGamma = exposures.reduce((sum, e) => sum + e.put_gamma_exposure, 0);
      const netGamma = exposures.reduce((sum, e) => sum + e.net_gamma_exposure, 0);

      const callWall = exposures.reduce((prev, cur) =>
        Math.abs(cur.call_gamma_exposure) > Math.abs(prev.call_gamma_exposure) ? cur : prev
      ).strike;
      const putWall = exposures.reduce((prev, cur) =>
        Math.abs(cur.put_gamma_exposure) > Math.abs(prev.put_gamma_exposure) ? cur : prev
      ).strike;
      const gammaFlip = exposures.reduce((prev, cur) =>
        Math.abs(cur.net_gamma_exposure) < Math.abs(prev.net_gamma_exposure) ? cur : prev
      ).strike;

      const gexData: GEXData = {
        symbol,
        date: dataDate.toISOString(),
        totalGamma,
        callGamma,
        putGamma,
        netGamma,
        gammaFlip,
        supportLevel: putWall,
        resistanceLevel: callWall,
        gexScore: totalGamma === 0 ? 0 : (netGamma / totalGamma) * 100,
      };

      if (!this.gexData.has(symbol)) {
        this.gexData.set(symbol, []);
      }

      const symbolData = this.gexData.get(symbol)!;
      symbolData.push(gexData);

      if (symbolData.length > 30) {
        symbolData.splice(0, symbolData.length - 30);
      }

      const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
      fs.writeFileSync(filePath, JSON.stringify(symbolData, null, 2));

      console.log(`Updated GEX data for ${symbol}`);
    } catch (error) {
      console.error(`Failed to update GEX for ${symbol}:`, error);
    }
  }

  private getLastFriday(): string {
    const date = new Date();
    const day = date.getDay();
    const diff = day >= 5 ? day - 5 : day + 2;
    date.setDate(date.getDate() - diff);
    return date.toISOString().split('T')[0];
  }

  async getGEXLevels(symbol: string): Promise<GEXLevels | null> {
    try {
      const filePath = path.join(this.dataDir, `${symbol}_gex.json`);
      if (!fs.existsSync(filePath)) {
        await this.updateSymbolGEX(symbol);
      }
      if (!fs.existsSync(filePath)) {
        return null;
      }

      let data: GEXData[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.length) {
        await this.updateSymbolGEX(symbol);
        data = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : [];
      }
      const latest = data[data.length - 1];

      if (!latest) return null;

      const { ibkrService } = await import('./ibkr');
      let currentPrice: number | null = null;
      try {
        const md = await ibkrService.getMarketData(symbol);
        currentPrice =
          md?.lastPrice ||
          md?.close ||
          md?.price ||
          md?.regularMarketPrice ||
          md?.c ||
          null;
      } catch (err) {
        console.error('Failed to fetch market price:', err);
      }

      const keyLevels = [
        { level: latest.gammaFlip, type: 'gamma_flip' as const, strength: 0.9 },
        { level: latest.supportLevel, type: 'support' as const, strength: 0.8 },
        { level: latest.resistanceLevel, type: 'resistance' as const, strength: 0.8 },
      ];

      return {
        symbol,
        date: latest.date,
        currentPrice: currentPrice ?? latest.gammaFlip,
        gammaFlip: latest.gammaFlip,
        callWall: latest.resistanceLevel,
        putWall: latest.supportLevel,
        netGamma: latest.netGamma,
        totalGamma: latest.totalGamma,
        gexScore: latest.gexScore,
        supportLevels: [latest.supportLevel],
        resistanceLevels: [latest.resistanceLevel],
        keyLevels,
      };
    } catch (error) {
      console.error(`Error getting GEX levels for ${symbol}:`, error);
      return null;
    }
  }

  async getAllGEXLevels(listName: string = 'default'): Promise<GEXLevels[]> {
    const symbols = this.getGEXEnabledSymbols(listName);
    const results: GEXLevels[] = [];

    for (const symbol of symbols) {
      const levels = await this.getGEXLevels(symbol);
      if (levels) {
        results.push(levels);
      }
    }

    return results;
  }

  async refreshWatchlist(listName: string = this.activeWatchlist): Promise<void> {
    const symbols = this.getWatchlist(listName).map(w => w.symbol);
    for (const symbol of symbols) {
      await this.updateSymbolGEX(symbol);
    }
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
