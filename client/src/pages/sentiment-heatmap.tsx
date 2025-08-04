import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Activity, Bitcoin, DollarSign, Users, BarChart3, Clock } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';

interface MarketSentimentData {
  success: boolean;
  data: {
    timestamp: string;
    overallSentiment: number;
    fearGreedIndex: number;
    marketTide: any;
    optionsFlow: {
      totalPremium: number;
      callPutRatio: number;
      netFlow: number;
      institutionalFlow: number;
      retailFlow: number;
      darkPoolActivity: number;
    };
    marketBreadth: {
      advanceDeclineRatio: number;
      newHighsLows: {
        newHighs: number;
        newLows: number;
        ratio: number;
      };
      volumeAnalysis: {
        upVolumeRatio: number;
        distributionDays: number;
        accumulationDays: number;
      };
    };
    volatilityMetrics: {
      vixLevel: number;
      vixTrend: string;
      gexLevels: {
        totalGEX: number;
        call_gex: number;
        put_gex: number;
        gex_flip_point: number;
      };
    };
    sentimentIndicators: {
      newsFlow: {
        avgSentiment: number;
        newsCount: number;
      };
      analystSentiment: {
        upgrades: number;
        downgrades: number;
        consensusDirection: string;
      };
      socialSentiment: {
        overallTone: number;
        twitterMentions: number;
        redditActivity: number;
      };
      cryptoCorrelation: {
        btcCorrelation: number;
        cryptoSentiment: number;
      };
    };
    macroContext: {
      treasuryYields: {
        twoYear: number;
        tenYear: number;
        yieldCurveSlope: number;
      };
      dollarStrength: number;
      commodities: {
        gold: number;
        oil: number;
        copper: number;
      };
    };
    predictiveSignals: {
      nextDayBias: string;
      weeklyOutlook: string;
      confidenceScore: number;
    };
  };
}

interface HistoricalSentimentData {
  success: boolean;
  data: {
    timestamps: string[];
    overallSentiment: number[];
    fearGreedIndex: number[];
    vixLevel: number[];
    callPutRatio: number[];
    marketBreadth: number[];
    newsFlow: number[];
    cryptoCorrelation: number[];
    dollarStrength: number[];
    confidenceScore: number[];
  };
  timeframe: string;
}

interface TrumpPost {
  id: string;
  platform: string;
  content: string;
  timestamp: string;
  sentiment: string;
  marketImpact: number;
  affectedSectors: string[];
}

interface SentimentStats {
  success: boolean;
  data: {
    avgSentiment: number;
    sentimentVolatility: number;
    fearGreedTrend: 'increasing' | 'decreasing' | 'stable';
    vixTrend: 'increasing' | 'decreasing' | 'stable';
    marketRegime: 'bull' | 'bear' | 'sideways';
    confidenceTrend: 'increasing' | 'decreasing' | 'stable';
  };
  timeframe: string;
}

export default function SentimentHeatmap() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedChart, setSelectedChart] = useState('sentiment');

  // Real-time comprehensive sentiment data
  // Enhanced live market sentiment with cache-busting
  const { data: marketSentiment, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['/api/sentiment/market', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching market sentiment...`);
      const response = await fetch('/api/sentiment/market');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Market sentiment updated:`, data);
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 30000 : false, // Enhanced to 30 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Live UnusualWhales market tide data
  const { data: marketTide } = useQuery({
    queryKey: ['/api/unusual-whales/market-tide', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching UnusualWhales market tide...`);
      const response = await fetch('/api/unusual-whales/market-tide');
      if (!response.ok) throw new Error('Failed to fetch market tide');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Market tide updated:`, data?.length || 0, 'data points');
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

    // Live sector ETF sentiment data
  const { data: sectorETFs } = useQuery({
    queryKey: ['/api/unusual-whales/sector-etfs', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching sector ETF data...`);
      const response = await fetch('/api/unusual-whales/sector-etfs');
      if (!response.ok) throw new Error('Failed to fetch sector ETFs');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Sector ETF data updated:`, data?.length || 0, 'sectors');
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Live total options volume from UnusualWhales
  const { data: totalOptionsVolume } = useQuery({
    queryKey: ['/api/unusual-whales/total-options-volume', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching total options volume...`);
      const response = await fetch('/api/unusual-whales/total-options-volume');
      if (!response.ok) throw new Error('Failed to fetch total options volume');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Total options volume updated`);
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 30000 : false,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Live Trump communications data
  const { data: trumpCommunications } = useQuery({
    queryKey: ['/api/unusual-whales/trump-communications', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching Trump communications...`);
      const response = await fetch('/api/unusual-whales/trump-communications?hours_back=24&min_impact=5');
      if (!response.ok) throw new Error('Failed to fetch Trump communications');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Trump communications updated:`, data?.recent_posts?.length || 0, 'posts');
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 45000 : false, // Slightly slower refresh for Trump data
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Live news headlines data
  const { data: newsHeadlines } = useQuery({
    queryKey: ['/api/unusual-whales/news-headlines', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching news headlines...`);
      const response = await fetch('/api/unusual-whales/news-headlines?limit=20&hours_back=12');
      if (!response.ok) throw new Error('Failed to fetch news headlines');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] News headlines updated:`, data?.length || 0, 'articles');
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute refresh for news
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Historical sentiment data for charts with enhanced refresh
  const { data: historicalData, isLoading: isLoadingHistorical } = useQuery<HistoricalSentimentData>({
    queryKey: ['/api/sentiment/historical', selectedTimeframe, Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching historical sentiment data...`);
      const response = await fetch(`/api/sentiment/historical?timeframe=${selectedTimeframe}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Historical sentiment updated`);
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 120000 : false, // Enhanced to 2 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Sentiment statistics and trends with enhanced refresh
  const { data: sentimentStats } = useQuery<SentimentStats>({
    queryKey: ['/api/sentiment/stats', selectedTimeframe === '1h' || selectedTimeframe === '4h' ? '7d' : '30d', Date.now()],
    queryFn: async () => {
      console.log(`[${new Date().toLocaleTimeString()}] Fetching sentiment stats...`);
      const timeframe = selectedTimeframe === '1h' || selectedTimeframe === '4h' ? '7d' : '30d';
      const response = await fetch(`/api/sentiment/stats?timeframe=${timeframe}`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Sentiment stats updated`);
      return data;
    },
    staleTime: 0,
    refetchInterval: autoRefresh ? 180000 : false, // Enhanced to 3 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  const getFearGreedColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getFearGreedLabel = (score: number) => {
    if (score >= 75) return 'Extreme Greed';
    if (score >= 50) return 'Greed';
    if (score >= 25) return 'Fear';
    return 'Extreme Fear';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-600 bg-green-100';
      case 'bearish': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getVIXLevel = (vix: number) => {
    if (vix >= 30) return { label: 'High Volatility', color: 'text-red-600' };
    if (vix >= 20) return { label: 'Elevated', color: 'text-yellow-600' };
    return { label: 'Low Volatility', color: 'text-green-600' };
  };

  const getAlertLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'risk-on': return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'risk-off': return <TrendingDown className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Market Sentiment Analysis</h1>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, i) => (
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

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to load market sentiment data</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sentiment = marketSentiment as any; // Use any for flexible property access
  const vixData = sentiment?.vixLevel ? getVIXLevel(sentiment.vixLevel) : { label: 'N/A', color: 'text-gray-600' };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Sentiment & Communications Intelligence</h1>
          <p className="text-gray-600 mt-1">
            Real-time market sentiment including crypto, commodities, and Trump communications impact
          </p>
          {dataUpdatedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-Refresh On' : 'Auto-Refresh Off'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* Overall Sentiment Summary */}
      {sentiment && sentiment.overall_sentiment !== undefined && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {sentiment.overall_sentiment > 0 ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
              Overall Market Sentiment: {sentiment.overall_sentiment > 0 ? 'BULLISH' : sentiment.overall_sentiment < 0 ? 'BEARISH' : 'NEUTRAL'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Sentiment Score</div>
                <div className={`text-2xl font-bold ${sentiment.overall_sentiment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sentiment.overall_sentiment > 0 ? '+' : ''}{sentiment.overall_sentiment.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="text-2xl font-bold">
                  {sentiment.confidence ? (sentiment.confidence * 100).toFixed(0) : '0'}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Market Impact</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {sentiment.market_impact || 'Unknown'}
                  </Badge>
                  {sentiment.bullish_signals && sentiment.bullish_signals.length > 0 && (
                    <Badge variant="outline" className="text-xs text-green-600">
                      {sentiment.bullish_signals.length} Bullish
                    </Badge>
                  )}
                  {sentiment.bearish_signals && sentiment.bearish_signals.length > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600">
                      {sentiment.bearish_signals.length} Bearish
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crypto">Crypto Markets</TabsTrigger>
          <TabsTrigger value="commodities">Commodities</TabsTrigger>
          <TabsTrigger value="trump">Trump Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Fear & Greed Index */}
            {sentiment && sentiment.fear_greed_index !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentiment.fear_greed_index}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-3 h-3 rounded-full ${getFearGreedColor(sentiment.fear_greed_index)}`}></div>
                    <span className="text-sm">{getFearGreedLabel(sentiment.fear_greed_index)}</span>
                  </div>
                  <Progress value={sentiment.fear_greed_index} className="mt-2" />
                </CardContent>
              </Card>
            )}

            {/* VIX Level */}
            {sentiment && sentiment.vix_level !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">VIX Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentiment.vix_level.toFixed(1)}</div>
                  <div className={`text-sm mt-1 ${getVIXLevel(sentiment.vix_level).color}`}>
                    {getVIXLevel(sentiment.vix_level).label}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market Tide Data */}
            {marketTide && marketTide.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Market Tide
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{marketTide.length}</div>
                  <div className="text-sm mt-1 text-gray-600">
                    Data Points
                  </div>
                  {marketTide[0] && (
                    <div className="text-xs text-gray-500 mt-1">
                      Latest: {new Date(marketTide[0].timestamp || marketTide[0].date).toLocaleTimeString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Total Options Volume */}
            {totalOptionsVolume && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Options Volume
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    C: {totalOptionsVolume.call_volume ? (totalOptionsVolume.call_volume / 1000000).toFixed(1) : '0'}M
                  </div>
                  <div className="text-lg font-bold">
                    P: {totalOptionsVolume.put_volume ? (totalOptionsVolume.put_volume / 1000000).toFixed(1) : '0'}M
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    P/C Ratio: {totalOptionsVolume.put_volume && totalOptionsVolume.call_volume ? 
                      (totalOptionsVolume.put_volume / totalOptionsVolume.call_volume).toFixed(2) : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="crypto" className="space-y-4">
          {sentiment && sentiment.crypto && sentiment.crypto.btc && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bitcoin className="h-5 w-5" />
                    Bitcoin Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Current Price</div>
                      <div className="text-lg font-bold">${sentiment.crypto.btc.price.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">24h Change</div>
                      <div className={`text-lg font-bold ${sentiment.crypto.btc.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sentiment.crypto.btc.change24h >= 0 ? '+' : ''}{sentiment.crypto.btc.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Market Sentiment</div>
                    <div className="flex gap-1 mt-1">
                      <Badge className={`${getSentimentColor(sentiment.crypto.btc.sentiment)}`}>
                        {sentiment.crypto.btc.sentiment.toUpperCase()}
                      </Badge>
                      {sentiment.crypto.btc.gexSentiment && (
                        <Badge variant="outline">
                          GEX: {sentiment.crypto.btc.gexSentiment.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Crypto Market Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Total Market Cap</div>
                    <div className="text-lg font-bold">
                      ${(sentiment.crypto.totalMarketCap / 1e12).toFixed(2)}T
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bitcoin Dominance</div>
                    <div className="text-lg font-bold">
                      {sentiment.crypto.dominance.toFixed(1)}%
                    </div>
                    <Progress value={sentiment.crypto.dominance} className="mt-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="commodities" className="space-y-4">
          {sentiment && sentiment.commodities && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-500" />
                    Gold
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Price (oz)</div>
                      <div className="text-lg font-bold">${sentiment.commodities.gold.price}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">24h Change</div>
                      <div className={`text-lg font-bold ${sentiment.commodities.gold.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sentiment.commodities.gold.change24h >= 0 ? '+' : ''}{sentiment.commodities.gold.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex gap-1">
                      <Badge className={`${getSentimentColor(sentiment.commodities.gold.sentiment)}`}>
                        {sentiment.commodities.gold.sentiment.toUpperCase()}
                      </Badge>
                      {sentiment.commodities.gold.gexSentiment && (
                        <Badge variant="outline">
                          GEX: {sentiment.commodities.gold.gexSentiment.toUpperCase()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-black" />
                    Oil (WTI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Price (bbl)</div>
                      <div className="text-lg font-bold">${sentiment.commodities.oil.price}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">24h Change</div>
                      <div className={`text-lg font-bold ${sentiment.commodities.oil.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {sentiment.commodities.oil.change24h >= 0 ? '+' : ''}{sentiment.commodities.oil.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <Badge className={`${getSentimentColor(sentiment.commodities.oil.sentiment)}`}>
                      {sentiment.commodities.oil.sentiment.toUpperCase()}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trump" className="space-y-4">
          {sentiment && sentiment.trumpCommunications && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Trump Communications</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getAlertLevelColor(sentiment.trumpCommunications.alertLevel)}`}></div>
                    <span className="text-sm">Alert Level: {sentiment.trumpCommunications.alertLevel}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {sentiment.trumpCommunications.recentPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No high-impact communications detected recently
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentiment.trumpCommunications.recentPosts.map((post: TrumpPost) => (
                        <Card key={post.id} className="border-l-4 border-blue-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{post.platform}</Badge>
                                <Badge className={`${getSentimentColor(post.sentiment)}`}>
                                  {post.sentiment}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-500">
                                {new Date(post.timestamp).toLocaleString()}
                              </div>
                            </div>
                            <p className="text-sm mb-3">{post.content}</p>
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-sm text-gray-600">Market Impact: {post.marketImpact}/10</div>
                                <Progress value={post.marketImpact * 10} className="w-24 mt-1" />
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {post.affectedSectors.map((sector, index) => (
                                  <Badge key={index} variant="secondary" className="text-xs">
                                    {sector}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}