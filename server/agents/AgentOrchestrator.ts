import { EventEmitter } from 'events';
import { TradingSignal, OptionsFlow, MarketData } from '@shared/schema';
import { MarketIntelligenceAgent } from './MarketIntelligenceAgent';
import { TechnicalAnalysisAgent } from './TechnicalAnalysisAgent';
import { RiskManagementAgent } from './RiskManagementAgent';
import { SentimentAnalysisAgent } from './SentimentAnalysisAgent';
import { ExecutionAgent } from './ExecutionAgent';

export interface AgentDecision {
  agentId: string;
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
  timestamp: Date;
}

export interface ConsensusDecision {
  symbol: string;
  finalAction: string;
  consensusScore: number; // 0-1
  participatingAgents: AgentDecision[];
  riskApproved: boolean;
  humanApprovalRequired: boolean;
  executionRecommendation: any;
}

export class AgentOrchestrator extends EventEmitter {
  private agents: Map<string, any> = new Map();
  private agentWeights: Map<string, number> = new Map();
  private decisionHistory: AgentDecision[] = [];
  private performanceMetrics: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeAgents();
    this.initializeWeights();
  }

  private initializeAgents() {
    // Initialize all trading agents
    this.agents.set('market_intelligence', new MarketIntelligenceAgent());
    this.agents.set('technical_analysis', new TechnicalAnalysisAgent());
    this.agents.set('risk_management', new RiskManagementAgent());
    this.agents.set('sentiment_analysis', new SentimentAnalysisAgent());
    this.agents.set('execution', new ExecutionAgent());

    // Set up event listeners for each agent
    this.agents.forEach((agent, agentId) => {
      agent.on('decision', (decision: AgentDecision) => {
        this.handleAgentDecision(agentId, decision);
      });
    });
  }

  private initializeWeights() {
    // Initial agent weights based on historical performance
    this.agentWeights.set('market_intelligence', 0.25);
    this.agentWeights.set('technical_analysis', 0.20);
    this.agentWeights.set('risk_management', 0.30); // Higher weight for risk
    this.agentWeights.set('sentiment_analysis', 0.15);
    this.agentWeights.set('execution', 0.10);
  }

  public async processMarketData(data: {
    optionsFlow: OptionsFlow[];
    marketData: MarketData;
    news: any[];
    signals: TradingSignal[];
  }): Promise<ConsensusDecision[]> {
    
    const decisions: ConsensusDecision[] = [];
    
    // Get unique symbols from the data
    const symbols = Array.from(new Set([
      ...data.optionsFlow.map(flow => flow.symbol),
      ...data.signals.map(signal => signal.ticker)
    ]));

    // Process each symbol through all agents
    for (const symbol of symbols) {
      const symbolData = {
        symbol,
        optionsFlow: data.optionsFlow.filter(flow => flow.symbol === symbol),
        marketData: data.marketData,
        news: data.news.filter(item => item.symbol === symbol),
        signals: data.signals.filter(signal => signal.ticker === symbol)
      };

      const consensus = await this.buildConsensus(symbolData);
      if (consensus) {
        decisions.push(consensus);
      }
    }

    return decisions;
  }

  private async buildConsensus(symbolData: any): Promise<ConsensusDecision | null> {
    const agentDecisions: AgentDecision[] = [];

    // Collect decisions from all agents
    for (const [agentId, agent] of Array.from(this.agents.entries())) {
      try {
        const decision = await agent.analyze(symbolData);
        if (decision) {
          agentDecisions.push({
            ...decision,
            agentId,
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error(`Agent ${agentId} analysis failed:`, error);
      }
    }

    if (agentDecisions.length === 0) return null;

    // Calculate weighted consensus
    const consensus = this.calculateWeightedConsensus(agentDecisions);
    
    // Risk management validation
    const riskAgent = this.agents.get('risk_management');
    const riskApproval = await riskAgent.validateConsensus(consensus, agentDecisions);

    // Determine if human approval is required
    const humanApprovalRequired = this.requiresHumanApproval(consensus, agentDecisions);

    const finalDecision: ConsensusDecision = {
      symbol: symbolData.symbol,
      finalAction: consensus.action,
      consensusScore: consensus.confidence,
      participatingAgents: agentDecisions,
      riskApproved: riskApproval.approved,
      humanApprovalRequired,
      executionRecommendation: riskApproval.execution
    };

    // Emit consensus event
    this.emit('consensus', finalDecision);

    return finalDecision;
  }

  private calculateWeightedConsensus(decisions: AgentDecision[]): {
    action: string;
    confidence: number;
  } {
    const actionScores = new Map<string, number>();
    let totalWeight = 0;

    // Calculate weighted scores for each action
    decisions.forEach(decision => {
      const weight = this.agentWeights.get(decision.agentId) || 0;
      const score = decision.confidence * weight;
      
      actionScores.set(
        decision.action,
        (actionScores.get(decision.action) || 0) + score
      );
      totalWeight += weight;
    });

    // Find the action with highest weighted score
    let bestAction = 'HOLD';
    let bestScore = 0;

    actionScores.forEach((score, action) => {
      const normalizedScore = score / totalWeight;
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore;
        bestAction = action;
      }
    });

    return {
      action: bestAction,
      confidence: bestScore
    };
  }

  private requiresHumanApproval(consensus: any, decisions: AgentDecision[]): boolean {
    // High-risk scenarios requiring human approval
    
    // Low consensus confidence
    if (consensus.confidence < 0.6) return true;
    
    // High risk scores from any agent
    const highRiskDecision = decisions.find(d => d.riskAssessment.riskScore > 7);
    if (highRiskDecision) return true;
    
    // Large position size
    const largePosition = decisions.find(d => d.riskAssessment.positionSize > 100000);
    if (largePosition) return true;
    
    // Conflicting agent opinions
    const uniqueActions = new Set(decisions.map(d => d.action));
    if (uniqueActions.size > 2) return true;

    return false;
  }

  private handleAgentDecision(agentId: string, decision: AgentDecision) {
    // Store decision for learning
    this.decisionHistory.push(decision);
    
    // Update performance metrics
    this.updateAgentPerformance(agentId, decision);
    
    // Emit decision event
    this.emit('agent_decision', { agentId, decision });
  }

  private updateAgentPerformance(agentId: string, decision: AgentDecision) {
    const metrics = this.performanceMetrics.get(agentId) || {
      totalDecisions: 0,
      averageConfidence: 0,
      successRate: 0,
      lastUpdated: new Date()
    };

    metrics.totalDecisions++;
    metrics.averageConfidence = (
      (metrics.averageConfidence * (metrics.totalDecisions - 1)) + decision.confidence
    ) / metrics.totalDecisions;
    metrics.lastUpdated = new Date();

    this.performanceMetrics.set(agentId, metrics);
  }

  public async updateAgentWeights(tradeOutcomes: any[]) {
    // Update agent weights based on trade performance
    const agentPerformance = new Map<string, { correct: number; total: number }>();

    tradeOutcomes.forEach(outcome => {
      if (outcome.agentDecisions) {
        outcome.agentDecisions.forEach((decision: AgentDecision) => {
          const perf = agentPerformance.get(decision.agentId) || { correct: 0, total: 0 };
          perf.total++;
          if (outcome.profitable) {
            perf.correct++;
          }
          agentPerformance.set(decision.agentId, perf);
        });
      }
    });

    // Adjust weights based on success rates
    let totalSuccessRate = 0;
    const successRates = new Map<string, number>();

    agentPerformance.forEach((perf, agentId) => {
      const successRate = perf.correct / perf.total;
      successRates.set(agentId, successRate);
      totalSuccessRate += successRate;
    });

    // Normalize and update weights
    successRates.forEach((rate, agentId) => {
      const newWeight = rate / totalSuccessRate;
      this.agentWeights.set(agentId, newWeight);
    });

    console.log('Updated agent weights:', Object.fromEntries(this.agentWeights));
  }

  public getAgentMetrics() {
    return {
      weights: Object.fromEntries(this.agentWeights),
      performance: Object.fromEntries(this.performanceMetrics),
      totalDecisions: this.decisionHistory.length
    };
  }
}