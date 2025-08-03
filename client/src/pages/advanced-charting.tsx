import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  BarChart3,
  Activity,
  Settings,
  Maximize2,
  Download,
  RefreshCw,
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
  const [selectedSymbol, setSelectedSymbol] = useState<string>('SPX');
  const [timeframe, setTimeframe] = useState<string>('1D');
  const [chartType, setChartType] = useState<string>('candlestick');
  const [indicators, setIndicators] = useState<string[]>(['SMA20', 'SMA50']);

  const { data: chartData = [], isLoading: loadingChart } = useQuery<ChartData[]>({
    queryKey: ['/api/charts/data', selectedSymbol, timeframe],
    queryFn: async () => {
      const res = await fetch(
        `/api/charts/data?symbol=${selectedSymbol}&timeframe=${timeframe}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch chart data');
      }
      return res.json();
    },
  });

  const { data: optionsData = [], isLoading: loadingOptions } = useQuery<OptionsData[]>({
    queryKey: ['/api/charts/options-chain', selectedSymbol],
    queryFn: async () => {
      const res = await fetch(
        `/api/charts/options-chain?symbol=${selectedSymbol}`
      );
      if (!res.ok) {
        throw new Error('Failed to fetch options chain');
      }
      return res.json();
    },
  });

  const symbols = ['SPX', 'SPY', 'QQQ', 'NVDA', 'TSLA', 'AAPL', 'MSFT', 'AMZN', 'META'];
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

  const hasChartData = chartData.length > 0;
  const latestBar = hasChartData ? chartData[chartData.length - 1] : null;
  const sessionHigh = hasChartData ? Math.max(...chartData.map(c => c.high)) : null;
  const sessionLow = hasChartData ? Math.min(...chartData.map(c => c.low)) : null;

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
                <Badge variant="outline">Last: {latestBar ? formatPrice(latestBar.close) : 'N/A'}</Badge>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {latestBar ? `Vol: ${formatVolume(latestBar.volume)} | High: ${formatPrice(sessionHigh!)} | Low: ${formatPrice(sessionLow!)}` : 'No chart data'}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {hasChartData ? (
            <pre className="h-96 overflow-auto bg-gray-100 rounded p-4 text-xs">
{JSON.stringify(chartData.slice(-50), null, 2)}
            </pre>
          ) : (
            <div className="h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-300">
              <div className="text-center text-slate-500">
                No chart data available
              </div>
            </div>
          )}
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
                  <span className="font-medium">{latestBar ? formatPrice(latestBar.close) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Volume</span>
                  <span className="font-medium">{latestBar ? formatVolume(latestBar.volume) : 'N/A'}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Momentum Indicators</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-center">
                Indicator data unavailable
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Moving Averages</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-center">
                Indicator data unavailable
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
              {optionsData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No options data available
                </div>
              ) : (
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
                      {optionsData.map((option, index) => (
                        <tr key={index} className={option.strike === 450 ? 'bg-blue-50' : ''}>
                          <td className="p-2 font-medium">{option.strike}</td>
                          <td className="p-2 text-green-600">{formatVolume(option.callVolume)}</td>
                          <td className="p-2">{formatVolume(option.callOI)}</td>
                          <td className="p-2 font-medium">{formatPrice(option.callPrice)}</td>
                          <td className="p-2 font-medium">{formatPrice(option.putPrice)}</td>
                          <td className="p-2">{formatVolume(option.putOI)}</td>
                          <td className="p-2 text-red-600">{formatVolume(option.putVolume)}</td>
                          <td className="p-2">{option.gamma?.toFixed(3)}</td>
                          <td className="p-2">{option.delta?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
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