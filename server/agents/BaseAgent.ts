import { EventEmitter } from 'events';

export interface AgentDecision {
  symbol: string;
  action: 'BUY_CALLS' | 'BUY_PUTS' | 'SELL_CALLS' | 'SELL_PUTS' | 'HOLD' | 'CLOSE';
  confidence: number; // 0-1
  reasoning: string;
  supportingData: any;
  riskAssessment: {
    riskScore: number; // 0-10
    positionSize: number;
    maxLoss: number;
    probabilityOfSuccess: number;
  };
}

export interface MarketAnalysisData {
  symbol: string;
  optionsFlow: any[];
  marketData: any;
  news: any[];
  signals: any[];
}

export abstract class BaseAgent extends EventEmitter {
  protected agentId: string;
  protected specialization: string;
  protected confidence: number = 0;
  protected isActive: boolean = true;

  constructor(agentId: string, specialization: string) {
    super();
    this.agentId = agentId;
    this.specialization = specialization;
  }

  abstract analyze(data: MarketAnalysisData): Promise<AgentDecision | null>;

  protected calculateConfidence(factors: number[]): number {
    // Average confidence across multiple factors
    const avg = factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
    return Math.max(0, Math.min(1, avg));
  }

  protected calculateRiskScore(
    volatility: number,
    positionSize: number,
    marketConditions: number
  ): number {
    // Weighted risk calculation
    const volWeight = 0.4;
    const sizeWeight = 0.3;
    const marketWeight = 0.3;
    
    return Math.min(10, 
      (volatility * volWeight + 
       positionSize * sizeWeight + 
       marketConditions * marketWeight) * 10
    );
  }

  protected calculatePositionSize(
    confidence: number,
    riskTolerance: number,
    accountSize: number = 100000
  ): number {
    const basePosition = accountSize * 0.02; // 2% base position
    const confidenceMultiplier = confidence * 2; // 0-2x multiplier
    const riskAdjustment = (10 - riskTolerance) / 10; // Lower risk = larger position
    
    return Math.floor(basePosition * confidenceMultiplier * riskAdjustment);
  }

  public getStatus() {
    return {
      agentId: this.agentId,
      specialization: this.specialization,
      confidence: this.confidence,
      isActive: this.isActive
    };
  }

  public setActive(active: boolean) {
    this.isActive = active;
  }
}