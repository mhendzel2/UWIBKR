import { BaseAgent, AgentDecision, MarketAnalysisData } from './BaseAgent';

export class SentimentAnalysisAgent extends BaseAgent {
  constructor() {
    super('sentiment_analysis', 'News & Market Sentiment Analysis');
  }

  async analyze(data: MarketAnalysisData): Promise<AgentDecision | null> {
    try {
      const { symbol, news, signals, optionsFlow } = data;

      // Analyze news sentiment
      const newsAnalysis = this.analyzeNewsData(news);
      
      // Analyze market sentiment from options flow
      const flowSentiment = this.analyzeFlowSentiment(optionsFlow);
      
      // Analyze signal sentiment patterns
      const signalSentiment = this.analyzeSignalSentiment(signals);

      // Combine all sentiment sources
      const overallSentiment = this.combinesentimentSources(
        newsAnalysis,
        flowSentiment,
        signalSentiment
      );

      if (overallSentiment.confidence < 0.4) {
        return null; // Not enough sentiment signal
      }

      const action = this.determineSentimentAction(overallSentiment);
      const riskScore = this.calculateSentimentRisk(overallSentiment);

      return {
        symbol,
        action,
        confidence: overallSentiment.confidence,
        reasoning: `Market sentiment is ${overallSentiment.direction} (${overallSentiment.score.toFixed(2)}). News sentiment: ${newsAnalysis.sentiment}, Flow sentiment: ${flowSentiment.sentiment}, Signal pattern: ${signalSentiment.pattern}`,
        supportingData: {
          newsSentiment: newsAnalysis,
          flowSentiment: flowSentiment,
          signalSentiment: signalSentiment,
          overallMetrics: {
            sentimentScore: overallSentiment.score,
            volatilityIndicator: overallSentiment.volatility,
            confidenceLevel: overallSentiment.confidence
          }
        },
        riskAssessment: {
          riskScore,
          positionSize: this.calculatePositionSize(overallSentiment.confidence, riskScore),
          maxLoss: Math.floor(overallSentiment.volatility * 5000), // Volatility-based max loss
          probabilityOfSuccess: overallSentiment.confidence * 0.7
        }
      };

    } catch (error) {
      console.error('Sentiment Analysis Agent analysis failed:', error);
      return null;
    }
  }

  private analyzeNewsData(news: any[]) {
    if (!news || news.length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        articleCount: 0,
        keyThemes: []
      };
    }

    let totalSentiment = 0;
    let sentimentCount = 0;
    const themes = new Map<string, number>();

    news.forEach(article => {
      // Analyze sentiment based on keywords and sentiment score
      const sentimentScore = this.extractSentimentScore(article);
      if (sentimentScore !== null) {
        totalSentiment += sentimentScore;
        sentimentCount++;
      }

      // Extract key themes
      const articleThemes = this.extractThemes(article);
      articleThemes.forEach(theme => {
        themes.set(theme, (themes.get(theme) || 0) + 1);
      });
    });

    const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;
    const sentiment = avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral';
    const confidence = Math.min(0.9, sentimentCount / 10); // More articles = higher confidence

    return {
      sentiment,
      score: avgSentiment,
      confidence,
      articleCount: news.length,
      keyThemes: Array.from(themes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([theme]) => theme)
    };
  }

  private analyzeFlowSentiment(flows: any[]) {
    if (!flows || flows.length === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        bullishFlow: 0,
        bearishFlow: 0
      };
    }

    let bullishFlow = 0;
    let bearishFlow = 0;
    let neutralFlow = 0;
    let totalPremium = 0;

    flows.forEach(flow => {
      const premium = parseFloat(flow.premium) || 0;
      totalPremium += premium;

      if (flow.sentiment === 'bullish') {
        bullishFlow += premium;
      } else if (flow.sentiment === 'bearish') {
        bearishFlow += premium;
      } else {
        neutralFlow += premium;
      }
    });

    const totalFlow = bullishFlow + bearishFlow + neutralFlow;
    if (totalFlow === 0) {
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0,
        bullishFlow: 0,
        bearishFlow: 0
      };
    }

    const bullishRatio = bullishFlow / totalFlow;
    const bearishRatio = bearishFlow / totalFlow;
    const score = bullishRatio - bearishRatio; // -1 to 1 scale

    let sentiment = 'neutral';
    if (score > 0.2) sentiment = 'bullish';
    else if (score < -0.2) sentiment = 'bearish';

    const confidence = Math.min(0.9, Math.abs(score) + (flows.length / 20));

    return {
      sentiment,
      score,
      confidence,
      bullishFlow: bullishFlow / 1000, // Convert to thousands
      bearishFlow: bearishFlow / 1000
    };
  }

  private analyzeSignalSentiment(signals: any[]) {
    if (!signals || signals.length === 0) {
      return {
        pattern: 'no_pattern',
        momentum: 0,
        confidence: 0,
        recentTrend: 'neutral'
      };
    }

    // Analyze recent signal patterns (last 10)
    const recentSignals = signals.slice(-10);
    let bullishSignals = 0;
    let bearishSignals = 0;
    let totalConfidence = 0;

    recentSignals.forEach(signal => {
      const confidence = parseFloat(signal.confidence) || 50;
      totalConfidence += confidence;

      if (signal.sentiment === 'bullish') {
        bullishSignals++;
      } else if (signal.sentiment === 'bearish') {
        bearishSignals++;
      }
    });

    const avgConfidence = totalConfidence / recentSignals.length;
    const momentum = (bullishSignals - bearishSignals) / recentSignals.length;

    // Identify patterns
    let pattern = 'consolidation';
    if (momentum > 0.4) pattern = 'bullish_momentum';
    else if (momentum < -0.4) pattern = 'bearish_momentum';
    else if (Math.abs(momentum) < 0.1) pattern = 'sideways';

    const recentTrend = momentum > 0.1 ? 'bullish' : momentum < -0.1 ? 'bearish' : 'neutral';
    const confidence = Math.min(0.9, (avgConfidence / 100) + (recentSignals.length / 20));

    return {
      pattern,
      momentum,
      confidence,
      recentTrend
    };
  }

  private combinesentimentSources(newsAnalysis: any, flowSentiment: any, signalSentiment: any) {
    // Weight the different sentiment sources
    const newsWeight = 0.3;
    const flowWeight = 0.4;
    const signalWeight = 0.3;

    // Convert sentiment to numerical scores
    const newsScore = this.sentimentToScore(newsAnalysis.sentiment) * newsAnalysis.confidence;
    const flowScore = flowSentiment.score * flowSentiment.confidence;
    const signalScore = this.sentimentToScore(signalSentiment.recentTrend) * signalSentiment.confidence;

    // Calculate weighted average
    const totalWeight = newsWeight + flowWeight + signalWeight;
    const combinedScore = (
      newsScore * newsWeight +
      flowScore * flowWeight +
      signalScore * signalWeight
    ) / totalWeight;

    // Determine overall direction
    let direction = 'neutral';
    if (combinedScore > 0.15) direction = 'bullish';
    else if (combinedScore < -0.15) direction = 'bearish';

    // Calculate combined confidence
    const combinedConfidence = (
      newsAnalysis.confidence * newsWeight +
      flowSentiment.confidence * flowWeight +
      signalSentiment.confidence * signalWeight
    ) / totalWeight;

    // Estimate volatility based on sentiment divergence
    const sentimentDivergence = Math.abs(newsScore - flowScore) + Math.abs(flowScore - signalScore);
    const volatility = Math.min(10, 5 + sentimentDivergence * 2);

    return {
      direction,
      score: combinedScore,
      confidence: combinedConfidence,
      volatility,
      sources: {
        news: { score: newsScore, weight: newsWeight },
        flow: { score: flowScore, weight: flowWeight },
        signals: { score: signalScore, weight: signalWeight }
      }
    };
  }

  private determineSentimentAction(sentiment: any): string {
    const { direction, confidence, score } = sentiment;

    // High confidence sentiment-based actions
    if (confidence > 0.7) {
      if (direction === 'bullish' && score > 0.3) {
        return 'BUY_CALLS';
      } else if (direction === 'bearish' && score < -0.3) {
        return 'BUY_PUTS';
      }
    }

    // Moderate confidence actions
    if (confidence > 0.5) {
      if (direction === 'bullish' && score > 0.2) {
        return 'BUY_CALLS';
      } else if (direction === 'bearish' && score < -0.2) {
        return 'BUY_PUTS';
      }
    }

    return 'HOLD';
  }

  private calculateSentimentRisk(sentiment: any): number {
    const baseRisk = 5;
    
    // Higher volatility = higher risk
    const volatilityRisk = sentiment.volatility * 0.3;
    
    // Lower confidence = higher risk
    const confidenceRisk = (1 - sentiment.confidence) * 2;
    
    // Extreme sentiment = higher risk (contrarian indicator)
    const extremeRisk = Math.abs(sentiment.score) > 0.7 ? 1.5 : 0;

    return Math.min(10, Math.max(1, baseRisk + volatilityRisk + confidenceRisk + extremeRisk));
  }

  private extractSentimentScore(article: any): number | null {
    // Extract sentiment from article properties
    if (article.sentiment) {
      if (typeof article.sentiment === 'number') {
        return Math.max(-1, Math.min(1, article.sentiment));
      } else if (typeof article.sentiment === 'string') {
        const sentiment = article.sentiment.toLowerCase();
        if (sentiment.includes('positive') || sentiment.includes('bullish')) return 0.6;
        if (sentiment.includes('negative') || sentiment.includes('bearish')) return -0.6;
        if (sentiment.includes('very positive')) return 0.8;
        if (sentiment.includes('very negative')) return -0.8;
      }
    }

    // Fallback: analyze title/content for sentiment keywords
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    let score = 0;

    // Positive keywords
    const positiveWords = ['buy', 'bull', 'gain', 'rise', 'up', 'strong', 'beat', 'exceed', 'growth'];
    const negativeWords = ['sell', 'bear', 'loss', 'fall', 'down', 'weak', 'miss', 'decline', 'drop'];

    positiveWords.forEach(word => {
      if (text.includes(word)) score += 0.1;
    });

    negativeWords.forEach(word => {
      if (text.includes(word)) score -= 0.1;
    });

    return Math.max(-1, Math.min(1, score));
  }

  private extractThemes(article: any): string[] {
    const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
    const themes: string[] = [];

    // Financial themes
    const themeKeywords = {
      'earnings': ['earnings', 'eps', 'revenue', 'profit'],
      'guidance': ['guidance', 'outlook', 'forecast', 'expects'],
      'merger': ['merger', 'acquisition', 'deal', 'buyout'],
      'dividend': ['dividend', 'payout', 'yield'],
      'regulation': ['regulation', 'regulatory', 'sec', 'compliance'],
      'product': ['product', 'launch', 'release', 'innovation'],
      'management': ['ceo', 'cfo', 'management', 'leadership']
    };

    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        themes.push(theme);
      }
    });

    return themes;
  }

  private sentimentToScore(sentiment: string): number {
    switch (sentiment.toLowerCase()) {
      case 'bullish': case 'positive': return 0.7;
      case 'bearish': case 'negative': return -0.7;
      case 'very positive': return 0.9;
      case 'very negative': return -0.9;
      case 'neutral': default: return 0;
    }
  }
}