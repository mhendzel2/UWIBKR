import { BaseAgent, AgentDecision, MarketAnalysisData } from './BaseAgent';

export class MarketIntelligenceAgent extends BaseAgent {
  constructor() {
    super('market_intelligence', 'Options Flow & Market Data Analysis');
  }

  async analyze(data: MarketAnalysisData): Promise<AgentDecision | null> {
    try {
      const { symbol, optionsFlow, signals } = data;

      if (!optionsFlow.length && !signals.length) {
        return null;
      }

      // Analyze options flow patterns
      const flowAnalysis = this.analyzeOptionsFlow(optionsFlow);
      
      // Analyze existing signals
      const signalAnalysis = this.analyzeSignals(signals);
      
      // Combine analysis
      const combinedConfidence = this.calculateConfidence([
        flowAnalysis.confidence,
        signalAnalysis.confidence
      ]);

      // Determine action based on flow direction and signal strength
      const action = this.determineAction(flowAnalysis, signalAnalysis);

      const riskScore = this.calculateRiskScore(
        flowAnalysis.volatility,
        flowAnalysis.premiumSize,
        signalAnalysis.marketStrength
      );

      return {
        symbol,
        action,
        confidence: combinedConfidence,
        reasoning: `Options flow shows ${flowAnalysis.direction} bias with ${flowAnalysis.premiumSize.toFixed(0)}K premium. ${signalAnalysis.count} signals detected with ${signalAnalysis.sentiment} sentiment.`,
        supportingData: {
          optionsFlow: flowAnalysis,
          signals: signalAnalysis,
          marketMetrics: {
            volumeRatio: flowAnalysis.volumeRatio,
            premiumCommitment: flowAnalysis.premiumSize,
            signalStrength: signalAnalysis.confidence
          }
        },
        riskAssessment: {
          riskScore,
          positionSize: this.calculatePositionSize(combinedConfidence, riskScore),
          maxLoss: Math.floor(flowAnalysis.premiumSize * 0.5), // 50% max loss
          probabilityOfSuccess: combinedConfidence * 0.8 // Conservative estimate
        }
      };

    } catch (error) {
      console.error('Market Intelligence Agent analysis failed:', error);
      return null;
    }
  }

  private analyzeOptionsFlow(flows: any[]) {
    if (!flows.length) {
      return {
        direction: 'neutral',
        confidence: 0,
        volumeRatio: 1,
        premiumSize: 0,
        volatility: 5
      };
    }

    // Aggregate flow data
    let totalPremium = 0;
    let callVolume = 0;
    let putVolume = 0;
    let bullishFlow = 0;
    let bearishFlow = 0;

    flows.forEach(flow => {
      const premium = parseFloat(flow.premium) || 0;
      const volume = flow.volume || 0;
      
      totalPremium += premium;
      
      if (flow.type === 'CALL') {
        callVolume += volume;
        if (flow.sentiment === 'bullish') bullishFlow += premium;
      } else if (flow.type === 'PUT') {
        putVolume += volume;
        if (flow.sentiment === 'bearish') bearishFlow += premium;
      }
    });

    const totalVolume = callVolume + putVolume;
    const volumeRatio = totalVolume > 0 ? callVolume / totalVolume : 0.5;
    const premiumSize = totalPremium / 1000; // Convert to thousands

    // Determine flow direction
    let direction = 'neutral';
    let confidence = 0.5;

    if (volumeRatio > 0.65) {
      direction = 'bullish';
      confidence = Math.min(0.9, 0.5 + (volumeRatio - 0.5));
    } else if (volumeRatio < 0.35) {
      direction = 'bearish';
      confidence = Math.min(0.9, 0.5 + (0.5 - volumeRatio));
    }

    // Adjust confidence based on premium size
    if (premiumSize > 500) {
      confidence = Math.min(0.95, confidence * 1.2);
    }

    return {
      direction,
      confidence,
      volumeRatio,
      premiumSize,
      volatility: this.estimateVolatility(flows)
    };
  }

  private analyzeSignals(signals: any[]) {
    if (!signals.length) {
      return {
        count: 0,
        confidence: 0,
        sentiment: 'neutral',
        marketStrength: 5
      };
    }

    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalConfidence = 0;

    signals.forEach(signal => {
      const confidence = parseFloat(signal.confidence) || 0;
      totalConfidence += confidence;

      if (signal.sentiment === 'bullish') {
        bullishSignals++;
      } else if (signal.sentiment === 'bearish') {
        bearishSignals++;
      }
    });

    const avgConfidence = totalConfidence / signals.length;
    const totalSignals = bullishSignals + bearishSignals;
    
    let sentiment = 'neutral';
    if (bullishSignals > bearishSignals * 1.5) {
      sentiment = 'bullish';
    } else if (bearishSignals > bullishSignals * 1.5) {
      sentiment = 'bearish';
    }

    return {
      count: signals.length,
      confidence: avgConfidence / 100, // Convert percentage to decimal
      sentiment,
      marketStrength: Math.min(10, Math.max(1, totalSignals))
    };
  }

  private determineAction(flowAnalysis: any, signalAnalysis: any): string {
    const flowDirection = flowAnalysis.direction;
    const signalSentiment = signalAnalysis.sentiment;
    const flowConfidence = flowAnalysis.confidence;
    const signalConfidence = signalAnalysis.confidence;

    // Strong agreement between flow and signals
    if (flowDirection === 'bullish' && signalSentiment === 'bullish') {
      return flowConfidence > 0.7 ? 'BUY_CALLS' : 'HOLD';
    }
    
    if (flowDirection === 'bearish' && signalSentiment === 'bearish') {
      return flowConfidence > 0.7 ? 'BUY_PUTS' : 'HOLD';
    }

    // Flow dominant (high premium commitment)
    if (flowAnalysis.premiumSize > 500) {
      if (flowDirection === 'bullish') return 'BUY_CALLS';
      if (flowDirection === 'bearish') return 'BUY_PUTS';
    }

    // Signal dominant (high confidence, multiple signals)
    if (signalAnalysis.count > 3 && signalConfidence > 0.8) {
      if (signalSentiment === 'bullish') return 'BUY_CALLS';
      if (signalSentiment === 'bearish') return 'BUY_PUTS';
    }

    return 'HOLD';
  }

  private estimateVolatility(flows: any[]): number {
    // Simple volatility estimation based on flow characteristics
    let volatilityScore = 5; // Base volatility

    // Large premium flows indicate higher volatility
    const avgPremium = flows.reduce((sum, flow) => 
      sum + (parseFloat(flow.premium) || 0), 0) / flows.length;
    
    if (avgPremium > 100000) volatilityScore += 2;
    if (avgPremium > 500000) volatilityScore += 2;

    // High volume indicates volatility
    const avgVolume = flows.reduce((sum, flow) => 
      sum + (flow.volume || 0), 0) / flows.length;
    
    if (avgVolume > 1000) volatilityScore += 1;

    return Math.min(10, volatilityScore);
  }
}