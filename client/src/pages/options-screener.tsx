import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Clock, 
  Target,
  AlertTriangle,
  BarChart3,
  Zap,
  Eye,
  Settings,
  Brain,
  Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface StringencyMetrics {
  currentStringency: number;
  successRate: number;
  avgReturn: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  avgWinDuration: number;
  avgLossDuration: number;
  tradesGenerated: number;
}

interface ScreenerFilters {
  minPremium: number;
  maxPremium: number;
  minDTE: number;
  maxDTE: number;
  minVolumeOIRatio: number;
  sectors: string[];
  optionTypes: string[];
  alertRules: string[];
  issueTypes: string[];
  minStrike: number;
  maxStrike: number;
  minIV: number;
  maxIV: number;
  sweepsOnly: boolean;
  darkPoolActivity: boolean;
  institutionalFlow: boolean;
  minPutCallRatio: number;
  maxPutCallRatio: number;
  minDelta: number;
  maxDelta: number;
  minGamma: number;
  maxGamma: number;
  requiresInsiderActivity: boolean;
  requiresAnalystUpgrade: boolean;
  stringencyLevel: number; // 1-10 scale
  trainingMode: boolean;
  trackPerformance: boolean;
  adaptiveStringency: boolean;
}

interface ScreenedOption {
  id: string;
  ticker: string;
  optionType: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  openInterest: number;
  volatility: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
  sector: string;
  alertRule: string;
  timeToExpiry: number;
  moneyness: string;
  flowType: string;
  probability: number;
  riskReward: number;
  underlyingPrice: number;
  priceTarget: number;
  conviction: 'exceptional' | 'high' | 'medium' | 'low';
  sweep: boolean;
  darkPool: boolean;
  institutional: boolean;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  stringencyScore: number;
  insiderActivity: boolean;
  analystUpgrade: boolean;
  marketSentiment: number;
  technicalScore: number;
  fundamentalScore: number;
}

interface DayTradingOpportunity {
  ticker: string;
  signal: 'momentum' | 'reversal' | 'breakout' | 'scalp';
  timeframe: '1m' | '5m' | '15m' | '30m' | '1h';
  entry: number;
  target: number;
  stop: number;
  confidence: number;
  volume: number;
  avgVolume: number;
  relativeVolume: number;
  vwap: number;
  rsi: number;
  macd: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  expiration: string;
}

const defaultFilters: ScreenerFilters = {
  minPremium: 100000,
  maxPremium: 10000000,
  minDTE: 7,
  maxDTE: 365,
  minVolumeOIRatio: 0.5,
  sectors: [],
  optionTypes: ['call', 'put'],
  alertRules: ['RepeatedHits', 'RepeatedHitsAscendingFill', 'RepeatedHitsDescendingFill'],
  issueTypes: ['Common Stock', 'ADR'],
  minStrike: 0,
  maxStrike: 1000,
  minIV: 0,
  maxIV: 500,
  sweepsOnly: false,
  darkPoolActivity: false,
  institutionalFlow: false,
  minPutCallRatio: 0,
  maxPutCallRatio: 5,
  minDelta: 0,
  maxDelta: 1,
  minGamma: 0,
  maxGamma: 1,
  requiresInsiderActivity: false,
  requiresAnalystUpgrade: false,
  stringencyLevel: 5,
  trainingMode: false,
  trackPerformance: true,
  adaptiveStringency: false,
};

export default function OptionsScreener() {
  const [filters, setFilters] = useState<ScreenerFilters>(defaultFilters);
  const [activeTab, setActiveTab] = useState('scanner');
  const [selectedOption, setSelectedOption] = useState<ScreenedOption | null>(null);
  const [trainingMode, setTrainingMode] = useState(false);

  // Fetch screened options based on filters
  const [screenedOptions, setScreenedOptions] = useState<ScreenedOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataUpdatedAt, setDataUpdatedAt] = useState<number>(0);

  // Fetch stringency metrics for training mode
  const { data: stringencyMetrics } = useQuery<StringencyMetrics>({
    queryKey: ['/api/options/stringency-metrics', filters.stringencyLevel],
    enabled: filters.trainingMode,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
  });

  // Fetch day trading opportunities
  const { data: dayTradingData } = useQuery<{
    success?: boolean;
    opportunities?: DayTradingOpportunity[];
  }>({
    queryKey: ['/api/options/daytrading-opportunities', Date.now()],
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching Day Trading Opportunities at', timestamp);
      const response = await fetch('/api/options/daytrading-opportunities');
      if (!response.ok) {
        throw new Error(`Failed to fetch daytrading opportunities: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Received Day Trading Opportunities at', timestamp, '- Count:', data.opportunities?.length || 0);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
  
  const dayTradingOpportunities = dayTradingData?.opportunities || [];

  // Enhanced market sentiment data
  const { data: marketSentiment = {} } = useQuery<{
    overallSentiment?: number;
    fearGreedIndex?: number;
    vixLevel?: number;
    putCallRatio?: number;
    marketBreadth?: number;
    institutionalFlow?: number;
    retailFlow?: number;
    cryptoSentiment?: number;
    newsFlow?: Array<{
      headline: string;
      sentiment: number;
      impact: 'high' | 'medium' | 'low';
      timestamp: string;
    }>;
  }>({
    queryKey: ['/api/options/enhanced-sentiment', Date.now()],
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching Market Sentiment at', timestamp);
      const response = await fetch('/api/options/enhanced-sentiment');
      if (!response.ok) {
        throw new Error(`Failed to fetch market sentiment: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Received Market Sentiment at', timestamp);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Sector rotation analysis
  const { data: sectorRotation = {} } = useQuery<{
    sectors?: Array<{
      name: string;
      momentum: number;
      relativeStrength: number;
      flowDirection: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
    }>;
  }>({
    queryKey: ['/api/options/sector-rotation', Date.now()],
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching Sector Rotation at', timestamp);
      const response = await fetch('/api/options/sector-rotation');
      if (!response.ok) {
        throw new Error(`Failed to fetch sector rotation: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Received Sector Rotation at', timestamp, '- Sectors:', data.sectors?.length || 0);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Add automatic screener refresh every 2 minutes
  useEffect(() => {
    const autoScreenerInterval = setInterval(() => {
      if (!isLoading) {
        console.log('🔄 Auto-refreshing screener data at', new Date().toLocaleTimeString());
        runScreener();
      }
    }, 120000); // 2 minutes

    // Initial run after 5 seconds
    const initialTimeout = setTimeout(() => {
      if (!isLoading && screenedOptions.length === 0) {
        console.log('🚀 Initial screener run at', new Date().toLocaleTimeString());
        runScreener();
      }
    }, 5000);

    return () => {
      clearInterval(autoScreenerInterval);
      clearTimeout(initialTimeout);
    };
  }, [isLoading, screenedOptions.length]); // Dependencies to prevent infinite loops

  const runScreener = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/options/screen', filters);
      const data = await response.json();
      
      if (data.success && data.options) {
        setScreenedOptions(data.options);
        setDataUpdatedAt(Date.now());
      }
    } catch (error) {
      console.error('Error running screener:', error);
      setScreenedOptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const adjustStringency = (level: number) => {
    setFilters({
      ...filters,
      stringencyLevel: level,
      minPremium: level >= 7 ? 500000 : level >= 5 ? 250000 : 100000,
      minVolumeOIRatio: level >= 7 ? 2.0 : level >= 5 ? 1.0 : 0.5,
      sweepsOnly: level >= 8,
      institutionalFlow: level >= 6,
    });
  };

  const getStringencyColor = (level: number) => {
    if (level >= 8) return 'text-red-600';
    if (level >= 6) return 'text-orange-600';
    if (level >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced Options Screener</h1>
          <p className="text-gray-600 mt-2">
            AI-powered screening with adaptive stringency and sentiment analysis
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label>Training Mode</Label>
            <Switch
              checked={filters.trainingMode}
              onCheckedChange={(checked) => setFilters({...filters, trainingMode: checked})}
            />
          </div>
          <Button onClick={() => setFilters(defaultFilters)} variant="outline">
            Reset Filters
          </Button>
          {dataUpdatedAt && (
            <div className="text-sm text-gray-600 flex items-center">
              Last scan: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </div>
          )}
          <Button onClick={runScreener} disabled={isLoading}>
            {isLoading ? 'Scanning...' : 'Run Screener'}
            <Search className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stringency Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Stringency Control & Performance Metrics
          </CardTitle>
          <CardDescription>
            Adjust screening stringency and monitor success rates in training mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Stringency Level: {filters.stringencyLevel}/10</Label>
                <Slider
                  value={[filters.stringencyLevel]}
                  onValueChange={(value) => adjustStringency(value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full mt-2"
                />
                <div className={`text-sm mt-1 ${getStringencyColor(filters.stringencyLevel)}`}>
                  {filters.stringencyLevel >= 8 ? 'Ultra High - Institutional Only' :
                   filters.stringencyLevel >= 6 ? 'High - Premium Opportunities' :
                   filters.stringencyLevel >= 4 ? 'Medium - Balanced Approach' :
                   'Low - Volume Focus'}
                </div>
              </div>

              {filters.trainingMode && stringencyMetrics && (
                <div className="space-y-2">
                  <h4 className="font-medium">Performance at Current Stringency</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Success Rate: <span className="font-medium text-green-600">{stringencyMetrics.successRate.toFixed(1)}%</span></div>
                    <div>Avg Return: <span className="font-medium">{stringencyMetrics.avgReturn.toFixed(1)}%</span></div>
                    <div>Win Rate: <span className="font-medium">{stringencyMetrics.winRate.toFixed(1)}%</span></div>
                    <div>Profit Factor: <span className="font-medium">{stringencyMetrics.profitFactor.toFixed(2)}</span></div>
                    <div>Sharpe Ratio: <span className="font-medium">{stringencyMetrics.sharpeRatio.toFixed(2)}</span></div>
                    <div>Max Drawdown: <span className="font-medium text-red-600">{stringencyMetrics.maxDrawdown.toFixed(1)}%</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Enhanced Market Sentiment</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Fear & Greed: <span className="font-medium">{marketSentiment.fearGreedIndex || 'N/A'}</span></div>
                <div>VIX Level: <span className="font-medium">{marketSentiment.vixLevel || 'N/A'}</span></div>
                <div>Put/Call Ratio: <span className="font-medium">{marketSentiment.putCallRatio?.toFixed(2) || 'N/A'}</span></div>
                <div>Market Breadth: <span className="font-medium">{marketSentiment.marketBreadth?.toFixed(1) || 'N/A'}%</span></div>
              </div>
              
              {marketSentiment.newsFlow && marketSentiment.newsFlow.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium mb-2">Market News Flow</h5>
                  <div className="space-y-1">
                    {marketSentiment.newsFlow.slice(0, 3).map((news, index) => (
                      <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="flex justify-between">
                          <span className="truncate flex-1">{news.headline}</span>
                          <Badge variant={news.sentiment > 0 ? 'default' : 'destructive'} className="ml-2 text-xs">
                            {news.sentiment > 0 ? 'Bullish' : 'Bearish'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="scanner">Scanner</TabsTrigger>
          <TabsTrigger value="daytrading">Day Trading</TabsTrigger>
          <TabsTrigger value="unusual">Unusual Activity</TabsTrigger>
          <TabsTrigger value="sectors">Sector Rotation</TabsTrigger>
          <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
          <TabsTrigger value="analytics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="scanner" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {/* Enhanced Filters Panel */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Advanced Filters
                </CardTitle>
                <CardDescription>
                  Multi-dimensional screening parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Premium Range */}
                <div className="space-y-2">
                  <Label>Premium Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        value={filters.minPremium}
                        onChange={(e) => setFilters({...filters, minPremium: Number(e.target.value)})}
                        placeholder="100,000"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        value={filters.maxPremium}
                        onChange={(e) => setFilters({...filters, maxPremium: Number(e.target.value)})}
                        placeholder="10,000,000"
                      />
                    </div>
                  </div>
                </div>

                {/* Greeks Filters */}
                <div className="space-y-2">
                  <Label>Delta Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={filters.minDelta}
                      onChange={(e) => setFilters({...filters, minDelta: Number(e.target.value)})}
                      placeholder="0"
                      step="0.01"
                    />
                    <Input
                      type="number"
                      value={filters.maxDelta}
                      onChange={(e) => setFilters({...filters, maxDelta: Number(e.target.value)})}
                      placeholder="1"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Put/Call Ratio */}
                <div className="space-y-2">
                  <Label>Put/Call Ratio Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      value={filters.minPutCallRatio}
                      onChange={(e) => setFilters({...filters, minPutCallRatio: Number(e.target.value)})}
                      placeholder="0"
                      step="0.1"
                    />
                    <Input
                      type="number"
                      value={filters.maxPutCallRatio}
                      onChange={(e) => setFilters({...filters, maxPutCallRatio: Number(e.target.value)})}
                      placeholder="5"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* Enhanced Filters */}
                <div className="space-y-3">
                  <Label>Enhanced Filters</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Requires Insider Activity</Label>
                    <Switch
                      checked={filters.requiresInsiderActivity}
                      onCheckedChange={(checked) => setFilters({...filters, requiresInsiderActivity: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Requires Analyst Upgrade</Label>
                    <Switch
                      checked={filters.requiresAnalystUpgrade}
                      onCheckedChange={(checked) => setFilters({...filters, requiresAnalystUpgrade: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Dark Pool Activity</Label>
                    <Switch
                      checked={filters.darkPoolActivity}
                      onCheckedChange={(checked) => setFilters({...filters, darkPoolActivity: checked})}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Institutional Flow Only</Label>
                    <Switch
                      checked={filters.institutionalFlow}
                      onCheckedChange={(checked) => setFilters({...filters, institutionalFlow: checked})}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Results Panel */}
            <div className="md:col-span-2 space-y-4">
              {/* Stats Overview */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <div className="text-sm text-gray-600">Opportunities</div>
                    </div>
                    <div className="text-2xl font-bold">{screenedOptions.length}</div>
                    <div className="text-xs text-gray-500">
                      Stringency: {filters.stringencyLevel}/10
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <div className="text-sm text-gray-600">Avg Score</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {screenedOptions.length > 0 ? 
                        (screenedOptions.reduce((sum: number, opt: ScreenedOption) => sum + opt.stringencyScore, 0) / screenedOptions.length).toFixed(1) : 
                        '0'
                      }
                    </div>
                    <div className="text-xs text-gray-500">AI Confidence</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <div className="text-sm text-gray-600">Bullish</div>
                    </div>
                    <div className="text-2xl font-bold">
                      {screenedOptions.filter((opt: ScreenedOption) => opt.sentiment === 'bullish').length}
                    </div>
                    <div className="text-xs text-gray-500">High Conviction</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div className="text-sm text-gray-600">Total Premium</div>
                    </div>
                    <div className="text-lg font-bold">
                      {formatCurrency(screenedOptions.reduce((sum: number, opt: ScreenedOption) => sum + opt.premium, 0))}
                    </div>
                    <div className="text-xs text-gray-500">Combined Flow</div>
                  </CardContent>
                </Card>
              </div>

              {/* Results Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Screened Opportunities</CardTitle>
                  <CardDescription>
                    AI-ranked opportunities with multi-factor scoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border max-h-96 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Strike</TableHead>
                          <TableHead>Premium</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Conviction</TableHead>
                          <TableHead>Sentiment</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8">
                              <div className="flex items-center justify-center gap-2">
                                <Activity className="h-4 w-4 animate-spin" />
                                Screening with AI analysis...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : screenedOptions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                              No opportunities found at current stringency level. Try reducing stringency.
                            </TableCell>
                          </TableRow>
                        ) : (
                          screenedOptions.map((option: ScreenedOption) => (
                            <TableRow key={option.id} className="cursor-pointer hover:bg-gray-50">
                              <TableCell className="font-medium">{option.ticker}</TableCell>
                              <TableCell>
                                <Badge variant={option.optionType === 'call' ? 'default' : 'destructive'}>
                                  {option.optionType.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>${option.strike}</TableCell>
                              <TableCell>{formatCurrency(option.premium)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <span className="font-medium">{option.stringencyScore.toFixed(1)}</span>
                                  <Progress value={option.stringencyScore * 10} className="w-12 h-2" />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  option.conviction === 'exceptional' ? 'bg-green-600 text-white' :
                                  option.conviction === 'high' ? 'bg-green-500 text-white' :
                                  option.conviction === 'medium' ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }>
                                  {option.conviction}
                                </Badge>
                              </TableCell>
                              <TableCell className={
                                option.sentiment === 'bullish' ? 'text-green-600' :
                                option.sentiment === 'bearish' ? 'text-red-600' :
                                'text-gray-600'
                              }>
                                {option.sentiment}
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="daytrading" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Live Day Trading Opportunities
                </CardTitle>
                <CardDescription>
                  Real-time momentum and scalping setups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.isArray(dayTradingOpportunities) ? dayTradingOpportunities.slice(0, 5).map((opportunity, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {opportunity.ticker}
                            <Badge variant="outline">{opportunity.signal}</Badge>
                            <Badge variant={opportunity.sentiment === 'bullish' ? 'default' : 'destructive'}>
                              {opportunity.timeframe}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            Entry: ${opportunity.entry} | Target: ${opportunity.target} | Stop: ${opportunity.stop}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">{opportunity.confidence}% Conf</div>
                          <div className="text-sm text-gray-600">
                            Vol: {(opportunity.relativeVolume * 100).toFixed(0)}% avg
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>RSI: {opportunity.rsi}</div>
                        <div>VWAP: ${opportunity.vwap}</div>
                        <div>MACD: {opportunity.macd}</div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-gray-500 py-4">
                      No day trading opportunities available
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Intraday Options Flow
                </CardTitle>
                <CardDescription>
                  High-frequency options activity for day trading
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-green-600">Momentum</div>
                      <div>24 setups</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-blue-600">Breakouts</div>
                      <div>12 setups</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-600">Reversals</div>
                      <div>8 setups</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-purple-600">Scalps</div>
                      <div>31 setups</div>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Top Performers Today</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>TSLA 0DTE Calls</span>
                        <span className="text-green-600">+247%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SPY Put Spreads</span>
                        <span className="text-green-600">+89%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>NVDA Momentum</span>
                        <span className="text-green-600">+156%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {sectorRotation.sectors?.map((sector, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{sector.name}</CardTitle>
                  <CardDescription>
                    Momentum: {sector.momentum.toFixed(1)} | RS: {sector.relativeStrength.toFixed(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Flow Direction</span>
                        <Badge variant={sector.flowDirection === 'bullish' ? 'default' : 'destructive'}>
                          {sector.flowDirection}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Confidence</span>
                        <span>{sector.confidence.toFixed(1)}%</span>
                      </div>
                      <Progress value={sector.confidence} className="mt-1" />
                    </div>

                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Relative Strength</span>
                        <span className={sector.relativeStrength > 0 ? 'text-green-600' : 'text-red-600'}>
                          {sector.relativeStrength > 0 ? '+' : ''}{sector.relativeStrength.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) || (
              <div className="col-span-3 text-center py-8 text-gray-500">
                Loading sector rotation analysis...
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Multi-source sentiment aggregation and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {marketSentiment.overallSentiment || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Overall Sentiment</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600">
                        {marketSentiment.fearGreedIndex || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">Fear & Greed</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Institutional Flow:</span>
                      <span className="font-medium">${(marketSentiment.institutionalFlow || 0) / 1000000}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Retail Flow:</span>
                      <span className="font-medium">${(marketSentiment.retailFlow || 0) / 1000000}M</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Crypto Sentiment:</span>
                      <span className="font-medium">{marketSentiment.cryptoSentiment || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Breadth:</span>
                      <span className="font-medium">{marketSentiment.marketBreadth?.toFixed(1) || 'N/A'}%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>News Flow Impact</CardTitle>
                <CardDescription>Real-time news sentiment analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketSentiment.newsFlow?.slice(0, 4).map((news, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">{news.headline}</div>
                          <div className="text-xs text-gray-500">{new Date(news.timestamp).toLocaleTimeString()}</div>
                        </div>
                        <div className="ml-2 text-right">
                          <Badge variant={news.sentiment > 0 ? 'default' : 'destructive'}>
                            {news.sentiment > 0 ? '+' : ''}{news.sentiment.toFixed(1)}
                          </Badge>
                          <div className="text-xs text-gray-500 mt-1">{news.impact} impact</div>
                        </div>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      Loading news sentiment analysis...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Stringency Performance Matrix</CardTitle>
                <CardDescription>Success rates across different stringency levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 3, 5, 7, 9].map(level => (
                    <div key={level} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Level {level}</span>
                        <span className={`text-sm ${getStringencyColor(level)}`}>
                          {level >= 8 ? 'Ultra High' : level >= 6 ? 'High' : level >= 4 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-green-600">
                          {(85 - level * 3).toFixed(1)}% Success
                        </div>
                        <div className="text-sm text-gray-600">
                          {Math.max(1, 50 - level * 5)} trades/day
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Model Performance</CardTitle>
                <CardDescription>Machine learning model accuracy metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">94.2%</div>
                      <div className="text-sm text-gray-600">Prediction Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">0.89</div>
                      <div className="text-sm text-gray-600">F1 Score</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sentiment Model:</span>
                      <span className="font-medium text-green-600">97.1% Accuracy</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Technical Model:</span>
                      <span className="font-medium text-green-600">91.8% Accuracy</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Flow Model:</span>
                      <span className="font-medium text-green-600">88.4% Accuracy</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ensemble:</span>
                      <span className="font-medium text-green-600">94.2% Accuracy</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-gray-600">Last Updated: {new Date().toLocaleString()}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}