import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  BarChart3, 
  PieChart,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Users,
  Building,
  Activity,
  Star,
  Shield
} from "lucide-react";

interface FundamentalData {
  symbol: string;
  company: string;
  sector: string;
  industry: string;
  description: string;
  valuation: {
    marketCap: number;
    enterpriseValue: number;
    priceToEarnings: number;
    priceToBook: number;
    priceToSales: number;
    priceEarningsGrowth: number;
    evToRevenue: number;
    evToEbitda: number;
    dividendYield: number;
    payoutRatio: number;
  };
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roe: number;
    roa: number;
    roic: number;
  };
  growth: {
    revenueGrowthTTM: number;
    earningsGrowthTTM: number;
    revenueGrowth5Y: number;
    earningsGrowth5Y: number;
  };
  financials: {
    revenue: number;
    revenueGrowth: number;
    netIncome: number;
    earningsPerShare: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    returnOnEquity: number;
    debtToEquity: number;
    currentRatio: number;
    freeCashFlow: number;
    bookValuePerShare: number;
  };
  events: {
    lastDividendDate: string | null;
  };
  risk: {
    overallRisk: string;
    liquidityRisk: number;
    volatilityRisk: number;
    fundamentalRisk: number;
    technicalRisk: number;
    sentimentRisk: number;
    concentrationRisk: number;
  };
  perShare: {
    earnings: number;
    book: number;
    sales: number;
    cashFlow: number;
    dividend: number;
    dividendYield: number;
  };
  analyst: {
    recommendation: string;
    targetPrice: number;
    priceTarget12M: number;
    analystCount: number;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
  };
  lastUpdated: string;
}

export default function Fundamentals() {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [searchSymbol, setSearchSymbol] = useState("");
  
  // Get fundamentals for selected symbol from API with JSON fallback
  const { data: fundamentals, isLoading, error } = useQuery<FundamentalData>({
    queryKey: ["fundamentals", selectedSymbol],
    enabled: !!selectedSymbol,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    queryFn: async ({ queryKey }) => {
      const [, symbol] = queryKey as [string, string];

      // Try API first
      try {
        const res = await fetch(`/api/fundamentals/${symbol}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {
        // ignore and try local file
      }

      // Fallback to local JSON file
      const localRes = await fetch(`/data/intelligence/${symbol}_fundamentals.json`);
      if (!localRes.ok) {
        throw new Error("Failed to load fundamentals data");
      }
      return await localRes.json();
    }
  });

  // Mock additional data for now
  const score = {
    overall: 78,
    financial: 85,
    valuation: 72,
    growth: 88,
    quality: 76,
    momentum: 65,
    strengths: ["Strong revenue growth", "High profit margins", "Low debt levels"],
    warnings: ["High valuation", "Market volatility risk"],
    explanation: ["Company shows strong fundamentals", "Revenue growth trending upward", "Solid balance sheet position"]
  };

  const news = [];
  const sentiment = {
    overall_sentiment: 0.3,
    confidence: 0.85,
    market_impact: "moderate",
    length: 0,
    slice: () => []
  };

  const handleSearch = () => {
    if (searchSymbol.trim()) {
      setSelectedSymbol(searchSymbol.toUpperCase().trim());
      setSearchSymbol("");
    }
  };

  const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === 0) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const formatPercent = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case 'Low': return "text-green-600";
      case 'Medium': return "text-yellow-600";
      case 'High': return "text-red-600";
      default: return "text-gray-600";
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load fundamentals data. Please check your API configuration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fundamental Analysis</h1>
          <p className="text-muted-foreground">Comprehensive company analysis and valuation</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter symbol (e.g., AAPL)"
            value={searchSymbol}
            onChange={(e) => setSearchSymbol(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="w-48"
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading fundamentals for {selectedSymbol}...</p>
          </div>
        </div>
      ) : fundamentals ? (
        <>
          {/* Company Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{fundamentals.company}</CardTitle>
                  <CardDescription>{fundamentals.symbol} • {fundamentals.sector} • {fundamentals.industry}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold">Market Cap: ${formatNumber(fundamentals.valuation.marketCap)}</div>
                  <div className="text-sm text-muted-foreground">
                    Last Updated: {new Date(fundamentals.lastUpdated).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Overall Score */}
          {score && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Star className="mr-2 h-5 w-5" />
                  Fundamental Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${getScoreColor(score.overall)}`}>
                      {score.overall}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall</div>
                    <Progress value={score.overall} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">{score.financial}</div>
                    <div className="text-sm text-muted-foreground">Financial</div>
                    <Progress value={score.financial} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">{score.valuation}</div>
                    <div className="text-sm text-muted-foreground">Valuation</div>
                    <Progress value={score.valuation} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">{score.growth}</div>
                    <div className="text-sm text-muted-foreground">Growth</div>
                    <Progress value={score.growth} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">{score.quality}</div>
                    <div className="text-sm text-muted-foreground">Quality</div>
                    <Progress value={score.quality} className="mt-2" />
                  </div>
                  
                  <div className="text-center">
                    <div className="text-lg font-semibold">{score.momentum}</div>
                    <div className="text-sm text-muted-foreground">Momentum</div>
                    <Progress value={score.momentum} className="mt-2" />
                  </div>
                </div>

                {/* Score Insights */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {score.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-600 mb-2 flex items-center">
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Strengths
                      </h4>
                      <ul className="text-sm space-y-1">
                        {score.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {score.warnings.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-2 flex items-center">
                        <AlertTriangle className="mr-1 h-4 w-4" />
                        Warnings
                      </h4>
                      <ul className="text-sm space-y-1">
                        {score.warnings.map((warning, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {score.explanation.length > 0 && (
                    <div>
                      <h4 className="font-medium text-blue-600 mb-2 flex items-center">
                        <Target className="mr-1 h-4 w-4" />
                        Key Insights
                      </h4>
                      <ul className="text-sm space-y-1">
                        {score.explanation.map((insight, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="financial" className="space-y-6">
            <TabsList className="grid grid-cols-7 w-full">
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="analyst">Analyst</TabsTrigger>
              <TabsTrigger value="technical">Technical</TabsTrigger>
              <TabsTrigger value="risk">Risk</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Revenue & Growth */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Revenue & Growth</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Revenue:</span>
                        <span className="font-medium">{formatNumber(fundamentals.financials.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Revenue Growth:</span>
                        <span className={`font-medium ${fundamentals.financials.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(fundamentals.financials.revenueGrowth)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Income:</span>
                        <span className="font-medium">{formatNumber(fundamentals.financials.netIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EPS:</span>
                        <span className="font-medium">${fundamentals.financials.earningsPerShare.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Profitability */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Profitability</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Gross Margin:</span>
                        <span className="font-medium">{formatPercent(fundamentals.financials.grossMargin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Operating Margin:</span>
                        <span className="font-medium">{formatPercent(fundamentals.financials.operatingMargin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Net Margin:</span>
                        <span className="font-medium">{formatPercent(fundamentals.financials.netMargin)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>ROE:</span>
                        <span className="font-medium">{formatPercent(fundamentals.financials.returnOnEquity)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Health */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
                    <Shield className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Debt/Equity:</span>
                        <span className={`font-medium ${fundamentals.financials.debtToEquity > 1 ? 'text-red-600' : 'text-green-600'}`}>
                          {fundamentals.financials.debtToEquity.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Current Ratio:</span>
                        <span className={`font-medium ${fundamentals.financials.currentRatio > 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {fundamentals.financials.currentRatio.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Free Cash Flow:</span>
                        <span className="font-medium">{formatNumber(fundamentals.financials.freeCashFlow)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Book Value/Share:</span>
                        <span className="font-medium">${fundamentals.financials.bookValuePerShare.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="valuation" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Price Ratios */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Price Ratios</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>P/E Ratio:</span>
                        <span className="font-medium">{fundamentals.valuation.priceToEarnings.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P/B Ratio:</span>
                        <span className="font-medium">{fundamentals.valuation.priceToBook.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>P/S Ratio:</span>
                        <span className="font-medium">{fundamentals.valuation.priceToSales.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PEG Ratio:</span>
                        <span className="font-medium">{fundamentals.valuation.priceEarningsGrowth.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enterprise Value */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Enterprise Value</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Enterprise Value:</span>
                        <span className="font-medium">{formatNumber(fundamentals.valuation.enterpriseValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EV/Revenue:</span>
                        <span className="font-medium">{fundamentals.valuation.evToRevenue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>EV/EBITDA:</span>
                        <span className="font-medium">{fundamentals.valuation.evToEbitda.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Dividend Info */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Dividend</CardTitle>
                    <PieChart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Dividend Yield:</span>
                        <span className="font-medium">{formatPercent(fundamentals.valuation.dividendYield)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payout Ratio:</span>
                        <span className="font-medium">{formatPercent(fundamentals.valuation.payoutRatio)}</span>
                      </div>
                      {fundamentals.events.lastDividendDate && (
                        <div className="flex justify-between">
                          <span>Last Dividend:</span>
                          <span className="font-medium">
                            {new Date(fundamentals.events.lastDividendDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="mr-2 h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                  <CardDescription>
                    Overall Risk: <span className={`font-semibold ${getRiskColor(fundamentals.risk.overallRisk)}`}>
                      {fundamentals.risk.overallRisk}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Liquidity Risk</h4>
                      <Progress value={fundamentals.risk.liquidityRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.liquidityRisk.toFixed(0)}% risk level</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Volatility Risk</h4>
                      <Progress value={fundamentals.risk.volatilityRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.volatilityRisk.toFixed(0)}% risk level</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Fundamental Risk</h4>
                      <Progress value={fundamentals.risk.fundamentalRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.fundamentalRisk.toFixed(0)}% risk level</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Technical Risk</h4>
                      <Progress value={fundamentals.risk.technicalRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.technicalRisk.toFixed(0)}% risk level</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Sentiment Risk</h4>
                      <Progress value={fundamentals.risk.sentimentRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.sentimentRisk.toFixed(0)}% risk level</p>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-3">Concentration Risk</h4>
                      <Progress value={fundamentals.risk.concentrationRisk} className="mb-2" />
                      <p className="text-sm text-muted-foreground">{fundamentals.risk.concentrationRisk.toFixed(0)}% risk level</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sentiment Overview */}
                {sentiment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="mr-2 h-5 w-5" />
                        Sentiment Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span>Overall Sentiment:</span>
                          <Badge variant={sentiment.overall_sentiment > 0.2 ? "default" : sentiment.overall_sentiment < -0.2 ? "destructive" : "secondary"}>
                            {sentiment.overall_sentiment > 0.2 ? "Bullish" : sentiment.overall_sentiment < -0.2 ? "Bearish" : "Neutral"}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="flex justify-between mb-2">
                            <span>Sentiment Score:</span>
                            <span className="font-medium">{sentiment.overall_sentiment.toFixed(2)}</span>
                          </div>
                          <Progress 
                            value={(sentiment.overall_sentiment + 1) * 50} 
                            className="h-2"
                          />
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Confidence:</span>
                          <span className="font-medium">{formatPercent(sentiment.confidence)}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span>Market Impact:</span>
                          <Badge variant={sentiment.market_impact === 'high' ? "destructive" : sentiment.market_impact === 'medium' ? "default" : "secondary"}>
                            {sentiment.market_impact}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recent News */}
                {news && news.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent News</CardTitle>
                      <CardDescription>{news.length} articles in the last 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {news.slice(0, 5).map((article: any, index: number) => (
                          <div key={index} className="border-b pb-3 last:border-b-0">
                            <h4 className="font-medium text-sm leading-tight">{article.title}</h4>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">{article.source}</span>
                              {article.sentiment && (
                                <Badge 
                                  variant={article.sentiment.label === 'bullish' ? "default" : article.sentiment.label === 'bearish' ? "destructive" : "secondary"}
                                  className="text-xs"
                                >
                                  {article.sentiment.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(article.publishedAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Add other tab contents for trading, analyst, technical as needed */}
          </Tabs>
        </>
      ) : (
        <div className="text-center py-12">
          <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No Data Available</h3>
          <p className="text-muted-foreground">Enter a symbol to view fundamental analysis</p>
        </div>
      )}
    </div>
  );
}