import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Activity, 
  Target, 
  Clock,
  DollarSign,
  BarChart3,
  AlertTriangle,
  Play,
  RefreshCw
} from 'lucide-react';

type TickerAnalysis = {
  ticker: string;
  probability: number;
  underlying_price: number;
  gex_exposure: number;
  flow_sentiment: string;
  news_sentiment: string;
  recommended_action: string;
  reasoning: string;
  top_contracts: ShortExpiryContract[];
};

type HotContracts = Array<{ contractId: string; details: string }>;

type ShortExpiryContract = {
  contractId: string;
  ticker: string;
  strike: number;
  type: string;
  expiration: string;
  details: string;
  ask: number;
  bid: number;
  dte: number;
  moneyness: string;
  volume: number;
  probability: number;
  recommendation: string;
  price: number;
  openInterest: number; // Added missing property
};

export default function ShortExpiryDashboard() {
  const [ticker, setTicker] = useState('SPY');
  const [probabilityThreshold, setProbabilityThreshold] = useState([70]);
  const [selectedContract, setSelectedContract] = useState<ShortExpiryContract | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tickerAnalysis, setTickerAnalysis] = useState<TickerAnalysis | null>(null);

  const { data: hotContracts, isLoading: hotLoading, refetch: refetchHot } = useQuery({
    queryKey: ['/api/short-expiry/hot-contracts'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const { data: fdaAlerts = [] } = useQuery({
    queryKey: ['/api/fda/alerts'],
    refetchInterval: 60000,
  });

  const { data: analysisData, isLoading: analysisLoading, refetch: refetchAnalysis } = useQuery({
    queryKey: ['/api/short-expiry/analyze', ticker, probabilityThreshold[0]],
    enabled: !!ticker,
    refetchInterval: autoRefresh ? 60000 : false,
  });

  // Defensive mapping for hotContracts
  const validHotContracts: ShortExpiryContract[] = Array.isArray(hotContracts)
    ? hotContracts.filter((c: any) => c && typeof c === 'object' && 'ticker' in c && 'strike' in c && 'type' in c && 'expiration' in c)
    : [];

  // Defensive mapping for top contracts in tickerAnalysis
  const validTopContracts: ShortExpiryContract[] = tickerAnalysis && Array.isArray(tickerAnalysis.top_contracts)
    ? tickerAnalysis.top_contracts.filter((c: any) => c && typeof c === 'object' && 'ticker' in c && 'strike' in c && 'type' in c && 'expiration' in c)
    : [];

  // Defensive fallback for FDA alerts
  const safeFdaAlerts: any[] = Array.isArray(fdaAlerts) ? fdaAlerts : [];

  useEffect(() => {
    if (analysisData && typeof analysisData === 'object' && 'ticker' in analysisData) {
      setTickerAnalysis(analysisData as TickerAnalysis);
    } else {
      setTickerAnalysis(null);
    }
  }, [analysisData]);

  const handleAnalyzeTicker = () => {
    if (ticker.trim()) {
      refetchAnalysis();
    }
  };

  const handleExecuteTrade = async (contract: ShortExpiryContract) => {
    try {
      const response = await fetch('/api/orders/short-expiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: contract.ticker,
          strike: contract.strike,
          expiry: contract.expiration,
          type: contract.type,
          action: 'BUY',
          quantity: 1,
          price: contract.ask
        })
      });
      
      if (response.ok) {
        alert(`Order submitted for ${contract.ticker} ${contract.strike}${contract.type.toUpperCase()}`);
      } else {
        alert('Failed to submit order');
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(`Error executing trade: ${error.message}`);
      } else {
        alert('Unknown error occurred during trade execution.');
      }
    }
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600 bg-green-100';
    if (probability >= 70) return 'text-blue-600 bg-blue-100';
    if (probability >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'strong_buy': return 'bg-green-600 text-white';
      case 'buy': return 'bg-green-500 text-white';
      case 'neutral': return 'bg-gray-500 text-white';
      case 'sell': return 'bg-red-500 text-white';
      case 'strong_sell': return 'bg-red-600 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'bearish': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Short Expiry Options Dashboard</h1>
          <p className="text-gray-600 mt-1">
            0-5 DTE options analysis with GEX, flow, and sentiment intelligence
          </p>
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
        </div>
      </div>

      <Tabs defaultValue="analyzer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyzer">Ticker Analyzer</TabsTrigger>
          <TabsTrigger value="hottest">Top 10 Hottest</TabsTrigger>
          <TabsTrigger value="fda-alerts">FDA Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="analyzer" className="space-y-6">
          {/* Ticker Analysis Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Ticker Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol</Label>
                  <Input
                    id="ticker"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="Enter ticker..."
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probability Threshold: {probabilityThreshold[0]}%</Label>
                  <Slider
                    value={probabilityThreshold}
                    onValueChange={setProbabilityThreshold}
                    max={95}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAnalyzeTicker} className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Analyze
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Results */}
          {analysisLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Analyzing {ticker}...
                </div>
              </CardContent>
            </Card>
          )}

          {tickerAnalysis && (
            <div className="space-y-4">
              {/* Analysis Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{tickerAnalysis.ticker} Analysis</span>
                    <Badge className={getProbabilityColor(tickerAnalysis.probability)}>
                      {tickerAnalysis.probability}% Confidence
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Underlying Price</div>
                      <div className="text-lg font-bold">${tickerAnalysis.underlying_price.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">GEX Exposure</div>
                      <div className="text-lg font-bold">{tickerAnalysis.gex_exposure.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Flow Sentiment</div>
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(tickerAnalysis.flow_sentiment)}
                        <span className="font-medium capitalize">{tickerAnalysis.flow_sentiment}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">News Sentiment</div>
                      <div className="flex items-center gap-1">
                        {getSentimentIcon(tickerAnalysis.news_sentiment)}
                        <span className="font-medium capitalize">{tickerAnalysis.news_sentiment}</span>
                      </div>
                    </div>
                  </div>

                  {tickerAnalysis.recommended_action !== 'none' && (
                    <Alert className="mb-4">
                      <TrendingUp className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Recommendation:</strong> {tickerAnalysis.recommended_action.toUpperCase()} - {tickerAnalysis.reasoning}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Top Contracts for This Ticker */}
                  {validTopContracts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Recommended Contracts</h3>
                      <div className="grid gap-2">
                        {validTopContracts.map((contract) => (
                          <Card key={contract.contractId || `${contract.ticker}-${contract.strike}-${contract.type}-${contract.expiration}` } className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="font-medium">
                                    {contract.ticker} ${contract.strike} {contract.type?.toUpperCase?.()}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {contract.dte ?? '?'} DTE • {contract.moneyness ?? '?'} • Vol: {contract.volume?.toLocaleString?.() ?? '?'}
                                  </div>
                                </div>
                                <Badge className={getProbabilityColor(contract.probability ?? 0)}>
                                  {contract.probability ?? '?'}%
                                </Badge>
                                <Badge className={getRecommendationColor(contract.recommendation ?? 'neutral')}>
                                  {(contract.recommendation ?? 'neutral').replace('_', ' ').toUpperCase()}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="font-bold">${contract.price?.toFixed?.(2) ?? '?'}</div>
                                  <div className="text-sm text-gray-600">
                                    ${contract.bid?.toFixed?.(2) ?? '?'} - ${contract.ask?.toFixed?.(2) ?? '?'}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleExecuteTrade(contract)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Play className="h-3 w-3 mr-1" />
                                  Buy
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="hottest" className="space-y-6">
          {/* Top 10 Hottest Contracts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Top 10 Hottest Short Expiry Contracts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {hotLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  Loading hottest contracts...
                </div>
              ) : validHotContracts.length > 0 ? (
                <div className="space-y-3">
                  {validHotContracts.slice(0, 10).map((contract: ShortExpiryContract, index: number) => (
                    <Card key={contract.contractId || `${contract.ticker}-${contract.strike}-${contract.type}-${contract.expiration}` } className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-lg font-bold text-gray-500">
                            #{index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-lg">
                              {contract.ticker} ${contract.strike} {contract.type?.toUpperCase?.()}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {contract.dte ?? '?'} DTE
                              </span>
                              <span className="flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" />
                                Vol: {contract.volume?.toLocaleString?.() ?? '?'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                OI: {contract.openInterest?.toLocaleString?.() ?? '?'}
                              </span>
                              <span>{contract.moneyness ?? '?'}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getProbabilityColor(contract.probability ?? 0)}>
                              {contract.probability ?? '?'}%
                            </Badge>
                            <Badge className={getRecommendationColor(contract.recommendation ?? 'neutral')}>
                              {(contract.recommendation ?? 'neutral').replace('_', ' ').toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getSentimentIcon((contract as any).gexSentiment ?? 'neutral')}
                              GEX
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              {getSentimentIcon((contract as any).flowSentiment ?? 'neutral')}
                              Flow
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold text-lg">${contract.price?.toFixed?.(2) ?? '?'}</div>
                            <div className="text-sm text-gray-600">
                              ${contract.bid?.toFixed?.(2) ?? '?'} - ${contract.ask?.toFixed?.(2) ?? '?'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Heat: {(contract as any).heat_score?.toFixed?.(1) ?? '?'}
                            </div>
                          </div>
                          <Button
                            onClick={() => handleExecuteTrade(contract)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 italic">
                        {(contract as any).reasoning ?? ''}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No hot contracts available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FDA Alerts Tab */}
        <TabsContent value="fda-alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                FDA Alerts & Trading Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              {safeFdaAlerts.length > 0 ? (
                <div className="space-y-4">
                  {safeFdaAlerts.map((alert: any) => (
                    <Card key={alert.id} className="border-l-4 border-l-orange-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{alert.ticker}</Badge>
                              <Badge className={
                                alert.event.type === 'approval' ? 'bg-green-500' :
                                alert.event.type === 'recall' ? 'bg-red-500' :
                                'bg-yellow-500'
                              }>
                                {alert.event.type.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary">{alert.event.impact.toUpperCase()} Impact</Badge>
                            </div>
                            <h4 className="font-medium">{alert.event.company}</h4>
                            <p className="text-sm text-gray-600">{alert.event.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {new Date(alert.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Trading Opportunity</span>
                            <Badge className={
                              alert.optionsOpportunity.recommendation === 'call' ? 'bg-green-500' : 'bg-red-500'
                            }>
                              {alert.optionsOpportunity.recommendation.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{alert.optionsOpportunity.reasoning}</p>
                          <div className="flex items-center justify-between text-sm">
                            <span>Confidence: <strong>{alert.optionsOpportunity.confidence}%</strong></span>
                            <span>Timeframe: <strong>{alert.optionsOpportunity.timeframe}</strong></span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No FDA alerts currently active</p>
                  <p className="text-sm mt-2">FDA monitoring service scans for drug approvals, recalls, and warning letters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}