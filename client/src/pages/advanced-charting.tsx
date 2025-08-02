import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  TrendingUp, 
  BarChart3, 
  LineChart, 
  Activity,
  Settings,
  Maximize2,
  Download,
  RefreshCw,
  TrendingDown,
  Target
} from "lucide-react";
import { useState } from "react";

interface ChartData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  indicators?: {
    sma20?: number;
    sma50?: number;
    rsi?: number;
    macd?: number;
    bollinger_upper?: number;
    bollinger_lower?: number;
  };
}

interface OptionsData {
  strike: number;
  callVolume: number;
  putVolume: number;
  callOI: number;
  putOI: number;
  callPrice: number;
  putPrice: number;
  gamma: number;
  delta: number;
  theta: number;
  vega: number;
}

export default function AdvancedChartingPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPY');
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [chartType, setChartType] = useState<string>('candlestick');
  const [indicators, setIndicators] = useState<string[]>(['SMA20', 'SMA50']);

  const { data: chartData = [], isLoading: loadingChart } = useQuery<ChartData[]>({
    queryKey: ['/api/charts/data', selectedSymbol, timeframe],
  });

  const { data: optionsData = [], isLoading: loadingOptions } = useQuery<OptionsData[]>({
    queryKey: ['/api/charts/options-chain', selectedSymbol],
  });

  const symbols = ['SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'META'];
  const timeframes = ['1m', '5m', '15m', '1H', '1D', '1W', '1M'];
  const chartTypes = ['candlestick', 'line', 'area', 'heikin-ashi'];
  const availableIndicators = [
    'SMA20', 'SMA50', 'EMA12', 'EMA26', 'RSI', 'MACD', 'Bollinger Bands', 
    'Volume Profile', 'VWAP', 'Stochastic', 'Williams %R', 'ADX'
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  if (loadingChart) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Advanced Charting</h1>
          <div className="animate-pulse">
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Mock chart data for demonstration
  const mockChartData: ChartData[] = Array.from({ length: 100 }, (_, i) => {
    const basePrice = 450;
    const volatility = 0.02;
    const trend = 0.001;
    const random = () => (Math.random() - 0.5) * volatility;
    const price = basePrice * (1 + trend * i + random());
    
    return {
      timestamp: new Date(Date.now() - (100 - i) * 24 * 60 * 60 * 1000).toISOString(),
      open: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price * (1 + random()),
      volume: Math.floor(Math.random() * 1000000 + 500000),
      indicators: {
        sma20: price * 0.998,
        sma50: price * 0.995,
        rsi: 30 + Math.random() * 40,
        macd: random() * 10,
        bollinger_upper: price * 1.02,
        bollinger_lower: price * 0.98
      }
    };
  });

  const mockOptionsData: OptionsData[] = [
    { strike: 440, callVolume: 1250, putVolume: 890, callOI: 5420, putOI: 3210, callPrice: 12.50, putPrice: 2.35, gamma: 0.025, delta: 0.75, theta: -0.12, vega: 0.18 },
    { strike: 445, callVolume: 2100, putVolume: 1200, callOI: 7850, putOI: 4560, callPrice: 8.75, putPrice: 3.20, gamma: 0.028, delta: 0.68, theta: -0.15, vega: 0.22 },
    { strike: 450, callVolume: 3500, putVolume: 3200, callOI: 12400, putOI: 11200, callPrice: 5.80, putPrice: 5.65, gamma: 0.032, delta: 0.52, theta: -0.18, vega: 0.25 },
    { strike: 455, callVolume: 2800, putVolume: 4100, callOI: 9600, putOI: 15800, callPrice: 3.40, putPrice: 8.85, gamma: 0.028, delta: 0.35, theta: -0.15, vega: 0.22 },
    { strike: 460, callVolume: 1800, putVolume: 2900, callOI: 6200, putOI: 9800, callPrice: 1.95, putPrice: 12.80, gamma: 0.022, delta: 0.22, theta: -0.11, vega: 0.16 }
  ];

  const displayData = chartData.length > 0 ? chartData : mockChartData;
  const displayOptions = optionsData.length > 0 ? optionsData : mockOptionsData;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Advanced Trading Charts</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            Real-time Data
          </Badge>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Chart Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chart Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Symbol:</label>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {symbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Timeframe:</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>
                      {tf}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Chart Type:</label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {chartTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Indicators
              </Button>
              <Button size="sm" variant="outline">
                <Maximize2 className="w-4 h-4 mr-2" />
                Fullscreen
              </Button>
              <Button size="sm" variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart Area */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl">{selectedSymbol} - {timeframe}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Last: $452.35</Badge>
                <Badge variant="outline" className="text-green-600">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +2.45 (+0.54%)
                </Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Vol: 2.4M | High: $454.80 | Low: $448.20
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
            <div className="text-center">
              <LineChart className="mx-auto h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Interactive Trading Chart</h3>
              <p className="text-slate-500 max-w-md">
                Advanced TradingView-style chart with candlesticks, technical indicators, volume analysis, 
                and real-time options flow visualization would be displayed here.
              </p>
              <div className="mt-4 flex gap-2 justify-center">
                <Badge variant="secondary">Candlestick Chart</Badge>
                <Badge variant="secondary">Volume Profile</Badge>
                <Badge variant="secondary">Technical Indicators</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="technical" className="space-y-4">
        <TabsList>
          <TabsTrigger value="technical">Technical Analysis</TabsTrigger>
          <TabsTrigger value="options">Options Chain</TabsTrigger>
          <TabsTrigger value="flow">Options Flow</TabsTrigger>
          <TabsTrigger value="gamma">Gamma Exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="technical" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price Action</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-medium">$452.35</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Change</span>
                  <span className="font-medium text-green-600">+2.45 (+0.54%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">2.4M</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VWAP</span>
                  <span className="font-medium">$451.22</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Momentum Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RSI (14)</span>
                  <span className="font-medium text-yellow-600">65.4</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MACD</span>
                  <span className="font-medium text-green-600">+1.25</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stochastic</span>
                  <span className="font-medium">%K: 72.1, %D: 68.9</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Williams %R</span>
                  <span className="font-medium">-28.5</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Moving Averages</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMA 20</span>
                  <span className="font-medium">$450.85</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SMA 50</span>
                  <span className="font-medium">$448.22</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EMA 12</span>
                  <span className="font-medium">$451.75</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EMA 26</span>
                  <span className="font-medium">$449.90</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Options Chain Analysis</CardTitle>
              <CardDescription>
                Real-time options data with Greeks and volume analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Strike</th>
                      <th className="text-left p-2">Call Vol</th>
                      <th className="text-left p-2">Call OI</th>
                      <th className="text-left p-2">Call Price</th>
                      <th className="text-left p-2">Put Price</th>
                      <th className="text-left p-2">Put OI</th>
                      <th className="text-left p-2">Put Vol</th>
                      <th className="text-left p-2">Gamma</th>
                      <th className="text-left p-2">Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayOptions.map((option, index) => (
                      <tr key={index} className={option.strike === 450 ? 'bg-blue-50' : ''}>
                        <td className="p-2 font-medium">{option.strike}</td>
                        <td className="p-2 text-green-600">{formatVolume(option.callVolume)}</td>
                        <td className="p-2">{formatVolume(option.callOI)}</td>
                        <td className="p-2 font-medium">{formatPrice(option.callPrice)}</td>
                        <td className="p-2 font-medium">{formatPrice(option.putPrice)}</td>
                        <td className="p-2">{formatVolume(option.putOI)}</td>
                        <td className="p-2 text-red-600">{formatVolume(option.putVolume)}</td>
                        <td className="p-2">{option.gamma.toFixed(3)}</td>
                        <td className="p-2">{option.delta.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Real-time Options Flow</CardTitle>
              <CardDescription>
                Live options transactions and unusual activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Options Flow Chart</h3>
                <p className="text-muted-foreground">
                  Real-time visualization of options transactions, highlighting unusual activity and institutional flow
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gamma" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gamma Exposure Analysis</CardTitle>
              <CardDescription>
                Market maker positioning and gamma levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gamma Exposure Map</h3>
                <p className="text-muted-foreground">
                  Interactive gamma exposure chart showing dealer positioning and key support/resistance levels
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}