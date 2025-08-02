import { BaseAgent, AgentDecision, MarketAnalysisData } from './BaseAgent';

export class ExecutionAgent extends BaseAgent {
  private executionQueue: any[] = [];
  private marketHours = {
    start: 9.5, // 9:30 AM
    end: 16,    // 4:00 PM
  };

  constructor() {
    super('execution', 'Trade Execution & Order Management');
  }

  async analyze(data: MarketAnalysisData): Promise<AgentDecision | null> {
    try {
      const { symbol, marketData } = data;

      // Execution agent focuses on timing and order management
      const executionAnalysis = this.analyzeExecutionConditions(symbol, marketData);
      
      if (!executionAnalysis.canExecute) {
        return null;
      }

      const action = this.determineExecutionAction(executionAnalysis);
      const riskScore = this.calculateExecutionRisk(executionAnalysis);

      return {
        symbol,
        action,
        confidence: executionAnalysis.confidence,
        reasoning: `Execution conditions: ${executionAnalysis.reasoning}. Market timing: ${executionAnalysis.timing}, Liquidity: ${executionAnalysis.liquidity}`,
        supportingData: {
          executionMetrics: executionAnalysis,
          orderRecommendations: {
            orderType: executionAnalysis.recommendedOrderType,
            timeInForce: executionAnalysis.timeInForce,
            executionStrategy: executionAnalysis.strategy
          },
          marketConditions: {
            volatility: executionAnalysis.volatility,
            liquidity: executionAnalysis.liquidity,
            timing: executionAnalysis.timing
          }
        },
        riskAssessment: {
          riskScore,
          positionSize: this.calculatePositionSize(executionAnalysis.confidence, riskScore),
          maxLoss: Math.floor(executionAnalysis.slippage * 10000), // Slippage-based max loss
          probabilityOfSuccess: executionAnalysis.confidence * 0.8
        }
      };

    } catch (error) {
      console.error('Execution Agent analysis failed:', error);
      return null;
    }
  }

  private analyzeExecutionConditions(symbol: string, marketData: any) {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    // Check market hours
    const isMarketHours = currentHour >= this.marketHours.start && currentHour <= this.marketHours.end;
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const canExecute = isMarketHours && isWeekday;

    // Analyze market timing
    const timing = this.analyzeMarketTiming(currentHour);
    
    // Estimate liquidity and volatility
    const liquidity = this.estimateLiquidity(symbol, currentHour);
    const volatility = this.estimateCurrentVolatility(currentHour);
    
    // Calculate execution confidence
    const confidence = this.calculateExecutionConfidence(timing, liquidity, volatility, canExecute);
    
    // Determine optimal execution strategy
    const strategy = this.determineExecutionStrategy(timing, liquidity, volatility);
    
    // Calculate expected slippage
    const slippage = this.calculateExpectedSlippage(liquidity, volatility, timing);

    let reasoning = `Market timing: ${timing.description}. `;
    reasoning += `Liquidity: ${liquidity.level}. `;
    reasoning += `Volatility: ${volatility.level}. `;
    if (!canExecute) reasoning += 'Outside market hours. ';

    return {
      canExecute,
      confidence,
      reasoning,
      timing: timing.level,
      liquidity: liquidity.level,
      volatility: volatility.level,
      strategy: strategy.type,
      recommendedOrderType: strategy.orderType,
      timeInForce: strategy.timeInForce,
      slippage: slippage.expected,
      optimalWindow: timing.optimalWindow
    };
  }

  private analyzeMarketTiming(currentHour: number) {
    // Market timing analysis based on time of day
    if (currentHour < 9.5) {
      return {
        level: 'pre_market',
        description: 'Pre-market hours - limited liquidity',
        optimalWindow: false,
        timingScore: 0.3
      };
    } else if (currentHour >= 9.5 && currentHour <= 10.5) {
      return {
        level: 'market_open',
        description: 'Market opening hour - high volatility',
        optimalWindow: false,
        timingScore: 0.6
      };
    } else if (currentHour > 10.5 && currentHour < 14) {
      return {
        level: 'mid_day',
        description: 'Mid-day trading - optimal conditions',
        optimalWindow: true,
        timingScore: 0.9
      };
    } else if (currentHour >= 14 && currentHour < 15.5) {
      return {
        level: 'afternoon',
        description: 'Afternoon session - good liquidity',
        optimalWindow: true,
        timingScore: 0.8
      };
    } else if (currentHour >= 15.5 && currentHour <= 16) {
      return {
        level: 'market_close',
        description: 'Market closing hour - high volatility',
        optimalWindow: false,
        timingScore: 0.5
      };
    } else {
      return {
        level: 'after_hours',
        description: 'After hours - limited trading',
        optimalWindow: false,
        timingScore: 0.2
      };
    }
  }

  private estimateLiquidity(symbol: string, currentHour: number) {
    // Estimate liquidity based on symbol and time
    const majorSymbols = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMZN', 'GOOGL'];
    const isMajorSymbol = majorSymbols.includes(symbol);
    
    let liquidityScore = isMajorSymbol ? 0.8 : 0.5;
    
    // Adjust for time of day
    if (currentHour >= 10 && currentHour <= 15) {
      liquidityScore *= 1.2; // Higher liquidity during main trading hours
    } else if (currentHour >= 9.5 && currentHour <= 10 || currentHour >= 15 && currentHour <= 16) {
      liquidityScore *= 0.9; // Slightly lower during open/close
    } else {
      liquidityScore *= 0.4; // Much lower outside main hours
    }

    liquidityScore = Math.min(1, liquidityScore);

    return {
      level: liquidityScore > 0.7 ? 'high' : liquidityScore > 0.4 ? 'medium' : 'low',
      score: liquidityScore,
      recommendation: liquidityScore > 0.6 ? 'market_order' : 'limit_order'
    };
  }

  private estimateCurrentVolatility(currentHour: number) {
    // Estimate volatility based on time of day
    let volatilityScore = 0.5; // Base volatility
    
    // Higher volatility during open and close
    if (currentHour >= 9.5 && currentHour <= 10.5 || currentHour >= 15.5 && currentHour <= 16) {
      volatilityScore = 0.8;
    } else if (currentHour >= 10.5 && currentHour <= 15.5) {
      volatilityScore = 0.4; // Lower volatility mid-day
    } else {
      volatilityScore = 0.6; // Moderate volatility outside hours
    }

    return {
      level: volatilityScore > 0.7 ? 'high' : volatilityScore > 0.4 ? 'medium' : 'low',
      score: volatilityScore,
      impact: volatilityScore > 0.6 ? 'use_limit_orders' : 'market_orders_acceptable'
    };
  }

  private calculateExecutionConfidence(timing: any, liquidity: any, volatility: any, canExecute: boolean) {
    if (!canExecute) return 0.2;
    
    const timingWeight = 0.4;
    const liquidityWeight = 0.4;
    const volatilityWeight = 0.2;
    
    // Higher volatility reduces confidence
    const volatilityConfidence = 1 - volatility.score;
    
    const confidence = (
      timing.timingScore * timingWeight +
      liquidity.score * liquidityWeight +
      volatilityConfidence * volatilityWeight
    );
    
    return Math.max(0.1, Math.min(0.95, confidence));
  }

  private determineExecutionStrategy(timing: any, liquidity: any, volatility: any) {
    // Determine optimal execution strategy
    if (liquidity.score > 0.7 && volatility.score < 0.5) {
      return {
        type: 'aggressive',
        orderType: 'market',
        timeInForce: 'IOC', // Immediate or Cancel
        description: 'High liquidity, low volatility - use market orders'
      };
    } else if (liquidity.score > 0.5 && volatility.score < 0.7) {
      return {
        type: 'moderate',
        orderType: 'limit',
        timeInForce: 'DAY',
        description: 'Moderate conditions - use limit orders with day duration'
      };
    } else if (volatility.score > 0.7) {
      return {
        type: 'cautious',
        orderType: 'limit',
        timeInForce: 'GTC', // Good Till Canceled
        description: 'High volatility - use conservative limit orders'
      };
    } else {
      return {
        type: 'patient',
        orderType: 'limit',
        timeInForce: 'GTC',
        description: 'Low liquidity - wait for better conditions'
      };
    }
  }

  private calculateExpectedSlippage(liquidity: any, volatility: any, timing: any) {
    // Calculate expected slippage based on market conditions
    let baseSlippage = 0.001; // 0.1% base slippage
    
    // Adjust for liquidity
    if (liquidity.score < 0.3) {
      baseSlippage *= 3; // High slippage in low liquidity
    } else if (liquidity.score < 0.6) {
      baseSlippage *= 1.5; // Moderate increase
    }
    
    // Adjust for volatility
    baseSlippage *= (1 + volatility.score);
    
    // Adjust for timing
    if (!timing.optimalWindow) {
      baseSlippage *= 1.3;
    }

    return {
      expected: baseSlippage,
      range: {
        best: baseSlippage * 0.5,
        worst: baseSlippage * 2
      }
    };
  }

  private determineExecutionAction(executionAnalysis: any): string {
    // Execution agent primarily validates other agents' decisions
    // It doesn't generate new trading signals, but recommends execution approach
    
    if (!executionAnalysis.canExecute) {
      return 'HOLD'; // Cannot execute outside market hours
    }
    
    if (executionAnalysis.confidence < 0.5) {
      return 'HOLD'; // Poor execution conditions
    }
    
    // Return neutral action - execution agent supports other agents' decisions
    return 'HOLD';
  }

  private calculateExecutionRisk(executionAnalysis: any): number {
    let riskScore = 5; // Base risk
    
    // Higher volatility = higher execution risk
    riskScore += executionAnalysis.volatility === 'high' ? 2 : 
                  executionAnalysis.volatility === 'medium' ? 1 : 0;
    
    // Lower liquidity = higher execution risk
    riskScore += executionAnalysis.liquidity === 'low' ? 3 : 
                  executionAnalysis.liquidity === 'medium' ? 1 : 0;
    
    // Poor timing = higher execution risk
    if (!executionAnalysis.optimalWindow) {
      riskScore += 1;
    }
    
    // Cannot execute = maximum risk
    if (!executionAnalysis.canExecute) {
      riskScore = 9;
    }
    
    return Math.min(10, Math.max(1, riskScore));
  }

  // Public methods for order management
  public async executeOrder(order: any) {
    // Queue order for execution
    this.executionQueue.push({
      ...order,
      timestamp: new Date(),
      status: 'queued'
    });
    
    return this.processExecutionQueue();
  }

  private async processExecutionQueue() {
    // Process queued orders based on execution conditions
    const results = [];
    
    for (const order of this.executionQueue) {
      if (order.status === 'queued') {
        const executionResult = await this.attemptExecution(order);
        results.push(executionResult);
      }
    }
    
    return results;
  }

  private async attemptExecution(order: any) {
    // Simulate order execution (in real system, this would connect to IBKR)
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    if (currentHour < this.marketHours.start || currentHour > this.marketHours.end) {
      return {
        orderId: order.id,
        status: 'rejected',
        reason: 'Outside market hours'
      };
    }
    
    // Simulate execution success/failure based on market conditions
    const executionProbability = this.calculateExecutionProbability(order);
    const isExecuted = Math.random() < executionProbability;
    
    return {
      orderId: order.id,
      status: isExecuted ? 'filled' : 'pending',
      fillPrice: isExecuted ? this.calculateFillPrice(order) : null,
      timestamp: now
    };
  }

  private calculateExecutionProbability(order: any): number {
    // Base execution probability
    let probability = 0.85;
    
    // Adjust based on order type
    if (order.type === 'market') {
      probability = 0.95;
    } else if (order.type === 'limit') {
      probability = 0.7; // Lower for limit orders
    }
    
    return probability;
  }

  private calculateFillPrice(order: any): number {
    // Simulate fill price with slippage
    const basePrice = order.price || 100; // Default price
    const slippage = (Math.random() - 0.5) * 0.002; // ±0.1% slippage
    
    return basePrice * (1 + slippage);
  }

  public getExecutionMetrics() {
    const total = this.executionQueue.length;
    const filled = this.executionQueue.filter(o => o.status === 'filled').length;
    const pending = this.executionQueue.filter(o => o.status === 'pending').length;
    const rejected = this.executionQueue.filter(o => o.status === 'rejected').length;
    
    return {
      totalOrders: total,
      fillRate: total > 0 ? filled / total : 0,
      pendingOrders: pending,
      rejectedOrders: rejected,
      averageSlippage: this.calculateAverageSlippage()
    };
  }

  private calculateAverageSlippage(): number {
    const filledOrders = this.executionQueue.filter(o => o.status === 'filled' && o.fillPrice && o.price);
    
    if (filledOrders.length === 0) return 0;
    
    const totalSlippage = filledOrders.reduce((sum, order) => {
      const slippage = Math.abs(order.fillPrice - order.price) / order.price;
      return sum + slippage;
    }, 0);
    
    return totalSlippage / filledOrders.length;
  }
}