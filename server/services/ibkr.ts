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
      console.error('Failed to connect to IBKR API:', error);
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
      // Mock account data for development
      return {
        accountId: 'DU123456',
        netLiquidation: 125847.32,
        totalCashValue: 80847.32,
        settledCash: 80847.32,
        availableFunds: 75847.32,
        buyingPower: 151694.64,
        grossPositionValue: 45000.00,
        realizedPnL: 1250.67,
        unrealizedPnL: 1095.00,
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
      // Mock positions data for development
      return [
        {
          account: 'DU123456',
          contract: {
            symbol: 'AAPL',
            secType: 'OPT',
            exchange: 'SMART',
            currency: 'USD',
            strike: 150,
            expiry: '20240119',
            right: 'C',
          },
          position: 2,
          marketPrice: 2.91,
          marketValue: 582.00,
          averageCost: 2.45,
          unrealizedPNL: 92.00,
          realizedPNL: 0,
        },
        {
          account: 'DU123456',
          contract: {
            symbol: 'TSLA',
            secType: 'OPT',
            exchange: 'SMART',
            currency: 'USD',
            strike: 220,
            expiry: '20240126',
            right: 'P',
          },
          position: -1,
          marketPrice: 2.12,
          marketValue: -212.00,
          averageCost: 1.85,
          unrealizedPNL: -27.00,
          realizedPNL: 0,
        },
      ];
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
      // In real implementation, this would use IB API reqNewsArticle and reqHistoricalNews
      // TWS provides news from multiple providers: Dow Jones, Reuters, Fly on the Wall, etc.
      console.log(`Fetching TWS market news for ${symbol || 'all symbols'} for ${days} days`);
      
      // Mock TWS news data structure for demonstration
      const newsItems = [
        {
          articleId: 'DJ001',
          headline: `${symbol || 'Market'} Analysis: Strong Performance Expected`,
          summary: 'Professional analysts provide detailed market outlook with institutional insights.',
          providerName: 'Dow Jones',
          timestamp: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000).toISOString(),
          symbols: symbol ? [symbol] : ['SPY', 'QQQ'],
          sentiment: 'neutral',
          body: 'Full article content would be available through TWS news feed...'
        },
        {
          articleId: 'RT002',
          headline: `Institutional Activity Detected in ${symbol || 'Major Indices'}`,
          summary: 'Reuters reports unusual institutional positioning in key market sectors.',
          providerName: 'Reuters',
          timestamp: new Date(Date.now() - Math.random() * days * 24 * 60 * 60 * 1000).toISOString(),
          symbols: symbol ? [symbol] : ['NVDA', 'TSLA'],
          sentiment: 'bullish',
          body: 'Professional institutional analysis from Reuters news wire...'
        }
      ];

      return newsItems;
    } catch (error) {
      console.error('Failed to get TWS market news:', error);
      return [];
    }
  }

  private generateQuote(symbol: string) {
    return {
      symbol,
      bid: 450.25 + Math.random() * 10,
      ask: 450.75 + Math.random() * 10,
      last: 450.5 + Math.random() * 10,
      volume: Math.floor(Math.random() * 1_000_000 + 100_000),
      change: (Math.random() - 0.5) * 20,
      changePercent: (Math.random() - 0.5) * 4,
      timestamp: new Date().toISOString(),
    };
  }

  async getMarketData(symbol: string): Promise<any>;
  async getMarketData(symbols: string[]): Promise<any[]>;
  async getMarketData(contract: ContractDetails): Promise<any>;
  async getMarketData(input: string | string[] | ContractDetails): Promise<any | any[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      if (typeof input === 'string') {
        return this.generateQuote(input);
      }

      if (Array.isArray(input)) {
        console.log(`Fetching TWS market data for symbols: ${input.join(', ')}`);
        return input.map((s) => this.generateQuote(s));
      }

      // Contract market data
      return {
        bid: 2.85,
        ask: 2.95,
        last: 2.91,
        volume: 1250,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to get TWS market data:', error);
      return Array.isArray(input) ? [] : null;
    }
  }

  async getFundamentalData(symbol: string): Promise<any | null> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      // In real implementation, this would use IB API reqFundamentalData
      console.log(`Fetching TWS fundamental data for ${symbol}`);
      
      return {
        symbol,
        marketCap: 2500000000000,
        peRatio: 28.5,
        eps: 15.23,
        dividendYield: 0.5,
        beta: 1.15,
        analystRating: 'Buy',
        priceTarget: 485.00,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get TWS fundamental data:', error);
      return null;
    }
  }

  async getEconomicCalendar(days: number = 7): Promise<any[]> {
    if (!this.connected) {
      throw new Error('Not connected to IBKR TWS');
    }

    try {
      // TWS provides economic calendar events
      console.log(`Fetching TWS economic calendar for ${days} days`);
      
      return [
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Federal Reserve Interest Rate Decision',
          importance: 'High',
          actual: null,
          forecast: '5.25%',
          previous: '5.25%',
          currency: 'USD'
        },
        {
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          event: 'Non-Farm Payrolls',
          importance: 'High',
          actual: null,
          forecast: '180K',
          previous: '199K',
          currency: 'USD'
        }
      ];
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
      // Validate order parameters
      this.validateOrder(contract, order);
      
      // Mock order placement
      const orderId = `ORD${Date.now()}`;
      console.log(`Placing order ${orderId}:`, { contract, order });
      
      // Simulate order processing delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return orderId;
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
      console.log(`Cancelling order ${orderId}`);
      await new Promise(resolve => setTimeout(resolve, 200));
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
      throw new Error('Not connected to IBKR TWS');
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
          period: '1d',
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
    // Generate mock technical indicator data
    const technicalData: any = {
      symbol,
      timestamp: new Date().toISOString()
    };

    indicators.forEach(indicator => {
      switch (indicator) {
        case 'SMA20':
          technicalData.sma20 = 100 + Math.random() * 50;
          break;
        case 'SMA50':
          technicalData.sma50 = 100 + Math.random() * 50;
          break;
        case 'RSI':
          technicalData.rsi = 30 + Math.random() * 40;
          break;
        case 'MACD':
          technicalData.macd = {
            macd: (Math.random() - 0.5) * 2,
            signal: (Math.random() - 0.5) * 2,
            histogram: (Math.random() - 0.5) * 1
          };
          break;
        case 'Bollinger Bands':
          technicalData.bollinger = {
            upper: 105 + Math.random() * 50,
            middle: 100 + Math.random() * 50,
            lower: 95 + Math.random() * 50
          };
          break;
        default:
          technicalData[indicator.toLowerCase()] = Math.random() * 100;
      }
    });

    return technicalData;
  }
}

export const ibkrService = new IBKRService();
