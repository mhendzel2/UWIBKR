// @ts-nocheck
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface NewsArticle {
  id: string;
  title: string;
  summary?: string;
  content?: string;
  source: string;
  author?: string;
  publishedAt: Date;
  url?: string;
  symbols?: string[];
  sentiment?: {
    score: number; // -1 to 1
    confidence: number; // 0 to 1
    label: 'bullish' | 'bearish' | 'neutral';
    keywords?: string[];
  };
  impact?: 'high' | 'medium' | 'low';
  category?: string;
}

export interface SentimentAnalysis {
  overall_sentiment: number; // -1 to 1
  confidence: number;
  bullish_signals: string[];
  bearish_signals: string[];
  key_themes: string[];
  market_impact: 'high' | 'medium' | 'low';
  price_target_mentions?: string[];
  analyst_ratings?: string[];
}

export class NewsAggregator {
  private alphaVantageKey: string | null = null;
  private newsApiKey: string | null = null;
  private fmpApiKey: string | null = null;
  private articles: Map<string, NewsArticle> = new Map();
  private sentimentCache: Map<string, SentimentAnalysis> = new Map();

  constructor() {
    this.alphaVantageKey = process.env.ALPHA_VANTAGE_API_KEY || null;
    this.newsApiKey = process.env.NEWS_API_KEY || null;
    this.fmpApiKey = process.env.FMP_API_KEY || null;
  }

  // Fetch news from Alpha Vantage (25 requests/day free)
  async fetchAlphaVantageNews(symbols: string[]): Promise<NewsArticle[]> {
    if (!this.alphaVantageKey) {
      console.log('Alpha Vantage API key not configured');
      return [];
    }

    const articles: NewsArticle[] = [];

    for (const symbol of symbols.slice(0, 5)) { // Limit to preserve daily quota
      try {
        const url = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${this.alphaVantageKey}&limit=20`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.feed) {
          for (const item of data.feed.slice(0, 10)) { // Limit articles per symbol
            const article: NewsArticle = {
              id: `av-${symbol}-${Date.now()}-${Math.random()}`,
              title: item.title,
              summary: item.summary,
              source: 'Alpha Vantage',
              publishedAt: new Date(item.time_published),
              url: item.url,
              symbols: [symbol],
              sentiment: {
                score: parseFloat(item.overall_sentiment_score) || 0,
                confidence: 0.8,
                label: this.scoreToLabel(parseFloat(item.overall_sentiment_score) || 0),
                keywords: item.topics?.map((t: any) => t.topic) || []
              },
              impact: this.calculateImpact(item),
              category: item.category_within_source
            };
            
            articles.push(article);
            this.articles.set(article.id, article);
          }
        }

        // Respect rate limits
        await new Promise(resolve => setTimeout(resolve, 12000)); // 5 req/min = 12s between calls
      } catch (error) {
        console.error(`Failed to fetch Alpha Vantage news for ${symbol}:`, error);
      }
    }

    return articles;
  }

  // Fetch news from NewsAPI (100 requests/day free, 24h delay)
  async fetchNewsApi(query: string = 'financial markets'): Promise<NewsArticle[]> {
    if (!this.newsApiKey) {
      console.log('NewsAPI key not configured');
      return [];
    }

    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&domains=reuters.com,bloomberg.com,marketwatch.com&language=en&sortBy=publishedAt&apiKey=${this.newsApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      const articles: NewsArticle[] = [];

      if (data.articles) {
        for (const item of data.articles.slice(0, 20)) {
          const article: NewsArticle = {
            id: `newsapi-${Date.now()}-${Math.random()}`,
            title: item.title,
            summary: item.description,
            content: item.content,
            source: `NewsAPI (${item.source.name})`,
            author: item.author,
            publishedAt: new Date(item.publishedAt),
            url: item.url,
            symbols: this.extractSymbols(item.title + ' ' + item.description),
            category: 'General Financial'
          };

          // Add AI sentiment analysis
          article.sentiment = await this.analyzeTextSentiment(
            `${item.title}. ${item.description || ''}`
          );

          articles.push(article);
          this.articles.set(article.id, article);
        }
      }

      return articles;
    } catch (error) {
      console.error('Failed to fetch NewsAPI data:', error);
      return [];
    }
  }

  // Fetch news from TWS (via IBKR service integration)
  async fetchTWSNews(symbols: string[]): Promise<NewsArticle[]> {
    try {
      // This would integrate with your existing IBKR service
      const { ibkrService } = await import('./ibkrService');
      const articles: NewsArticle[] = [];

      for (const symbol of symbols) {
        try {
          // TWS provides news headlines and fundamental data
          const newsData = await ibkrService.getNewsHeadlines(symbol);
          const fundamentals = await ibkrService.getFundamentalData(symbol);

          if (newsData && newsData.length > 0) {
            for (const item of newsData.slice(0, 15)) {
              const article: NewsArticle = {
                id: `tws-${symbol}-${item.articleId || Date.now()}`,
                title: item.headline,
                summary: item.summary,
                source: `TWS (${item.provider || 'Interactive Brokers'})`,
                publishedAt: new Date(item.sentTime || Date.now()),
                url: item.url,
                symbols: [symbol],
                category: item.category || 'Company News',
                impact: item.impactLevel || 'medium'
              };

              // Add AI sentiment analysis for TWS news
              article.sentiment = await this.analyzeTextSentiment(
                `${item.headline}. ${item.summary || ''}`
              );

              articles.push(article);
              this.articles.set(article.id, article);
            }
          }

          // Add fundamental data as "news" if there are significant changes
          if (fundamentals) {
            const fundamentalNews = this.createFundamentalNews(symbol, fundamentals);
            articles.push(...fundamentalNews);
          }

        } catch (error) {
          console.error(`Failed to fetch TWS news for ${symbol}:`, error);
        }
      }

      return articles;
    } catch (error) {
      console.error('TWS news integration not available:', error);
      return [];
    }
  }

  // Fetch free news from MarketAux API
  async fetchMarketAuxNews(symbols: string[]): Promise<NewsArticle[]> {
    try {
      const articles: NewsArticle[] = [];
      
      for (const symbol of symbols.slice(0, 3)) { // Conservative limit for free tier
        const url = `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&language=en&api_token=demo`;
        
        try {
          const response = await fetch(url);
          const data = await response.json();

          if (data.data) {
            for (const item of data.data.slice(0, 10)) {
              const article: NewsArticle = {
                id: `marketaux-${symbol}-${item.uuid || Date.now()}`,
                title: item.title,
                summary: item.description,
                source: `MarketAux (${item.source})`,
                publishedAt: new Date(item.published_at),
                url: item.url,
                symbols: item.entities?.map((e: any) => e.symbol) || [symbol],
                category: item.categories?.[0] || 'Financial News'
              };

              // Add sentiment analysis
              article.sentiment = await this.analyzeTextSentiment(
                `${item.title}. ${item.description || ''}`
              );

              articles.push(article);
              this.articles.set(article.id, article);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
        } catch (error) {
          console.error(`MarketAux API error for ${symbol}:`, error);
        }
      }

      return articles;
    } catch (error) {
      console.error('MarketAux integration failed:', error);
      return [];
    }
  }

  // Fetch news from Unusual Whales API
  async fetchUnusualWhalesNews(symbols: string[]): Promise<NewsArticle[]> {
    try {
      const { UnusualWhalesService } = await import('./unusualWhales');
      const uwService = new UnusualWhalesService();
      const articles: NewsArticle[] = [];

      for (const symbol of symbols.slice(0, 5)) {
        try {
          const data = await uwService.getNewsSentiment(symbol);

          for (const item of (data as any[]).slice(0, 10)) {
            const score = typeof item.sentiment_score === 'number' ? item.sentiment_score : 0;
            const article: NewsArticle = {
              id: `uw-${symbol}-${item.id || Date.now()}`,
              title: item.headline || item.title || 'Unusual Whales News',
              summary: item.summary || item.text || '',
              source: 'Unusual Whales',
              publishedAt: new Date(item.created_at || item.published_at || Date.now()),
              url: item.url,
              symbols: [symbol],
              category: item.category || 'Market News',
              sentiment: {
                score,
                confidence: 0.8,
                label: this.scoreToLabel(score)
              }
            };

            articles.push(article);
            this.articles.set(article.id, article);
          }
        } catch (error) {
          console.error(`Failed to fetch Unusual Whales news for ${symbol}:`, error);
        }
      }

      return articles;
    } catch (error) {
      console.error('Unusual Whales news integration not available:', error);
      return [];
    }
  }

  // Fetch news from Financial Modeling Prep API
  async fetchFmpNews(symbols: string[]): Promise<NewsArticle[]> {
    if (!this.fmpApiKey) {
      console.log('FMP API key not configured');
      return [];
    }

    try {
      const tickers = symbols.slice(0, 5).join(',');
      const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${tickers}&limit=50&apikey=${this.fmpApiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      const articles: NewsArticle[] = [];

      if (Array.isArray(data)) {
        for (const item of data) {
          const article: NewsArticle = {
            id: `fmp-${item.symbol}-${item.url || Date.now()}`,
            title: item.title,
            summary: item.text,
            source: `FMP (${item.site})`,
            publishedAt: new Date(item.publishedDate),
            url: item.url,
            symbols: [item.symbol],
            category: 'Company News'
          };

          article.sentiment = await this.analyzeTextSentiment(
            `${item.title}. ${item.text || ''}`
          );

          articles.push(article);
          this.articles.set(article.id, article);
        }
      }

      return articles;
    } catch (error) {
      console.error('Failed to fetch FMP news:', error);
      return [];
    }
  }

  // AI-powered sentiment analysis using OpenAI
  async analyzeTextSentiment(text: string): Promise<{
    score: number;
    confidence: number;
    label: 'bullish' | 'bearish' | 'neutral';
    keywords?: string[];
  }> {
    try {
      const prompt = `Analyze the financial sentiment of this text and provide a JSON response:

Text: "${text}"

Provide a JSON object with:
- score: number between -1 (very bearish) and 1 (very bullish)
- confidence: number between 0 and 1
- label: "bullish", "bearish", or "neutral"
- keywords: array of 3-5 key financial terms or phrases

Focus on market impact, price implications, and trading sentiment.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      
      return {
        score: Math.max(-1, Math.min(1, analysis.score || 0)),
        confidence: Math.max(0, Math.min(1, analysis.confidence || 0.5)),
        label: analysis.label || 'neutral',
        keywords: analysis.keywords || []
      };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      return {
        score: 0,
        confidence: 0.1,
        label: 'neutral'
      };
    }
  }

  // Aggregate sentiment for a symbol across all news sources
  async getSymbolSentiment(symbol: string, hours: number = 24): Promise<SentimentAnalysis> {
    const cacheKey = `${symbol}-${hours}h`;
    
    if (this.sentimentCache.has(cacheKey)) {
      return this.sentimentCache.get(cacheKey)!;
    }

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const relevantArticles = Array.from(this.articles.values())
      .filter(article => 
        article.symbols?.includes(symbol) && 
        article.publishedAt > cutoffTime &&
        article.sentiment
      );

    if (relevantArticles.length === 0) {
      const neutralAnalysis: SentimentAnalysis = {
        overall_sentiment: 0,
        confidence: 0,
        bullish_signals: [],
        bearish_signals: [],
        key_themes: [],
        market_impact: 'low'
      };
      
      this.sentimentCache.set(cacheKey, neutralAnalysis);
      return neutralAnalysis;
    }

    // Calculate weighted sentiment scores
    const sentimentScores = relevantArticles.map(article => ({
      score: article.sentiment!.score,
      confidence: article.sentiment!.confidence,
      weight: this.getSourceWeight(article.source)
    }));

    const totalWeight = sentimentScores.reduce((sum, item) => sum + item.weight, 0);
    const weightedSentiment = sentimentScores.reduce(
      (sum, item) => sum + (item.score * item.confidence * item.weight), 0
    ) / totalWeight;

    const avgConfidence = sentimentScores.reduce(
      (sum, item) => sum + item.confidence, 0
    ) / sentimentScores.length;

    // Extract signals and themes
    const bullishSignals: string[] = [];
    const bearishSignals: string[] = [];
    const allKeywords: string[] = [];

    relevantArticles.forEach(article => {
      if (article.sentiment!.score > 0.2) {
        bullishSignals.push(article.title);
      } else if (article.sentiment!.score < -0.2) {
        bearishSignals.push(article.title);
      }
      
      if (article.sentiment!.keywords) {
        allKeywords.push(...article.sentiment!.keywords);
      }
    });

    // Get most common themes
    const keywordCounts = allKeywords.reduce((acc, keyword) => {
      acc[keyword] = (acc[keyword] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const key_themes = Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([keyword]) => keyword);

    // Determine market impact
    const highImpactCount = relevantArticles.filter(a => a.impact === 'high').length;
    const market_impact = highImpactCount > relevantArticles.length * 0.3 ? 'high' : 
                         highImpactCount > 0 ? 'medium' : 'low';

    const analysis: SentimentAnalysis = {
      overall_sentiment: Math.max(-1, Math.min(1, weightedSentiment)),
      confidence: avgConfidence,
      bullish_signals: bullishSignals.slice(0, 5),
      bearish_signals: bearishSignals.slice(0, 5),
      key_themes,
      market_impact
    };

    this.sentimentCache.set(cacheKey, analysis);
    
    // Cache for 15 minutes
    setTimeout(() => {
      this.sentimentCache.delete(cacheKey);
    }, 15 * 60 * 1000);

    return analysis;
  }

  // Comprehensive news aggregation from all sources
  async aggregateAllNews(symbols: string[]): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    try {
      // Fetch from all sources in parallel, prioritizing TWS and Unusual Whales
      const [twsNews, uwNews, alphaVantageNews, newsApiNews, marketAuxNews, fmpNews] = await Promise.allSettled([
        this.fetchTWSNews(symbols),
        this.fetchUnusualWhalesNews(symbols),
        this.fetchAlphaVantageNews(symbols),
        this.fetchNewsApi(symbols.join(' OR ')),
        this.fetchMarketAuxNews(symbols),
        this.fetchFmpNews(symbols)
      ]);

      // Collect successful results
      if (twsNews.status === 'fulfilled') {
        allArticles.push(...twsNews.value);
      }
      if (uwNews.status === 'fulfilled') {
        allArticles.push(...uwNews.value);
      }
      if (alphaVantageNews.status === 'fulfilled') {
        allArticles.push(...alphaVantageNews.value);
      }
      if (newsApiNews.status === 'fulfilled') {
        allArticles.push(...newsApiNews.value);
      }
      if (marketAuxNews.status === 'fulfilled') {
        allArticles.push(...marketAuxNews.value);
      }
      if (fmpNews.status === 'fulfilled') {
        allArticles.push(...fmpNews.value);
      }

      // Sort by publish date (newest first)
      allArticles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      // Remove duplicates based on title similarity
      const uniqueArticles = this.deduplicateArticles(allArticles);

      console.log(`Aggregated ${uniqueArticles.length} unique news articles from ${symbols.length} symbols`);
      return uniqueArticles;

    } catch (error) {
      console.error('News aggregation failed:', error);
      return [];
    }
  }

  // Helper methods
  private scoreToLabel(score: number): 'bullish' | 'bearish' | 'neutral' {
    if (score > 0.15) return 'bullish';
    if (score < -0.15) return 'bearish';
    return 'neutral';
  }

  private calculateImpact(item: any): 'high' | 'medium' | 'low' {
    const relevanceScore = parseFloat(item.relevance_score) || 0;
    if (relevanceScore > 0.7) return 'high';
    if (relevanceScore > 0.4) return 'medium';
    return 'low';
  }

  private extractSymbols(text: string): string[] {
    const stockPattern = /\$?([A-Z]{1,5})\b/g;
    const matches = text.match(stockPattern) || [];
    return [...new Set(matches.map(m => m.replace('$', '')))];
  }

  private getSourceWeight(source: string): number {
    if (source.includes('TWS')) return 1.3; // TWS gets highest weight
    if (source.includes('Unusual Whales')) return 1.2;
    if (source.includes('Alpha Vantage')) return 1.0;
    if (source.includes('Bloomberg') || source.includes('Reuters')) return 0.9;
    if (source.includes('FMP')) return 0.8;
    if (source.includes('MarketAux')) return 0.7;
    return 0.5;
  }

  private createFundamentalNews(symbol: string, fundamentals: any): NewsArticle[] {
    const articles: NewsArticle[] = [];
    
    // Create news items for significant fundamental changes
    if (fundamentals.earningsGrowth && Math.abs(fundamentals.earningsGrowth) > 10) {
      articles.push({
        id: `fundamental-${symbol}-earnings-${Date.now()}`,
        title: `${symbol} Shows ${fundamentals.earningsGrowth > 0 ? 'Strong' : 'Declining'} Earnings Growth`,
        summary: `${symbol} reported ${fundamentals.earningsGrowth.toFixed(1)}% earnings growth`,
        source: 'TWS Fundamentals',
        publishedAt: new Date(),
        symbols: [symbol],
        sentiment: {
          score: fundamentals.earningsGrowth > 0 ? 0.6 : -0.6,
          confidence: 0.8,
          label: fundamentals.earningsGrowth > 0 ? 'bullish' : 'bearish'
        },
        impact: Math.abs(fundamentals.earningsGrowth) > 20 ? 'high' : 'medium',
        category: 'Fundamental Analysis'
      });
    }

    return articles;
  }

  private deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // Get cached articles for a symbol
  getArticlesForSymbol(symbol: string, hours: number = 24): NewsArticle[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.articles.values())
      .filter(article => 
        article.symbols?.includes(symbol) && 
        article.publishedAt > cutoffTime
      )
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  // Clear old articles to manage memory
  cleanupOldArticles(): void {
    const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const articlesToDelete: string[] = [];
    
    this.articles.forEach((article, id) => {
      if (article.publishedAt < cutoffTime) {
        articlesToDelete.push(id);
      }
    });

    articlesToDelete.forEach(id => this.articles.delete(id));
    
    if (articlesToDelete.length > 0) {
      console.log(`Cleaned up ${articlesToDelete.length} old articles`);
    }
  }
}

export const newsAggregator = new NewsAggregator();
