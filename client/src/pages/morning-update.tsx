import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock,
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  BarChart3,
  LineChart,
  Gauge,
  Shield,
  Globe,
  Building,
  Zap,
  Calendar,
  Eye,
  RefreshCw,
  Bell,
  PieChart,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";

interface MorningUpdateData {
  id: string;
  timestamp: string;
  marketOpen: string;
  minutesToOpen: number;
  marketOverview: {
    preMarketSentiment: 'bullish' | 'bearish' | 'neutral';
    keyLevels: {
      spy: { support: number; resistance: number; current: number };
      qqq: { support: number; resistance: number; current: number };
      vix: { current: number; trend: 'rising' | 'falling' | 'stable' };
    };
    gapAnalysis: {
      symbol: string;
      gapPercent: number;
      direction: 'up' | 'down';
      significance: 'high' | 'medium' | 'low';
    }[];
  };
  economicEvents: {
    time: string;
    event: string;
    importance: 'high' | 'medium' | 'low';
    forecast?: string;
    previous?: string;
    impact: string;
  }[];
  macroSummary: {
    fearGreedIndex: number;
    fearGreedInterpretation: string;
    yieldCurveSignal: 'normal' | 'warning' | 'inverted';
    tenYearYield: number;
    fedFundsRate: number;
    dollarStrength: 'strong' | 'neutral' | 'weak';
    commodityTrend: 'risk-on' | 'risk-off' | 'mixed';
  };
  signalsSummary: {
    totalActiveSignals: number;
    newSignalsOvernight: number;
    highPrioritySignals: {
      ticker: string;
      strategy: string;
      confidence: number;
      premium: number;
      timeframe: string;
    }[];
    sectorFocus: string[];
  };
  newsSentiment: {
    overallSentiment: number;
    topStories: {
      headline: string;
      sentiment: number;
      relevance: 'high' | 'medium' | 'low';
      symbols: string[];
      summary: string;
    }[];
    sectorSentiment: {
      sector: string;
      sentiment: number;
      keyDrivers: string[];
    }[];
  };
  riskAssessment: {
    overallRiskLevel: 'low' | 'medium' | 'high';
    keyRisks: string[];
    portfolioHeat: number;
    recommendedPositionSizing: 'aggressive' | 'normal' | 'conservative';
    hedgingRecommendations: string[];
  };
  aiAnalysis: {
    marketRegime: string;
    tradingTheme: string;
    keyOpportunities: string[];
    watchList: string[];
    tacticalRecommendations: string[];
    riskWarnings: string[];
  };
  performanceUpdate: {
    yesterdayPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    winRate: number;
    activePositions: number;
    portfolioValue: number;
  };
}

export default function MorningUpdatePage() {
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Get morning update data
  const { data: morningUpdate, isLoading, error, refetch } = useQuery<MorningUpdateData | null>({
    queryKey: ['/api/morning-update'],
    refetchInterval: autoRefresh ? 2 * 60 * 1000 : false // Refresh every 2 minutes if auto-refresh enabled
  });

  // Get morning update summary
  const { data: morningUpdateSummary } = useQuery<{
    executiveSummary?: string;
    tradingPlan?: string;
    riskConsiderations?: string;
    keyWatchItems?: string[];
  } | null>({
    queryKey: ['/api/morning-update/summary'],
    enabled: !!morningUpdate,
    refetchInterval: autoRefresh ? 5 * 60 * 1000 : false
  });

  const formatPercent = (num: number): string => {
    return `${num.toFixed(2)}%`;
  };

  const formatCurrency = (num: number): string => {
    return `$${num.toLocaleString()}`;
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getMinutesToOpenColor = (minutes: number): string => {
    if (minutes <= 5) return "text-red-600 bg-red-50";
    if (minutes <= 15) return "text-orange-600 bg-orange-50";
    if (minutes <= 30) return "text-yellow-600 bg-yellow-50";
    return "text-blue-600 bg-blue-50";
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return "text-green-600";
      case 'medium': return "text-yellow-600";
      case 'high': return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const generateManualUpdate = async () => {
    try {
      const response = await fetch('/api/morning-update/generate', { method: 'POST' });
      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to generate manual update:', error);
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load morning update. Please check your system configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Clock className="mr-3 h-8 w-8" />
            Morning Market Update
          </h1>
          <p className="text-muted-foreground">Comprehensive pre-market intelligence and trading preparation</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 text-green-700" : ""}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh: {autoRefresh ? 'On' : 'Off'}
          </Button>
          
          <Button onClick={generateManualUpdate} size="sm">
            <Zap className="mr-2 h-4 w-4" />
            Generate Update
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading morning update...</p>
          </div>
        </div>
      ) : morningUpdate ? (
        <>
          {/* Market Open Countdown */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Market Opens In</CardTitle>
                  <CardDescription>
                    {formatTime(morningUpdate.timestamp)} - Update generated
                  </CardDescription>
                </div>
                <div className={`text-3xl font-bold px-4 py-2 rounded-lg ${getMinutesToOpenColor(morningUpdate.minutesToOpen)}`}>
                  {morningUpdate.minutesToOpen} minutes
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Executive Summary */}
          {morningUpdateSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2">Market Outlook</h4>
                    <p className="text-sm">{morningUpdateSummary.executiveSummary}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Trading Plan</h4>
                    <p className="text-sm">{morningUpdateSummary.tradingPlan}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-orange-600 mb-2">Risk Considerations</h4>
                    <p className="text-sm">{morningUpdateSummary.riskConsiderations}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-purple-600 mb-2">Key Watch Items</h4>
                    <div className="flex flex-wrap gap-2">
                      {morningUpdateSummary.keyWatchItems?.map((item: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pre-Market Sentiment */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pre-Market Sentiment</CardTitle>
                {getSentimentIcon(morningUpdate.marketOverview.preMarketSentiment)}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">
                  {morningUpdate.marketOverview.preMarketSentiment}
                </div>
                <p className="text-xs text-muted-foreground">
                  SPY: ${morningUpdate.marketOverview.keyLevels.spy.current}
                </p>
              </CardContent>
            </Card>

            {/* Fear & Greed */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
                <Gauge className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{morningUpdate.macroSummary.fearGreedIndex}</div>
                <p className="text-xs text-muted-foreground">
                  {morningUpdate.macroSummary.fearGreedInterpretation}
                </p>
              </CardContent>
            </Card>

            {/* VIX Level */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">VIX Level</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{morningUpdate.marketOverview.keyLevels.vix.current.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground capitalize">
                  {morningUpdate.marketOverview.keyLevels.vix.trend} trend
                </p>
              </CardContent>
            </Card>

            {/* Active Signals */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Signals</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{morningUpdate.signalsSummary.totalActiveSignals}</div>
                <p className="text-xs text-muted-foreground">
                  {morningUpdate.signalsSummary.newSignalsOvernight} new overnight
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="signals">Trading Signals</TabsTrigger>
              <TabsTrigger value="news">News & Sentiment</TabsTrigger>
              <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Market Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <LineChart className="mr-2 h-5 w-5" />
                      Market Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Key Levels</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>SPY:</span>
                            <span>${morningUpdate.marketOverview.keyLevels.spy.current} 
                              (S: ${morningUpdate.marketOverview.keyLevels.spy.support} | 
                               R: ${morningUpdate.marketOverview.keyLevels.spy.resistance})
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>QQQ:</span>
                            <span>${morningUpdate.marketOverview.keyLevels.qqq.current} 
                              (S: ${morningUpdate.marketOverview.keyLevels.qqq.support} | 
                               R: ${morningUpdate.marketOverview.keyLevels.qqq.resistance})
                            </span>
                          </div>
                        </div>
                      </div>

                      {morningUpdate.marketOverview.gapAnalysis.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Gap Analysis</h4>
                          {morningUpdate.marketOverview.gapAnalysis.map((gap: any, index: number) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span>{gap.symbol}</span>
                              <div className="flex items-center space-x-2">
                                {gap.direction === 'up' ? <ArrowUp className="h-3 w-3 text-green-600" /> : <ArrowDown className="h-3 w-3 text-red-600" />}
                                <span className={gap.direction === 'up' ? 'text-green-600' : 'text-red-600'}>
                                  {gap.gapPercent.toFixed(2)}%
                                </span>
                                <Badge variant={gap.significance === 'high' ? 'destructive' : gap.significance === 'medium' ? 'default' : 'secondary'} className="text-xs">
                                  {gap.significance}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Economic Events */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="mr-2 h-5 w-5" />
                      Economic Events Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {morningUpdate.economicEvents.length > 0 ? (
                      <div className="space-y-3">
                        {morningUpdate.economicEvents.map((event: any, index: number) => (
                          <div key={index} className="border-l-4 border-blue-200 pl-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-sm">{event.event}</h4>
                                <p className="text-xs text-muted-foreground">{event.time}</p>
                              </div>
                              <Badge variant={event.importance === 'high' ? 'destructive' : event.importance === 'medium' ? 'default' : 'secondary'}>
                                {event.importance}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{event.impact}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No major economic events scheduled</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Macro Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="mr-2 h-5 w-5" />
                    Macroeconomic Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatPercent(morningUpdate.macroSummary.tenYearYield)}</div>
                      <div className="text-xs text-muted-foreground">10Y Treasury</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{formatPercent(morningUpdate.macroSummary.fedFundsRate)}</div>
                      <div className="text-xs text-muted-foreground">Fed Funds Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold capitalize">{morningUpdate.macroSummary.dollarStrength}</div>
                      <div className="text-xs text-muted-foreground">Dollar Strength</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold capitalize">{morningUpdate.macroSummary.commodityTrend}</div>
                      <div className="text-xs text-muted-foreground">Commodity Trend</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="market" className="space-y-6">
              {/* Market data content would go here */}
              <Card>
                <CardHeader>
                  <CardTitle>Market Data Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Detailed market data analysis will be displayed here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* High Priority Signals */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Target className="mr-2 h-5 w-5" />
                      High Priority Signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {morningUpdate.signalsSummary.highPrioritySignals.length > 0 ? (
                      <div className="space-y-3">
                        {morningUpdate.signalsSummary.highPrioritySignals.map((signal: any, index: number) => (
                          <div key={index} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">{signal.ticker}</h4>
                                <p className="text-sm text-muted-foreground">{signal.strategy}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">{signal.confidence}% confidence</div>
                                <div className="text-xs text-muted-foreground">{formatCurrency(signal.premium)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No high priority signals at this time</p>
                    )}
                  </CardContent>
                </Card>

                {/* Sector Focus */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChart className="mr-2 h-5 w-5" />
                      Sector Focus
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {morningUpdate.signalsSummary.sectorFocus.map((sector: string, index: number) => (
                        <Badge key={index} variant="outline" className="mr-2">
                          {sector}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="news" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    News & Sentiment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Overall Market Sentiment:</span>
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${morningUpdate.newsSentiment.overallSentiment > 0 ? 'text-green-600' : morningUpdate.newsSentiment.overallSentiment < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {morningUpdate.newsSentiment.overallSentiment > 0 ? '+' : ''}{morningUpdate.newsSentiment.overallSentiment}
                        </span>
                        <Progress 
                          value={Math.abs(morningUpdate.newsSentiment.overallSentiment)} 
                          className="w-20"
                        />
                      </div>
                    </div>

                    {morningUpdate.newsSentiment.topStories.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Top Stories</h4>
                        <div className="space-y-2">
                          {morningUpdate.newsSentiment.topStories.slice(0, 3).map((story: any, index: number) => (
                            <div key={index} className="border-l-4 border-gray-200 pl-3">
                              <h5 className="text-sm font-medium">{story.headline}</h5>
                              <p className="text-xs text-muted-foreground mt-1">{story.summary}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={story.sentiment > 0 ? 'default' : 'destructive'} className="text-xs">
                                  {story.sentiment > 0 ? 'Bullish' : 'Bearish'}
                                </Badge>
                                {story.symbols.slice(0, 3).map((symbol: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {symbol}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5" />
                      Risk Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Overall Risk Level:</span>
                        <Badge className={getRiskColor(morningUpdate.riskAssessment.overallRiskLevel)}>
                          {morningUpdate.riskAssessment.overallRiskLevel}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Portfolio Heat:</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{morningUpdate.riskAssessment.portfolioHeat}%</span>
                          <Progress value={morningUpdate.riskAssessment.portfolioHeat} className="w-20" />
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Position Sizing:</span>
                        <Badge variant="outline">
                          {morningUpdate.riskAssessment.recommendedPositionSizing}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Key Risks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {morningUpdate.riskAssessment.keyRisks.map((risk: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="mr-2 h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Yesterday P&L</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${morningUpdate.performanceUpdate.yesterdayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(morningUpdate.performanceUpdate.yesterdayPnL)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weekly P&L</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${morningUpdate.performanceUpdate.weeklyPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(morningUpdate.performanceUpdate.weeklyPnL)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatPercent(morningUpdate.performanceUpdate.winRate)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{morningUpdate.performanceUpdate.activePositions}</div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Morning Update Available</h3>
          <p className="text-muted-foreground mb-4">Generate a new morning update to see comprehensive market intelligence</p>
          <Button onClick={generateManualUpdate}>
            <Zap className="mr-2 h-4 w-4" />
            Generate Morning Update
          </Button>
        </div>
      )}
    </div>
  );
}