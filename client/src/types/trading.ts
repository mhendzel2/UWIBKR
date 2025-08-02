export interface TradingSignal {
  id: string;
  ticker: string;
  strategy: string;
  sentiment: string;
  confidence: string;
  entryPrice: string;
  targetPrice: string;
  maxRisk: string;
  expiry: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  aiAnalysis?: any;
  createdAt?: Date;
  approvedAt?: Date;
  executedAt?: Date;
}

export interface Position {
  id: string;
  signalId?: string;
  ticker: string;
  strategy: string;
  quantity: number;
  entryPrice: string;
  currentPrice?: string;
  pnl: string;
  pnlPercent: string;
  status: 'open' | 'closed';
  entryTime?: Date;
  exitTime?: Date;
  contractDetails?: any;
}

export interface OptionsFlow {
  id: string;
  symbol: string;
  type: 'C' | 'P';
  volume: number;
  price: string;
  premium: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timestamp?: Date;
  askSidePercentage?: string;
  openInterest?: number;
}

export interface AccountInfo {
  accountId?: string;
  netLiquidation: number;
  totalCashValue: number;
  settledCash: number;
  availableFunds: number;
  buyingPower: number;
  grossPositionValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

export interface SystemHealth {
  id: string;
  service: string;
  status: string;
  latency?: number;
  lastCheck?: Date;
  errorMessage?: string;
  metadata?: any;
}

export interface RiskStatus {
  emergencyStop: boolean;
  tradingPaused: boolean;
  dailyLossLimit: number;
  maxPositionSize: number;
  maxDrawdownLimit: number;
  portfolioHeatLimit: number;
}

export interface MarketData {
  symbol: string;
  price: string;
  volume?: number;
  timestamp?: Date;
  gammaExposure?: string;
  deltaExposure?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export interface DashboardMetrics {
  activeSignals: number;
  winRate: number;
  openPositions: number;
  aiConfidence: number;
  accountEquity: number;
  dayPnl: number;
  portfolioHeat: number;
  maxDrawdown: number;
}
