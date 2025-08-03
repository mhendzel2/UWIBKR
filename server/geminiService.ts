import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Simple in-memory rate limiter to respect API data limits
const callHistory: number[] = [];
const MAX_CALLS_PER_MINUTE = 60;
async function requestJSON(prompt: string, model: string = "gemini-2.0-flash") {
  const now = Date.now();
  callHistory.push(now);
  while (callHistory.length && now - callHistory[0] > 60_000) {
    callHistory.shift();
  }
  if (callHistory.length > MAX_CALLS_PER_MINUTE) {
    throw new Error("Gemini rate limit exceeded");
  }
  const result = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { responseMimeType: "application/json" },
  });
  return result.text || "{}";
}

export interface TradingSignal {
  ticker: string;
  action: 'buy' | 'sell';
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  confidence: number;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  targetPrice: number;
  stopLoss: number;
  expectedReturn: number;
}

export interface MarketAnalysis {
  sentiment: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  keyFactors: string[];
  riskFactors: string[];
  volatilityOutlook: 'low' | 'medium' | 'high';
  marketRegime: 'trending' | 'ranging' | 'volatile';
}

export async function generateTradingSignals(flowData: any[]): Promise<TradingSignal[]> {
  try {
    const prompt = `You are an expert options trader analyzing unusual options flow data.

    Analyze the following options flow data and generate trading signals:
    ${JSON.stringify(flowData.slice(0, 10), null, 2)}

    Focus on:
    1. Large premium flows ($500K+)
    2. Unusual volume relative to open interest
    3. Directional bias from ask/bid side percentages
    4. Time to expiration considerations
    5. Strike price positioning relative to current price

    Generate up to 5 high-conviction trading signals. For each signal, provide:
    - ticker, action (buy/sell), type (call/put), strike, expiry
    - confidence (0-100), reasoning, riskLevel, targetPrice, stopLoss, expectedReturn

    Respond with JSON in this format:
    {
      "signals": [
        {
          "ticker": "AAPL",
          "action": "buy",
          "type": "call",
          "strike": 180,
          "expiry": "2024-03-15",
          "confidence": 85,
          "reasoning": "Large institutional call buying with high ask-side percentage",
          "riskLevel": "medium",
          "targetPrice": 185,
          "stopLoss": 175,
          "expectedReturn": 25.5
        }
      ]
    }`;

    const text = await requestJSON(prompt);
    const result = JSON.parse(text);
    return result.signals || [];
  } catch (error) {
    console.error('Failed to generate trading signals:', error);
    throw error;
  }
}

export async function analyzeMarketSentiment(newsData: any[], flowData: any[]): Promise<MarketAnalysis> {
  try {
    const prompt = `Analyze current market sentiment using the following data:

    Recent News Headlines:
    ${newsData.slice(0, 5).map(n => `- ${n.title || n.headline}`).join('\n')}

    Options Flow Summary:
    - Total flows analyzed: ${flowData.length}
    - Call/Put ratio: ${flowData.filter(f => f.type === 'call').length}/${flowData.filter(f => f.type === 'put').length}
    - Average premium: $${(flowData.reduce((sum, f) => sum + (f.premium || 0), 0) / flowData.length).toFixed(0)}

    Provide a comprehensive market analysis including:
    - Overall sentiment (bullish/bearish/neutral)
    - Confidence level (0-100)
    - Key factors driving sentiment
    - Risk factors to monitor
    - Volatility outlook
    - Market regime

    Respond with JSON in this format:
    {
      "sentiment": "bullish",
      "confidence": 75,
      "keyFactors": ["Factor1"],
      "riskFactors": ["Risk1"],
      "volatilityOutlook": "medium",
      "marketRegime": "trending"
    }`;

    const text = await requestJSON(prompt);
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to analyze market sentiment:', error);
    throw error;
  }
}

export async function analyzeTradeOpportunity(trade: any): Promise<{
  riskScore: number;
  opportunityScore: number;
  analysis: string;
  recommendations: string[];
}> {
  try {
    const prompt = `Analyze this specific trade opportunity:

    Trade Details:
    - Symbol: ${trade.ticker}
    - Type: ${trade.type}
    - Strike: $${trade.strike}
    - Expiry: ${trade.expiry}
    - Premium: $${trade.premium}
    - Volume: ${trade.volume}
    - Open Interest: ${trade.openInterest}
    - Ask Side %: ${trade.askSidePercentage}%

    Provide a detailed analysis including:
    - Risk score (0-100, where 100 is highest risk)
    - Opportunity score (0-100, where 100 is best opportunity)
    - Detailed analysis of the trade setup
    - Specific recommendations for execution

    Respond with JSON in this format:
    {
      "riskScore": 35,
      "opportunityScore": 78,
      "analysis": "Detailed analysis text...",
      "recommendations": ["Recommendation 1", "Recommendation 2"]
    }`;

    const text = await requestJSON(prompt);
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to analyze trade opportunity:', error);
    throw error;
  }
}

export async function generatePortfolioInsights(portfolioData: any): Promise<{
  summary: string;
  recommendations: string[];
  riskAssessment: string;
  performanceHighlights: string[];
}> {
  try {
    const prompt = `Analyze this trading portfolio performance:

    Portfolio Metrics:
    - Total P&L: $${portfolioData.totalPnl || 0}
    - Win Rate: ${portfolioData.winRate || 0}%
    - Number of Trades: ${portfolioData.totalTrades || 0}
    - Average Return: ${portfolioData.avgReturn || 0}%
    - Max Drawdown: ${portfolioData.maxDrawdown || 0}%
    - Sharpe Ratio: ${portfolioData.sharpeRatio || 0}

    Recent Trades: ${portfolioData.recentTrades || 0} in last 7 days
    Active Positions: ${portfolioData.activePositions || 0}

    Provide insights including:
    - Overall performance summary
    - Specific recommendations for improvement
    - Risk assessment and warnings
    - Performance highlights to celebrate

    Respond with JSON in this format:
    {
      "summary": "Portfolio summary text...",
      "recommendations": ["Recommendation 1", "Recommendation 2"],
      "riskAssessment": "Risk assessment text...",
      "performanceHighlights": ["Highlight 1", "Highlight 2"]
    }`;

    const text = await requestJSON(prompt);
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to generate portfolio insights:', error);
    throw error;
  }
}

export async function analyzeOptionsStrategy(prompt: string): Promise<string> {
  return requestJSON(prompt);
}

export async function createCompletion(prompt: string, options?: { model?: string }): Promise<string> {
  return requestJSON(prompt, options?.model);
}

export default {
  generateTradingSignals,
  analyzeMarketSentiment,
  analyzeTradeOpportunity,
  generatePortfolioInsights,
  analyzeOptionsStrategy,
  createCompletion,
};
