// @ts-nocheck
import { IBKRService } from './ibkr';
import { storage } from '../storage';
import type { 
  Portfolio, 
  InsertPortfolio, 
  PortfolioPosition, 
  InsertPortfolioPosition,
  PortfolioTransaction,
  InsertPortfolioTransaction 
} from '@shared/schema';

export interface PortfolioSyncResult {
  success: boolean;
  portfolioId: string;
  positionsUpdated: number;
  newTransactions: number;
  errors: string[];
}

export interface PortfolioPerformance {
  totalValue: number;
  dayPnL: number;
  totalPnL: number;
  percentChange: number;
  positionCount: number;
}

/**
 * Portfolio Manager - Handles multi-portfolio tracking and IBKR integration
 * Manages paper trading accounts and facilitates transition to live trading
 */
export class PortfolioManager {
  private ibkr: IBKRService;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.ibkr = new IBKRService();
  }

  /**
   * Create a new portfolio with IBKR integration
   */
  async createPortfolio(portfolioData: {
    userId: string;
    name: string;
    description?: string;
    type: 'paper' | 'live' | 'demo';
    ibkrAccountId?: string;
    riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  }): Promise<Portfolio> {
    const insertData: InsertPortfolio = {
      userId: portfolioData.userId,
      name: portfolioData.name,
      description: portfolioData.description,
      type: portfolioData.type,
      ibkrAccountId: portfolioData.ibkrAccountId,
      riskProfile: portfolioData.riskProfile || 'moderate',
    };

    const portfolio = await storage.createPortfolio(insertData);
    
    // If IBKR account specified, perform initial sync
    if (portfolioData.ibkrAccountId && portfolioData.type === 'paper') {
      await this.syncPortfolioWithIBKR(portfolio.id);
    }

    return portfolio;
  }

  /**
   * Get all portfolios for a user
   */
  async getUserPortfolios(userId: string): Promise<Portfolio[]> {
    return await storage.getPortfoliosByUser(userId);
  }

  /**
   * Calculate portfolio performance from positions
   */
  async getPortfolioPerformance(portfolioId: string): Promise<PortfolioPerformance> {
    const positions = await storage.getPortfolioPositions(portfolioId);
    
    return this.calculatePortfolioPerformance(positions || []);
  }

  /**
   * Get portfolio with positions and performance data
   */
  async getPortfolioDetails(portfolioId: string): Promise<{
    portfolio: Portfolio;
    positions: PortfolioPosition[];
    performance: PortfolioPerformance;
    recentTransactions: PortfolioTransaction[];
  }> {
    const [portfolio, positions, transactions] = await Promise.all([
      storage.getPortfolio(portfolioId),
      storage.getPortfolioPositions(portfolioId),
      storage.getPortfolioTransactions(portfolioId, 50)
    ]);

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const performance = this.calculatePortfolioPerformance(positions);

    return {
      portfolio,
      positions: positions || [],
      performance,
      recentTransactions: transactions || []
    };
  }

  /**
   * Sync portfolio positions with IBKR paper trading account
   */
  async syncPortfolioWithIBKR(portfolioId: string): Promise<PortfolioSyncResult> {
    const result: PortfolioSyncResult = {
      success: false,
      portfolioId,
      positionsUpdated: 0,
      newTransactions: 0,
      errors: []
    };

    try {
      const portfolio = await storage.getPortfolio(portfolioId);
      if (!portfolio) {
        result.errors.push('Portfolio not found');
        return result;
      }

      // Connect to IBKR if not already connected
      if (!this.ibkr.isConnected()) {
        const connected = await this.ibkr.connect();
        if (!connected) {
          result.errors.push('Failed to connect to IBKR TWS');
          return result;
        }
      }

      // Get current account info and positions from IBKR
      const [accountInfo, ibkrPositions] = await Promise.all([
        this.ibkr.getAccountInfo(),
        this.ibkr.getPositions()
      ]);

      if (!accountInfo) {
        result.errors.push('Failed to get IBKR account information');
        return result;
      }

      // Update portfolio with account values
      await storage.updatePortfolio(portfolioId, {
        totalValue: accountInfo.netLiquidation.toString(),
        cashBalance: accountInfo.totalCashValue.toString(),
        buyingPower: accountInfo.buyingPower.toString(),
        dayPnL: (accountInfo.realizedPnL + accountInfo.unrealizedPnL).toString(),
        totalPnL: accountInfo.unrealizedPnL.toString(),
        updatedAt: new Date()
      });

      // Process IBKR positions
      const currentPositions = await storage.getPortfolioPositions(portfolioId);
      const currentPositionMap = new Map(
        currentPositions.map(pos => [`${pos.symbol}_${pos.secType}`, pos])
      );

      for (const ibkrPos of ibkrPositions) {
        const positionKey = `${ibkrPos.symbol}_STK`; // Default to STK for now
        const existingPosition = currentPositionMap.get(positionKey);

        const contractDetails = {
          secType: 'STK',
          exchange: 'SMART',
          currency: 'USD'
        };

        if (existingPosition) {
          // Update existing position
          await storage.updatePortfolioPosition(existingPosition.id, {
            quantity: ibkrPos.position,
            avgCost: ibkrPos.avgCost.toString(),
            marketPrice: ibkrPos.marketPrice?.toString(),
            marketValue: ibkrPos.marketValue?.toString(),
            unrealizedPnL: ibkrPos.unrealizedPNL?.toString(),
            contractDetails,
            lastUpdated: new Date()
          });
        } else {
          // Create new position
          const newPosition: InsertPortfolioPosition = {
            portfolioId,
            symbol: ibkrPos.symbol,
            secType: 'STK',
            quantity: ibkrPos.position,
            avgCost: ibkrPos.avgCost.toString(),
            marketPrice: ibkrPos.marketPrice?.toString(),
            marketValue: ibkrPos.marketValue?.toString(),
            unrealizedPnL: ibkrPos.unrealizedPNL?.toString(),
            contractDetails
          };
          await storage.createPortfolioPosition(newPosition);
        }

        result.positionsUpdated++;
      }

      result.success = true;
      console.log(`Successfully synced portfolio ${portfolioId} with IBKR`);

    } catch (error) {
      console.error('Portfolio sync error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    }

    return result;
  }

  /**
   * Start automatic syncing for a portfolio
   */
  startAutoSync(portfolioId: string, intervalMinutes: number = 5): void {
    // Clear existing interval if any
    this.stopAutoSync(portfolioId);

    const interval = setInterval(async () => {
      try {
        await this.syncPortfolioWithIBKR(portfolioId);
      } catch (error) {
        console.error(`Auto-sync failed for portfolio ${portfolioId}:`, error);
      }
    }, intervalMinutes * 60 * 1000);

    this.syncIntervals.set(portfolioId, interval);
    console.log(`Started auto-sync for portfolio ${portfolioId} every ${intervalMinutes} minutes`);
  }

  /**
   * Stop automatic syncing for a portfolio
   */
  stopAutoSync(portfolioId: string): void {
    const interval = this.syncIntervals.get(portfolioId);
    if (interval) {
      clearInterval(interval);
      this.syncIntervals.delete(portfolioId);
      console.log(`Stopped auto-sync for portfolio ${portfolioId}`);
    }
  }

  /**
   * Calculate portfolio performance metrics
   */
  private calculatePortfolioPerformance(positions: PortfolioPosition[]): PortfolioPerformance {
    let totalValue = 0;
    let totalPnL = 0;
    let dayPnL = 0;

    for (const position of positions) {
      const marketValue = parseFloat(position.marketValue || '0');
      const unrealizedPnL = parseFloat(position.unrealizedPnL || '0');
      const realizedPnL = parseFloat(position.realizedPnL || '0');

      totalValue += marketValue;
      totalPnL += unrealizedPnL + realizedPnL;
      dayPnL += unrealizedPnL; // Assuming unrealized is daily change
    }

    const initialValue = totalValue - totalPnL;
    const percentChange = initialValue > 0 ? (totalPnL / initialValue) * 100 : 0;

    return {
      totalValue,
      dayPnL,
      totalPnL,
      percentChange,
      positionCount: positions.length
    };
  }

  /**
   * Record a new transaction (trade execution)
   */
  async recordTransaction(transaction: Omit<InsertPortfolioTransaction, 'id'>): Promise<PortfolioTransaction> {
    const newTransaction = await storage.createPortfolioTransaction(transaction);
    
    // Update position after transaction
    await this.updatePositionFromTransaction(newTransaction);
    
    return newTransaction;
  }

  /**
   * Update position based on transaction
   */
  private async updatePositionFromTransaction(transaction: PortfolioTransaction): Promise<void> {
    const positions = await storage.getPortfolioPositions(transaction.portfolioId);
    const existingPosition = positions.find(
      pos => pos.symbol === transaction.symbol && 
             pos.secType === ((transaction.contractDetails as any)?.secType || 'STK')
    );

    if (existingPosition) {
      // Update existing position quantity and average cost
      const currentQty = existingPosition.quantity;
      const currentAvgCost = parseFloat(existingPosition.avgCost);
      const transactionQty = transaction.side === 'BUY' ? transaction.quantity : -transaction.quantity;
      
      const newQty = currentQty + transactionQty;
      let newAvgCost = currentAvgCost;

      if (transaction.side === 'BUY' && newQty > 0) {
        // Calculate new average cost for buy orders
        const totalCost = (currentQty * currentAvgCost) + (transaction.quantity * parseFloat(transaction.price));
        newAvgCost = totalCost / newQty;
      }

      await storage.updatePortfolioPosition(existingPosition.id, {
        quantity: newQty,
        avgCost: newAvgCost.toString(),
        lastUpdated: new Date()
      });
    } else if (transaction.side === 'BUY') {
      // Create new position for buy orders
      const newPosition: InsertPortfolioPosition = {
        portfolioId: transaction.portfolioId,
        symbol: transaction.symbol,
        secType: (transaction.contractDetails as any)?.secType || 'STK',
        quantity: transaction.quantity,
        avgCost: transaction.price,
        contractDetails: transaction.contractDetails
      };
      await storage.createPortfolioPosition(newPosition);
    }
  }

  /**
   * Get portfolio summary for all user portfolios
   */
  async getPortfolioSummary(userId: string): Promise<{
    totalValue: number;
    totalPnL: number;
    portfolios: Array<Portfolio & { performance: PortfolioPerformance }>;
  }> {
    const portfolios = await this.getUserPortfolios(userId);
    const portfolioDetails = await Promise.all(
      portfolios.map(async (portfolio) => {
        const positions = await storage.getPortfolioPositions(portfolio.id);
        const performance = this.calculatePortfolioPerformance(positions);
        return { ...portfolio, performance };
      })
    );

    const totalValue = portfolioDetails.reduce((sum, p) => sum + p.performance.totalValue, 0);
    const totalPnL = portfolioDetails.reduce((sum, p) => sum + p.performance.totalPnL, 0);

    return {
      totalValue,
      totalPnL,
      portfolios: portfolioDetails
    };
  }

  /**
   * Close all positions in a portfolio (emergency liquidation)
   */
  async liquidatePortfolio(portfolioId: string, reason: string = 'Manual liquidation'): Promise<void> {
    const positions = await storage.getPortfolioPositions(portfolioId);
    
    for (const position of positions) {
      if (position.quantity > 0) {
        // Record sell transaction to close position
        const sellTransaction: InsertPortfolioTransaction = {
          portfolioId,
          symbol: position.symbol,
          side: 'SELL',
          quantity: position.quantity,
          price: position.marketPrice || position.avgCost,
          amount: (parseFloat(position.marketPrice || position.avgCost) * position.quantity).toString(),
          orderType: 'MKT',
          orderStatus: 'FILLED',
          contractDetails: position.contractDetails
        };

        await this.recordTransaction(sellTransaction);
      }
    }

    console.log(`Liquidated all positions in portfolio ${portfolioId}: ${reason}`);
  }

  /**
   * Get connection status and health
   */
  getStatus(): {
    ibkrConnected: boolean;
    activeSyncs: number;
    lastSyncTimes: Map<string, Date>;
  } {
    return {
      ibkrConnected: this.ibkr.isConnected(),
      activeSyncs: this.syncIntervals.size,
      lastSyncTimes: new Map() // Would track in production
    };
  }

  /**
   * Cleanup - stop all auto-sync intervals
   */
  cleanup(): void {
    Array.from(this.syncIntervals.keys()).forEach(portfolioId => {
      this.stopAutoSync(portfolioId);
    });
  }
}

// Export singleton instance
export const portfolioManager = new PortfolioManager();