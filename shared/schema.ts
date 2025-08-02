import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tradingSignals = pgTable("trading_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticker: text("ticker").notNull(),
  strategy: text("strategy").notNull(),
  sentiment: text("sentiment").notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 2 }),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  maxRisk: decimal("max_risk", { precision: 10, scale: 2 }).notNull(),
  expiry: text("expiry").notNull(),
  reasoning: text("reasoning").notNull(),
  status: text("status").notNull().default("pending"),
  aiAnalysis: jsonb("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
  executedAt: timestamp("executed_at"),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").references(() => tradingSignals.id),
  ticker: text("ticker").notNull(),
  strategy: text("strategy").notNull(),
  quantity: integer("quantity").notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 2 }).notNull(),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }),
  pnl: decimal("pnl", { precision: 10, scale: 2 }).default("0"),
  pnlPercent: decimal("pnl_percent", { precision: 5, scale: 2 }).default("0"),
  status: text("status").notNull().default("open"),
  entryTime: timestamp("entry_time").defaultNow(),
  exitTime: timestamp("exit_time"),
  contractDetails: jsonb("contract_details"),
});

export const optionsFlow = pgTable("options_flow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  type: text("type").notNull(), // C or P
  volume: integer("volume").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  premium: decimal("premium", { precision: 12, scale: 2 }).notNull(),
  sentiment: text("sentiment").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  askSidePercentage: decimal("ask_side_percentage", { precision: 5, scale: 2 }),
  openInterest: integer("open_interest"),
});

export const riskParameters = pgTable("risk_parameters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  maxDailyLoss: decimal("max_daily_loss", { precision: 10, scale: 2 }).notNull(),
  maxPositionSize: decimal("max_position_size", { precision: 10, scale: 2 }).notNull(),
  maxDrawdown: decimal("max_drawdown", { precision: 5, scale: 2 }).notNull(),
  portfolioHeatLimit: decimal("portfolio_heat_limit", { precision: 5, scale: 2 }).notNull(),
  isEnabled: boolean("is_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const systemHealth = pgTable("system_health", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  service: text("service").notNull(),
  status: text("status").notNull(),
  latency: integer("latency"),
  lastCheck: timestamp("last_check").defaultNow(),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"),
});

// Portfolio Management Tables
export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("paper"), // paper, live, demo
  ibkrAccountId: text("ibkr_account_id"), // IBKR account identifier
  totalValue: decimal("total_value", { precision: 12, scale: 2 }).default("0"),
  cashBalance: decimal("cash_balance", { precision: 12, scale: 2 }).default("0"),
  buyingPower: decimal("buying_power", { precision: 12, scale: 2 }).default("0"),
  dayPnL: decimal("day_pnl", { precision: 10, scale: 2 }).default("0"),
  totalPnL: decimal("total_pnl", { precision: 10, scale: 2 }).default("0"),
  isActive: boolean("is_active").default(true),
  riskProfile: text("risk_profile").default("moderate"), // conservative, moderate, aggressive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const portfolioPositions = pgTable("portfolio_positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  symbol: text("symbol").notNull(),
  secType: text("sec_type").notNull(), // STK, OPT, FUT, etc.
  quantity: integer("quantity").notNull(),
  avgCost: decimal("avg_cost", { precision: 10, scale: 4 }).notNull(),
  marketPrice: decimal("market_price", { precision: 10, scale: 4 }),
  marketValue: decimal("market_value", { precision: 12, scale: 2 }),
  unrealizedPnL: decimal("unrealized_pnl", { precision: 10, scale: 2 }).default("0"),
  realizedPnL: decimal("realized_pnl", { precision: 10, scale: 2 }).default("0"),
  contractDetails: jsonb("contract_details"), // For options: strike, expiry, right
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const portfolioTransactions = pgTable("portfolio_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // BUY, SELL
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 4 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  commission: decimal("commission", { precision: 8, scale: 2 }).default("0"),
  orderType: text("order_type"), // MKT, LMT, STP, etc.
  orderStatus: text("order_status").default("FILLED"), // FILLED, PARTIAL, CANCELLED
  executionTime: timestamp("execution_time").defaultNow(),
  signalId: varchar("signal_id").references(() => tradingSignals.id),
  contractDetails: jsonb("contract_details"),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  volume: integer("volume"),
  timestamp: timestamp("timestamp").defaultNow(),
  gammaExposure: decimal("gamma_exposure", { precision: 15, scale: 2 }),
  deltaExposure: decimal("delta_exposure", { precision: 15, scale: 2 }),
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  alertType: text("alert_type").notNull(), // 'position_alert', 'risk_alert', 'market_alert', 'system_alert'
  severity: text("severity").notNull(), // 'info', 'warning', 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  ticker: text("ticker"),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }),
  isRead: boolean("is_read").default(false),
  isActive: boolean("is_active").default(true),
  triggeredAt: timestamp("triggered_at").defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  metadata: jsonb("metadata"),
});

export const historicalData = pgTable("historical_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataType: text("data_type").notNull(), // 'signal', 'position', 'options_flow', 'market_data'
  symbol: text("symbol"),
  timeframe: text("timeframe").notNull(), // '1m', '5m', '1h', '1d', etc.
  openPrice: decimal("open_price", { precision: 10, scale: 2 }),
  highPrice: decimal("high_price", { precision: 10, scale: 2 }),
  lowPrice: decimal("low_price", { precision: 10, scale: 2 }),
  closePrice: decimal("close_price", { precision: 10, scale: 2 }),
  volume: integer("volume"),
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata"),
});

export const accountAlerts = pgTable("account_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  alertName: text("alert_name").notNull(),
  condition: text("condition").notNull(), // 'portfolio_value_above', 'portfolio_value_below', 'daily_pnl_above', 'daily_pnl_below', 'position_pnl_above', 'position_pnl_below'
  threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull(),
  ticker: text("ticker"), // Optional - for position-specific alerts
  isEnabled: boolean("is_enabled").default(true),
  notificationMethod: text("notification_method").notNull(), // 'email', 'sms', 'push', 'all'
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trades table - comprehensive record of all executed trades
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  signalId: varchar("signal_id").references(() => tradingSignals.id),
  ticker: text("ticker").notNull(),
  strategy: text("strategy").notNull(),
  tradeType: text("trade_type").notNull(), // 'BUY', 'SELL', 'BUY_TO_OPEN', 'SELL_TO_CLOSE', etc.
  quantity: integer("quantity").notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 2 }).notNull(),
  exitPrice: decimal("exit_price", { precision: 10, scale: 2 }),
  commission: decimal("commission", { precision: 10, scale: 2 }).default('0'),
  fees: decimal("fees", { precision: 10, scale: 2 }).default('0'),
  realizedPnl: decimal("realized_pnl", { precision: 10, scale: 2 }),
  unrealizedPnl: decimal("unrealized_pnl", { precision: 10, scale: 2 }),
  status: text("status").notNull().default('open'), // 'open', 'closed', 'partially_filled'
  fillPrice: decimal("fill_price", { precision: 10, scale: 2 }),
  fillQuantity: integer("fill_quantity"),
  orderId: text("order_id"),
  executionTime: timestamp("execution_time").notNull(),
  closeTime: timestamp("close_time"),
  contractDetails: jsonb("contract_details"), // strikes, expiry, option details
  marketConditions: jsonb("market_conditions"), // VIX, market state at execution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Trade Assessments - AI and human evaluations of trade performance
export const tradeAssessments = pgTable("trade_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tradeId: varchar("trade_id").references(() => trades.id).notNull(),
  assessmentType: text("assessment_type").notNull(), // 'ai_pre_trade', 'ai_post_trade', 'human_review'
  assessor: text("assessor").notNull(), // 'gemini', 'user', 'system'
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // AI confidence score
  riskRating: text("risk_rating"), // 'LOW', 'MEDIUM', 'HIGH'
  expectedOutcome: text("expected_outcome"),
  actualOutcome: text("actual_outcome"),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }), // how close prediction was to reality
  keyFactors: jsonb("key_factors"), // factors that influenced the trade
  lessonsLearned: text("lessons_learned"),
  improvementSuggestions: text("improvement_suggestions"),
  marketAnalysis: jsonb("market_analysis"), // market conditions analysis
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Performance Analytics - aggregated statistics and metrics
// Macroeconomic Data Storage
export const macroeconomicData = pgTable("macroeconomic_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  dataType: text("data_type").notNull(), // 'treasury_rates', 'federal_rates', 'economic_indicators', 'sentiment', 'fear_greed'
  symbol: text("symbol"), // For specific instruments like VIX, DXY
  timeframe: text("timeframe").notNull(), // 'daily', 'weekly', 'monthly'
  value: decimal("value", { precision: 15, scale: 6 }).notNull(),
  metadata: jsonb("metadata"), // Additional context and details
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const yieldCurveData = pgTable("yield_curve_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  maturity: text("maturity").notNull(), // '1M', '3M', '6M', '1Y', '2Y', '5Y', '10Y', '20Y', '30Y'
  yieldRate: decimal("yield_rate", { precision: 8, scale: 4 }).notNull(),
  curveShape: text("curve_shape"), // 'normal', 'inverted', 'flat', 'humped'
  spread: decimal("spread", { precision: 8, scale: 4 }), // Spread vs benchmark
  riskSignal: text("risk_signal"), // 'low', 'medium', 'high'
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const fearGreedIndex = pgTable("fear_greed_index", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  overallIndex: integer("overall_index").notNull(), // 0-100
  marketMomentum: integer("market_momentum").notNull(),
  stockPriceStrength: integer("stock_price_strength").notNull(),
  stockPriceBreadth: integer("stock_price_breadth").notNull(),
  putCallOptions: integer("put_call_options").notNull(),
  marketVolatility: integer("market_volatility").notNull(),
  safeHavenDemand: integer("safe_haven_demand").notNull(),
  junkBondDemand: integer("junk_bond_demand").notNull(),
  interpretation: text("interpretation").notNull(), // 'Extreme Fear', 'Fear', 'Neutral', 'Greed', 'Extreme Greed'
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  period: text("period").notNull(), // 'daily', 'weekly', 'monthly', 'yearly'
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalTrades: integer("total_trades").notNull().default(0),
  winningTrades: integer("winning_trades").notNull().default(0),
  losingTrades: integer("losing_trades").notNull().default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).default('0'),
  totalPnl: decimal("total_pnl", { precision: 12, scale: 2 }).default('0'),
  avgWin: decimal("avg_win", { precision: 10, scale: 2 }).default('0'),
  avgLoss: decimal("avg_loss", { precision: 10, scale: 2 }).default('0'),
  maxWin: decimal("max_win", { precision: 10, scale: 2 }).default('0'),
  maxLoss: decimal("max_loss", { precision: 10, scale: 2 }).default('0'),
  profitFactor: decimal("profit_factor", { precision: 5, scale: 2 }).default('0'),
  sharpeRatio: decimal("sharpe_ratio", { precision: 5, scale: 2 }),
  maxDrawdown: decimal("max_drawdown", { precision: 10, scale: 2 }).default('0'),
  recoveryFactor: decimal("recovery_factor", { precision: 5, scale: 2 }),
  totalCommissions: decimal("total_commissions", { precision: 10, scale: 2 }).default('0'),
  netProfit: decimal("net_profit", { precision: 12, scale: 2 }).default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const insertTradingSignalSchema = createInsertSchema(tradingSignals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  executedAt: true,
});

export const insertPositionSchema = createInsertSchema(positions).omit({
  id: true,
  entryTime: true,
  exitTime: true,
});

export const insertOptionsFlowSchema = createInsertSchema(optionsFlow).omit({
  id: true,
  timestamp: true,
});

export const insertRiskParametersSchema = createInsertSchema(riskParameters).omit({
  id: true,
  updatedAt: true,
});

export const insertSystemHealthSchema = createInsertSchema(systemHealth).omit({
  id: true,
  lastCheck: true,
});

export const insertMarketDataSchema = createInsertSchema(marketData).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  triggeredAt: true,
  acknowledgedAt: true,
});

export const insertHistoricalDataSchema = createInsertSchema(historicalData).omit({
  id: true,
});

export const insertAccountAlertSchema = createInsertSchema(accountAlerts).omit({
  id: true,
  lastTriggered: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeSchema = createInsertSchema(trades, {
  executionTime: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTradeAssessmentSchema = createInsertSchema(tradeAssessments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPerformanceMetricsSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMacroeconomicDataSchema = createInsertSchema(macroeconomicData).omit({
  id: true,
  createdAt: true,
});

export const insertYieldCurveDataSchema = createInsertSchema(yieldCurveData).omit({
  id: true,
  createdAt: true,
});

export const insertFearGreedIndexSchema = createInsertSchema(fearGreedIndex).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;

export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;

export type OptionsFlow = typeof optionsFlow.$inferSelect;
export type InsertOptionsFlow = z.infer<typeof insertOptionsFlowSchema>;

export type RiskParameters = typeof riskParameters.$inferSelect;
export type InsertRiskParameters = z.infer<typeof insertRiskParametersSchema>;

export type SystemHealth = typeof systemHealth.$inferSelect;
export type InsertSystemHealth = z.infer<typeof insertSystemHealthSchema>;

export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type HistoricalData = typeof historicalData.$inferSelect;
export type InsertHistoricalData = z.infer<typeof insertHistoricalDataSchema>;

export type AccountAlert = typeof accountAlerts.$inferSelect;
export type InsertAccountAlert = z.infer<typeof insertAccountAlertSchema>;

export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;

export type TradeAssessment = typeof tradeAssessments.$inferSelect;
export type InsertTradeAssessment = z.infer<typeof insertTradeAssessmentSchema>;

export type PerformanceMetrics = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetrics = z.infer<typeof insertPerformanceMetricsSchema>;

export type MacroeconomicData = typeof macroeconomicData.$inferSelect;
export type InsertMacroeconomicData = z.infer<typeof insertMacroeconomicDataSchema>;

export type YieldCurveData = typeof yieldCurveData.$inferSelect;
export type InsertYieldCurveData = z.infer<typeof insertYieldCurveDataSchema>;

export type FearGreedIndex = typeof fearGreedIndex.$inferSelect;
export type InsertFearGreedIndex = z.infer<typeof insertFearGreedIndexSchema>;

// Portfolio Management Types
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = typeof portfolios.$inferInsert;

export type PortfolioPosition = typeof portfolioPositions.$inferSelect;
export type InsertPortfolioPosition = typeof portfolioPositions.$inferInsert;

export type PortfolioTransaction = typeof portfolioTransactions.$inferSelect;
export type InsertPortfolioTransaction = typeof portfolioTransactions.$inferInsert;
