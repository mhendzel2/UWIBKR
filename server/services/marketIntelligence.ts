import { gexTracker, type DarkPoolData, type InsiderTrade, type AnalystUpdate, type NewsAlert } from './gexTracker';
import { ibkrService } from './ibkr';
import * as fs from 'fs';
import * as path from 'path';

export interface MarketAlert {
  id: string;
  symbol: string;
  type: 'dark_pool' | 'insider' | 'analyst' | 'news' | 'volume' | 'price';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: any;
  timestamp: string;
  acknowledged: boolean;
}

export class MarketIntelligenceService {
  private alertHistory: MarketAlert[] = [];
  private readonly dataDir = path.join(process.cwd(), 'data', 'intelligence');

  constructor() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.loadAlertHistory();
  }

  private async getRealPrice(symbol: string): Promise<number> {
    try {
      const marketData = await ibkrService.getMarketData(symbol);
      if (marketData && marketData.last) {
        return marketData.last;
      }
    } catch (error) {
      console.error(`Failed to get real price for ${symbol}:`, error);
    }
    
    // Fallback to a more realistic base price than the hardcoded 150
    const basePrices: { [key: string]: number } = {
      'AAPL': 230,
      'TSLA': 250, 
      'NVDA': 140,
      'MSFT': 415,
      'GOOGL': 175,
      'AMZN': 185,
      'META': 560,
      'SPY': 470,
      'QQQ': 400
    };
    
    return basePrices[symbol] || 100 + Math.random() * 100;
  }

  async trackDarkPoolActivity(symbol: string): Promise<DarkPoolData | null> {
    try {
      // Get real current price for more accurate calculations
      const currentPrice = await this.getRealPrice(symbol);
      
      // In production, this would connect to dark pool data providers
      // For now, we'll simulate realistic dark pool data with real price reference
      
      const darkPoolData: DarkPoolData = {
        symbol,
        date: new Date().toISOString().split('T')[0],
        darkPoolVolume: Math.floor(Math.random() * 5000000) + 1000000, // 1M-6M shares
        totalVolume: Math.floor(Math.random() * 15000000) + 5000000, // 5M-20M shares
        darkPoolRatio: 0, // Will be calculated
        avgDarkPoolSize: Math.floor(Math.random() * 10000) + 1000, // 1K-11K avg size
        sentiment: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        significantTrades: []
      };

      darkPoolData.darkPoolRatio = darkPoolData.darkPoolVolume / darkPoolData.totalVolume;

      // Generate significant dark pool trades using real price
      const numTrades = Math.floor(Math.random() * 5) + 2;
      for (let i = 0; i < numTrades; i++) {
        darkPoolData.significantTrades.push({
          size: Math.floor(Math.random() * 100000) + 50000,
          price: currentPrice + (Math.random() - 0.5) * (currentPrice * 0.02), // ±2% of real price
          timestamp: new Date(Date.now() - Math.random() * 8 * 60 * 60 * 1000).toISOString() // Last 8 hours
        });
      }

      // Check for alerts
      if (darkPoolData.darkPoolRatio > 0.45) { // Alert if >45% dark pool
        await this.createAlert({
          symbol,
          type: 'dark_pool',
          severity: darkPoolData.darkPoolRatio > 0.6 ? 'high' : 'medium',
          title: `High Dark Pool Activity - ${symbol}`,
          message: `Dark pool volume represents ${(darkPoolData.darkPoolRatio * 100).toFixed(1)}% of total volume`,
          data: darkPoolData
        });
      }

      await this.saveDarkPoolData(symbol, darkPoolData);
      return darkPoolData;
    } catch (error) {
      console.error(`Error tracking dark pool for ${symbol}:`, error);
      return null;
    }
  }

  async trackInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
    try {
      // Get real current price for more accurate calculations
      const currentPrice = await this.getRealPrice(symbol);
      
      // In production, this would connect to SEC EDGAR filings API
      // Simulating recent insider trades with real price reference
      
      const trades: InsiderTrade[] = [];
      const numTrades = Math.floor(Math.random() * 3) + 1;
      
      const insiders = [
        { name: 'John Smith', title: 'CEO' },
        { name: 'Jane Doe', title: 'CFO' },
        { name: 'Mike Johnson', title: 'CTO' },
        { name: 'Sarah Wilson', title: 'Director' }
      ];

      for (let i = 0; i < numTrades; i++) {
        const insider = insiders[Math.floor(Math.random() * insiders.length)];
        const isBuy = Math.random() > 0.3; // 70% buy, 30% sell
        const shares = Math.floor(Math.random() * 50000) + 1000;
        // Use real price with small variation for historical trade price
        const tradePrice = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.05); // ±5% variation
        
        const trade: InsiderTrade = {
          symbol,
          insider: insider.name,
          title: insider.title,
          transactionType: isBuy ? 'buy' : 'sell',
          shares,
          price: tradePrice,
          value: shares * tradePrice,
          date: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
          filingDate: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(), // Last 3 days
          ownershipPercent: Math.random() * 5 + 0.1 // 0.1% to 5%
        };

        trades.push(trade);

        // Check for significant insider activity
        if (trade.value > 1000000) { // Alert for trades >$1M
          await this.createAlert({
            symbol,
            type: 'insider',
            severity: trade.value > 5000000 ? 'high' : 'medium',
            title: `Significant Insider ${trade.transactionType.toUpperCase()} - ${symbol}`,
            message: `${trade.insider} (${trade.title}) ${trade.transactionType} ${trade.shares.toLocaleString()} shares for $${trade.value.toLocaleString()}`,
            data: trade
          });
        }
      }

      await this.saveInsiderTrades(symbol, trades);
      return trades;
    } catch (error) {
      console.error(`Error tracking insider trades for ${symbol}:`, error);
      return [];
    }
  }

  async trackAnalystUpdates(symbol: string): Promise<AnalystUpdate[]> {
    try {
      // Get real current price for more accurate calculations
      const currentPrice = await this.getRealPrice(symbol);
      
      // In production, this would connect to financial data providers
      // Simulating analyst updates with real price targets
      
      const updates: AnalystUpdate[] = [];
      const numUpdates = Math.floor(Math.random() * 2) + 1;
      
      const firms = ['Goldman Sachs', 'Morgan Stanley', 'JPMorgan', 'Bank of America', 'Wells Fargo', 'Barclays'];
      const ratings = ['Buy', 'Outperform', 'Hold', 'Underperform', 'Sell'];
      const actions = ['upgrade', 'downgrade', 'initiate', 'maintain'] as const;

      for (let i = 0; i < numUpdates; i++) {
        const firm = firms[Math.floor(Math.random() * firms.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const previousRating = ratings[Math.floor(Math.random() * ratings.length)];
        const newRating = ratings[Math.floor(Math.random() * ratings.length)];
        // Base targets on real current price with realistic ranges
        const previousTarget = currentPrice + (Math.random() - 0.5) * (currentPrice * 0.3); // ±30%
        const newTarget = previousTarget + (Math.random() - 0.5) * (currentPrice * 0.2); // ±20% change
        
        const update: AnalystUpdate = {
          symbol,
          firm,
          analyst: 'Research Team', // Would be specific analyst name in production
          action,
          previousRating,
          newRating,
          previousTarget,
          newTarget,
          date: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString(), // Last 5 days
          reasoning: this.generateAnalystReasoning(action, newRating)
        };

        updates.push(update);

        // Check for significant rating changes
        const targetChange = Math.abs((newTarget - previousTarget) / previousTarget);
        if (targetChange > 0.1 || (action === 'upgrade' || action === 'downgrade')) {
          await this.createAlert({
            symbol,
            type: 'analyst',
            severity: targetChange > 0.2 ? 'high' : 'medium',
            title: `Analyst ${action.toUpperCase()} - ${symbol}`,
            message: `${firm} ${action}s ${symbol} to ${newRating} with $${newTarget.toFixed(0)} target`,
            data: update
          });
        }
      }

      await this.saveAnalystUpdates(symbol, updates);
      return updates;
    } catch (error) {
      console.error(`Error tracking analyst updates for ${symbol}:`, error);
      return [];
    }
  }

  async trackNewsAlerts(symbol: string): Promise<NewsAlert[]> {
    try {
      // In production, this would connect to news APIs (Reuters, Bloomberg, etc.)
      // Simulating news alerts
      
      const alerts: NewsAlert[] = [];
      const numAlerts = Math.floor(Math.random() * 3) + 1;
      
      const sources = ['Reuters', 'Bloomberg', 'CNBC', 'MarketWatch', 'Yahoo Finance'];
      const categories = ['earnings', 'guidance', 'analyst', 'regulatory', 'general'] as const;
      
      const newsTemplates = [
        { headline: '{symbol} reports strong Q4 earnings, beats estimates', category: 'earnings', sentiment: 0.7, importance: 'high' },
        { headline: '{symbol} raises full-year guidance', category: 'guidance', sentiment: 0.8, importance: 'high' },
        { headline: 'Regulatory approval granted for {symbol} new product', category: 'regulatory', sentiment: 0.6, importance: 'medium' },
        { headline: '{symbol} announces strategic partnership', category: 'general', sentiment: 0.5, importance: 'medium' },
        { headline: 'Analyst upgrades {symbol} on strong fundamentals', category: 'analyst', sentiment: 0.7, importance: 'medium' }
      ];

      for (let i = 0; i < numAlerts; i++) {
        const template = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];
        
        const alert: NewsAlert = {
          symbol,
          headline: template.headline.replace('{symbol}', symbol),
          summary: `Recent developments suggest positive momentum for ${symbol} with strong market reception.`,
          source: sources[Math.floor(Math.random() * sources.length)],
          sentiment: template.sentiment + (Math.random() - 0.5) * 0.4,
          importance: template.importance as any,
          category: template.category,
          publishedAt: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000).toISOString(), // Last 12 hours
          url: `https://example.com/news/${symbol.toLowerCase()}-${Date.now()}`
        };

        alerts.push(alert);

        // Check for important news
        if (alert.importance === 'high' || alert.importance === 'critical') {
          await this.createAlert({
            symbol,
            type: 'news',
            severity: alert.importance === 'critical' ? 'critical' : 'high',
            title: `Important News - ${symbol}`,
            message: alert.headline,
            data: alert
          });
        }
      }

      await this.saveNewsAlerts(symbol, alerts);
      return alerts;
    } catch (error) {
      console.error(`Error tracking news for ${symbol}:`, error);
      return [];
    }
  }

  private generateAnalystReasoning(action: string, rating: string): string {
    const reasons = {
      upgrade: ['Strong earnings momentum', 'Improved market position', 'Positive sector outlook'],
      downgrade: ['Margin pressure concerns', 'Competitive headwinds', 'Valuation concerns'],
      initiate: ['Compelling growth story', 'Attractive valuation', 'Strong management team'],
      maintain: ['Balanced risk/reward', 'Stable fundamentals', 'Fair valuation']
    };
    
    const actionReasons = reasons[action] || reasons.maintain;
    return actionReasons[Math.floor(Math.random() * actionReasons.length)];
  }

  private async createAlert(alertData: Omit<MarketAlert, 'id' | 'timestamp' | 'acknowledged'>): Promise<void> {
    const alert: MarketAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...alertData
    };

    this.alertHistory.push(alert);
    await this.saveAlertHistory();
    
    console.log(`🚨 MARKET ALERT: ${alert.title} - ${alert.message}`);
  }

  async getMarketAlerts(symbol?: string, acknowledged?: boolean): Promise<MarketAlert[]> {
    let alerts = this.alertHistory;
    
    if (symbol) {
      alerts = alerts.filter(alert => alert.symbol === symbol);
    }
    
    if (acknowledged !== undefined) {
      alerts = alerts.filter(alert => alert.acknowledged === acknowledged);
    }
    
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      await this.saveAlertHistory();
      return true;
    }
    return false;
  }

  async getMarketIntelligenceSummary(symbol: string): Promise<{
    darkPool: DarkPoolData | null;
    insiderTrades: InsiderTrade[];
    analystUpdates: AnalystUpdate[];
    newsAlerts: NewsAlert[];
    alerts: MarketAlert[];
  }> {
    const [darkPool, insiderTrades, analystUpdates, newsAlerts] = await Promise.all([
      this.getDarkPoolData(symbol),
      this.getInsiderTrades(symbol),
      this.getAnalystUpdates(symbol),
      this.getNewsAlerts(symbol)
    ]);

    const alerts = await this.getMarketAlerts(symbol, false); // Unacknowledged alerts

    return {
      darkPool,
      insiderTrades,
      analystUpdates,
      newsAlerts,
      alerts
    };
  }

  // Data persistence methods
  private async saveDarkPoolData(symbol: string, data: DarkPoolData): Promise<void> {
    const filePath = path.join(this.dataDir, `${symbol}_darkpool.json`);
    let existingData: DarkPoolData[] = [];
    
    if (fs.existsSync(filePath)) {
      existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    existingData.push(data);
    
    // Keep only last 30 days
    if (existingData.length > 30) {
      existingData = existingData.slice(-30);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  }

  private async saveInsiderTrades(symbol: string, trades: InsiderTrade[]): Promise<void> {
    const filePath = path.join(this.dataDir, `${symbol}_insider.json`);
    let existingTrades: InsiderTrade[] = [];
    
    if (fs.existsSync(filePath)) {
      existingTrades = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    existingTrades.push(...trades);
    
    // Keep only last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    existingTrades = existingTrades.filter(trade => new Date(trade.date) > ninetyDaysAgo);
    
    fs.writeFileSync(filePath, JSON.stringify(existingTrades, null, 2));
  }

  private async saveAnalystUpdates(symbol: string, updates: AnalystUpdate[]): Promise<void> {
    const filePath = path.join(this.dataDir, `${symbol}_analyst.json`);
    let existingUpdates: AnalystUpdate[] = [];
    
    if (fs.existsSync(filePath)) {
      existingUpdates = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    existingUpdates.push(...updates);
    
    // Keep only last 60 days
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    existingUpdates = existingUpdates.filter(update => new Date(update.date) > sixtyDaysAgo);
    
    fs.writeFileSync(filePath, JSON.stringify(existingUpdates, null, 2));
  }

  private async saveNewsAlerts(symbol: string, alerts: NewsAlert[]): Promise<void> {
    const filePath = path.join(this.dataDir, `${symbol}_news.json`);
    let existingAlerts: NewsAlert[] = [];
    
    if (fs.existsSync(filePath)) {
      existingAlerts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    
    existingAlerts.push(...alerts);
    
    // Keep only last 7 days for news
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    existingAlerts = existingAlerts.filter(alert => new Date(alert.publishedAt) > sevenDaysAgo);
    
    fs.writeFileSync(filePath, JSON.stringify(existingAlerts, null, 2));
  }

  private async saveAlertHistory(): Promise<void> {
    const filePath = path.join(this.dataDir, 'alert_history.json');
    
    // Keep only last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(this.alertHistory, null, 2));
  }

  private async loadAlertHistory(): Promise<void> {
    const filePath = path.join(this.dataDir, 'alert_history.json');
    if (fs.existsSync(filePath)) {
      this.alertHistory = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  }

  // Data retrieval methods
  private async getDarkPoolData(symbol: string): Promise<DarkPoolData | null> {
    const filePath = path.join(this.dataDir, `${symbol}_darkpool.json`);
    if (fs.existsSync(filePath)) {
      const data: DarkPoolData[] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data[data.length - 1] || null;
    }
    return null;
  }

  private async getInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
    const filePath = path.join(this.dataDir, `${symbol}_insider.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
  }

  private async getAnalystUpdates(symbol: string): Promise<AnalystUpdate[]> {
    const filePath = path.join(this.dataDir, `${symbol}_analyst.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
  }

  private async getNewsAlerts(symbol: string): Promise<NewsAlert[]> {
    const filePath = path.join(this.dataDir, `${symbol}_news.json`);
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return [];
  }
}

export const marketIntelligence = new MarketIntelligenceService();