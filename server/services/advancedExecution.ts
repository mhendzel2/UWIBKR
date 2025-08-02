import { IBKRService } from './ibkr';

export interface AdaptiveOrderConfig {
  priority: 'Patient' | 'Normal' | 'Urgent';
  minFillSize?: number;
  maxPctVol?: number;
  riskAversion?: 'Aggressive' | 'Neutral' | 'Conservative';
}

export interface ComboOrderLeg {
  symbol: string;
  secType: 'OPT' | 'STK';
  exchange: 'SMART';
  currency: 'USD';
  strike?: number;
  expiry?: string;
  right?: 'C' | 'P';
  action: 'BUY' | 'SELL';
  ratio: number;
}

/**
 * Advanced execution strategies for sophisticated order management
 * Implements improvements suggested in the architectural analysis
 */
export class AdvancedExecutionService {
  private ibkr: IBKRService;

  constructor(ibkrService: IBKRService) {
    this.ibkr = ibkrService;
  }

  /**
   * Execute adaptive algorithm order to minimize slippage
   * Critical for navigating wide spreads common in options
   */
  async executeAdaptiveOrder(
    symbol: string,
    quantity: number,
    orderType: 'MKT' | 'LMT' | 'MID',
    config: AdaptiveOrderConfig = { priority: 'Normal' }
  ): Promise<string | null> {
    try {
      console.log(`Executing adaptive order for ${symbol}: ${quantity} contracts`);
      
      // In real implementation, this would use IBKR's Adaptive algo
      const contract = {
        symbol,
        secType: 'OPT' as const,
        exchange: 'SMART' as const,
        currency: 'USD' as const,
        strike: 150, // Would be calculated
        expiry: '20240119',
        right: 'C' as const,
      };

      const order = {
        action: quantity > 0 ? 'BUY' as const : 'SELL' as const,
        orderType: 'ADAPTIVE' as const, // Special IBKR algo type
        totalQuantity: Math.abs(quantity),
        adaptivePriority: config.priority,
        tif: 'DAY' as const,
        transmit: true,
        // Adaptive-specific parameters
        algoStrategy: 'Adaptive',
        algoParams: [
          { tag: 'adaptivePriority', value: config.priority },
          { tag: 'maxPctVol', value: (config.maxPctVol || 0.1).toString() },
        ],
      };

      const orderId = await this.ibkr.placeOrder(contract, order);
      console.log(`Adaptive order placed with ID: ${orderId}`);
      
      return orderId;
    } catch (error) {
      console.error('Failed to execute adaptive order:', error);
      return null;
    }
  }

  /**
   * Execute multi-leg combo order with guaranteed fills
   * Essential for spreads, straddles, and complex strategies
   */
  async executeComboOrder(
    legs: ComboOrderLeg[],
    netPrice: number,
    orderType: 'LMT' | 'MKT' = 'LMT'
  ): Promise<string | null> {
    try {
      console.log(`Executing combo order: ${legs.length} legs at net ${netPrice}`);

      // Create combo contract
      const comboContract = {
        symbol: legs[0].symbol,
        secType: 'BAG' as const, // Bag indicates combo order
        exchange: 'SMART' as const,
        currency: 'USD' as const,
        comboLegs: legs.map(leg => ({
          conId: 0, // Would be resolved from contract details
          ratio: leg.ratio,
          action: leg.action,
          exchange: leg.exchange,
        })),
      };

      const order = {
        action: 'BUY' as const, // Net action determined by leg ratios
        orderType,
        totalQuantity: 1, // Combo quantity
        lmtPrice: orderType === 'LMT' ? netPrice : undefined,
        tif: 'DAY' as const,
        transmit: true,
        smartComboRoutingParams: [
          { tag: 'NonGuaranteed', value: '0' }, // Require guaranteed fill
        ],
      };

      const orderId = await this.ibkr.placeOrder(comboContract, order);
      console.log(`Combo order placed with ID: ${orderId}`);
      
      return orderId;
    } catch (error) {
      console.error('Failed to execute combo order:', error);
      return null;
    }
  }

  /**
   * Execute VWAP algorithm for large stock orders
   * Minimizes market impact when hedging or adjusting underlying positions
   */
  async executeVWAPOrder(
    symbol: string,
    quantity: number,
    startTime?: string,
    endTime?: string
  ): Promise<string | null> {
    try {
      console.log(`Executing VWAP order for ${symbol}: ${quantity} shares`);

      const contract = {
        symbol,
        secType: 'STK' as const,
        exchange: 'SMART' as const,
        currency: 'USD' as const,
      };

      const order = {
        action: quantity > 0 ? 'BUY' as const : 'SELL' as const,
        orderType: 'VWAP' as const,
        totalQuantity: Math.abs(quantity),
        tif: 'DAY' as const,
        transmit: true,
        algoStrategy: 'Vwap',
        algoParams: [
          { tag: 'maxPctVol', value: '0.1' }, // Max 10% of volume
          { tag: 'startTime', value: startTime || '09:30:00' },
          { tag: 'endTime', value: endTime || '16:00:00' },
          { tag: 'allowPastEndTime', value: '1' },
        ],
      };

      const orderId = await this.ibkr.placeOrder(contract, order);
      console.log(`VWAP order placed with ID: ${orderId}`);
      
      return orderId;
    } catch (error) {
      console.error('Failed to execute VWAP order:', error);
      return null;
    }
  }

  /**
   * Get real-time bid/ask spread for liquidity check
   * Critical: Trading on wide spreads significantly reduces edge
   */
  async checkLiquidity(
    symbol: string,
    strike: number,
    expiry: string,
    right: 'C' | 'P'
  ): Promise<{
    bid: number;
    ask: number;
    spread: number;
    spreadPercent: number;
    isLiquid: boolean;
  } | null> {
    try {
      // In real implementation, use reqMktData for live quotes
      const marketData = await this.ibkr.getMarketData([symbol]);
      
      if (!marketData.length) return null;

      const data = marketData[0];
      const bid = data.bid || 0;
      const ask = data.ask || 0;
      const spread = ask - bid;
      const mid = (bid + ask) / 2;
      const spreadPercent = mid > 0 ? (spread / mid) * 100 : 0;

      // Consider liquid if spread is less than 5% of mid price
      const isLiquid = spreadPercent < 5.0;

      return {
        bid,
        ask,
        spread,
        spreadPercent,
        isLiquid,
      };
    } catch (error) {
      console.error('Failed to check liquidity:', error);
      return null;
    }
  }

  /**
   * Smart order routing for price improvement
   * Leverages IBKR's Smart Routing across multiple exchanges
   */
  async executeSmartRoutedOrder(
    symbol: string,
    quantity: number,
    limitPrice?: number
  ): Promise<string | null> {
    try {
      const contract = {
        symbol,
        secType: 'OPT' as const,
        exchange: 'SMART' as const, // Enable smart routing
        currency: 'USD' as const,
        strike: 150, // Would be calculated
        expiry: '20240119',
        right: 'C' as const,
      };

      const order = {
        action: quantity > 0 ? 'BUY' as const : 'SELL' as const,
        orderType: limitPrice ? 'LMT' as const : 'MKT' as const,
        totalQuantity: Math.abs(quantity),
        lmtPrice: limitPrice,
        tif: 'DAY' as const,
        transmit: true,
        // Smart routing parameters for price improvement
        smartComboRoutingParams: [
          { tag: 'NonGuaranteed', value: '0' },
        ],
      };

      const orderId = await this.ibkr.placeOrder(contract, order);
      console.log(`Smart routed order placed with ID: ${orderId}`);
      
      return orderId;
    } catch (error) {
      console.error('Failed to execute smart routed order:', error);
      return null;
    }
  }
}