import { Router } from 'express';
import { UnusualWhalesService } from '../services/unusualWhales';
import openaiService from '../openai';

const router = Router();

interface ShortExpiryContract {
  id: string;
  ticker: string;
  strike: number;
  expiry: string;
  dte: number;
  type: 'call' | 'put';
  price: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  impliedVolatility: number;
  probability: number;
  recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  gexSentiment: 'bullish' | 'bearish' | 'neutral';
  flowSentiment: 'bullish' | 'bearish' | 'neutral';
  newsSentiment: 'bullish' | 'bearish' | 'neutral';
  reasoning: string;
  heat_score: number;
  underlying_price: number;
  moneyness: 'ITM' | 'ATM' | 'OTM';
}

interface TickerAnalysis {
  ticker: string;
  underlying_price: number;
  gex_exposure: number;
  flow_sentiment: 'bullish' | 'bearish' | 'neutral';
  news_sentiment: 'bullish' | 'bearish' | 'neutral';
  volume_surge: boolean;
  recommended_action: 'call' | 'put' | 'none';
  probability: number;
  reasoning: string;
  top_contracts: ShortExpiryContract[];
}

class ShortExpiryAnalyzer {
  private unusualWhales: UnusualWhalesService;

  constructor() {
    this.unusualWhales = new UnusualWhalesService();
  }

  async analyzeHotContracts(): Promise<ShortExpiryContract[]> {
    try {
      // Get market-wide options flow for short expiry contracts (0-5 DTE), excluding ETFs
      const flowData = await this.unusualWhales.getOptionsFlow({
        min_dte: 0,
        max_dte: 5,
        min_volume: 100,
        min_premium: 10000,
        issue_types: ['Common Stock', 'ADR'], // Only common stocks and ADRs
        limit: 100 // Get more data to filter for best non-ETF opportunities
      });

      const contracts: ShortExpiryContract[] = [];

      // Filter out ETFs and focus on individual stocks
      const etfList = [
        'SPY', 'QQQ', 'IWM', 'VIX', 'TLT', 'GLD', 'SLV', 'EEM', 'FXI', 
        'XLE', 'XLF', 'XLK', 'XLI', 'XLV', 'XLP', 'XLY', 'XLB', 'XLU', 
        'XLRE', 'XRT', 'DIA', 'ARKK', 'ARKQ', 'ARKG', 'ARKW', 'VTI', 
        'VOO', 'VEA', 'VWO', 'BND', 'VTEB', 'HYG', 'LQD', 'IEMG'
      ];
      
      const filteredFlowData = flowData.filter((flow: any) => {
        const ticker = flow.ticker || flow.symbol || flow.underlying_symbol;
        return ticker && !etfList.includes(ticker.toUpperCase());
      });

      for (const flow of filteredFlowData.slice(0, 50)) { // Analyze top 50 non-ETF stocks
        try {
          // Get current option chain data
          const optionData = await this.getOptionData(flow.ticker, flow.strike, flow.expiry, flow.option_type);
          if (!optionData) continue;

          // Get GEX data for sentiment
          const gexData = await this.unusualWhales.getGammaExposure(flow.ticker);
          const gexSentiment = this.analyzeGexSentiment(gexData, flow.strike, flow.option_type);

          // Analyze options flow sentiment
          const flowSentiment = this.analyzeFlowSentiment(flow);

          // Get news sentiment
          const newsSentiment = await this.getNewsSentiment(flow.ticker);

          // Calculate probability and recommendation
          const analysis = await this.calculateProbability(
            flow.ticker,
            optionData,
            gexSentiment,
            flowSentiment,
            newsSentiment
          );

          const contract: ShortExpiryContract = {
            id: `${flow.ticker}-${flow.strike}-${flow.expiry}-${flow.option_type}`,
            ticker: flow.ticker,
            strike: flow.strike,
            expiry: flow.expiry,
            dte: flow.dte,
            type: flow.option_type === 'C' ? 'call' : 'put',
            price: optionData.midpoint,
            bid: optionData.bid,
            ask: optionData.ask,
            volume: flow.volume,
            openInterest: optionData.openInterest,
            delta: optionData.delta,
            gamma: optionData.gamma,
            theta: optionData.theta,
            vega: optionData.vega,
            impliedVolatility: optionData.iv,
            probability: analysis.probability,
            recommendation: analysis.recommendation,
            gexSentiment,
            flowSentiment,
            newsSentiment,
            reasoning: analysis.reasoning,
            heat_score: this.calculateHeatScore(flow, optionData, gexSentiment, flowSentiment),
            underlying_price: flow.underlying_price,
            moneyness: this.getMoneyness(flow.underlying_price, flow.strike, flow.option_type)
          };

          contracts.push(contract);
        } catch (error) {
          console.error(`Error analyzing contract ${flow.ticker}:`, error);
        }
      }

      // Sort by heat score and probability
      return contracts
        .sort((a, b) => (b.heat_score * b.probability) - (a.heat_score * a.probability))
        .slice(0, 10);

    } catch (error) {
      console.error('Error analyzing hot contracts:', error);
      return [];
    }
  }

  async analyzeTicker(ticker: string, probabilityThreshold: number): Promise<TickerAnalysis> {
    try {
      // Get current stock price
      const stockData = await this.getStockData(ticker);
      
      // Get GEX exposure
      const gexData = await this.unusualWhales.getGammaExposure(ticker);
      const gexExposure = gexData.reduce((sum: number, level: any) => sum + level.net_gamma_exposure, 0);

      // Get options flow for this ticker
      const flowData = await this.unusualWhales.getOptionsFlow({
        ticker,
        min_dte: 0,
        max_dte: 5
      });

      // Analyze flow sentiment
      const flowSentiment = this.analyzeTickerFlowSentiment(flowData);

      // Get news sentiment
      const newsSentiment = await this.getNewsSentiment(ticker);

      // Check for volume surge
      const volumeSurge = await this.checkVolumeSurge(ticker);

      // AI-powered recommendation
      const aiAnalysis = await this.getAIRecommendation(
        ticker,
        stockData,
        gexExposure,
        flowSentiment,
        newsSentiment,
        volumeSurge
      );

      // Get top contracts for this ticker
      const topContracts = await this.getTopContractsForTicker(ticker, probabilityThreshold);

      return {
        ticker,
        underlying_price: stockData.price,
        gex_exposure: gexExposure,
        flow_sentiment: flowSentiment,
        news_sentiment: newsSentiment,
        volume_surge: volumeSurge,
        recommended_action: aiAnalysis.action,
        probability: aiAnalysis.probability,
        reasoning: aiAnalysis.reasoning,
        top_contracts: topContracts
      };

    } catch (error) {
      console.error(`Error analyzing ticker ${ticker}:`, error);
      return {
        ticker,
        underlying_price: 0,
        gex_exposure: 0,
        flow_sentiment: 'neutral',
        news_sentiment: 'neutral',
        volume_surge: false,
        recommended_action: 'none',
        probability: 0,
        reasoning: 'Analysis failed',
        top_contracts: []
      };
    }
  }

  private async getOptionData(ticker: string, strike: number, expiry: string, type: string) {
    // Get option chain data from Unusual Whales or TWS
    const optionChain = await this.unusualWhales.getOptionsChain(ticker, expiry);
    const contract = optionChain.find((opt: any) =>
      opt.strike === strike && opt.type === type
    );

    return contract ? {
      midpoint: (contract.bid + contract.ask) / 2,
      bid: contract.bid,
      ask: contract.ask,
      openInterest: contract.open_interest,
      delta: contract.delta,
      gamma: contract.gamma,
      theta: contract.theta,
      vega: contract.vega,
      iv: contract.implied_volatility
    } : null;
  }

  private async getStockData(ticker: string) {
    const data = await this.unusualWhales.getStockQuote(ticker);
    return {
      price: data.price,
      volume: data.volume,
      avgVolume: data.avgVolume
    };
  }

  private analyzeGexSentiment(gexData: any[], strike: number, optionType: string): 'bullish' | 'bearish' | 'neutral' {
    if (!gexData || gexData.length === 0) return 'neutral';

    const relevantLevel = gexData.find(level => Math.abs(level.strike - strike) < 5);
    if (!relevantLevel) return 'neutral';

    const netGamma = relevantLevel.net_gamma_exposure;
    
    if (optionType === 'C') {
      return netGamma > 1000000 ? 'bullish' : netGamma < -1000000 ? 'bearish' : 'neutral';
    } else {
      return netGamma < -1000000 ? 'bullish' : netGamma > 1000000 ? 'bearish' : 'neutral';
    }
  }

  private analyzeFlowSentiment(flow: any): 'bullish' | 'bearish' | 'neutral' {
    const askSidePercentage = flow.ask_side_percentage || 50;
    
    if (flow.option_type === 'C') {
      return askSidePercentage > 60 ? 'bullish' : askSidePercentage < 40 ? 'bearish' : 'neutral';
    } else {
      return askSidePercentage > 60 ? 'bearish' : askSidePercentage < 40 ? 'bullish' : 'neutral';
    }
  }

  private analyzeTickerFlowSentiment(flowData: any[]): 'bullish' | 'bearish' | 'neutral' {
    if (!flowData || flowData.length === 0) return 'neutral';

    let bullishScore = 0;
    let bearishScore = 0;

    flowData.forEach(flow => {
      const weight = flow.total_premium / 1000000; // Weight by premium size
      
      if (flow.option_type === 'C' && flow.ask_side_percentage > 60) {
        bullishScore += weight;
      } else if (flow.option_type === 'P' && flow.ask_side_percentage > 60) {
        bearishScore += weight;
      }
    });

    const diff = bullishScore - bearishScore;
    return Math.abs(diff) < 0.5 ? 'neutral' : diff > 0 ? 'bullish' : 'bearish';
  }

  private async getNewsSentiment(ticker: string): Promise<'bullish' | 'bearish' | 'neutral'> {
    try {
      // This would integrate with news service
      return 'neutral'; // Placeholder
    } catch (error) {
      return 'neutral';
    }
  }

  private async checkVolumeSurge(ticker: string): Promise<boolean> {
    try {
      const data = await this.getStockData(ticker);
      return data.volume > data.avgVolume * 1.5;
    } catch (error) {
      return false;
    }
  }

  private async getAIRecommendation(
    ticker: string,
    stockData: any,
    gexExposure: number,
    flowSentiment: string,
    newsSentiment: string,
    volumeSurge: boolean
  ) {
    try {
      const prompt = `Analyze ${ticker} for 0-5 DTE options trading:
- Current price: $${stockData.price}
- GEX exposure: ${gexExposure}
- Options flow sentiment: ${flowSentiment}
- News sentiment: ${newsSentiment}
- Volume surge: ${volumeSurge}

Recommend: call, put, or none. Include probability (0-100) and reasoning.
Response format: {"action": "call|put|none", "probability": 75, "reasoning": "explanation"}`;

      const response = await openaiService.analyzeOptionsStrategy(prompt);
      return JSON.parse(response);
    } catch (error) {
      return {
        action: 'none',
        probability: 50,
        reasoning: 'Insufficient data for recommendation'
      };
    }
  }

  private async calculateProbability(
    ticker: string,
    optionData: any,
    gexSentiment: string,
    flowSentiment: string,
    newsSentiment: string
  ) {
    try {
      const prompt = `Calculate probability of success for this options trade:
Ticker: ${ticker}
Option data: ${JSON.stringify(optionData)}
GEX sentiment: ${gexSentiment}
Flow sentiment: ${flowSentiment}
News sentiment: ${newsSentiment}

Provide probability (0-100) and recommendation (strong_buy, buy, neutral, sell, strong_sell).
Response format: {"probability": 75, "recommendation": "buy", "reasoning": "explanation"}`;

      const response = await openaiService.analyzeOptionsStrategy(prompt);
      return JSON.parse(response);
    } catch (error) {
      return {
        probability: 50,
        recommendation: 'neutral',
        reasoning: 'Analysis unavailable'
      };
    }
  }

  private calculateHeatScore(flow: any, optionData: any, gexSentiment: string, flowSentiment: string): number {
    let score = 0;

    // Volume factor
    score += Math.min(flow.volume / 1000, 10);
    
    // Premium factor
    score += Math.min(flow.total_premium / 100000, 10);
    
    // Sentiment alignment
    if (gexSentiment === flowSentiment && gexSentiment !== 'neutral') {
      score += 5;
    }
    
    // DTE factor (prefer very short term)
    score += (6 - flow.dte) * 2;
    
    // IV factor
    if (optionData.iv > 0.3) score += 3;
    
    return Math.min(score, 100);
  }

  private getMoneyness(underlyingPrice: number, strike: number, optionType: string): 'ITM' | 'ATM' | 'OTM' {
    const diff = Math.abs(underlyingPrice - strike);
    const pctDiff = diff / underlyingPrice;

    if (pctDiff < 0.02) return 'ATM';
    
    if (optionType === 'C') {
      return underlyingPrice > strike ? 'ITM' : 'OTM';
    } else {
      return underlyingPrice < strike ? 'ITM' : 'OTM';
    }
  }

  private async getTopContractsForTicker(ticker: string, threshold: number): Promise<ShortExpiryContract[]> {
    try {
      const flowData = await this.unusualWhales.getOptionsFlow({
        ticker,
        min_dte: 0,
        max_dte: 5,
        min_volume: 50
      });

      const contracts: ShortExpiryContract[] = [];

      for (const flow of flowData.slice(0, 10)) {
        const optionData = await this.getOptionData(flow.ticker, flow.strike, flow.expiry, flow.option_type);
        if (!optionData) continue;

        const gexData = await this.unusualWhales.getGammaExposure(flow.ticker);
        const gexSentiment = this.analyzeGexSentiment(gexData, flow.strike, flow.option_type);
        const flowSentiment = this.analyzeFlowSentiment(flow);
        const newsSentiment = await this.getNewsSentiment(flow.ticker);

        const analysis = await this.calculateProbability(
          flow.ticker,
          optionData,
          gexSentiment,
          flowSentiment,
          newsSentiment
        );

        if (analysis.probability >= threshold) {
          contracts.push({
            id: `${flow.ticker}-${flow.strike}-${flow.expiry}-${flow.option_type}`,
            ticker: flow.ticker,
            strike: flow.strike,
            expiry: flow.expiry,
            dte: flow.dte,
            type: flow.option_type === 'C' ? 'call' : 'put',
            price: optionData.midpoint,
            bid: optionData.bid,
            ask: optionData.ask,
            volume: flow.volume,
            openInterest: optionData.openInterest,
            delta: optionData.delta,
            gamma: optionData.gamma,
            theta: optionData.theta,
            vega: optionData.vega,
            impliedVolatility: optionData.iv,
            probability: analysis.probability,
            recommendation: analysis.recommendation,
            gexSentiment,
            flowSentiment,
            newsSentiment,
            reasoning: analysis.reasoning,
            heat_score: this.calculateHeatScore(flow, optionData, gexSentiment, flowSentiment),
            underlying_price: flow.underlying_price,
            moneyness: this.getMoneyness(flow.underlying_price, flow.strike, flow.option_type)
          });
        }
      }

      return contracts.sort((a, b) => b.probability - a.probability);
    } catch (error) {
      console.error('Error getting top contracts:', error);
      return [];
    }
  }
}

const analyzer = new ShortExpiryAnalyzer();

// Get top 10 hottest short expiry contracts
router.get('/hot-contracts', async (req, res) => {
  try {
    const contracts = await analyzer.analyzeHotContracts();
    res.json(contracts);
  } catch (error) {
    console.error('Error getting hot contracts:', error);
    res.status(500).json({ error: 'Failed to get hot contracts' });
  }
});

// Analyze specific ticker for short expiry opportunities
router.get('/analyze/:ticker/:threshold', async (req, res) => {
  try {
    const { ticker, threshold } = req.params;
    const analysis = await analyzer.analyzeTicker(ticker.toUpperCase(), parseInt(threshold));
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing ticker:', error);
    res.status(500).json({ error: 'Failed to analyze ticker' });
  }
});

export default router;