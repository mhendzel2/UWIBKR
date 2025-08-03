import { 
  type User, 
  type InsertUser,
  type TradingSignal,
  type InsertTradingSignal,
  type Position,
  type InsertPosition,
  type OptionsFlow,
  type InsertOptionsFlow,
  type RiskParameters,
  type InsertRiskParameters,
  type SystemHealth,
  type InsertSystemHealth,
  type MarketData,
  type InsertMarketData,
  type Alert,
  type InsertAlert,
  type HistoricalData,
  type InsertHistoricalData,
  type AccountAlert,
  type InsertAccountAlert,
  type Trade,
  type InsertTrade,
  type TradeAssessment,
  type InsertTradeAssessment,
  type PerformanceMetrics,
  type InsertPerformanceMetrics,
  type Portfolio,
  type InsertPortfolio,
  type PortfolioPosition,
  type InsertPortfolioPosition,
  type PortfolioTransaction,
  type InsertPortfolioTransaction,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, gte, lte, and, desc } from "drizzle-orm";
import * as schema from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trading Signals
  getTradingSignals(): Promise<TradingSignal[]>;
  getTradingSignal(id: string): Promise<TradingSignal | undefined>;
  createTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal>;
  updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined>;
  deleteTradingSignal(id: string): Promise<boolean>;

  // Positions
  getAllPositions(): Promise<Position[]>;
  getPosition(id: string): Promise<Position | undefined>;
  getPositionsBySignal(signalId: string): Promise<Position[]>;
  createPosition(position: InsertPosition): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined>;
  deletePosition(id: string): Promise<boolean>;

  // Options Flow
  getOptionsFlow(limit?: number): Promise<OptionsFlow[]>;
  createOptionsFlow(flow: InsertOptionsFlow): Promise<OptionsFlow>;

    // Risk Parameters
    getRiskParameters(userId?: string): Promise<RiskParameters[]>;
    createRiskParameters(params: InsertRiskParameters): Promise<RiskParameters>;
    updateRiskParameters(id: string, updates: Partial<RiskParameters>): Promise<RiskParameters | undefined>;

  // System Health
  getSystemHealth(): Promise<SystemHealth[]>;
  updateSystemHealth(service: string, health: Partial<SystemHealth>): Promise<SystemHealth>;

  // Market Data
  getMarketData(symbol: string): Promise<MarketData | undefined>;
  createMarketData(data: InsertMarketData): Promise<MarketData>;
  updateMarketData(symbol: string, updates: Partial<MarketData>): Promise<MarketData | undefined>;

  // Alerts
  getAlerts(userId?: string): Promise<Alert[]>;
  getUnreadAlerts(userId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(alertId: string): Promise<Alert | undefined>;
  acknowledgeAlert(alertId: string): Promise<Alert | undefined>;

  // Historical Data
  getHistoricalData(params: {
    dataType: string;
    symbol?: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<HistoricalData[]>;
  createHistoricalData(data: InsertHistoricalData): Promise<HistoricalData>;

  // Account Alerts
  getAccountAlerts(userId: string): Promise<AccountAlert[]>;
  createAccountAlert(alert: InsertAccountAlert): Promise<AccountAlert>;
  updateAccountAlert(alertId: string, updates: Partial<AccountAlert>): Promise<AccountAlert | undefined>;
  deleteAccountAlert(alertId: string): Promise<boolean>;

  // Trades
  getAllTrades(): Promise<Trade[]>;
  getTrade(id: string): Promise<Trade | undefined>;
  getTradesBySignal(signalId: string): Promise<Trade[]>;
  getTradesByTicker(ticker: string): Promise<Trade[]>;
  createTrade(trade: InsertTrade): Promise<Trade>;
  updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined>;
  deleteTrade(id: string): Promise<boolean>;

  // Trade Assessments
  getTradeAssessments(tradeId: string): Promise<TradeAssessment[]>;
  createTradeAssessment(assessment: InsertTradeAssessment): Promise<TradeAssessment>;
  updateTradeAssessment(id: string, updates: Partial<TradeAssessment>): Promise<TradeAssessment | undefined>;
  deleteTradeAssessment(id: string): Promise<boolean>;

  // Performance Metrics
  getPerformanceMetrics(params: {
    period?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PerformanceMetrics[]>;
  createPerformanceMetrics(metrics: InsertPerformanceMetrics): Promise<PerformanceMetrics>;
  calculatePerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics>;

  // Portfolio Management
  getPortfoliosByUser(userId: string): Promise<Portfolio[]>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined>;
  deletePortfolio(id: string): Promise<boolean>;

  // Portfolio Positions
  getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]>;
  getPortfolioPosition(id: string): Promise<PortfolioPosition | undefined>;
  createPortfolioPosition(position: InsertPortfolioPosition): Promise<PortfolioPosition>;
  updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined>;
  deletePortfolioPosition(id: string): Promise<boolean>;

  // Portfolio Transactions
  getPortfolioTransactions(portfolioId: string, limit?: number): Promise<PortfolioTransaction[]>;
  createPortfolioTransaction(transaction: InsertPortfolioTransaction): Promise<PortfolioTransaction>;

  // Risk Status
  updateRiskStatus(status: any): Promise<void>;
  getRiskStatus(): Promise<any>;
}

/* export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tradingSignals: Map<string, TradingSignal> = new Map();
  private positions: Map<string, Position> = new Map();
  private optionsFlow: Map<string, OptionsFlow> = new Map();
  private riskParameters: Map<string, RiskParameters> = new Map();
  private systemHealth: Map<string, SystemHealth> = new Map();
  private marketData: Map<string, MarketData> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private historicalData: Map<string, HistoricalData> = new Map();
  private accountAlerts: Map<string, AccountAlert> = new Map();

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Initialize with some sample data for development
    const mockSignal: TradingSignal = {
      id: randomUUID(),
      ticker: 'AAPL',
      strategy: 'Bull Call Spread',
      sentiment: 'BULLISH',
      confidence: '92.5',
      entryPrice: '2.45',
      targetPrice: '4.20',
      maxRisk: '245.00',
      expiry: '2024-01-19',
      reasoning: 'Large unusual call activity detected with high gamma positioning',
      status: 'pending',
      aiAnalysis: { confidence: 92.5, risk_factors: 'Market volatility' },
      createdAt: new Date(),
      approvedAt: null,
      executedAt: null,
    };
    this.tradingSignals.set(mockSignal.id, mockSignal);

    const mockPosition: Position = {
      id: randomUUID(),
      signalId: mockSignal.id,
      ticker: 'AAPL',
      strategy: 'Bull Call Spread',
      quantity: 2,
      entryPrice: '2.45',
      currentPrice: '2.91',
      pnl: '92.00',
      pnlPercent: '18.7',
      status: 'open',
      entryTime: new Date(),
      exitTime: null,
      contractDetails: { strikes: [150, 155], expiry: '2024-01-19' },
    };
    this.positions.set(mockPosition.id, mockPosition);

    // Initialize sample account alerts
    const sampleAlert: AccountAlert = {
      id: randomUUID(),
      userId: 'demo-user',
      alertName: 'Portfolio Stop Loss',
      condition: 'portfolio_value_below',
      threshold: '100000',
      ticker: null,
      isEnabled: true,
      notificationMethod: 'all',
      lastTriggered: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.accountAlerts.set(sampleAlert.id, sampleAlert);

    // Add historical data sample
    const sampleHistorical: HistoricalData = {
      id: randomUUID(),
      dataType: 'options_flow',
      symbol: 'AAPL',
      timeframe: '1d',
      openPrice: '185.50',
      highPrice: '187.25',
      lowPrice: '184.75',
      closePrice: '186.80',
      volume: 25000,
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      metadata: { source: 'unusual_whales' },
    };
    this.historicalData.set(sampleHistorical.id, sampleHistorical);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trading Signal methods
  async getTradingSignals(): Promise<TradingSignal[]> {
    return Array.from(this.tradingSignals.values())
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getTradingSignal(id: string): Promise<TradingSignal | undefined> {
    return this.tradingSignals.get(id);
  }

  async createTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal> {
    const id = randomUUID();
    const newSignal: TradingSignal = {
      ...signal,
      id,
      createdAt: new Date(),
      approvedAt: null,
      executedAt: null,
    };
    this.tradingSignals.set(id, newSignal);
    return newSignal;
  }

  async updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined> {
    const signal = this.tradingSignals.get(id);
    if (!signal) return undefined;

    const updatedSignal = { ...signal, ...updates };
    this.tradingSignals.set(id, updatedSignal);
    return updatedSignal;
  }

  async deleteTradingSignal(id: string): Promise<boolean> {
    return this.tradingSignals.delete(id);
  }

  // Position methods
  async getAllPositions(): Promise<Position[]> {
    return Array.from(this.positions.values())
      .sort((a, b) => (b.entryTime?.getTime() || 0) - (a.entryTime?.getTime() || 0));
  }

  async getPosition(id: string): Promise<Position | undefined> {
    return this.positions.get(id);
  }

  async getPositionsBySignal(signalId: string): Promise<Position[]> {
    return Array.from(this.positions.values())
      .filter(position => position.signalId === signalId);
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const newPosition: Position = {
      ...position,
      id,
      entryTime: new Date(),
      exitTime: null,
    };
    this.positions.set(id, newPosition);
    return newPosition;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const position = this.positions.get(id);
    if (!position) return undefined;

    const updatedPosition = { ...position, ...updates };
    this.positions.set(id, updatedPosition);
    return updatedPosition;
  }

  async deletePosition(id: string): Promise<boolean> {
    return this.positions.delete(id);
  }

  // Options Flow methods
  async getOptionsFlow(limit: number = 50): Promise<OptionsFlow[]> {
    const flows = Array.from(this.optionsFlow.values())
      .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));
    
    return flows.slice(0, limit);
  }

    async createOptionsFlow(flow: InsertOptionsFlow): Promise<OptionsFlow> {
      const id = randomUUID();
      const newFlow: OptionsFlow = {
        id,
        symbol: flow.symbol,
        type: flow.type,
        sentiment: flow.sentiment,
        volume: flow.volume,
        price: flow.price,
        premium: flow.premium,
        askSidePercentage: flow.askSidePercentage ?? null,
        openInterest: flow.openInterest ?? null,
        timestamp: new Date(),
      };
      this.optionsFlow.set(id, newFlow);
      return newFlow;
    }

  // Risk Parameters methods
  async getRiskParameters(userId?: string): Promise<RiskParameters[]> {
    if (userId) {
      const params = Array.from(this.riskParameters.values())
        .find(params => params.userId === userId);
      return params ? [params] : [];
    }
    return Array.from(this.riskParameters.values());
  }

    async createRiskParameters(params: InsertRiskParameters): Promise<RiskParameters> {
      const id = randomUUID();
      const newParams: RiskParameters = {
        id,
        userId: params.userId ?? null,
        maxDailyLoss: params.maxDailyLoss,
        maxPositionSize: params.maxPositionSize,
        maxDrawdown: params.maxDrawdown,
        portfolioHeatLimit: params.portfolioHeatLimit,
        isEnabled: params.isEnabled ?? null,
        updatedAt: new Date(),
      };
      this.riskParameters.set(id, newParams);
      return newParams;
    }

    async updateRiskParameters(id: string, updates: Partial<RiskParameters>): Promise<RiskParameters | undefined> {
      const params = this.riskParameters.get(id);

      if (!params) return undefined;

      const updatedParams = { ...params, ...updates, updatedAt: new Date() };
      this.riskParameters.set(id, updatedParams);
      return updatedParams;
    }

  // System Health methods
  async getSystemHealth(): Promise<SystemHealth[]> {
    return Array.from(this.systemHealth.values())
      .sort((a, b) => (b.lastCheck?.getTime() || 0) - (a.lastCheck?.getTime() || 0));
  }

    async updateSystemHealth(service: string, health: Partial<SystemHealth>): Promise<SystemHealth> {
    const existing = Array.from(this.systemHealth.values())
      .find(h => h.service === service);

    if (existing) {
      const updated = { ...existing, ...health, lastCheck: new Date() };
      this.systemHealth.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const newHealth: SystemHealth = {
        id,
        service,
        status: 'unknown',
        latency: null,
        lastCheck: new Date(),
        errorMessage: null,
        metadata: null,
        ...health,
      };
      this.systemHealth.set(id, newHealth);
      return newHealth;
    }
  }

  // Market Data methods
  async getMarketData(symbol: string): Promise<MarketData | undefined> {
    return Array.from(this.marketData.values())
      .find(data => data.symbol === symbol);
  }

    async createMarketData(data: InsertMarketData): Promise<MarketData> {
      const id = randomUUID();
      const newData: MarketData = {
        id,
        symbol: data.symbol,
        price: data.price,
        volume: data.volume ?? null,
        timestamp: new Date(),
        gammaExposure: data.gammaExposure ?? null,
        deltaExposure: data.deltaExposure ?? null,
      };
      this.marketData.set(id, newData);
      return newData;
    }

  async updateMarketData(symbol: string, updates: Partial<MarketData>): Promise<MarketData | undefined> {
    const data = Array.from(this.marketData.values())
      .find(d => d.symbol === symbol);
    
    if (!data) return undefined;

    const updatedData = { ...data, ...updates, timestamp: new Date() };
    this.marketData.set(data.id, updatedData);
    return updatedData;
  }

  // Alert methods
  async getAlerts(userId?: string): Promise<Alert[]> {
    const alerts = Array.from(this.alerts.values());
    if (userId) {
      return alerts.filter(alert => alert.userId === userId)
        .sort((a, b) => (b.triggeredAt?.getTime() || 0) - (a.triggeredAt?.getTime() || 0));
    }
    return alerts.sort((a, b) => (b.triggeredAt?.getTime() || 0) - (a.triggeredAt?.getTime() || 0));
  }

  async getUnreadAlerts(userId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId && !alert.isRead)
      .sort((a, b) => (b.triggeredAt?.getTime() || 0) - (a.triggeredAt?.getTime() || 0));
  }

    async createAlert(alert: InsertAlert): Promise<Alert> {
      const id = randomUUID();
      const newAlert: Alert = {
        id,
        message: alert.message,
        ticker: alert.ticker ?? null,
        userId: alert.userId ?? null,
        metadata: alert.metadata ?? null,
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        threshold: alert.threshold ?? null,
        currentValue: alert.currentValue ?? null,
        isRead: alert.isRead ?? null,
        isActive: alert.isActive ?? null,
        triggeredAt: new Date(),
        acknowledgedAt: null,
      };
      this.alerts.set(id, newAlert);
      return newAlert;
    }

  async markAlertAsRead(alertId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    const updatedAlert = { ...alert, isRead: true };
    this.alerts.set(alertId, updatedAlert);
    return updatedAlert;
  }

  async acknowledgeAlert(alertId: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(alertId);
    if (!alert) return undefined;

    const updatedAlert = { ...alert, acknowledgedAt: new Date() };
    this.alerts.set(alertId, updatedAlert);
    return updatedAlert;
  }

  // Historical Data methods
  async getHistoricalData(params: {
    dataType: string;
    symbol?: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<HistoricalData[]> {
    let filtered = Array.from(this.historicalData.values())
      .filter(data => {
        const matchesType = data.dataType === params.dataType;
        const matchesSymbol = !params.symbol || data.symbol === params.symbol;
        const matchesTimeframe = data.timeframe === params.timeframe;
        const withinDateRange = data.timestamp >= params.startDate && data.timestamp <= params.endDate;
        
        return matchesType && matchesSymbol && matchesTimeframe && withinDateRange;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

    async createHistoricalData(data: InsertHistoricalData): Promise<HistoricalData> {
      const id = randomUUID();
      const newData: HistoricalData = {
        id,
        dataType: data.dataType,
        symbol: data.symbol ?? null,
        timeframe: data.timeframe,
        openPrice: data.openPrice ?? null,
        highPrice: data.highPrice ?? null,
        lowPrice: data.lowPrice ?? null,
        closePrice: data.closePrice ?? null,
        volume: data.volume ?? null,
        timestamp: data.timestamp,
        metadata: data.metadata ?? null,
      };
      this.historicalData.set(id, newData);
      return newData;
    }

  // Account Alert methods
  async getAccountAlerts(userId: string): Promise<AccountAlert[]> {
    return Array.from(this.accountAlerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

    async createAccountAlert(alert: InsertAccountAlert): Promise<AccountAlert> {
      const id = randomUUID();
      const newAlert: AccountAlert = {
        id,
        userId: alert.userId ?? null,
        alertName: alert.alertName,
        condition: alert.condition,
        threshold: alert.threshold,
        ticker: alert.ticker ?? null,
        isEnabled: alert.isEnabled ?? null,
        notificationMethod: alert.notificationMethod,
        lastTriggered: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.accountAlerts.set(id, newAlert);
      return newAlert;
    }

  async updateAccountAlert(alertId: string, updates: Partial<AccountAlert>): Promise<AccountAlert | undefined> {
    const alert = this.accountAlerts.get(alertId);
    if (!alert) return undefined;

    const updatedAlert = { ...alert, ...updates, updatedAt: new Date() };
    this.accountAlerts.set(alertId, updatedAlert);
    return updatedAlert;
  }

  async deleteAccountAlert(alertId: string): Promise<boolean> {
    return this.accountAlerts.delete(alertId);
  }
  }

*/

  // Database Storage Implementation
  export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(schema.users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Trading Signal methods
  async getTradingSignals(): Promise<TradingSignal[]> {
    return db.select().from(schema.tradingSignals).orderBy(desc(schema.tradingSignals.createdAt));
  }

  async getTradingSignal(id: string): Promise<TradingSignal | undefined> {
    const [signal] = await db.select().from(schema.tradingSignals).where(eq(schema.tradingSignals.id, id));
    return signal || undefined;
  }

  async createTradingSignal(signal: InsertTradingSignal): Promise<TradingSignal> {
    const [newSignal] = await db
      .insert(schema.tradingSignals)
      .values(signal)
      .returning();
    return newSignal;
  }

  async updateTradingSignal(id: string, updates: Partial<TradingSignal>): Promise<TradingSignal | undefined> {
    const [updatedSignal] = await db
      .update(schema.tradingSignals)
      .set(updates)
      .where(eq(schema.tradingSignals.id, id))
      .returning();
    return updatedSignal || undefined;
  }

  async deleteTradingSignal(id: string): Promise<boolean> {
    const result = await db.delete(schema.tradingSignals).where(eq(schema.tradingSignals.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Position methods
  async getAllPositions(): Promise<Position[]> {
    return db.select().from(schema.positions).orderBy(desc(schema.positions.entryTime));
  }

  async getPosition(id: string): Promise<Position | undefined> {
    const [position] = await db.select().from(schema.positions).where(eq(schema.positions.id, id));
    return position || undefined;
  }

  async getPositionsBySignal(signalId: string): Promise<Position[]> {
    return db.select().from(schema.positions).where(eq(schema.positions.signalId, signalId));
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [newPosition] = await db
      .insert(schema.positions)
      .values(position)
      .returning();
    return newPosition;
  }

  async updatePosition(id: string, updates: Partial<Position>): Promise<Position | undefined> {
    const [updatedPosition] = await db
      .update(schema.positions)
      .set(updates)
      .where(eq(schema.positions.id, id))
      .returning();
    return updatedPosition || undefined;
  }

  async deletePosition(id: string): Promise<boolean> {
    const result = await db.delete(schema.positions).where(eq(schema.positions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Trade methods - comprehensive trade tracking
  async getAllTrades(): Promise<Trade[]> {
    return db.select().from(schema.trades).orderBy(desc(schema.trades.executionTime));
  }

  async getTrade(id: string): Promise<Trade | undefined> {
    const [trade] = await db.select().from(schema.trades).where(eq(schema.trades.id, id));
    return trade || undefined;
  }

  async getTradesBySignal(signalId: string): Promise<Trade[]> {
    return db.select().from(schema.trades).where(eq(schema.trades.signalId, signalId));
  }

  async getTradesByTicker(ticker: string): Promise<Trade[]> {
    return db.select().from(schema.trades).where(eq(schema.trades.ticker, ticker));
  }

  async createTrade(trade: InsertTrade): Promise<Trade> {
    const [newTrade] = await db
      .insert(schema.trades)
      .values(trade)
      .returning();
    return newTrade;
  }

  async updateTrade(id: string, updates: Partial<Trade>): Promise<Trade | undefined> {
    const [updatedTrade] = await db
      .update(schema.trades)
      .set(updates)
      .where(eq(schema.trades.id, id))
      .returning();
    return updatedTrade || undefined;
  }

  async deleteTrade(id: string): Promise<boolean> {
    const result = await db.delete(schema.trades).where(eq(schema.trades.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Trade Assessment methods
  async getTradeAssessments(tradeId: string): Promise<TradeAssessment[]> {
    return db.select().from(schema.tradeAssessments)
      .where(eq(schema.tradeAssessments.tradeId, tradeId))
      .orderBy(desc(schema.tradeAssessments.createdAt));
  }

  async createTradeAssessment(assessment: InsertTradeAssessment): Promise<TradeAssessment> {
    const [newAssessment] = await db
      .insert(schema.tradeAssessments)
      .values(assessment)
      .returning();
    return newAssessment;
  }

  async updateTradeAssessment(id: string, updates: Partial<TradeAssessment>): Promise<TradeAssessment | undefined> {
    const [updated] = await db
      .update(schema.tradeAssessments)
      .set(updates)
      .where(eq(schema.tradeAssessments.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTradeAssessment(id: string): Promise<boolean> {
    const result = await db.delete(schema.tradeAssessments).where(eq(schema.tradeAssessments.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Performance Metrics methods
  async getPerformanceMetrics(params: {
    period?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<PerformanceMetrics[]> {
      const conditions = [] as any[];
      if (params.period) {
        conditions.push(eq(schema.performanceMetrics.period, params.period));
      }
      if (params.startDate && params.endDate) {
        conditions.push(gte(schema.performanceMetrics.startDate, params.startDate));
        conditions.push(lte(schema.performanceMetrics.endDate, params.endDate));
      }

        let query: any = db.select().from(schema.performanceMetrics);
      if (conditions.length) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(schema.performanceMetrics.startDate));
      return await query;
    }

  async createPerformanceMetrics(metrics: InsertPerformanceMetrics): Promise<PerformanceMetrics> {
    const [newMetrics] = await db
      .insert(schema.performanceMetrics)
      .values(metrics)
      .returning();
    return newMetrics;
  }

  async calculatePerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics> {
    // Get all closed trades in the period
    const trades = await db.select().from(schema.trades)
      .where(
        and(
          eq(schema.trades.status, 'closed'),
          gte(schema.trades.executionTime, startDate),
          lte(schema.trades.closeTime!, endDate)
        )
      );

    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => parseFloat(t.realizedPnl || '0') > 0).length;
    const losingTrades = trades.filter(t => parseFloat(t.realizedPnl || '0') < 0).length;
    
    const totalPnl = trades.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0);
    const wins = trades.filter(t => parseFloat(t.realizedPnl || '0') > 0);
    const losses = trades.filter(t => parseFloat(t.realizedPnl || '0') < 0);
    
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0) / losses.length) : 0;
    
    const maxWin = wins.length > 0 ? Math.max(...wins.map(t => parseFloat(t.realizedPnl || '0'))) : 0;
    const maxLoss = losses.length > 0 ? Math.abs(Math.min(...losses.map(t => parseFloat(t.realizedPnl || '0')))) : 0;
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const grossWin = wins.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + parseFloat(t.realizedPnl || '0'), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 0;
    
    const totalCommissions = trades.reduce((sum, t) => sum + parseFloat(t.commission || '0'), 0);
    const netProfit = totalPnl - totalCommissions;

    const metrics: InsertPerformanceMetrics = {
      period: 'custom',
      startDate,
      endDate,
      totalTrades,
      winningTrades,
      losingTrades,
      winRate: winRate.toString(),
      totalPnl: totalPnl.toString(),
      avgWin: avgWin.toString(),
      avgLoss: avgLoss.toString(),
      maxWin: maxWin.toString(),
      maxLoss: maxLoss.toString(),
      profitFactor: profitFactor.toString(),
      totalCommissions: totalCommissions.toString(),
      netProfit: netProfit.toString(),
    };

    return this.createPerformanceMetrics(metrics);
  }

  // Other methods remain unchanged for compatibility
  async getOptionsFlow(): Promise<OptionsFlow[]> {
    return db.select().from(schema.optionsFlow).orderBy(desc(schema.optionsFlow.timestamp));
  }

  async createOptionsFlow(flow: InsertOptionsFlow): Promise<OptionsFlow> {
    const [newFlow] = await db
      .insert(schema.optionsFlow)
      .values(flow)
      .returning();
    return newFlow;
  }

  async getRiskParameters(userId?: string): Promise<RiskParameters[]> {
    let query: any = db.select().from(schema.riskParameters);
    if (userId) {
      query = query.where(eq(schema.riskParameters.userId, userId));
    }
    return await query;
  }

  async createRiskParameters(params: InsertRiskParameters): Promise<RiskParameters> {
    const [newParams] = await db
      .insert(schema.riskParameters)
      .values(params)
      .returning();
    return newParams;
  }

  async updateRiskParameters(id: string, updates: Partial<RiskParameters>): Promise<RiskParameters | undefined> {
    const [updated] = await db
      .update(schema.riskParameters)
      .set(updates)
      .where(eq(schema.riskParameters.id, id))
      .returning();
    return updated || undefined;
  }

  async getSystemHealth(): Promise<SystemHealth[]> {
    return db.select().from(schema.systemHealth).orderBy(desc(schema.systemHealth.lastCheck));
  }

  async createSystemHealth(health: InsertSystemHealth): Promise<SystemHealth> {
    const [newHealth] = await db
      .insert(schema.systemHealth)
      .values(health)
      .returning();
    return newHealth;
  }

  async updateSystemHealth(service: string, health: Partial<SystemHealth>): Promise<SystemHealth> {
    const [updated] = await db
      .update(schema.systemHealth)
      .set(health)
      .where(eq(schema.systemHealth.service, service))
      .returning();
    if (!updated) {
      throw new Error('System health entry not found');
    }
    return updated;
  }

    async getMarketData(symbol: string): Promise<MarketData | undefined> {
      const [data] = await db.select().from(schema.marketData).where(eq(schema.marketData.symbol, symbol));
      return data || undefined;
    }

    async getAllMarketData(): Promise<MarketData[]> {
      return db.select().from(schema.marketData).orderBy(desc(schema.marketData.timestamp));
    }

    async createMarketData(data: InsertMarketData): Promise<MarketData> {
      const [newData] = await db
        .insert(schema.marketData)
        .values(data)
        .returning();
      return newData;
    }

    async updateMarketData(symbol: string, updates: Partial<MarketData>): Promise<MarketData | undefined> {
      const [updated] = await db
        .update(schema.marketData)
        .set(updates)
        .where(eq(schema.marketData.symbol, symbol))
        .returning();
      return updated || undefined;
    }

  async getAlerts(userId?: string): Promise<Alert[]> {
    let query: any = db.select().from(schema.alerts);
    if (userId) {
      query = query.where(eq(schema.alerts.userId, userId));
    }
    return await query.orderBy(desc(schema.alerts.triggeredAt));
  }

  async getUnreadAlerts(userId: string): Promise<Alert[]> {
    return db.select().from(schema.alerts)
      .where(
        and(
          eq(schema.alerts.userId, userId),
          eq(schema.alerts.isRead, false)
        )
      )
      .orderBy(desc(schema.alerts.triggeredAt));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db
      .insert(schema.alerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async markAlertAsRead(alertId: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(schema.alerts)
      .set({ isRead: true })
      .where(eq(schema.alerts.id, alertId))
      .returning();
    return updated || undefined;
  }

  async acknowledgeAlert(alertId: string): Promise<Alert | undefined> {
    const [updated] = await db
      .update(schema.alerts)
      .set({ acknowledgedAt: new Date() })
      .where(eq(schema.alerts.id, alertId))
      .returning();
    return updated || undefined;
  }

  async getHistoricalData(params: {
    dataType: string;
    symbol?: string;
    timeframe: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<HistoricalData[]> {
      const conditions = [
        eq(schema.historicalData.dataType, params.dataType),
        eq(schema.historicalData.timeframe, params.timeframe),
        gte(schema.historicalData.timestamp, params.startDate),
        lte(schema.historicalData.timestamp, params.endDate),
      ];

      if (params.symbol) {
        conditions.push(eq(schema.historicalData.symbol, params.symbol));
      }

      let query: any = db
        .select()
        .from(schema.historicalData)
        .where(and(...conditions));

      if (params.limit) {
        query = query.limit(params.limit);
      }

      query = query.orderBy(desc(schema.historicalData.timestamp));
      return await query;
    }

  async createHistoricalData(data: InsertHistoricalData): Promise<HistoricalData> {
    const [newData] = await db
      .insert(schema.historicalData)
      .values(data)
      .returning();
    return newData;
  }

  async getAccountAlerts(userId: string): Promise<AccountAlert[]> {
    return db.select().from(schema.accountAlerts)
      .where(eq(schema.accountAlerts.userId, userId))
      .orderBy(desc(schema.accountAlerts.createdAt));
  }

  async createAccountAlert(alert: InsertAccountAlert): Promise<AccountAlert> {
    const [newAlert] = await db
      .insert(schema.accountAlerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async updateAccountAlert(alertId: string, updates: Partial<AccountAlert>): Promise<AccountAlert | undefined> {
    const [updated] = await db
      .update(schema.accountAlerts)
      .set(updates)
      .where(eq(schema.accountAlerts.id, alertId))
      .returning();
    return updated || undefined;
  }

  async deleteAccountAlert(alertId: string): Promise<boolean> {
    const result = await db.delete(schema.accountAlerts).where(eq(schema.accountAlerts.id, alertId));
    return (result.rowCount ?? 0) > 0;
  }

  // Portfolio Management Methods
  async getPortfoliosByUser(userId: string): Promise<Portfolio[]> {
    return db.select().from(schema.portfolios)
      .where(eq(schema.portfolios.userId, userId))
      .orderBy(desc(schema.portfolios.createdAt));
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const [portfolio] = await db.select().from(schema.portfolios)
      .where(eq(schema.portfolios.id, id));
    return portfolio || undefined;
  }

  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [newPortfolio] = await db
      .insert(schema.portfolios)
      .values(portfolio)
      .returning();
    return newPortfolio;
  }

  async updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<Portfolio | undefined> {
    const [updated] = await db
      .update(schema.portfolios)
      .set(updates)
      .where(eq(schema.portfolios.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePortfolio(id: string): Promise<boolean> {
    const result = await db.delete(schema.portfolios).where(eq(schema.portfolios.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Portfolio Positions Methods
  async getPortfolioPositions(portfolioId: string): Promise<PortfolioPosition[]> {
    return db.select().from(schema.portfolioPositions)
      .where(eq(schema.portfolioPositions.portfolioId, portfolioId))
      .orderBy(desc(schema.portfolioPositions.lastUpdated));
  }

  async getPortfolioPosition(id: string): Promise<PortfolioPosition | undefined> {
    const [position] = await db.select().from(schema.portfolioPositions)
      .where(eq(schema.portfolioPositions.id, id));
    return position || undefined;
  }

  async createPortfolioPosition(position: InsertPortfolioPosition): Promise<PortfolioPosition> {
    const [newPosition] = await db
      .insert(schema.portfolioPositions)
      .values(position)
      .returning();
    return newPosition;
  }

  async updatePortfolioPosition(id: string, updates: Partial<PortfolioPosition>): Promise<PortfolioPosition | undefined> {
    const [updated] = await db
      .update(schema.portfolioPositions)
      .set(updates)
      .where(eq(schema.portfolioPositions.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePortfolioPosition(id: string): Promise<boolean> {
    const result = await db.delete(schema.portfolioPositions).where(eq(schema.portfolioPositions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Portfolio Transactions Methods
    async getPortfolioTransactions(portfolioId: string, limit?: number): Promise<PortfolioTransaction[]> {
      let query: any = db
        .select()
        .from(schema.portfolioTransactions)
        .where(eq(schema.portfolioTransactions.portfolioId, portfolioId));

      if (limit) {
        query = query.limit(limit);
      }

      query = query.orderBy(desc(schema.portfolioTransactions.executionTime));
      return await query;
    }

  async createPortfolioTransaction(transaction: InsertPortfolioTransaction): Promise<PortfolioTransaction> {
    const [newTransaction] = await db
      .insert(schema.portfolioTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Required methods that aren't implemented yet
  async updateRiskStatus(status: any): Promise<void> {
    // Implementation would go here
    console.log('Risk status updated:', status);
  }

  async getRiskStatus(): Promise<any> {
    // Implementation would go here
    return {
      emergencyStop: false,
      tradingPaused: false,
      killSwitchActive: false,
      reason: null,
      timestamp: new Date(),
    };
  }

  // Generic storage methods for non-schema data
  private genericStorage: Map<string, Map<string, any>> = new Map();

  async store(collection: string, key: string, data: any): Promise<void> {
    if (!this.genericStorage.has(collection)) {
      this.genericStorage.set(collection, new Map());
    }
    this.genericStorage.get(collection)!.set(key, data);
  }

  async query(collection: string, filters: any): Promise<any[]> {
    const collectionData = this.genericStorage.get(collection);
    if (!collectionData) {
      return [];
    }
    return Array.from(collectionData.values());
  }

  async delete(collection: string, key: string): Promise<boolean> {
    const collectionData = this.genericStorage.get(collection);
    if (!collectionData) {
      return false;
    }
    return collectionData.delete(key);
  }
}

export const storage = new DatabaseStorage();
