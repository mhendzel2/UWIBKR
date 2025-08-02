import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Zap,
  Eye,
  Filter,
  RefreshCw,
  Target,
  Flame,
  BarChart3
} from 'lucide-react';

interface HeatMapCell {
  ticker: string;
  sector: string;
  premium: number;
  volume: number;
  openInterest: number;
  callFlow: number;
  putFlow: number;
  netFlow: number;
  sentiment: number; // -1 to 1
  conviction: 'exceptional' | 'high' | 'medium' | 'low';
  darkPool: boolean;
  unusual: boolean;
  sweep: boolean;
  institutional: boolean;
  price: number;
  change: number;
  changePercent: number;
  volatility: number;
  heatScore: number; // 0-100 composite score
  aiConfidence: number;
  alerts: Array<{
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

interface HeatMapFilters {
  minPremium: number;
  timeframe: '1h' | '4h' | '1d' | '3d' | '1w';
  sectors: string[];
  showUnusualOnly: boolean;
  showSweepsOnly: boolean;
  showInstitutionalOnly: boolean;
  heatMetric: 'volume' | 'premium' | 'unusual' | 'sentiment' | 'ai_score';
  colorScheme: 'sentiment' | 'volume' | 'heat' | 'ai';
}

const defaultFilters: HeatMapFilters = {
  minPremium: 100000,
  timeframe: '1d',
  sectors: [],
  showUnusualOnly: false,
  showSweepsOnly: false,
  showInstitutionalOnly: false,
  heatMetric: 'ai_score',
  colorScheme: 'sentiment',
};

export default function OptionsHeatMap() {
  const [filters, setFilters] = useState<HeatMapFilters>(defaultFilters);
  const [selectedCell, setSelectedCell] = useState<HeatMapCell | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch heat map data
  const { data: heatMapData = [], isLoading, refetch, dataUpdatedAt } = useQuery<HeatMapCell[]>({
    queryKey: ['/api/options/heatmap', filters],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Fetch sector performance for context
  const { data: sectorPerformance = {} } = useQuery<{
    sectors?: Array<{
      name: string;
      performance: number;
      flowDirection: 'bullish' | 'bearish' | 'neutral';
      strength: number;
    }>;
  }>({
    queryKey: ['/api/options/sector-performance'],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  // Fetch market overview for context
  const { data: marketOverview = {} } = useQuery<{
    vix?: number;
    putCallRatio?: number;
    marketSentiment?: number;
    totalFlow?: number;
  }>({
    queryKey: ['/api/options/market-overview'],
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });

  const getHeatColor = (cell: HeatMapCell): string => {
    switch (filters.colorScheme) {
      case 'sentiment':
        if (cell.sentiment > 0.5) return 'bg-green-500';
        if (cell.sentiment > 0.2) return 'bg-green-400';
        if (cell.sentiment > -0.2) return 'bg-gray-400';
        if (cell.sentiment > -0.5) return 'bg-red-400';
        return 'bg-red-500';
      
      case 'volume':
        const volumeIntensity = Math.min(cell.volume / 10000, 1);
        const intensity = Math.floor(volumeIntensity * 5);
        return ['bg-blue-100', 'bg-blue-300', 'bg-blue-400', 'bg-blue-500', 'bg-blue-600'][intensity];
      
      case 'heat':
        const heatIntensity = cell.heatScore / 100;
        if (heatIntensity > 0.8) return 'bg-red-600';
        if (heatIntensity > 0.6) return 'bg-orange-500';
        if (heatIntensity > 0.4) return 'bg-yellow-500';
        if (heatIntensity > 0.2) return 'bg-green-400';
        return 'bg-green-300';
      
      case 'ai':
        const aiIntensity = cell.aiConfidence;
        if (aiIntensity > 0.8) return 'bg-purple-600';
        if (aiIntensity > 0.6) return 'bg-purple-500';
        if (aiIntensity > 0.4) return 'bg-purple-400';
        if (aiIntensity > 0.2) return 'bg-purple-300';
        return 'bg-purple-200';
      
      default:
        return 'bg-gray-400';
    }
  };

  const getTextColor = (cell: HeatMapCell): string => {
    const bgColor = getHeatColor(cell);
    return bgColor.includes('600') || bgColor.includes('500') ? 'text-white' : 'text-black';
  };

  const getCellSize = (cell: HeatMapCell): string => {
    switch (filters.heatMetric) {
      case 'volume':
        const volumeSize = Math.min(cell.volume / 5000, 3);
        return volumeSize > 2 ? 'w-32 h-24' : volumeSize > 1 ? 'w-28 h-20' : 'w-24 h-16';
      
      case 'premium':
        const premiumSize = Math.min(cell.premium / 1000000, 3);
        return premiumSize > 2 ? 'w-32 h-24' : premiumSize > 1 ? 'w-28 h-20' : 'w-24 h-16';
      
      case 'ai_score':
        const aiSize = cell.aiConfidence * 3;
        return aiSize > 2 ? 'w-32 h-24' : aiSize > 1 ? 'w-28 h-20' : 'w-24 h-16';
      
      default:
        return 'w-24 h-16';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  const groupedData = heatMapData.reduce((acc, cell) => {
    if (!acc[cell.sector]) acc[cell.sector] = [];
    acc[cell.sector].push(cell);
    return acc;
  }, {} as Record<string, HeatMapCell[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI-Powered Options Heat Map</h1>
          <p className="text-gray-600 mt-2">
            Real-time visual analysis of options flow with AI sentiment scoring
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label>Auto Refresh</Label>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            Last updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Market Context Panel */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-gray-600">VIX Level</div>
            </div>
            <div className="text-2xl font-bold">{marketOverview.vix?.toFixed(1) || 'N/A'}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-gray-600">Put/Call Ratio</div>
            </div>
            <div className="text-2xl font-bold">{marketOverview.putCallRatio?.toFixed(2) || 'N/A'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div className="text-sm text-gray-600">Market Sentiment</div>
            </div>
            <div className="text-2xl font-bold">
              {marketOverview.marketSentiment ? 
                (marketOverview.marketSentiment > 0 ? '+' : '') + (marketOverview.marketSentiment * 100).toFixed(0) + '%' : 
                'N/A'
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-gray-600">Total Flow</div>
            </div>
            <div className="text-2xl font-bold">
              {marketOverview.totalFlow ? formatCurrency(marketOverview.totalFlow) : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Heat Map Controls
          </CardTitle>
          <CardDescription>
            Customize visualization and filtering parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Color Scheme</Label>
              <Select value={filters.colorScheme} onValueChange={(value: any) => setFilters({...filters, colorScheme: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="heat">Heat Score</SelectItem>
                  <SelectItem value="ai">AI Confidence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Heat Metric</Label>
              <Select value={filters.heatMetric} onValueChange={(value: any) => setFilters({...filters, heatMetric: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_score">AI Score</SelectItem>
                  <SelectItem value="volume">Volume</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="unusual">Unusual Activity</SelectItem>
                  <SelectItem value="sentiment">Sentiment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Timeframe</Label>
              <Select value={filters.timeframe} onValueChange={(value: any) => setFilters({...filters, timeframe: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="4h">4 Hours</SelectItem>
                  <SelectItem value="1d">1 Day</SelectItem>
                  <SelectItem value="3d">3 Days</SelectItem>
                  <SelectItem value="1w">1 Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Refresh Rate: {refreshInterval}s</Label>
              <Slider
                value={[refreshInterval]}
                onValueChange={(value) => setRefreshInterval(value[0])}
                min={5}
                max={300}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Unusual Only</Label>
              <Switch
                checked={filters.showUnusualOnly}
                onCheckedChange={(checked) => setFilters({...filters, showUnusualOnly: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Show Sweeps Only</Label>
              <Switch
                checked={filters.showSweepsOnly}
                onCheckedChange={(checked) => setFilters({...filters, showSweepsOnly: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Institutional Only</Label>
              <Switch
                checked={filters.showInstitutionalOnly}
                onCheckedChange={(checked) => setFilters({...filters, showInstitutionalOnly: checked})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Heat Map Grid */}
      <div className="grid gap-6">
        {Object.entries(groupedData).map(([sector, cells]) => (
          <Card key={sector}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{sector}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {cells.length} symbols
                  </Badge>
                  {sectorPerformance.sectors?.find(s => s.name === sector) && (
                    <Badge variant={
                      sectorPerformance.sectors.find(s => s.name === sector)?.flowDirection === 'bullish' ? 'default' : 'destructive'
                    }>
                      {sectorPerformance.sectors.find(s => s.name === sector)?.flowDirection}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {cells.map((cell) => (
                  <div
                    key={cell.ticker}
                    className={`
                      ${getCellSize(cell)} 
                      ${getHeatColor(cell)} 
                      ${getTextColor(cell)}
                      rounded-lg p-2 cursor-pointer transition-all hover:scale-105 hover:shadow-lg
                      border-2 border-transparent hover:border-blue-400
                      relative
                    `}
                    onClick={() => setSelectedCell(cell)}
                  >
                    {/* Main ticker and indicators */}
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm">{cell.ticker}</div>
                      <div className="flex gap-1">
                        {cell.unusual && <Zap className="h-3 w-3 text-yellow-300" />}
                        {cell.sweep && <Target className="h-3 w-3 text-red-300" />}
                        {cell.institutional && <Eye className="h-3 w-3 text-blue-300" />}
                        {cell.darkPool && <Activity className="h-3 w-3 text-purple-300" />}
                      </div>
                    </div>

                    {/* Primary metric based on heat metric selection */}
                    <div className="text-xs font-medium mt-1">
                      {filters.heatMetric === 'volume' && formatVolume(cell.volume)}
                      {filters.heatMetric === 'premium' && formatCurrency(cell.premium)}
                      {filters.heatMetric === 'ai_score' && `AI: ${(cell.aiConfidence * 100).toFixed(0)}%`}
                      {filters.heatMetric === 'sentiment' && `${(cell.sentiment * 100).toFixed(0)}%`}
                      {filters.heatMetric === 'unusual' && `${cell.heatScore.toFixed(0)}`}
                    </div>

                    {/* Price and change */}
                    <div className="text-xs mt-1">
                      <div>${cell.price.toFixed(2)}</div>
                      <div className={cell.changePercent >= 0 ? 'text-green-300' : 'text-red-300'}>
                        {cell.changePercent >= 0 ? '+' : ''}{cell.changePercent.toFixed(1)}%
                      </div>
                    </div>

                    {/* Conviction badge */}
                    <div className="absolute top-1 right-1">
                      <div className={`
                        w-2 h-2 rounded-full
                        ${cell.conviction === 'exceptional' ? 'bg-green-400' :
                          cell.conviction === 'high' ? 'bg-yellow-400' :
                          cell.conviction === 'medium' ? 'bg-orange-400' :
                          'bg-red-400'
                        }
                      `} />
                    </div>

                    {/* Alerts indicator */}
                    {cell.alerts.length > 0 && (
                      <div className="absolute bottom-1 right-1">
                        <Flame className="h-3 w-3 text-red-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Cell Details Modal */}
      {selectedCell && (
        <Card className="fixed inset-x-4 bottom-4 z-50 max-w-md mx-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {selectedCell.ticker}
                <Badge className={
                  selectedCell.conviction === 'exceptional' ? 'bg-green-600' :
                  selectedCell.conviction === 'high' ? 'bg-green-500' :
                  selectedCell.conviction === 'medium' ? 'bg-yellow-500' :
                  'bg-red-500'
                }>
                  {selectedCell.conviction}
                </Badge>
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCell(null)}
              >
                ×
              </Button>
            </div>
            <CardDescription>{selectedCell.sector}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium">Price</div>
                <div>${selectedCell.price.toFixed(2)}</div>
              </div>
              <div>
                <div className="font-medium">Change</div>
                <div className={selectedCell.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {selectedCell.changePercent >= 0 ? '+' : ''}{selectedCell.changePercent.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="font-medium">Premium</div>
                <div>{formatCurrency(selectedCell.premium)}</div>
              </div>
              <div>
                <div className="font-medium">Volume</div>
                <div>{formatVolume(selectedCell.volume)}</div>
              </div>
              <div>
                <div className="font-medium">Net Flow</div>
                <div className={selectedCell.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatCurrency(Math.abs(selectedCell.netFlow))} {selectedCell.netFlow >= 0 ? 'Call' : 'Put'}
                </div>
              </div>
              <div>
                <div className="font-medium">AI Confidence</div>
                <div>{(selectedCell.aiConfidence * 100).toFixed(1)}%</div>
              </div>
            </div>

            {selectedCell.alerts.length > 0 && (
              <div className="mt-4">
                <div className="font-medium mb-2">Active Alerts</div>
                <div className="space-y-1">
                  {selectedCell.alerts.map((alert, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Badge variant={
                        alert.severity === 'high' ? 'destructive' :
                        alert.severity === 'medium' ? 'default' :
                        'outline'
                      }>
                        {alert.type}
                      </Badge>
                      <span className="text-xs">{alert.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button size="sm" className="flex-1">
                View Details
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                Add to Watchlist
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <div className="font-medium">Indicators</div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Unusual Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-red-500" />
                <span>Sweep Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>Institutional</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span>Dark Pool</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Conviction</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span>Exceptional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <span>High</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <span>Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span>Low</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Color Schemes</div>
              <div>Sentiment: Green (Bullish) → Red (Bearish)</div>
              <div>Volume: Light Blue → Dark Blue</div>
              <div>Heat: Green → Yellow → Red</div>
              <div>AI: Light Purple → Dark Purple</div>
            </div>

            <div className="space-y-2">
              <div className="font-medium">Size Metrics</div>
              <div>Cell size reflects selected heat metric</div>
              <div>Larger = Higher value</div>
              <div>Volume, Premium, or AI Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}