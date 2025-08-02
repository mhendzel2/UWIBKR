import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  Newspaper, 
  Search,
  Filter,
  Clock,
  AlertCircle,
  Zap,
  Globe,
  BarChart3
} from "lucide-react";
import { useState } from "react";

interface NewsItem {
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

interface SentimentAnalysis {
  symbol: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  sentimentScore: number;
  newsCount: number;
  trending: boolean;
  momentum: number;
  socialVolume: number;
  institutionalSentiment: number;
}

interface MarketMood {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number;
  fearGreedIndex: number;
  volatilityIndex: number;
  newsVolume: number;
  socialActivity: number;
}

export default function NewsSentimentPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('24h');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');

  const { data: news = [], isLoading: loadingNews } = useQuery<NewsItem[]>({
    queryKey: ['/api/news', selectedSymbol, timeframe, sentimentFilter],
  });

  const { data: sentimentAnalysis = [], isLoading: loadingSentiment } = useQuery<SentimentAnalysis[]>({
    queryKey: ['/api/sentiment/analysis'],
  });

  const { data: marketMood, isLoading: loadingMood } = useQuery<MarketMood>({
    queryKey: ['/api/sentiment/market-mood'],
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'bearish':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish':
        return <TrendingUp className="w-3 h-3" />;
      case 'bearish':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <BarChart3 className="w-3 h-3" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      default:
        return 'text-green-600';
    }
  };

  if (loadingNews && loadingSentiment) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">News & Sentiment Analysis</h1>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayNews = news;
  const displaySentiment = sentimentAnalysis;
  const displayMood = marketMood;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Market News & Sentiment Analysis</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Globe className="w-3 h-3 mr-1" />
            Live Feed
          </Badge>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>
      </div>

      {/* Market Mood Overview */}
      {displayMood ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Sentiment</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSentimentColor(displayMood.overall).split(' ')[0]}`}>
                {displayMood.overall.toUpperCase()}
              </div>
              <p className="text-xs text-muted-foreground">
                Score: {(displayMood.score * 100).toFixed(0)}/100
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {displayMood.fearGreedIndex}
              </div>
              <p className="text-xs text-muted-foreground">
                Greed level indicator
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">News Volume</CardTitle>
              <Newspaper className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayMood.newsVolume}
              </div>
              <p className="text-xs text-muted-foreground">
                articles in 24h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Social Activity</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {displayMood.socialActivity}%
              </div>
              <p className="text-xs text-muted-foreground">
                above average
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          Market mood data not available
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">News Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search symbols or keywords..."
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">1 Hour</SelectItem>
                <SelectItem value="24h">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All News</SelectItem>
                <SelectItem value="bullish">Bullish</SelectItem>
                <SelectItem value="bearish">Bearish</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="sentiment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="news">Latest News</TabsTrigger>
          <TabsTrigger value="trending">Trending Topics</TabsTrigger>
          <TabsTrigger value="social">Social Sentiment</TabsTrigger>
        </TabsList>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Symbol Sentiment Analysis</CardTitle>
              <CardDescription>
                Real-time sentiment analysis for portfolio symbols
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displaySentiment.map((sentiment) => (
                  <div key={sentiment.symbol} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="font-semibold text-lg">{sentiment.symbol}</div>
                      <Badge className={getSentimentColor(sentiment.overallSentiment)}>
                        {getSentimentIcon(sentiment.overallSentiment)}
                        <span className="ml-1">{sentiment.overallSentiment}</span>
                      </Badge>
                      {sentiment.trending && (
                        <Badge variant="outline">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Trending
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-muted-foreground">Score</div>
                        <div className="font-medium">{sentiment.sentimentScore.toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">News</div>
                        <div className="font-medium">{sentiment.newsCount}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Social</div>
                        <div className="font-medium">{sentiment.socialVolume}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Momentum</div>
                        <div className={`font-medium ${sentiment.momentum > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {sentiment.momentum > 0 ? '+' : ''}{(sentiment.momentum * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <div className="grid gap-4">
            {displayNews.map((article) => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge className={getSentimentColor(article.sentiment)}>
                        {getSentimentIcon(article.sentiment)}
                        <span className="ml-1">{article.sentiment}</span>
                      </Badge>
                      <Badge variant="outline" className={getImpactColor(article.impact)}>
                        {article.impact} impact
                      </Badge>
                      <Badge variant="outline">{article.category}</Badge>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatTime(article.timestamp)}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2">{article.headline}</h3>
                  <p className="text-muted-foreground mb-3">{article.summary}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">Source: {article.source}</span>
                      <div className="flex gap-1">
                        {article.symbols.map((symbol) => (
                          <Badge key={symbol} variant="secondary" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        Analyze Impact
                      </Button>
                      <Button size="sm" variant="ghost">
                        Read More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trending Topics</CardTitle>
              <CardDescription>
                Most discussed topics and their market impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Trending topics data not available
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Sentiment</CardTitle>
              <CardDescription>
                Sentiment analysis from social media platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Globe className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Social Sentiment Dashboard</h3>
                <p className="text-muted-foreground">
                  Real-time social media sentiment analysis from Twitter, Reddit, and other platforms would be displayed here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}