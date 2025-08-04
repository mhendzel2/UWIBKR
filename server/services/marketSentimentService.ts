// @ts-nocheck
import { UnusualWhalesService } from './unusualWhales';
import { gexTracker } from './gexTracker';
import geminiService from '../geminiService';

export interface MarketSentimentData {
  timestamp: Date;
  fearGreedIndex: number;
  vixLevel: number;
  crypto: {
    btc: {
      price: number;
      change24h: number;
      sentiment: 'bullish' | 'bearish' | 'neutral';
      gexSentiment?: 'bullish' | 'bearish' | 'neutral';
    };
    totalMarketCap: number;
    dominance: number;
  };
  commodities: {
    gold: {
      price: number;
      change24h: number;
      sentiment: 'bullish' | 'bearish' | 'neutral';
      gexSentiment?: 'bullish' | 'bearish' | 'neutral';
    };
    oil: {
      price: number;
      change24h: number;
      sentiment: 'bullish' | 'bearish' | 'neutral';
    };
  };
  trumpCommunications: {
    recentPosts: TrumpPost[];
    marketImpactScore: number;
    alertLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  overallSentiment: {
    score: number; // -100 to 100
    confidence: number; // 0 to 1
    primaryDrivers: string[];
    recommendation: 'risk-on' | 'risk-off' | 'neutral';
  };
  optionsFlow: OptionsFlowMetrics;
  macroEvents: {
    economic: any;
    fda: any;
    newsHeadlines: any;
  };
}

interface OptionsFlowMetrics {
  netFlowExpiry: any;
  marketTide: any;
  sectorTide: any;
  etfTide: any;
  oiChange: any;
  totalOptionsVolume: any;
  spike: any;
  sectorGreekFlow: Record<string, any>;
  callPutRatio?: number | null;
  correlations?: any;
}

export interface TrumpPost {
  id: string;
  content: string;
  timestamp: Date;
  platform: string;
  marketImpact: number; // 0 to 10
  affectedSectors: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

class MarketSentimentService {
  private cache: MarketSentimentData | null = null;
  private lastUpdate: Date | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getMarketSentiment(): Promise<MarketSentimentData> {
    if (this.cache && this.lastUpdate && 
        Date.now() - this.lastUpdate.getTime() < this.CACHE_DURATION) {
      return this.cache;
    }

    try {
      const watchlist = gexTracker.getWatchlist().filter(w => w.enabled).map(w => w.symbol);
      const [fearGreed, crypto, commodities, trump, optionsFlow, macroEvents] = await Promise.all([
        this.getFearGreedIndex(),
        this.getCryptoSentiment(),
        this.getCommoditiesSentiment(),
        this.getTrumpCommunications(),
        this.getOptionsFlowMetrics(watchlist),
        this.getMacroEvents(watchlist)
      ]);

      const vixLevel = await this.getVIXLevel();
      const overallSentiment = await this.calculateOverallSentiment({
        fearGreed,
        crypto,
        commodities,
        trump,
        vixLevel
      });

      this.cache = {
        timestamp: new Date(),
        fearGreedIndex: fearGreed,
        vixLevel,
        crypto,
        commodities,
        trumpCommunications: trump,
        overallSentiment,
        optionsFlow,
        macroEvents
      };

      this.lastUpdate = new Date();
      return this.cache!;
    } catch (error) {
      console.error('Error fetching market sentiment:', error);
      throw error;
    }
  }

  private async getFearGreedIndex(): Promise<number> {
    try {
      // Using alternative.me Fear & Greed Index API
      const response = await fetch('https://api.alternative.me/fng/');
      const data = await response.json();
      return parseInt(data.data[0].value);
    } catch (error) {
      console.error('Error fetching Fear & Greed Index:', error);
      return 50; // Neutral fallback
    }
  }

  private async getVIXLevel(): Promise<number> {
    try {
      // Try to get VIX data from TWS/Unusual Whales first
      const unusualWhales = new UnusualWhalesService();
      const vixResponse = await unusualWhales.makeRequest('/market-data/indices/VIX');
      
      if (vixResponse && vixResponse.price) {
        return vixResponse.price;
      }
      
      // Fallback to Yahoo Finance API if available
      // For now, return a reasonable default
      return 18.5;
    } catch (error) {
      console.error('Error fetching VIX:', error);
      return 20; // Neutral fallback
    }
  }

  private async getCryptoSentiment() {
    try {
      // Get BTC data from TWS first, fallback to CoinGecko
      let btcPrice = 0;
      let btcChange = 0;
      
      try {
        const unusualWhales = new UnusualWhalesService();
        
        // Get BTC price from Unusual Whales or use TWS
        const btcResponse = await unusualWhales.makeRequest('/market-data/crypto/btc');
        
        if (btcResponse && btcResponse.price) {
          btcPrice = btcResponse.price;
          btcChange = btcResponse.change_24h || 0;
        }
      } catch (twsError) {
        console.log('TWS crypto data not available, using CoinGecko');
      }
      
      // Fallback to CoinGecko if TWS/UW data not available
      if (btcPrice === 0) {
        const btcResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true');
        const btcData = await btcResponse.json();
        btcPrice = btcData.bitcoin.usd;
        btcChange = btcData.bitcoin.usd_24h_change;
      }
      
      const globalResponse = await fetch('https://api.coingecko.com/api/v3/global');
      const globalData = await globalResponse.json();

      // Get BTC GEX data from Unusual Whales for enhanced sentiment
      let gexSentiment = 'neutral';
      try {
        const unusualWhales = new UnusualWhalesService();
        const gexResponse = await unusualWhales.makeRequest('/gamma-exposure/crypto/btc');
        
        if (gexResponse && gexResponse.net_gamma) {
          // Positive gamma exposure typically indicates bullish sentiment
          const netGamma = gexResponse.net_gamma;
          if (netGamma > 50000000) gexSentiment = 'bullish';
          else if (netGamma < -50000000) gexSentiment = 'bearish';
        }
      } catch (gexError) {
        console.log('BTC GEX data not available from Unusual Whales');
      }

      // Combine price action and GEX sentiment
      const priceSentiment = btcChange > 2 ? 'bullish' : btcChange < -2 ? 'bearish' : 'neutral';
      const combinedSentiment = gexSentiment !== 'neutral' ? gexSentiment : priceSentiment;

      return {
        btc: {
          price: btcPrice,
          change24h: btcChange,
          sentiment: combinedSentiment as const,
          gexSentiment: gexSentiment as 'bullish' | 'bearish' | 'neutral'
        },
        totalMarketCap: globalData.data.total_market_cap.usd,
        dominance: globalData.data.market_cap_percentage.btc
      };
    } catch (error) {
      console.error('Error fetching crypto sentiment:', error);
      // Return neutral data on error
      return {
        btc: { 
          price: 0, 
          change24h: 0, 
          sentiment: 'neutral' as const,
          gexSentiment: 'neutral' as const
        },
        totalMarketCap: 0,
        dominance: 0
      };
    }
  }

  private async getCommoditiesSentiment() {
    try {
      let goldPrice = 0;
      let goldChange = 0;
      let goldGexSentiment = 'neutral';
      
      let oilPrice = 0;
      let oilChange = 0;
      
      // Try to get gold ETF (GLD) data from TWS/Unusual Whales
      try {
        const unusualWhales = new UnusualWhalesService();
        
        // Get GLD (Gold ETF) data and GEX
        const goldResponse = await unusualWhales.makeRequest('/market-data/stocks/GLD');
        
        if (goldResponse && goldResponse.price) {
          // Convert GLD price to approximate gold spot price
          goldPrice = goldResponse.price * 10; // Rough conversion factor
          goldChange = goldResponse.change_percent || 0;
        }
        
        // Get GLD GEX data for sentiment
        const gldGexResponse = await unusualWhales.makeRequest('/gamma-exposure/stocks/GLD');
        
        if (gldGexResponse && gldGexResponse.net_gamma) {
          const netGamma = gldGexResponse.net_gamma;
          if (netGamma > 10000000) goldGexSentiment = 'bullish';
          else if (netGamma < -10000000) goldGexSentiment = 'bearish';
        }
        
        // Get oil data (USO ETF or /CL futures)
        const oilResponse = await unusualWhales.makeRequest('/market-data/stocks/USO');
        
        if (oilResponse && oilResponse.price) {
          oilPrice = oilResponse.price;
          oilChange = oilResponse.change_percent || 0;
        }
        
      } catch (twsError) {
        console.log('TWS commodities data not available, using fallback');
      }
      
      // Fallback to external APIs if TWS data not available
      if (goldPrice === 0) {
        // Use a gold price API or set reasonable defaults
        goldPrice = 2650.50;
        goldChange = 0.8;
      }
      
      if (oilPrice === 0) {
        oilPrice = 73.25;
        oilChange = -1.2;
      }
      
      // Combine price action and GEX sentiment for gold
      const goldPriceSentiment = goldChange > 1 ? 'bullish' : goldChange < -1 ? 'bearish' : 'neutral';
      const goldCombinedSentiment = goldGexSentiment !== 'neutral' ? goldGexSentiment : goldPriceSentiment;
      
      const oilSentiment = oilChange > 2 ? 'bullish' : oilChange < -2 ? 'bearish' : 'neutral';

      return {
        gold: {
          price: goldPrice,
          change24h: goldChange,
          sentiment: goldCombinedSentiment as const,
          gexSentiment: goldGexSentiment as 'bullish' | 'bearish' | 'neutral'
        },
        oil: {
          price: oilPrice,
          change24h: oilChange,
          sentiment: oilSentiment as const
        }
      };
    } catch (error) {
      console.error('Error fetching commodities sentiment:', error);
      return {
        gold: { 
          price: 0, 
          change24h: 0, 
          sentiment: 'neutral' as const,
          gexSentiment: 'neutral' as const
        },
        oil: { price: 0, change24h: 0, sentiment: 'neutral' as const }
      };
    }
  }

  private async getTrumpCommunications(): Promise<{ recentPosts: TrumpPost[], marketImpactScore: number, alertLevel: 'low' | 'medium' | 'high' | 'critical' }> {
    try {
      // Try to get Trump news from Unusual Whales API
      const unusualWhales = new UnusualWhalesService();
      const response = await unusualWhales.makeRequest('/news/trump', {
        method: 'GET'
      });

      if (response && response.data) {
        const posts = response.data.slice(0, 5).map((item: any) => ({
          id: item.id || Math.random().toString(),
          content: item.headline || item.content || '',
          timestamp: new Date(item.date || Date.now()),
          platform: item.source || 'Truth Social',
          marketImpact: this.assessMarketImpact(item.headline || item.content || ''),
          affectedSectors: this.extractAffectedSectors(item.headline || item.content || ''),
          sentiment: this.assessSentiment(item.headline || item.content || '')
        }));

        const avgImpact = posts.reduce((sum: number, post: TrumpPost) => sum + post.marketImpact, 0) / posts.length;
        const alertLevel = this.getAlertLevel(avgImpact);

        return {
          recentPosts: posts,
          marketImpactScore: avgImpact,
          alertLevel
        };
      }
    } catch (error) {
      console.log('Trump news API not available, using alternative approach');
    }

    // Fallback: return neutral data
    return {
      recentPosts: [],
      marketImpactScore: 0,
      alertLevel: 'low'
    };
  }

  private assessMarketImpact(content: string): number {
    const marketKeywords = [
      'tariff', 'trade', 'china', 'tax', 'rate', 'fed', 'inflation',
      'economy', 'jobs', 'unemployment', 'gdp', 'recession', 'growth',
      'dollar', 'currency', 'oil', 'energy', 'regulation', 'deregulation'
    ];

    const words = content.toLowerCase().split(/\s+/);
    const matchCount = words.filter(word => 
      marketKeywords.some(keyword => word.includes(keyword))
    ).length;

    // Scale 0-10 based on keyword density and content length
    return Math.min(10, Math.max(0, (matchCount / words.length) * 100));
  }

  private extractAffectedSectors(content: string): string[] {
    const sectorKeywords = {
      'Technology': ['tech', 'ai', 'artificial intelligence', 'silicon valley', 'google', 'apple', 'microsoft'],
      'Energy': ['oil', 'gas', 'energy', 'drilling', 'pipeline', 'renewable'],
      'Finance': ['bank', 'financial', 'wall street', 'fed', 'interest rate'],
      'Healthcare': ['healthcare', 'pharma', 'drug', 'medical', 'hospital'],
      'Defense': ['defense', 'military', 'weapons', 'aerospace']
    };

    const affected: string[] = [];
    const lowercaseContent = content.toLowerCase();

    Object.entries(sectorKeywords).forEach(([sector, keywords]) => {
      if (keywords.some(keyword => lowercaseContent.includes(keyword))) {
        affected.push(sector);
      }
    });

    return affected;
  }

  private assessSentiment(content: string): 'bullish' | 'bearish' | 'neutral' {
    const bullishWords = ['great', 'fantastic', 'winning', 'success', 'boom', 'up', 'high', 'strong'];
    const bearishWords = ['bad', 'terrible', 'failing', 'disaster', 'crash', 'down', 'low', 'weak'];

    const words = content.toLowerCase().split(/\s+/);
    const bullishCount = words.filter(word => bullishWords.some(b => word.includes(b))).length;
    const bearishCount = words.filter(word => bearishWords.some(b => word.includes(b))).length;

    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  private getAlertLevel(impact: number): 'low' | 'medium' | 'high' | 'critical' {
    if (impact >= 8) return 'critical';
    if (impact >= 6) return 'high';
    if (impact >= 4) return 'medium';
    return 'low';
  }

  private async calculateOverallSentiment(data: {
    fearGreed: number;
    crypto: any;
    commodities: any;
    trump: any;
    vixLevel: number;
  }) {
    try {
      // Use AI to synthesize overall sentiment
      const prompt = `Analyze the following market sentiment data and provide an overall market sentiment assessment:

Fear & Greed Index: ${data.fearGreed}/100
VIX Level: ${data.vixLevel}
Bitcoin: $${data.crypto.btc.price} (${data.crypto.btc.change24h}% 24h)
Gold: $${data.commodities.gold.price} (${data.commodities.gold.change24h}% 24h)
Oil: $${data.commodities.oil.price} (${data.commodities.oil.change24h}% 24h)
Trump Communications Impact Score: ${data.trump.marketImpactScore}/10

Provide a JSON response with:
- score: -100 to 100 (bearish to bullish)
- confidence: 0 to 1
- primaryDrivers: array of main factors
- recommendation: "risk-on", "risk-off", or "neutral"`;

      const response = await geminiService.createCompletion(prompt, {
        model: 'gemini-2.0-flash',
      });

      return JSON.parse(response);
    } catch (error) {
      console.error('Error calculating overall sentiment:', error);
      // Fallback calculation
      const score = (data.fearGreed - 50) * 0.8 + 
                   (data.crypto.btc.change24h * 2) + 
                   (data.commodities.gold.change24h * 1.5) - 
                   (data.vixLevel - 20);

      return {
        score: Math.max(-100, Math.min(100, score)),
        confidence: 0.7,
        primaryDrivers: ['Fear & Greed Index', 'Crypto Markets', 'VIX'],
        recommendation: score > 20 ? 'risk-on' : score < -20 ? 'risk-off' : 'neutral'
      };
    }
  }

  async getTrumpAlerts(): Promise<TrumpPost[]> {
    const data = await this.getMarketSentiment();
    return data.trumpCommunications.recentPosts.filter(
      post => post.marketImpact >= 6 // High impact posts only
    );
  }

  private async getOptionsFlowMetrics(watchlist: string[]): Promise<OptionsFlowMetrics> {
    // Combines total options volume, market tide, open-interest changes, SPiKE and
    // correlation data to enhance market sentiment analysis as per project specs.
    try {
      const uw = new UnusualWhalesService();
      const sectors = [
        'technology',
        'healthcare',
        'financial services',
        'consumer cyclical',
        'communication services',
        'industrials',
        'consumer defensive',
        'energy',
        'utilities',
        'real estate'
      ];

      const sectorGreekFlow: Record<string, any> = {};
      const [netFlowExpiry, marketTide, sectorTide, etfTide, oiChangeRaw, totalOptionsVolume, spike, correlations] = await Promise.all([
        uw.getNetFlowExpiry(),
        uw.getMarketTide(),
        uw.getSectorTide('technology'),
        uw.getEtfTide('SPY'),
        uw.getOiChange(),
        uw.getTotalOptionsVolume(),
        uw.getSpike(),
        uw.getMarketCorrelations(watchlist)
      ]);

      await Promise.all(
        sectors.map(async sector => {
          try {
            sectorGreekFlow[sector] = await uw.getGroupGreekFlow(sector);
          } catch (err) {
            sectorGreekFlow[sector] = null;
          }
        })
      );

      let callPutRatio: number | null = null;
      if (totalOptionsVolume && Array.isArray(totalOptionsVolume.data) && totalOptionsVolume.data.length > 0) {
        const latest = totalOptionsVolume.data[0];
        const callPrem = Number(latest.call_premium ?? latest.total_call_premium ?? 0);
        const putPrem = Number(latest.put_premium ?? latest.total_put_premium ?? 0);
        callPutRatio = putPrem === 0 ? null : callPrem / putPrem;
      }

      const filteredOi = (oiChangeRaw?.data || oiChangeRaw || []).filter((item: any) =>
        watchlist.includes(String(item.ticker || item.symbol || '').toUpperCase()) &&
        Math.abs(Number(item.oi_change || item.open_interest_change || 0)) >= 1000
      );

      return { netFlowExpiry, marketTide, sectorTide, etfTide, oiChange: filteredOi, totalOptionsVolume, spike, sectorGreekFlow, callPutRatio, correlations };
    } catch (error) {
      console.error('Error fetching options flow metrics:', error);
      return {
        netFlowExpiry: null,
        marketTide: null,
        sectorTide: null,
        etfTide: null,
        oiChange: null,
        totalOptionsVolume: null,
        spike: null,
        sectorGreekFlow: {},
        callPutRatio: null,
        correlations: null
      };
    }
  }

  private async getMacroEvents(watchlist: string[]) {
    // Retrieves economic and FDA calendars plus sentiment-scored headlines.
    try {
      const uw = new UnusualWhalesService();
      const [economic, fda, newsHeadlines] = await Promise.all([
        uw.getEconomicCalendar({ tickers: watchlist }),
        uw.getFdaCalendar({ tickers: watchlist }),
        uw.getNewsHeadlines({ tickers: watchlist })
      ]);
      return { economic, fda, newsHeadlines };
    } catch (error) {
      console.error('Error fetching macro events:', error);
      return { economic: null, fda: null, newsHeadlines: null };
    }
  }
}

export const marketSentimentService = new MarketSentimentService();
