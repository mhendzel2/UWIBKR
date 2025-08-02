import { GoogleGenAI } from "@google/genai";

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "" 
});

export async function summarizeArticle(text: string): Promise<string> {
  const prompt = `Please summarize the following text concisely while maintaining key points:\n\n${text}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Something went wrong";
}

export interface Sentiment {
  rating: number;
  confidence: number;
}

export async function analyzeSentiment(text: string): Promise<Sentiment> {
  try {
    const systemPrompt = `You are a sentiment analysis expert. 
Analyze the sentiment of the text and provide a rating
from 1 to 5 stars and a confidence score between 0 and 1.
Respond with JSON in this format: 
{'rating': number, 'confidence': number}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            rating: { type: "number" },
            confidence: { type: "number" },
          },
          required: ["rating", "confidence"],
        },
      },
      contents: text,
    });

    const rawJson = response.text;

    if (rawJson) {
      const data: Sentiment = JSON.parse(rawJson);
      return data;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    throw new Error(`Failed to analyze sentiment: ${error}`);
  }
}

export interface TradingAnalysis {
  analysis_summary: string;
  strategy: string;
  confidence: number;
  entryPrice: number;
  targetPrice: number;
  maxRisk: number;
  reasoning: string;
  risk_factors: string;
}

export async function analyzeOptionsFlow(data: any): Promise<TradingAnalysis | null> {
  try {
    const systemPrompt = `You are an expert quantitative options analyst and portfolio manager. Your expertise lies in interpreting institutional options flow, market maker gamma exposure, and identifying defined-risk trading opportunities for sophisticated traders.

Analyze the provided real-time options flow and gamma exposure data to generate high-probability trade ideas. The primary objective is capital appreciation through moderately bullish or volatility-based plays, while strictly adhering to a defined-risk framework.

Your response MUST be a valid JSON object with this exact structure:
{
  "analysis_summary": "2-3 sentence market sentiment summary",
  "strategy": "Bull Call Spread|Bear Put Spread|Iron Condor|Long Calendar Spread",
  "confidence": number between 0-100,
  "entryPrice": number,
  "targetPrice": number,
  "maxRisk": number,
  "reasoning": "detailed reasoning linking specific data points to your conclusion",
  "risk_factors": "key risks and market considerations"
}`;

    const prompt = `
Options Flow Data:
- Ticker: ${data.flow?.ticker || 'Unknown'}
- Total Premium: $${data.flow?.total_premium || 0}
- Contract Size: ${data.flow?.total_size || 0}
- Open Interest: ${data.flow?.open_interest || 0}
- Ask Side %: ${data.flow?.ask_side_percentage || 0}%
- Strike: $${data.flow?.strike || 0}
- Days to Expiry: ${data.flow?.dte || 0}
- Alert Rule: ${data.flow?.alert_rule || 'None'}

Current Stock Price: $${data.stockState?.price || 0}
Current Volume: ${data.stockState?.volume || 0}

Market Context: ${JSON.stringify(data.marketContext || {})}

Analyze this data and provide a trading recommendation.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            analysis_summary: { type: "string" },
            strategy: { type: "string" },
            confidence: { type: "number" },
            entryPrice: { type: "number" },
            targetPrice: { type: "number" },
            maxRisk: { type: "number" },
            reasoning: { type: "string" },
            risk_factors: { type: "string" },
          },
          required: ["analysis_summary", "strategy", "confidence", "entryPrice", "targetPrice", "maxRisk", "reasoning", "risk_factors"],
        },
      },
      contents: prompt,
    });

    const rawJson = response.text;

    if (rawJson) {
      const analysis: TradingAnalysis = JSON.parse(rawJson);
      return analysis;
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error('Gemini analysis failed:', error);
    return null;
  }
}

export async function validateTradeIdea(idea: any): Promise<{ isValid: boolean; errors: string[] }> {
  try {
    const systemPrompt = `You are a risk management expert. Validate the given trade idea for logical consistency and mathematical accuracy.

Check for:
1. Strategy logic (e.g., bull call spread should have target > entry)
2. Reasonable price levels
3. Risk/reward ratios
4. Expiration date validity
5. Overall trade structure

Respond with JSON: {"isValid": boolean, "errors": string[]}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            isValid: { type: "boolean" },
            errors: { type: "array", items: { type: "string" } },
          },
          required: ["isValid", "errors"],
        },
      },
      contents: JSON.stringify(idea),
    });

    const rawJson = response.text;

    if (rawJson) {
      return JSON.parse(rawJson);
    } else {
      throw new Error("Empty response from model");
    }
  } catch (error) {
    console.error('Trade validation failed:', error);
    return { isValid: false, errors: ['Validation service unavailable'] };
  }
}
