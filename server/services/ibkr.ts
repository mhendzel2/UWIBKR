import axios, { AxiosInstance } from "axios";
import https from "https";

interface IBKRConfig {
  host: string;
  port: number;
  clientId: number;
}

interface ContractDetails {
  symbol: string;
  secType: string;
  exchange: string;
  currency: string;
  strike?: number;
  expiry?: string;
  right?: string;
}

interface OrderDetails {
  action: string;
  totalQuantity: number;
  orderType: string;
  lmtPrice?: number;
  auxPrice?: number;
}

interface AccountInfo {
  accountId: string;
  netLiquidation: number;
  totalCashValue: number;
  settledCash: number;
  availableFunds: number;
  buyingPower: number;
  grossPositionValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
}

interface PositionInfo {
  account: string;
  contract: ContractDetails;
  position: number;
  marketPrice: number;
  marketValue: number;
  averageCost: number;
  unrealizedPNL: number;
  realizedPNL: number;
}

export class IBKRService {
  private config: IBKRConfig;
  private connected = false;
  private connectionAttempts = 0;
  private maxRetries = 5;
  private reconnectDelay = 5000;
  private apiBaseUrl: string;
  private http: AxiosInstance;

  constructor() {
    this.config = {
      host: process.env.IBKR_HOST || 'localhost',
      port: parseInt(process.env.IBKR_PORT || '7497'),
      clientId: parseInt(process.env.IBKR_CLIENT_ID || '1'),
    };
    this.apiBaseUrl = process.env.IBKR_API_URL || 'https://localhost:5000/v1/api';
    this.http = axios.create({
      baseURL: this.apiBaseUrl,
      httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });
  }

  async connect(): Promise<boolean> {
    try {
      await this.http.get('/iserver/auth/status');
      this.connected = true;
      this.connectionAttempts = 0;
      return true;
    } catch (error) {
      const err: any = error;
      if (err?.code === 'ECONNREFUSED') {
        console.warn(
          `IBKR port ${this.config.port} unavailable, falling back to Yahoo Finance`
        );
      } else {
        console.error('Failed to connect to IBKR API:', error);
      }
      this.connectionAttempts++;
      if (this.connectionAttempts < this.maxRetries) {
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    console.log('Disconnected from IBKR TWS');
  }

  /**
   * Get connection statistics for monitoring
   */
  getConnectionStats() {
    return {
      connected: this.connected,
      connectionAttempts: this.connectionAttempts,
      lastConnectionTime: Date.now(),
      host: this.config.host,
      port: this.config.port,
      clientId: this.config.clientId,
    };
  }

  /**
   * Check if TWS is connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  async getAccountInfo(): Promise<AccountInfo | null> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const { data: accounts } = await this.http.get('/portfolio/accounts');
      const accountId = accounts?.[0]?.accountId || accounts?.[0]?.id;
      if (!accountId) return null;

      const { data } = await this.http.get(`/portfolio/${accountId}/summary`);
      return {
        accountId,
        netLiquidation: Number(data.netliquidation || data.total || 0),
        totalCashValue: Number(data.totalcashvalue || 0),
        settledCash: Number(data.settledcash || 0),
        availableFunds: Number(data.availablefunds || 0),
        buyingPower: Number(data.buyingpower || 0),
        grossPositionValue: Number(data.grosspositionvalue || 0),
        realizedPnL: Number(data.realizedpnl || 0),
        unrealizedPnL: Number(data.unrealizedpnl || 0),
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      return null;
    }
  }

  async getPositions(): Promise<PositionInfo[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const { data: accounts } = await this.http.get('/portfolio/accounts');
      const accountId = accounts?.[0]?.accountId || accounts?.[0]?.id;
      if (!accountId) return [];

      const { data } = await this.http.get(`/portfolio/${accountId}/positions`);
      return (data || []).map((pos: any) => ({
        account: accountId,
        contract: {
          symbol: pos.contract?.symbol || pos.symbol,
          secType: pos.contract?.secType || pos.secType,
          exchange: pos.contract?.exchange || pos.exchange || 'SMART',
          currency: pos.contract?.currency || pos.currency || 'USD',
          strike: pos.contract?.strike,
          expiry: pos.contract?.expiry,
          right: pos.contract?.right,
        },
        position: pos.position,
        marketPrice: pos.marketPrice || pos.marketprice,
        marketValue: pos.marketValue || pos.marketvalue,
        averageCost: pos.avgCost || pos.averageCost,
        unrealizedPNL: pos.unrealizedPnL || pos.unrealizedpnl,
        realizedPNL: pos.realizedPnL || pos.realizedpnl,
      }));
    } catch (error) {
      console.error('Failed to get positions:', error);
      return [];
    }
  }

  async getMarketNews(symbol?: string, days: number = 7): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const endpoint = symbol ? `/iserver/news/${symbol}` : '/iserver/news';
      const { data } = await this.http.get(endpoint, { params: { days } });
      return data || [];
    } catch (error) {
      console.error('Failed to get TWS market news:', error);
      return [];
    }
  }

  async getMarketData(symbol: string): Promise<any>;
  async getMarketData(symbols: string[]): Promise<any[]>;
  async getMarketData(contract: ContractDetails): Promise<any>;
  async getMarketData(input: string | string[] | ContractDetails): Promise<any | any[]> {
    if (!this.connected) {
      return this.getYahooMarketData(input);
    }

    try {
      if (typeof input === 'string') {
        const { data: sym } = await this.http.get(`/iserver/marketdata/symbols/${input}`);
        const conid = sym?.conid || sym?.[0]?.conid;
        if (!conid) return null;
        const { data } = await this.http.get('/iserver/marketdata/snapshot', { params: { conids: conid } });
        return data?.[0] || null;
      }

      if (Array.isArray(input)) {
        const conids: string[] = [];
        for (const s of input) {
          const { data: sym } = await this.http.get(`/iserver/marketdata/symbols/${s}`);
          const conid = sym?.conid || sym?.[0]?.conid;
          if (conid) conids.push(conid);
        }
        if (!conids.length) return [];
        const { data } = await this.http.get('/iserver/marketdata/snapshot', { params: { conids: conids.join(',') } });
        return data || [];
      }

      const symbol = (input as ContractDetails).symbol;
      if (symbol) {
        return this.getMarketData(symbol);
      }
      return null;
    } catch (error) {
      console.error('Failed to get TWS market data:', error);
      return Array.isArray(input) ? [] : null;
    }
  }

  private async getYahooMarketData(
    input: string | string[] | ContractDetails
  ): Promise<any | any[]> {
    try {
      if (typeof input === 'string') {
        const { data } = await axios.get(
          'https://query1.finance.yahoo.com/v7/finance/quote',
          { params: { symbols: input } }
        );
        return data?.quoteResponse?.result?.[0] || null;
      }

      if (Array.isArray(input)) {
        const { data } = await axios.get(
          'https://query1.finance.yahoo.com/v7/finance/quote',
          { params: { symbols: input.join(',') } }
        );
        return data?.quoteResponse?.result || [];
      }

      const symbol = (input as ContractDetails).symbol;
      if (symbol) {
        return this.getYahooMarketData(symbol);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch Yahoo Finance market data:', error);
      return Array.isArray(input) ? [] : null;
    }
  }

  async getFundamentalData(symbol: string): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const { data: sym } = await this.http.get(`/iserver/marketdata/symbols/${symbol}`);
      const conid = sym?.conid || sym?.[0]?.conid;
      if (!conid) return null;
      const { data } = await this.http.get(`/iserver/fundamentals/financial-summary/${conid}`);
      return data || null;
    } catch (error) {
      console.error('Failed to get TWS fundamental data:', error);
      return null;
    }
  }

  async getEconomicCalendar(days: number = 7): Promise<any[]> {
    if (!this.connected) {
      try {
        const today = new Date();
        const from = today.toISOString().split('T')[0];
        const to = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0];
        const apiKey = process.env.FMP_API_KEY || 'demo';
        const { data } = await axios.get(
          'https://financialmodelingprep.com/api/v3/economic_calendar',
          { params: { from, to, apikey: apiKey } }
        );
        return data || [];
      } catch (error) {
        console.error('Failed to fetch external economic calendar:', error);
        return [];
      }
    }

    try {
      const { data } = await this.http.get('/iserver/calendar/economic', { params: { days } });
      return data || [];
    } catch (error) {
      console.error('Failed to get TWS economic calendar:', error);
      return [];
    }
  }

  async placeOrder(contract: ContractDetails, order: OrderDetails): Promise<string | null> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      this.validateOrder(contract, order);
      const { data } = await this.http.post('/iserver/accounts/orders', { contract, order });
      return data?.id || null;
    } catch (error) {
      console.error('Failed to place order:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      await this.http.delete(`/iserver/accounts/orders/${orderId}`);
      return true;
    } catch (error) {
      console.error('Failed to cancel order:', error);
      return false;
    }
  }

  private validateOrder(contract: ContractDetails, order: OrderDetails): void {
    if (!contract.symbol || !contract.secType) {
      throw new Error('Invalid contract: symbol and secType are required');
    }

    if (!order.action || !order.totalQuantity || !order.orderType) {
      throw new Error('Invalid order: action, totalQuantity, and orderType are required');
    }

    if (order.totalQuantity <= 0) {
      throw new Error('Order quantity must be positive');
    }

    if (order.orderType === 'LMT' && !order.lmtPrice) {
      throw new Error('Limit price required for limit orders');
    }
  }

  async getHistoricalData(symbol: string, timeframe: string): Promise<any[]> {
    if (!this.connected) {
      return this.getYahooHistoricalData(symbol, timeframe);
    }

    try {
      const symbolRes = await this.http.get(`/iserver/marketdata/symbols/${symbol}`);
      const conid = symbolRes.data?.conid || symbolRes.data[0]?.conid;
      if (!conid) return [];

      const barMap: Record<string, string> = {
        '1m': '1min',
        '5m': '5min',
        '15m': '15min',
        '1H': '1hour',
        '1D': '1day',
        '1W': '1week',
        '1M': '1month'
      };

      const { data } = await this.http.get('/iserver/marketdata/history', {
        params: {
          conid,
          period: '1y',
          bar: barMap[timeframe] || '1day'
        }
      });

      return (data?.data || []).map((bar: any) => ({
        timestamp: bar.t || bar.time,
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }));
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      return [];
    }
  }

  private async getYahooHistoricalData(
    symbol: string,
    timeframe: string
  ): Promise<any[]> {
    try {
      const intervalMap: Record<string, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1H': '60m',
        '1D': '1d',
        '1W': '1wk',
        '1M': '1mo'
      };

      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          params: {
            range: '1y',
            interval: intervalMap[timeframe] || '1d'
          }
        }
      );

      const result = data?.chart?.result?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const quote = result?.indicators?.quote?.[0] || {};
      return timestamps.map((t, i) => ({
        timestamp: t * 1000,
        open: quote.open?.[i],
        high: quote.high?.[i],
        low: quote.low?.[i],
        close: quote.close?.[i],
        volume: quote.volume?.[i]
      }));
    } catch (error) {
      console.error('Failed to fetch Yahoo Finance historical data:', error);
      return [];
    }
  }

  async getOptionsChain(symbol: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      const symbolRes = await this.http.get(`/iserver/marketdata/symbols/${symbol}`);
      const conid = symbolRes.data?.conid || symbolRes.data[0]?.conid;
      if (!conid) return [];

      const { data } = await this.http.get('/iserver/marketdata/options', {
        params: { conid }
      });

      return (data || []).map((opt: any) => ({
        strike: opt.strike,
        callVolume: opt.callVolume,
        putVolume: opt.putVolume,
        callOI: opt.callOpenInterest,
        putOI: opt.putOpenInterest,
        callPrice: opt.callPrice,
        putPrice: opt.putPrice,
        gamma: opt.gamma,
        delta: opt.delta,
        theta: opt.theta,
        vega: opt.vega
      }));
    } catch (error) {
      console.error('Failed to fetch options chain:', error);
      return [];
    }
  }

  async getTechnicalIndicators(symbol: string, indicators: string[]): Promise<any> {
    const bars = await this.getHistoricalData(symbol, '1D');
    const closes = bars.map(b => b.close);
    const result: any = { symbol, timestamp: new Date().toISOString() };

    const sma = (period: number) => {
      if (closes.length < period) return null;
      const slice = closes.slice(-period);
      return slice.reduce((a, b) => a + b, 0) / period;
    };

    const rsi = (period: number) => {
      if (closes.length <= period) return null;
      let gains = 0, losses = 0;
      for (let i = closes.length - period; i < closes.length; i++) {
        const change = closes[i] - closes[i - 1];
        if (change >= 0) gains += change; else losses -= change;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      return 100 - 100 / (1 + rs);
    };

    indicators.forEach(ind => {
      switch (ind) {
        case 'SMA20':
          result.sma20 = sma(20);
          break;
        case 'SMA50':
          result.sma50 = sma(50);
          break;
        case 'RSI':
          result.rsi = rsi(14);
          break;
        default:
          break;
      }
    });

    return result;
  }
}

export const ibkrService = new IBKRService();
