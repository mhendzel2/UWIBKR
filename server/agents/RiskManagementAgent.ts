import { BaseAgent, AgentDecision, MarketAnalysisData } from './BaseAgent';

interface RiskValidationResult {
  approved: boolean;
  riskScore: number;
  concerns: string[];
  execution: {
    maxPositionSize: number;
    stopLoss: number;
    profitTarget: number;
    timeframe: string;
  };
}

export class RiskManagementAgent extends BaseAgent {
  private portfolioValue: number = 100000; // Default portfolio value
  private maxRiskPerTrade: number = 0.02; // 2% max risk per trade
  private maxPortfolioRisk: number = 0.10; // 10% max portfolio risk
  private currentOpenRisk: number = 0;

  constructor() {
    super('risk_management', 'Portfolio Risk Assessment & Position Sizing');
  }

  async analyze(data: MarketAnalysisData): Promise<AgentDecision | null> {
    try {
      const { symbol, optionsFlow, signals } = data;

      // Risk assessment based on market conditions
      const riskAssessment = this.assessMarketRisk(data);
      
      // Position sizing based on risk parameters
      const positionSizing = this.calculateOptimalPositionSize(riskAssessment);

      if (riskAssessment.overallRisk > 8) {
        // High risk - recommend no position
        return {
          symbol,
          action: 'HOLD',
          confidence: 0.9, // High confidence in risk assessment
          reasoning: `Risk assessment shows high risk (${riskAssessment.overallRisk}/10). ${riskAssessment.primaryConcerns.join(', ')}. Recommend avoiding position.`,
          supportingData: {
            riskMetrics: riskAssessment,
            positionSizing,
            portfolioImpact: this.calculatePortfolioImpact(positionSizing.recommendedSize)
          },
          riskAssessment: {
            riskScore: riskAssessment.overallRisk,
            positionSize: 0,
            maxLoss: 0,
            probabilityOfSuccess: 0.1
          }
        };
      }

      // Calculate appropriate action based on risk-adjusted sizing
      const action = this.determineRiskAdjustedAction(riskAssessment, positionSizing);

      return {
        symbol,
        action,
        confidence: 0.8,
        reasoning: `Risk-adjusted position sizing: $${positionSizing.recommendedSize.toLocaleString()}. Risk score: ${riskAssessment.overallRisk}/10. Portfolio impact: ${positionSizing.portfolioAllocation.toFixed(1)}%`,
        supportingData: {
          riskMetrics: riskAssessment,
          positionSizing,
          riskControls: {
            stopLoss: positionSizing.stopLoss,
            profitTarget: positionSizing.profitTarget,
            timeframe: positionSizing.maxHoldTime
          }
        },
        riskAssessment: {
          riskScore: riskAssessment.overallRisk,
          positionSize: positionSizing.recommendedSize,
          maxLoss: positionSizing.maxLoss,
          probabilityOfSuccess: this.calculateSuccessProbability(riskAssessment)
        }
      };

    } catch (error) {
      console.error('Risk Management Agent analysis failed:', error);
      return null;
    }
  }

  async validateConsensus(consensus: any, agentDecisions: AgentDecision[]): Promise<RiskValidationResult> {
    try {
      // Aggregate risk scores from all agents
      const avgRiskScore = agentDecisions.reduce((sum, decision) => 
        sum + decision.riskAssessment.riskScore, 0) / agentDecisions.length;

      // Check for position size limits
      const totalPositionSize = agentDecisions.reduce((sum, decision) => 
        sum + decision.riskAssessment.positionSize, 0);

      const portfolioRisk = totalPositionSize / this.portfolioValue;
      const concerns: string[] = [];
      let approved = true;

      // Risk validation checks
      if (avgRiskScore > 8) {
        concerns.push('High aggregate risk score');
        approved = false;
      }

      if (portfolioRisk > this.maxRiskPerTrade) {
        concerns.push(`Position size exceeds ${(this.maxRiskPerTrade * 100).toFixed(1)}% risk limit`);
        approved = false;
      }

      if (this.currentOpenRisk + portfolioRisk > this.maxPortfolioRisk) {
        concerns.push('Total portfolio risk would exceed limits');
        approved = false;
      }

      // Check for conflicting signals
      const uniqueActions = new Set(agentDecisions.map(d => d.action));
      if (uniqueActions.size > 2) {
        concerns.push('Conflicting agent signals detected');
        approved = false;
      }

      // Calculate execution parameters
      const maxPositionSize = Math.min(
        totalPositionSize,
        this.portfolioValue * this.maxRiskPerTrade
      );

      return {
        approved,
        riskScore: avgRiskScore,
        concerns,
        execution: {
          maxPositionSize,
          stopLoss: this.calculateStopLoss(avgRiskScore),
          profitTarget: this.calculateProfitTarget(avgRiskScore),
          timeframe: this.determineTimeframe(avgRiskScore)
        }
      };

    } catch (error) {
      console.error('Risk validation failed:', error);
      return {
        approved: false,
        riskScore: 10,
        concerns: ['Risk validation system error'],
        execution: {
          maxPositionSize: 0,
          stopLoss: 0,
          profitTarget: 0,
          timeframe: 'immediate'
        }
      };
    }
  }

  private assessMarketRisk(data: MarketAnalysisData) {
    const { optionsFlow, signals, marketData } = data;
    
    let overallRisk = 5; // Base risk level
    const primaryConcerns: string[] = [];
    const riskFactors: { [key: string]: number } = {};

    // Volatility risk from options flow
    if (optionsFlow.length > 0) {
      const avgPremium = optionsFlow.reduce((sum, flow) => 
        sum + (parseFloat(flow.premium) || 0), 0) / optionsFlow.length;
      
      if (avgPremium > 1000000) {
        overallRisk += 2;
        primaryConcerns.push('High premium options flow');
        riskFactors.volatility = 8;
      } else if (avgPremium > 500000) {
        overallRisk += 1;
        riskFactors.volatility = 6;
      } else {
        riskFactors.volatility = 4;
      }
    }

    // Signal concentration risk
    if (signals.length > 10) {
      overallRisk += 1;
      primaryConcerns.push('High signal concentration');
      riskFactors.signalRisk = 7;
    } else if (signals.length > 5) {
      riskFactors.signalRisk = 5;
    } else {
      riskFactors.signalRisk = 3;
    }

    // Time-based risk (market hours, day of week)
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Higher risk during market open/close
    if (hour === 9 || hour === 15) {
      overallRisk += 1;
      primaryConcerns.push('High volatility market hours');
      riskFactors.timeRisk = 6;
    } else if (hour < 9 || hour > 16) {
      overallRisk += 0.5;
      riskFactors.timeRisk = 4;
    } else {
      riskFactors.timeRisk = 3;
    }

    // Friday/Monday risk
    if (dayOfWeek === 1 || dayOfWeek === 5) {
      overallRisk += 0.5;
      riskFactors.dayRisk = 5;
    } else {
      riskFactors.dayRisk = 3;
    }

    // Liquidity risk assessment
    const liquidityRisk = this.assessLiquidityRisk(optionsFlow);
    overallRisk += liquidityRisk;
    riskFactors.liquidity = liquidityRisk * 2;

    if (liquidityRisk > 2) {
      primaryConcerns.push('Low liquidity conditions');
    }

    return {
      overallRisk: Math.min(10, Math.max(1, Math.round(overallRisk))),
      primaryConcerns,
      riskFactors,
      marketConditions: {
        volatilityRegime: this.determineVolatilityRegime(optionsFlow),
        liquidityScore: 10 - liquidityRisk * 2,
        timeRisk: riskFactors.timeRisk
      }
    };
  }

  private calculateOptimalPositionSize(riskAssessment: any) {
    const basePosition = this.portfolioValue * this.maxRiskPerTrade;
    const riskMultiplier = (10 - riskAssessment.overallRisk) / 10;
    const recommendedSize = Math.floor(basePosition * riskMultiplier);

    const portfolioAllocation = (recommendedSize / this.portfolioValue) * 100;
    const maxLoss = recommendedSize * 0.5; // 50% max loss
    
    return {
      recommendedSize,
      portfolioAllocation,
      maxLoss,
      stopLoss: this.calculateStopLoss(riskAssessment.overallRisk),
      profitTarget: this.calculateProfitTarget(riskAssessment.overallRisk),
      maxHoldTime: this.determineTimeframe(riskAssessment.overallRisk)
    };
  }

  private calculatePortfolioImpact(positionSize: number) {
    return {
      allocation: (positionSize / this.portfolioValue) * 100,
      riskContribution: (positionSize * 0.5) / this.portfolioValue * 100, // Assume 50% max loss
      correlationRisk: this.currentOpenRisk * 100,
      totalRisk: (this.currentOpenRisk + (positionSize / this.portfolioValue)) * 100
    };
  }

  private determineRiskAdjustedAction(riskAssessment: any, positionSizing: any): string {
    if (positionSizing.recommendedSize === 0) return 'HOLD';
    
    // Lower risk = more aggressive positioning
    if (riskAssessment.overallRisk <= 4) {
      return 'BUY_CALLS'; // Default to bullish in low risk
    } else if (riskAssessment.overallRisk <= 6) {
      return 'BUY_CALLS'; // Conservative bullish
    } else {
      return 'HOLD'; // High risk = no position
    }
  }

  private assessLiquidityRisk(optionsFlow: any[]): number {
    if (optionsFlow.length === 0) return 3; // Medium risk for no data

    const avgVolume = optionsFlow.reduce((sum, flow) => 
      sum + (flow.volume || 0), 0) / optionsFlow.length;

    const avgOpenInterest = optionsFlow.reduce((sum, flow) => 
      sum + (flow.openInterest || 0), 0) / optionsFlow.length;

    // Low volume/OI = higher liquidity risk
    if (avgVolume < 100 || avgOpenInterest < 500) {
      return 4; // High liquidity risk
    } else if (avgVolume < 500 || avgOpenInterest < 2000) {
      return 2; // Medium liquidity risk
    } else {
      return 1; // Low liquidity risk
    }
  }

  private determineVolatilityRegime(optionsFlow: any[]): string {
    if (optionsFlow.length === 0) return 'normal';

    const avgPremium = optionsFlow.reduce((sum, flow) => 
      sum + (parseFloat(flow.premium) || 0), 0) / optionsFlow.length;

    if (avgPremium > 1000000) return 'high';
    if (avgPremium > 500000) return 'elevated';
    return 'normal';
  }

  private calculateStopLoss(riskScore: number): number {
    // Higher risk = tighter stop loss
    const baseStopLoss = 0.15; // 15% base stop loss
    const riskAdjustment = (riskScore - 5) * 0.02; // Adjust by 2% per risk point
    return Math.max(0.05, Math.min(0.25, baseStopLoss - riskAdjustment));
  }

  private calculateProfitTarget(riskScore: number): number {
    // Lower risk = higher profit targets
    const baseProfitTarget = 0.25; // 25% base profit target
    const riskAdjustment = (5 - riskScore) * 0.05; // Adjust by 5% per risk point
    return Math.max(0.15, Math.min(0.50, baseProfitTarget + riskAdjustment));
  }

  private determineTimeframe(riskScore: number): string {
    if (riskScore >= 8) return '1-2 days';
    if (riskScore >= 6) return '3-5 days';
    if (riskScore >= 4) return '1-2 weeks';
    return '2-4 weeks';
  }

  private calculateSuccessProbability(riskAssessment: any): number {
    const baseProb = 0.6; // 60% base probability
    const riskAdjustment = (5 - riskAssessment.overallRisk) * 0.05;
    return Math.max(0.1, Math.min(0.9, baseProb + riskAdjustment));
  }

  // Public methods for portfolio management
  public updatePortfolioValue(value: number) {
    this.portfolioValue = value;
  }

  public updateCurrentRisk(risk: number) {
    this.currentOpenRisk = risk;
  }

  public setRiskParameters(maxRiskPerTrade: number, maxPortfolioRisk: number) {
    this.maxRiskPerTrade = maxRiskPerTrade;
    this.maxPortfolioRisk = maxPortfolioRisk;
  }
}