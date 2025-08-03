import path from 'path';
import fs from 'fs';
import { WatchlistItem } from './dataImporter';

export interface Watchlist {
  id: string;
  name: string;
  description?: string;
  symbols: WatchlistItem[];
  createdAt: string;
  updatedAt: string;
  isDefault: boolean;
}

export class WatchlistManager {
  private watchlists: Map<string, Watchlist> = new Map();
  private currentWatchlistId: string = 'default';
  private readonly dataDir = path.join(process.cwd(), 'data', 'watchlists');

  constructor() {
    this.ensureDataDir();
    this.loadWatchlists();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private async loadWatchlists(): Promise<void> {
    try {
      const watchlistsFile = path.join(this.dataDir, 'watchlists.json');
      
      if (fs.existsSync(watchlistsFile)) {
        const data = JSON.parse(fs.readFileSync(watchlistsFile, 'utf8'));
        
        // Load watchlists from file
        for (const watchlist of data.watchlists || []) {
          this.watchlists.set(watchlist.id, watchlist);
        }
        
        this.currentWatchlistId = data.currentWatchlistId || 'default';
      }

      // Ensure default watchlist exists
      if (!this.watchlists.has('default')) {
        await this.createDefaultWatchlist();
      }

      console.log(`Loaded ${this.watchlists.size} watchlists`);
    } catch (error) {
      console.error('Error loading watchlists:', error);
      await this.createDefaultWatchlist();
    }
  }

  private async saveWatchlists(): Promise<void> {
    try {
      const watchlistsFile = path.join(this.dataDir, 'watchlists.json');
      const data = {
        watchlists: Array.from(this.watchlists.values()),
        currentWatchlistId: this.currentWatchlistId,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(watchlistsFile, JSON.stringify(data, null, 2));
      console.log(`Saved ${this.watchlists.size} watchlists`);
    } catch (error) {
      console.error('Error saving watchlists:', error);
    }
  }

  async createWatchlist(name: string, description?: string): Promise<Watchlist> {
    const id = `watchlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const watchlist: Watchlist = {
      id,
      name,
      description,
      symbols: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: false
    };

    this.watchlists.set(id, watchlist);
    await this.saveWatchlists();
    
    console.log(`Created new watchlist: ${name} (${id})`);
    return watchlist;
  }

  async createDefaultWatchlist(): Promise<void> {
    const defaultSymbols: Partial<WatchlistItem>[] = [
      // Major indices
      { symbol: 'SPY', sector: 'ETF', gexTracking: true },
      { symbol: 'QQQ', sector: 'ETF', gexTracking: true },
      { symbol: 'IWM', sector: 'ETF', gexTracking: true },
      
      // FAANG/Big Tech
      { symbol: 'AAPL', sector: 'Technology', gexTracking: true },
      { symbol: 'MSFT', sector: 'Technology', gexTracking: true },
      { symbol: 'GOOGL', sector: 'Technology', gexTracking: true },
      { symbol: 'AMZN', sector: 'Technology', gexTracking: true },
      { symbol: 'META', sector: 'Technology', gexTracking: true },
      { symbol: 'NFLX', sector: 'Communication Services', gexTracking: true },
      
      // High volatility stocks
      { symbol: 'NVDA', sector: 'Technology', gexTracking: true },
      { symbol: 'TSLA', sector: 'Consumer Cyclical', gexTracking: true },
      { symbol: 'AMD', sector: 'Technology', gexTracking: true },
      
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

    const symbols: WatchlistItem[] = defaultSymbols.map(item => ({
      symbol: item.symbol!,
      sector: item.sector || 'Unknown',
      enabled: true,
      gexTracking: item.gexTracking ?? true,
      lastUpdated: new Date().toISOString()
    }));

    const defaultWatchlist: Watchlist = {
      id: 'default',
      name: 'Default Watchlist',
      description: 'Default watchlist with major market symbols',
      symbols,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: true
    };

    this.watchlists.set('default', defaultWatchlist);
    this.currentWatchlistId = 'default';
    await this.saveWatchlists();
    
    console.log('Created default watchlist with major symbols');
  }

  async deleteWatchlist(id: string): Promise<boolean> {
    if (id === 'default') {
      throw new Error('Cannot delete default watchlist');
    }

    if (!this.watchlists.has(id)) {
      return false;
    }

    this.watchlists.delete(id);
    
    // If this was the current watchlist, switch to default
    if (this.currentWatchlistId === id) {
      this.currentWatchlistId = 'default';
    }

    await this.saveWatchlists();
    console.log(`Deleted watchlist: ${id}`);
    return true;
  }

  async setCurrentWatchlist(id: string): Promise<boolean> {
    if (!this.watchlists.has(id)) {
      return false;
    }

    this.currentWatchlistId = id;
    await this.saveWatchlists();
    console.log(`Switched to watchlist: ${id}`);
    return true;
  }

  getCurrentWatchlist(): Watchlist | null {
    return this.watchlists.get(this.currentWatchlistId) || null;
  }

  getAllWatchlists(): Watchlist[] {
    return Array.from(this.watchlists.values());
  }

  getWatchlist(id: string): Watchlist | null {
    return this.watchlists.get(id) || null;
  }

  async addSymbolsToWatchlist(watchlistId: string, symbols: string[], options?: Partial<WatchlistItem>): Promise<void> {
    const watchlist = this.watchlists.get(watchlistId);
    if (!watchlist) {
      throw new Error(`Watchlist ${watchlistId} not found`);
    }

    const existingSymbols = new Set(watchlist.symbols.map(s => s.symbol));

    for (const symbol of symbols) {
      const upperSymbol = symbol.toUpperCase();
      
      if (!existingSymbols.has(upperSymbol)) {
        watchlist.symbols.push({
          symbol: upperSymbol,
          sector: options?.sector || 'Unknown',
          marketCap: options?.marketCap,
          avgVolume: options?.avgVolume,
          enabled: options?.enabled ?? true,
          gexTracking: options?.gexTracking ?? true,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    watchlist.updatedAt = new Date().toISOString();
    await this.saveWatchlists();
    console.log(`Added ${symbols.length} symbols to watchlist ${watchlistId}`);
  }

  async removeSymbolsFromWatchlist(watchlistId: string, symbols: string[]): Promise<void> {
    const watchlist = this.watchlists.get(watchlistId);
    if (!watchlist) {
      throw new Error(`Watchlist ${watchlistId} not found`);
    }

    const symbolsToRemove = new Set(symbols.map(s => s.toUpperCase()));
    watchlist.symbols = watchlist.symbols.filter(item => !symbolsToRemove.has(item.symbol));
    
    watchlist.updatedAt = new Date().toISOString();
    await this.saveWatchlists();
    console.log(`Removed ${symbols.length} symbols from watchlist ${watchlistId}`);
  }

  async updateWatchlistInfo(id: string, updates: { name?: string; description?: string }): Promise<boolean> {
    const watchlist = this.watchlists.get(id);
    if (!watchlist) {
      return false;
    }

    if (updates.name) watchlist.name = updates.name;
    if (updates.description !== undefined) watchlist.description = updates.description;
    
    watchlist.updatedAt = new Date().toISOString();
    await this.saveWatchlists();
    
    console.log(`Updated watchlist ${id}`);
    return true;
  }

  async duplicateWatchlist(sourceId: string, newName: string): Promise<Watchlist> {
    const sourceWatchlist = this.watchlists.get(sourceId);
    if (!sourceWatchlist) {
      throw new Error(`Source watchlist ${sourceId} not found`);
    }

    const newWatchlist = await this.createWatchlist(newName, `Copy of ${sourceWatchlist.name}`);
    
    // Copy all symbols
    newWatchlist.symbols = [...sourceWatchlist.symbols.map(symbol => ({
      ...symbol,
      lastUpdated: new Date().toISOString()
    }))];

    await this.saveWatchlists();
    console.log(`Duplicated watchlist ${sourceId} as ${newWatchlist.id}`);
    return newWatchlist;
  }

  // Legacy compatibility methods for existing GEXTracker
  getWatchlistItems(): WatchlistItem[] {
    const current = this.getCurrentWatchlist();
    return current ? current.symbols : [];
  }

  getGEXEnabledSymbols(): string[] {
    const current = this.getCurrentWatchlist();
    return current ? current.symbols
      .filter(item => item.enabled && item.gexTracking)
      .map(item => item.symbol) : [];
  }

  async addToWatchlist(symbols: string[], options?: Partial<WatchlistItem>): Promise<void> {
    await this.addSymbolsToWatchlist(this.currentWatchlistId, symbols, options);
  }

  async removeFromWatchlist(symbols: string[]): Promise<void> {
    await this.removeSymbolsFromWatchlist(this.currentWatchlistId, symbols);
  }
}

// Export singleton instance
export const watchlistManager = new WatchlistManager();
