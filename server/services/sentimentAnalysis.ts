import { ibkrService } from './ibkr';
import { UnusualWhalesService } from './unusualWhales';

export interface SentimentWeights {
  flow: number;
  news: number;
  analyst: number;
}

const DEFAULT_WEIGHTS: SentimentWeights = {
  flow: 0.5,
  news: 0.3,
  analyst: 0.2,
};

export interface TickerSentimentResult {
  ticker: string;
  ticker_sentiment: number;
  component_scores: {
    news_score: number;
    analyst_score: number;
    flow_score: number;
  };
  raw: {
    news: any[];
    analyst_ratings: any[];
    options_flow: any[];
    market_data: any;
  };
}

export class SentimentAnalysisService {
  private uw: UnusualWhalesService;

  constructor() {
    this.uw = new UnusualWhalesService();
  }

  async getTickerSentiment(ticker: string, weights: Partial<SentimentWeights> = {}): Promise<TickerSentimentResult> {
    const w = { ...DEFAULT_WEIGHTS, ...weights };

    const [news, analysts, flow] = await Promise.all([
      this.uw.getNewsSentiment(ticker),
      this.uw.getAnalystRatings(ticker),
      this.uw.getOptionsFlow(ticker),
    ]);

    let marketData: any = null;
    try {
      if (!ibkrService.isConnected()) {
        await ibkrService.connect();
      }
      marketData = await ibkrService.getMarketData(ticker);
    } catch (error) {
      console.error('Failed to fetch IBKR market data:', error);
    }

    const newsScore = this.calculateNewsScore(news);
    const analystScore = this.calculateAnalystScore(analysts);
    const flowScore = this.calculateFlowScore(flow);

    const totalWeight = w.flow + w.news + w.analyst;
    const sentiment =
      totalWeight === 0
        ? 0
        : (flowScore * w.flow + newsScore * w.news + analystScore * w.analyst) /
          totalWeight;

    return {
      ticker: ticker.toUpperCase(),
      ticker_sentiment: sentiment,
      component_scores: {
        news_score: newsScore,
        analyst_score: analystScore,
        flow_score: flowScore,
      },
      raw: {
        news,
        analyst_ratings: analysts,
        options_flow: flow,
        market_data: marketData,
      },
    };
  }

  async getMarketSentiment(weights: Partial<SentimentWeights> = {}): Promise<TickerSentimentResult> {
    return this.getTickerSentiment('SPY', weights);
  }

  async getMarketSentimentDirect(): Promise<{ market_sentiment: number; raw: any } | null> {
    try {
      const data = await this.uw.getMarketTide();
      if (!data) return null;
      const bullish = Number(data?.bullish_premium) || 0;
      const bearish = Number(data?.bearish_premium) || 0;
      const score = bullish + bearish === 0 ? 0 : (bullish - bearish) / (bullish + bearish);
      return { market_sentiment: score, raw: data };
    } catch (error) {
      console.error('Failed to fetch market tide data:', error);
      return null;
    }
  }

  async getSectorSentiment(sectorOrEtf: string, weights: Partial<SentimentWeights> = {}): Promise<TickerSentimentResult> {
    const etf = this.sectorEtfMap[sectorOrEtf.toLowerCase()] || sectorOrEtf;
    return this.getTickerSentiment(etf, weights);
  }

  async getSectorTideExpirySentiment(
    sectorOrEtf: string
  ): Promise<{
    gauge: number;
    trend: 'rising' | 'falling';
    expiry: { weekly: number; zero_dte: number };
    raw: { tide: any; expiry: any };
  }> {
    try {
      const key = sectorOrEtf.toLowerCase();
      const isSector = !!this.sectorEtfMap[key];
      const tide = isSector
        ? await this.uw.getSectorTide(key)
        : await this.uw.getEtfTide(sectorOrEtf);

      let gauge = 0;
      let trend: 'rising' | 'falling' = 'rising';

      if (tide && Array.isArray(tide.data) && tide.data.length >= 2) {
        const latest = tide.data[tide.data.length - 1];
        const prev = tide.data[tide.data.length - 2];
        const call = Number(latest?.net_call_premium ?? 0);
        const put = Math.abs(Number(latest?.net_put_premium ?? 0));
        gauge = call + put === 0 ? 0 : (call - put) / (call + put);
        const prevCall = Number(prev?.net_call_premium ?? 0);
        trend = call >= prevCall ? 'rising' : 'falling';
      }

      const expiryData = await this.uw.getNetFlowExpiry({
        tide_type: ['equity_only'],
        expiration: ['weekly', 'zero_dte'],
      });

      const expiry = { weekly: 0, zero_dte: 0 };
      if (expiryData && Array.isArray(expiryData.data)) {
        expiryData.data.forEach((item: any) => {
          const exp = (item.expiration || item.expiration_type || '').toLowerCase();
          const call = Number(item.net_call_premium ?? 0);
          const put = Math.abs(Number(item.net_put_premium ?? 0));
          const net = call - put;
          if (exp.includes('zero')) expiry.zero_dte += net;
          else if (exp.includes('week')) expiry.weekly += net;
        });
      }

      return { gauge, trend, expiry, raw: { tide, expiry: expiryData } };
    } catch (error) {
      console.error('Failed to combine sector tide and expiry data:', error);
      return {
        gauge: 0,
        trend: 'falling',
        expiry: { weekly: 0, zero_dte: 0 },
        raw: { tide: null, expiry: null },
      };
    }
  }

  private sectorEtfMap: Record<string, string> = {
    technology: 'XLK',
    financials: 'XLF',
    energy: 'XLE',
    healthcare: 'XLV',
    industrials: 'XLI',
    materials: 'XLB',
    utilities: 'XLU',
    realestate: 'XLRE',
    consumerdiscretionary: 'XLY',
    consumercyclicals: 'XLY',
    consumerstaples: 'XLP',
    communicationservices: 'XLC',
  };

  private calculateNewsScore(news: any[]): number {
    if (!news.length) return 0;
    let total = 0;
    news.forEach((article) => {
      const sentiment = (article.sentiment || article.label || '').toLowerCase();
      if (sentiment === 'bullish') total += 1;
      else if (sentiment === 'bearish') total -= 1;
    });
    return total / news.length;
  }

  private calculateAnalystScore(ratings: any[]): number {
    if (!ratings.length) return 0;
    let total = 0;
    ratings.forEach((r) => {
      const rating = (r.rating || r.recommendation || '').toLowerCase();
      if (['buy', 'overweight', 'strong buy'].includes(rating)) total += 1;
      else if (['sell', 'underweight', 'strong sell'].includes(rating)) total -= 1;
    });
    return total / ratings.length;
  }

  private calculateFlowScore(flows: any[]): number {
    if (!flows.length) return 0;
    let bullish = 0;
    let bearish = 0;
    flows.forEach((t) => {
      const premium = Number(t.premium || t.total_premium || 0);
      const sentiment = (t.sentiment || t.flag || '').toLowerCase();
      if (sentiment === 'bullish') bullish += premium;
      else if (sentiment === 'bearish') bearish += premium;
    });
    if (bullish + bearish === 0) return 0;
    return (bullish - bearish) / (bullish + bearish);
  }
}

export const sentimentAnalysisService = new SentimentAnalysisService();
