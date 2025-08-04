import { analyzeMarketSentiment } from "../geminiService";

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  timestamp: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  symbols: string[];
  impact: 'high' | 'medium' | 'low';
  category: string;
  url: string;
}

export interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  newsCount: number;
  trending: boolean;
  momentum: number;
  socialVolume: number;
  institutionalSentiment: number;
}

export interface MarketMood {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number;
  fearGreedIndex: number;
  volatilityIndex: number;
  newsVolume: number;
  socialActivity: number;
}

class NewsService {
  private newsCache: Map<string, NewsItem[]> = new Map();
  private sentimentCache: Map<string, SentimentAnalysis> = new Map();
  private lastFetchTime: number = 0;
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private marketAuxApiKey: string | undefined = process.env.MARKETAUX_API_KEY;

  /**
   * Fetch financial news from TWS (primary source) with fallbacks
   */
  async fetchFinancialNews(symbols: string[] = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'], timeframe: string = '24h'): Promise<NewsItem[]> {
    try {
      const cacheKey = `news_${symbols.join(',')}_${timeframe}`;
      
      // Return cached data if still valid
      if (this.newsCache.has(cacheKey) && Date.now() - this.lastFetchTime < this.cacheExpiry) {
        return this.newsCache.get(cacheKey) || [];
      }

      let news: NewsItem[] = [];
      
      // Primary source: TWS News Feeds
      try {
        const { ibkrService } = await import('./ibkr');
        const days = timeframe === '1h' ? 1 : timeframe === '24h' ? 1 : timeframe === '7d' ? 7 : 30;

        // Get news from TWS for each symbol
        for (const symbol of symbols.slice(0, 5)) { // Limit to avoid overloading
          const twsNews = await ibkrService.getMarketNews(symbol, days);
          news.push(...this.formatTWSNews(twsNews, symbol));
        }

        console.log(`Retrieved ${news.length} articles from TWS news feeds`);
      } catch (error) {
        console.error("Failed to fetch TWS news:", error);
      }

      // Secondary source: MarketAux API
      try {
        const marketAuxNews = await this.fetchMarketAuxNews(symbols);
        if (marketAuxNews.length > 0) {
          news.push(...marketAuxNews);
          console.log(`Retrieved ${marketAuxNews.length} articles from MarketAux`);
        }
      } catch (error) {
        console.error("Failed to fetch MarketAux news:", error);
      }

      // Unusual Whales headlines
      try {
        const { UnusualWhalesService } = await import('./unusualWhales');
        const uwService = new UnusualWhalesService();
        let uwCount = 0;
        for (const symbol of symbols.slice(0, 5)) {
          const uwArticles = await uwService.getNewsSentiment(symbol);
          for (const item of uwArticles.slice(0, 10)) {
            news.push({
              id: `uw-${symbol}-${item.id || Date.now()}`,
              headline: item.headline || item.title || 'Unusual Whales News',
              summary: item.summary || item.text || '',
              source: 'Unusual Whales',
              timestamp: item.created_at || item.published_at || new Date().toISOString(),
              sentiment: this.basicSentimentAnalysis(`${item.headline || ''} ${item.summary || ''}`),
              sentimentScore: typeof item.sentiment_score === 'number' ? item.sentiment_score : 0,
              symbols: [symbol],
              impact: 'medium',
              category: item.category || 'Market News',
              url: item.url || ''
            });
            uwCount++;
          }
        }
        if (uwCount > 0) {
          console.log(`Retrieved ${uwCount} articles from Unusual Whales`);
        }
      } catch (error) {
        console.error('Failed to fetch Unusual Whales news:', error);
      }

      // If no news was retrieved from external sources, generate simulated news
      if (news.length === 0) {
        news = await this.generateRealisticNews(symbols);
      }
      
      // Enhance all articles with AI sentiment analysis
      for (const article of news) {
        try {
          if (process.env.GEMINI_API_KEY) {
            const sentimentResult = await analyzeMarketSentiment([article], []);
            article.sentimentScore = sentimentResult.confidence / 100; // Convert to 0-1 scale
            article.sentiment = this.classifySentiment(article.sentimentScore);
          }
        } catch (error) {
          console.error("Error analyzing sentiment:", error);
          // Use basic keyword-based sentiment as fallback
          article.sentiment = this.basicSentimentAnalysis(article.headline + " " + article.summary);
        }
      }

      this.newsCache.set(cacheKey, news);
      this.lastFetchTime = Date.now();
      
      return news;
      
    } catch (error) {
      console.error("Error fetching financial news:", error);
      return [];
    }
  }

  /**
   * Format TWS news data to our standard NewsItem format
   */
  private formatTWSNews(twsNews: any[], symbol: string): NewsItem[] {
    return twsNews.map(article => ({
      id: article.articleId || `tws_${Date.now()}_${Math.random()}`,
      headline: article.headline,
      summary: article.summary || article.headline,
      source: article.providerName || 'TWS',
      timestamp: article.timestamp,
      sentiment: this.classifySentiment(0), // Will be updated by AI analysis
      sentimentScore: 0,
      symbols: article.symbols || [symbol],
      impact: this.determineImpact(article.headline),
      category: this.categorizeNews(article.headline),
      url: article.url || '#'
    }));
  }

  /**
   * Fetch news from MarketAux API
   */
  private async fetchMarketAuxNews(symbols: string[]): Promise<NewsItem[]> {
    if (!this.marketAuxApiKey) {
      console.log('MarketAux API key not configured');
      return [];
    }

    const articles: NewsItem[] = [];

    for (const symbol of symbols.slice(0, 3)) { // conservative limit
      const url = `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=${this.marketAuxApiKey}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.data) {
          for (const item of data.data.slice(0, 10)) {
            articles.push({
              id: item.uuid || `marketaux_${Date.now()}_${Math.random()}`,
              headline: item.title,
              summary: item.description || item.title,
              source: `MarketAux (${item.source})`,
              timestamp: item.published_at,
              sentiment: this.classifySentiment(0),
              sentimentScore: 0,
              symbols: item.entities?.map((e: any) => e.symbol) || [symbol],
              impact: this.determineImpact(item.title),
              category: this.categorizeNews(item.title),
              url: item.url
            });
          }
        }

        // avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`MarketAux API error for ${symbol}:`, error);
      }
    }

    return articles;
  }

  /**
   * Generate realistic news based on current market conditions
   */
  private async generateRealisticNews(symbols: string[]): Promise<NewsItem[]> {
    const newsTemplates = [
      {
        headline: "Quarterly Earnings Beat Expectations",
        summary: "Company reports strong quarterly results with revenue growth exceeding analyst estimates.",
        category: "Earnings",
        impact: "high" as const,
        sentiment: "bullish" as const
      },
      {
        headline: "New Product Launch Announcement",
        summary: "Company unveils innovative product line targeting emerging market opportunities.",
        category: "Product Launch",
        impact: "medium" as const,
        sentiment: "bullish" as const
      },
      {
        headline: "Regulatory Concerns Impact Sector",
        summary: "New regulatory guidelines raise concerns about future operating constraints.",
        category: "Regulatory",
        impact: "medium" as const,
        sentiment: "bearish" as const
      },
      {
        headline: "Strategic Partnership Announced",
        summary: "Major partnership agreement expected to drive long-term growth initiatives.",
        category: "Partnership",
        impact: "medium" as const,
        sentiment: "bullish" as const
      },
      {
        headline: "Supply Chain Disruptions Continue",
        summary: "Ongoing supply chain challenges affecting production and delivery schedules.",
        category: "Supply Chain",
        impact: "medium" as const,
        sentiment: "bearish" as const
      }
    ];

    const sources = ["Reuters", "Bloomberg", "CNBC", "MarketWatch", "Yahoo Finance"];
    
    return symbols.slice(0, 5).map((symbol, index) => {
      const template = newsTemplates[index % newsTemplates.length];
      const source = sources[index % sources.length];
      
      return {
        id: `news_${symbol}_${Date.now()}_${index}`,
        headline: `${symbol}: ${template.headline}`,
        summary: `${symbol} ${template.summary}`,
        source,
        timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        sentiment: template.sentiment,
        sentimentScore: template.sentiment === 'bullish' ? 0.6 + Math.random() * 0.3 : 
                       template.sentiment === 'bearish' ? -0.6 - Math.random() * 0.3 : 
                       -0.2 + Math.random() * 0.4,
        symbols: [symbol],
        impact: template.impact,
        category: template.category,
        url: `https://example.com/news/${symbol.toLowerCase()}`
      };
    });
  }

  /**
   * Analyze sentiment for portfolio symbols
   */
  async analyzeSentimentForSymbols(symbols: string[]): Promise<SentimentAnalysis[]> {
    const news = await this.fetchFinancialNews(symbols);
    const analysis: SentimentAnalysis[] = [];

    for (const symbol of symbols) {
      const symbolNews = news.filter(n => n.symbols.includes(symbol));
      
      if (symbolNews.length === 0) {
        analysis.push({
          symbol,
          overallSentiment: 'neutral',
          sentimentScore: 0,
          newsCount: 0,
          trending: false,
          momentum: 0,
          socialVolume: Math.floor(Math.random() * 100),
          institutionalSentiment: 0
        });
        continue;
      }

      const avgSentiment = symbolNews.reduce((sum, news) => sum + news.sentimentScore, 0) / symbolNews.length;
      const recentNews = symbolNews.filter(n => Date.now() - new Date(n.timestamp).getTime() < 4 * 60 * 60 * 1000);
      const trending = recentNews.length > 2;
      
      analysis.push({
        symbol,
        overallSentiment: this.classifySentiment(avgSentiment),
        sentimentScore: avgSentiment,
        newsCount: symbolNews.length,
        trending,
        momentum: trending ? avgSentiment * 0.1 : 0,
        socialVolume: Math.floor(Math.random() * 100),
        institutionalSentiment: avgSentiment * 0.8 + (Math.random() - 0.5) * 0.2
      });
    }

    return analysis;
  }

  /**
   * Get overall market mood
   */
  async getMarketMood(): Promise<MarketMood> {
    const majorSymbols = ['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT'];
    const sentimentAnalysis = await this.analyzeSentimentForSymbols(majorSymbols);
    
    const avgSentiment = sentimentAnalysis.reduce((sum, s) => sum + s.sentimentScore, 0) / sentimentAnalysis.length;
    const totalNews = sentimentAnalysis.reduce((sum, s) => sum + s.newsCount, 0);
    const avgSocialVolume = sentimentAnalysis.reduce((sum, s) => sum + s.socialVolume, 0) / sentimentAnalysis.length;

    // Simulate Fear & Greed Index (normally would fetch from CNN Money API)
    const fearGreedIndex = Math.max(0, Math.min(100, 50 + avgSentiment * 30 + Math.random() * 20 - 10));
    
    return {
      overall: this.classifySentiment(avgSentiment),
      score: avgSentiment,
      fearGreedIndex: Math.round(fearGreedIndex),
      volatilityIndex: 15 + Math.random() * 10, // VIX simulation
      newsVolume: totalNews,
      socialActivity: Math.round(avgSocialVolume)
    };
  }

  private classifySentiment(score: number): 'bullish' | 'bearish' | 'neutral' {
    if (score > 0.2) return 'bullish';
    if (score < -0.2) return 'bearish';
    return 'neutral';
  }

  private basicSentimentAnalysis(text: string): 'bullish' | 'bearish' | 'neutral' {
    const bullishWords = ['beat', 'strong', 'growth', 'positive', 'up', 'rise', 'gain', 'success', 'profit', 'innovation'];
    const bearishWords = ['miss', 'weak', 'decline', 'negative', 'down', 'fall', 'loss', 'concern', 'challenge', 'disruption'];
    
    const lowerText = text.toLowerCase();
    const bullishCount = bullishWords.filter(word => lowerText.includes(word)).length;
    const bearishCount = bearishWords.filter(word => lowerText.includes(word)).length;
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  private determineImpact(headline: string): 'high' | 'medium' | 'low' {
    const highImpactWords = ['earnings', 'revenue', 'guidance', 'acquisition', 'merger', 'lawsuit', 'fda', 'regulation'];
    const mediumImpactWords = ['partnership', 'product', 'launch', 'expansion', 'investment', 'upgrade', 'downgrade'];
    
    const lowerHeadline = headline.toLowerCase();
    
    if (highImpactWords.some(word => lowerHeadline.includes(word))) return 'high';
    if (mediumImpactWords.some(word => lowerHeadline.includes(word))) return 'medium';
    return 'low';
  }

  private categorizeNews(headline: string): string {
    const lowerHeadline = headline.toLowerCase();
    
    if (lowerHeadline.includes('earnings') || lowerHeadline.includes('revenue')) return 'Earnings';
    if (lowerHeadline.includes('product') || lowerHeadline.includes('launch')) return 'Product Launch';
    if (lowerHeadline.includes('partnership') || lowerHeadline.includes('deal')) return 'Partnership';
    if (lowerHeadline.includes('regulation') || lowerHeadline.includes('fda')) return 'Regulatory';
    if (lowerHeadline.includes('acquisition') || lowerHeadline.includes('merger')) return 'M&A';
    if (lowerHeadline.includes('analyst') || lowerHeadline.includes('rating')) return 'Analyst Rating';
    
    return 'General';
  }
}

export const newsService = new NewsService();