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

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.2) return 'text-green-600 bg-green-100';
    if (sentiment < -0.2) return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getVIXLevel = (vix: number) => {
    if (vix >= 30) return { label: 'High Volatility', color: 'text-red-600' };
    if (vix >= 20) return { label: 'Elevated', color: 'text-yellow-600' };
    return { label: 'Low Volatility', color: 'text-green-600' };
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatChartData = () => {
    if (!historicalData?.data || !historicalData.data.timestamps.length) return [];

    return historicalData.data.timestamps.map((timestamp, index) => ({
      time: new Date(timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
      }),
      timestamp: new Date(timestamp).getTime(),
      overallSentiment: historicalData.data.overallSentiment[index] * 100,
      fearGreedIndex: historicalData.data.fearGreedIndex[index],
      vixLevel: historicalData.data.vixLevel[index],
      callPutRatio: historicalData.data.callPutRatio[index],
      marketBreadth: historicalData.data.marketBreadth[index] * 100,
      newsFlow: historicalData.data.newsFlow[index] * 100,
      cryptoCorrelation: historicalData.data.cryptoCorrelation[index] * 100,
      dollarStrength: historicalData.data.dollarStrength[index],
      confidenceScore: historicalData.data.confidenceScore[index]
    }));
  };

  const chartData = formatChartData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load market sentiment data. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sentimentData = (marketSentiment as MarketSentimentData)?.data;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Market Sentiment & Communications Intelligence</h1>
          <p className="text-gray-600 mt-1">
            Real-time market sentiment analysis with historical tracking and predictive insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto Refresh {autoRefresh && '(ON)'}
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Sentiment</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentimentData ? ((sentimentData.overallSentiment || 0) * 100).toFixed(1) : '0.0'}%
            </div>
            <Badge className={getSentimentColor(sentimentData?.overallSentiment || 0)}>
              {(sentimentData?.overallSentiment || 0) > 0.2 ? 'Bullish' : 
               (sentimentData?.overallSentiment || 0) < -0.2 ? 'Bearish' : 'Neutral'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentimentData?.fearGreedIndex || 50}
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getFearGreedColor(sentimentData?.fearGreedIndex || 50)}`}></div>
              <span className="text-sm text-gray-600">
                {getFearGreedLabel(sentimentData?.fearGreedIndex || 50)}
              </span>
            </div>
            <Progress 
              value={sentimentData?.fearGreedIndex || 50} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIX Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentimentData?.volatilityMetrics?.vixLevel?.toFixed(2) || '20.00'}
            </div>
            <div className={`text-sm ${getVIXLevel(sentimentData?.volatilityMetrics?.vixLevel || 20).color}`}>
              {getVIXLevel(sentimentData?.volatilityMetrics?.vixLevel || 20).label}
            </div>
            {sentimentStats && (
              <div className="flex items-center mt-1">
                {getTrendIcon(sentimentStats.data.vixTrend)}
                <span className="text-xs text-gray-500 ml-1">
                  {sentimentStats.data.vixTrend}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confidence Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentimentData?.predictiveSignals?.confidenceScore || 50}%
            </div>
            <div className="text-sm text-gray-600">
              {sentimentData?.predictiveSignals?.nextDayBias || 'neutral'}
            </div>
            {sentimentStats && (
              <div className="flex items-center mt-1">
                {getTrendIcon(sentimentStats.data.confidenceTrend)}
                <span className="text-xs text-gray-500 ml-1">
                  {sentimentStats.data.confidenceTrend}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedChart} onValueChange={setSelectedChart} className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="sentiment">Sentiment Trends</TabsTrigger>
            <TabsTrigger value="volatility">Volatility Analysis</TabsTrigger>
            <TabsTrigger value="flows">Options Flow</TabsTrigger>
            <TabsTrigger value="macro">Macro Context</TabsTrigger>
          </TabsList>
          <div className="flex space-x-2">
            {['1h', '4h', '24h', '7d', '30d'].map((timeframe) => (
              <Button
                key={timeframe}
                variant={selectedTimeframe === timeframe ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(timeframe)}
              >
                {timeframe}
              </Button>
            ))}
          </div>
        </div>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Sentiment & Fear/Greed Trends ({selectedTimeframe})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistorical ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="fearGreedIndex"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      stroke="#8884d8"
                      name="Fear & Greed Index"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="overallSentiment"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Overall Sentiment (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="confidenceScore"
                      stroke="#ffc658"
                      strokeWidth={2}
                      name="Confidence Score"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No historical data available for selected timeframe
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volatility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                VIX & Market Volatility ({selectedTimeframe})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistorical ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="vixLevel"
                      fill="#ff6b6b"
                      fillOpacity={0.6}
                      stroke="#ff6b6b"
                      name="VIX Level"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No historical data available for selected timeframe
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Options Flow & Market Breadth ({selectedTimeframe})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistorical ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="callPutRatio"
                      fill="#8884d8"
                      name="Call/Put Ratio"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="marketBreadth"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Market Breadth (%)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No historical data available for selected timeframe
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="macro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Macro Context & Correlations ({selectedTimeframe})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistorical ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="dollarStrength"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Dollar Strength"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cryptoCorrelation"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Crypto Correlation (%)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="newsFlow"
                      stroke="#ffc658"
                      strokeWidth={2}
                      name="News Sentiment (%)"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  No historical data available for selected timeframe
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Market Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Options Flow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Call/Put Ratio</span>
              <span className="font-semibold">
                {sentimentData?.optionsFlow?.callPutRatio?.toFixed(2) || '1.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Net Flow</span>
              <span className="font-semibold">
                ${(sentimentData?.optionsFlow?.netFlow || 0).toLocaleString()}M
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Dark Pool Activity</span>
              <span className="font-semibold">
                {((sentimentData?.optionsFlow?.darkPoolActivity || 0) * 100).toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Market Breadth</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Advance/Decline</span>
              <span className="font-semibold">
                {sentimentData?.marketBreadth?.advanceDeclineRatio?.toFixed(2) || '1.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Highs</span>
              <span className="font-semibold text-green-600">
                {sentimentData?.marketBreadth?.newHighsLows?.newHighs || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">New Lows</span>
              <span className="font-semibold text-red-600">
                {sentimentData?.marketBreadth?.newHighsLows?.newLows || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Predictive Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Next Day Bias</span>
              <Badge variant="outline">
                {sentimentData?.predictiveSignals?.nextDayBias || 'neutral'}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Weekly Outlook</span>
              <Badge variant="outline">
                {sentimentData?.predictiveSignals?.weeklyOutlook || 'balanced'}
              </Badge>
            </div>
            {sentimentStats && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Market Regime</span>
                <Badge 
                  className={
                    sentimentStats.data.marketRegime === 'bull' 
                      ? 'bg-green-100 text-green-800' 
                      : sentimentStats.data.marketRegime === 'bear'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }
                >
                  {sentimentStats.data.marketRegime}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data source footer */}
      <div className="text-center text-sm text-gray-500 mt-8">
        Last updated: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleString() : 'Never'} | 
        Data sources: Unusual Whales API, Alpha Vantage, Market Breadth Analysis
      </div>
    </div>
  );
}
