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
  const { data: marketSentiment, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['/api/sentiment/market'],
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Historical sentiment data for charts
  const { data: historicalData, isLoading: isLoadingHistorical } = useQuery<HistoricalSentimentData>({
    queryKey: ['/api/sentiment/historical', selectedTimeframe],
    refetchInterval: autoRefresh ? 300000 : false, // 5 minutes
  });

  // Sentiment statistics and trends
  const { data: sentimentStats } = useQuery<SentimentStats>({
    queryKey: ['/api/sentiment/stats', selectedTimeframe === '1h' || selectedTimeframe === '4h' ? '7d' : '30d'],
    refetchInterval: autoRefresh ? 600000 : false, // 10 minutes
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

  const sentiment = marketSentiment as MarketSentimentData;
  const vixData = sentiment ? getVIXLevel(sentiment.vixLevel) : { label: 'N/A', color: 'text-gray-600' };

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

      {/* Trump Communications Alerts */}
      {trumpAlerts && trumpAlerts.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>High-Impact Trump Communications Detected:</strong> {trumpAlerts.length} recent posts with significant market impact potential
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Sentiment Summary */}
      {sentiment && sentiment.overallSentiment && sentiment.overallSentiment.recommendation && (
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getRecommendationIcon(sentiment.overallSentiment.recommendation)}
              Overall Market Sentiment: {sentiment.overallSentiment.recommendation.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Sentiment Score</div>
                <div className={`text-2xl font-bold ${sentiment.overallSentiment.score > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {sentiment.overallSentiment.score > 0 ? '+' : ''}{sentiment.overallSentiment.score.toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Confidence</div>
                <div className="text-2xl font-bold">
                  {(sentiment.overallSentiment.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Primary Drivers</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sentiment.overallSentiment.primaryDrivers.map((driver, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {driver}
                    </Badge>
                  ))}
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
            {sentiment && sentiment.fearGreedIndex !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentiment.fearGreedIndex}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-3 h-3 rounded-full ${getFearGreedColor(sentiment.fearGreedIndex)}`}></div>
                    <span className="text-sm">{getFearGreedLabel(sentiment.fearGreedIndex)}</span>
                  </div>
                  <Progress value={sentiment.fearGreedIndex} className="mt-2" />
                </CardContent>
              </Card>
            )}

            {/* VIX Level */}
            {sentiment && sentiment.vixLevel !== undefined && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">VIX Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sentiment.vixLevel.toFixed(1)}</div>
                  <div className={`text-sm mt-1 ${vixData.color}`}>
                    {vixData.label}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bitcoin Sentiment */}
            {sentiment && sentiment.crypto && sentiment.crypto.btc && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bitcoin className="h-4 w-4" />
                    Bitcoin
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${sentiment.crypto.btc.price.toLocaleString()}</div>
                  <div className={`text-sm mt-1 ${sentiment.crypto.btc.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {sentiment.crypto.btc.change24h >= 0 ? '+' : ''}{sentiment.crypto.btc.change24h.toFixed(2)}%
                  </div>
                  <div className="flex gap-1 mt-2">
                    <Badge className={`${getSentimentColor(sentiment.crypto.btc.sentiment)} text-xs`}>
                      {sentiment.crypto.btc.sentiment}
                    </Badge>
                    {sentiment.crypto.btc.gexSentiment && (
                      <Badge variant="outline" className="text-xs">
                        GEX: {sentiment.crypto.btc.gexSentiment}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Trump Impact */}
            {sentiment && sentiment.trumpCommunications && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Trump Impact
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {sentiment.trumpCommunications.marketImpactScore.toFixed(1)}/10
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className={`w-3 h-3 rounded-full ${getAlertLevelColor(sentiment.trumpCommunications.alertLevel)}`}></div>
                    <span className="text-sm capitalize">{sentiment.trumpCommunications.alertLevel} Alert</span>
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
                    <span className="text-sm capitalize">{sentiment.trumpCommunications.alertLevel} Alert Level</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {sentiment.trumpCommunications.recentPosts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No high-impact communications detected recently
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentiment.trumpCommunications.recentPosts.map((post) => (
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