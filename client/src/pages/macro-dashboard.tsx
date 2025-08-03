import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
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
  Zap
} from "lucide-react";

export default function MacroDashboard() {
  // Get macroeconomic data
  const { data: macroData, isLoading: isLoadingMacro, error: macroError } = useQuery({
    queryKey: ['/api/macro/data'],
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  // Get macroeconomic analysis
  const { data: macroAnalysis, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ['/api/macro/analysis'],
    refetchInterval: 15 * 60 * 1000 // Refresh every 15 minutes
  });

  // Get Fear & Greed Index
  const { data: fearGreedData } = useQuery({
    queryKey: ['/api/macro/fear-greed'],
    refetchInterval: 2 * 60 * 1000 // Refresh every 2 minutes
  });

  // Get yield curve data
  const { data: yieldCurveData } = useQuery({
    queryKey: ['/api/macro/yield-curve'],
    refetchInterval: 5 * 60 * 1000
  });

  const formatPercent = (num: number): string => {
    return `${num.toFixed(2)}%`;
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    return num.toFixed(decimals);
  };

  const getFearGreedColor = (index: number): string => {
    if (index >= 75) return "text-red-600 bg-red-50";
    if (index >= 55) return "text-orange-600 bg-orange-50";
    if (index >= 45) return "text-blue-600 bg-blue-50";
    if (index >= 25) return "text-yellow-600 bg-yellow-50";
    return "text-green-600 bg-green-50";
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'low': return "text-green-600";
      case 'medium': return "text-yellow-600";
      case 'high': return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const getRegimeColor = (regime: string): string => {
    switch (regime) {
      case 'growth': return "text-green-600";
      case 'expansion': return "text-blue-600";
      case 'recession': return "text-red-600";
      case 'contraction': return "text-orange-600";
      default: return "text-gray-600";
    }
  };

  if (macroError) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load macroeconomic data. Please check your API configuration.
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
          <h1 className="text-3xl font-bold">Macroeconomic Dashboard</h1>
          <p className="text-muted-foreground">Real-time economic indicators and market sentiment analysis</p>
        </div>
        
        {macroData && (
          <div className="text-right">
            <div className="text-sm text-muted-foreground">
              Last Updated: {new Date(macroData.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {isLoadingMacro ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading macroeconomic data...</p>
          </div>
        </div>
      ) : macroData ? (
        <>
          {/* Key Indicators Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Fear & Greed Index */}
            {fearGreedData && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fear & Greed Index</CardTitle>
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fearGreedData.index}</div>
                  <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getFearGreedColor(fearGreedData.index)}`}>
                    {fearGreedData.interpretation}
                  </div>
                  <Progress value={fearGreedData.index} className="mt-2" />
                </CardContent>
              </Card>
            )}

            {/* 10Y Treasury Yield */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">10Y Treasury</CardTitle>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(macroData.treasuryRates.tenYear)}</div>
                <p className="text-xs text-muted-foreground">
                  {macroData.yieldCurve.shape} curve
                </p>
              </CardContent>
            </Card>

            {/* Federal Funds Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fed Funds Rate</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercent(macroData.federalRates.federalFundsRate)}</div>
                <p className="text-xs text-muted-foreground">
                  {macroAnalysis?.monetaryPolicy || 'neutral'} policy
                </p>
              </CardContent>
            </Card>

            {/* VIX */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Volatility (VIX)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(macroData.sentimentIndicators.vix)}</div>
                <p className={`text-xs ${macroData.sentimentIndicators.vix > 25 ? 'text-red-600' : macroData.sentimentIndicators.vix < 15 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {macroData.sentimentIndicators.vix > 25 ? 'High' : macroData.sentimentIndicators.vix < 15 ? 'Low' : 'Normal'} volatility
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="treasury">Treasury & Rates</TabsTrigger>
              <TabsTrigger value="fear-greed">Fear & Greed</TabsTrigger>
              <TabsTrigger value="economic">Economic Data</TabsTrigger>
              <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Market Regime */}
                {macroAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Globe className="mr-2 h-5 w-5" />
                        Economic Assessment
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Market Regime:</span>
                          <Badge className={getRegimeColor(macroAnalysis.marketRegime)}>
                            {macroAnalysis.marketRegime}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span>Economic Health:</span>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{macroAnalysis.economicHealth}</span>
                            <Progress value={macroAnalysis.economicHealth} className="w-20" />
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span>Risk Level:</span>
                          <Badge className={getRiskColor(macroAnalysis.riskLevel)}>
                            {macroAnalysis.riskLevel}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span>Inflation Trend:</span>
                          <span className="font-medium">{macroAnalysis.inflationTrend}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Yield Curve Analysis */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="mr-2 h-5 w-5" />
                      Yield Curve Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Curve Shape:</span>
                        <Badge variant={macroData.yieldCurve.shape === 'inverted' ? 'destructive' : 'default'}>
                          {macroData.yieldCurve.shape}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>10Y-2Y Spread:</span>
                        <span className={`font-medium ${macroData.yieldCurve.steepness < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatPercent(macroData.yieldCurve.steepness)}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span>Risk Signal:</span>
                        <Badge className={getRiskColor(macroData.yieldCurve.riskSignal)}>
                          {macroData.yieldCurve.riskSignal}
                        </Badge>
                      </div>
                      
                      {macroData.yieldCurve.inversionPoints.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-red-600">Inversions:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {macroData.yieldCurve.inversionPoints.map((point, index) => (
                              <Badge key={index} variant="destructive" className="text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Key Signals & Trading Implications */}
              {macroAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Zap className="mr-2 h-5 w-5" />
                        Key Economic Signals
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {macroAnalysis.keySignals.map((signal, index) => (
                          <li key={index} className="flex items-start">
                            <CheckCircle className="mr-2 h-4 w-4 text-blue-500 mt-0.5" />
                            <span className="text-sm">{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="mr-2 h-5 w-5" />
                        Trading Implications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {macroAnalysis.tradingImplications.map((implication, index) => (
                          <li key={index} className="flex items-start">
                            <TrendingUp className="mr-2 h-4 w-4 text-green-500 mt-0.5" />
                            <span className="text-sm">{implication}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="treasury" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Treasury Rates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Treasury Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>1 Month:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.oneMonth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3 Month:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.threeMonth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>1 Year:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.oneYear)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2 Year:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.twoYear)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>5 Year:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.fiveYear)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>10 Year:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.tenYear)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>30 Year:</span>
                        <span className="font-medium">{formatPercent(macroData.treasuryRates.thirtyYear)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Federal Rates */}
                <Card>
                  <CardHeader>
                    <CardTitle>Federal Reserve Rates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Fed Funds Rate:</span>
                        <span className="font-medium">{formatPercent(macroData.federalRates.federalFundsRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount Rate:</span>
                        <span className="font-medium">{formatPercent(macroData.federalRates.discountRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Prime Rate:</span>
                        <span className="font-medium">{formatPercent(macroData.federalRates.primeRate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sentiment Indicators */}
                <Card>
                  <CardHeader>
                    <CardTitle>Market Indicators</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>VIX:</span>
                        <span className="font-medium">{formatNumber(macroData.sentimentIndicators.vix)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Put/Call Ratio:</span>
                        <span className="font-medium">{formatNumber(macroData.sentimentIndicators.putCallRatio)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Dollar Index:</span>
                        <span className="font-medium">{formatNumber(macroData.sentimentIndicators.dollarIndex)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gold Price:</span>
                        <span className="font-medium">${formatNumber(macroData.sentimentIndicators.goldPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Oil Price:</span>
                        <span className="font-medium">${formatNumber(macroData.sentimentIndicators.oilPrice)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fear-greed" className="space-y-6">
              {fearGreedData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Fear & Greed Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Gauge className="mr-2 h-5 w-5" />
                        Fear & Greed Index: {fearGreedData.index}
                      </CardTitle>
                      <CardDescription>
                        Current market sentiment: {fearGreedData.interpretation}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Progress value={fearGreedData.index} className="h-4" />
                        
                        <div className="grid grid-cols-5 text-xs text-center">
                          <div className="text-red-600">Extreme Fear</div>
                          <div className="text-orange-600">Fear</div>
                          <div className="text-gray-600">Neutral</div>
                          <div className="text-blue-600">Greed</div>
                          <div className="text-purple-600">Extreme Greed</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Component Breakdown */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Component Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Market Momentum</span>
                            <span className="text-sm font-medium">{fearGreedData.components.marketMomentum}</span>
                          </div>
                          <Progress value={fearGreedData.components.marketMomentum} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Stock Price Strength</span>
                            <span className="text-sm font-medium">{fearGreedData.components.stockPriceStrength}</span>
                          </div>
                          <Progress value={fearGreedData.components.stockPriceStrength} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Market Volatility</span>
                            <span className="text-sm font-medium">{fearGreedData.components.marketVolatility}</span>
                          </div>
                          <Progress value={fearGreedData.components.marketVolatility} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Put/Call Options</span>
                            <span className="text-sm font-medium">{fearGreedData.components.putCallOptions}</span>
                          </div>
                          <Progress value={fearGreedData.components.putCallOptions} className="h-2" />
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm">Safe Haven Demand</span>
                            <span className="text-sm font-medium">{fearGreedData.components.safeHavenDemand}</span>
                          </div>
                          <Progress value={fearGreedData.components.safeHavenDemand} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="economic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Employment & Growth</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Unemployment Rate:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.unemploymentRate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GDP Growth:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.gdpGrowth)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Industrial Production:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.industrialProduction)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Inflation & Prices</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Consumer Price Index:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.cpi)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Producer Price Index:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.ppi)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Consumer & Housing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Consumer Confidence:</span>
                        <span className="font-medium">{formatNumber(macroData.economicData.consumerConfidence)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Retail Sales:</span>
                        <span className="font-medium">{formatPercent(macroData.economicData.retailSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Housing Starts:</span>
                        <span className="font-medium">{formatNumber(macroData.economicData.housingStarts, 1)}M</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {isLoadingAnalysis ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <Activity className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p>Analyzing macroeconomic conditions...</p>
                  </div>
                </div>
              ) : macroAnalysis ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Shield className="mr-2 h-5 w-5" />
                      AI-Powered Economic Analysis
                    </CardTitle>
                    <CardDescription>
                      Generated at {new Date(macroAnalysis.timeframe).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-blue-600 mb-3">Key Economic Signals</h4>
                        <ul className="space-y-2">
                          {macroAnalysis.keySignals.map((signal, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="mr-2 h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-medium text-green-600 mb-3">Trading Implications</h4>
                        <ul className="space-y-2">
                          {macroAnalysis.tradingImplications.map((implication, index) => (
                            <li key={index} className="flex items-start">
                              <TrendingUp className="mr-2 h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{implication}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    AI analysis not available. Please check your Google Gemini API configuration.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12">
          <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Macroeconomic Data Available</h3>
          <p className="text-muted-foreground">Check your FRED API configuration to enable data collection</p>
        </div>
      )}
    </div>
  );
}