import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Radar, 
  Zap, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Activity, 
  AlertTriangle,
  Volume2,
  Settings,
  Play,
  Pause,
  Eye,
  Filter
} from 'lucide-react';

interface OpportunityAlert {
  id: string;
  timestamp: string;
  ticker: string;
  sector: string;
  alertType: 'sweep' | 'unusual_volume' | 'momentum' | 'reversal' | 'breakout' | 'flow_imbalance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  description: string;
  details: {
    optionType: 'call' | 'put';
    strike: number;
    expiry: string;
    premium: number;
    volume: number;
    openInterest: number;
    underlyingPrice: number;
    impliedMove: number;
    delta: number;
    gamma: number;
    timeValue: number;
    intrinsicValue: number;
  };
  analysis: {
    sentiment: 'bullish' | 'bearish' | 'neutral';
    probabilityOfProfit: number;
    riskReward: number;
    timeDecay: number;
    volumeProfile: string;
    institutionalActivity: boolean;
    darkPoolActivity: boolean;
    catalysts: string[];
  };
  recommendation: {
    action: 'buy' | 'sell' | 'watch' | 'avoid';
    reasoning: string;
    entryPrice: number;
    stopLoss: number;
    profitTarget: number;
    timeframe: string;
    positionSize: string;
  };
}

interface RadarSettings {
  enabled: boolean;
  sensitivity: number; // 1-10 scale
  minConfidence: number;
  alertTypes: string[];
  sectors: string[];
  minPremium: number;
  maxTimeToExpiry: number;
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  maxAlerts: number;
}

const defaultSettings: RadarSettings = {
  enabled: true,
  sensitivity: 7,
  minConfidence: 75,
  alertTypes: ['sweep', 'unusual_volume', 'momentum', 'flow_imbalance'],
  sectors: [],
  minPremium: 100000,
  maxTimeToExpiry: 60,
  soundEnabled: true,
  autoRefresh: true,
  refreshInterval: 5,
  maxAlerts: 50,
};

export default function OptionsOpportunityRadar() {
  const [settings, setSettings] = useState<RadarSettings>(defaultSettings);
  const [selectedAlert, setSelectedAlert] = useState<OpportunityAlert | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  // Fetch real-time opportunities
  const { data: opportunities = [], isLoading, refetch, dataUpdatedAt } = useQuery<OpportunityAlert[]>({
    queryKey: ['/api/options/radar', settings, Date.now()], // Add timestamp for cache busting
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching Options Radar data at', timestamp);
      const response = await fetch('/api/options/radar');
      if (!response.ok) {
        throw new Error(`Failed to fetch radar data: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Received Options Radar data at', timestamp, '- Opportunities:', data.length);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds like LEAP analysis
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    enabled: settings.enabled && isActive,
  });

  // Fetch radar statistics  
  const { data: radarStats = {} } = useQuery<{
    totalScanned?: number;
    opportunitiesFound?: number;
    avgConfidence?: number;
    topSector?: string;
    scanRate?: number;
  }>({
    queryKey: ['/api/options/radar-stats', Date.now()], // Add timestamp for cache busting
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching Radar Stats at', timestamp);
      const response = await fetch('/api/options/radar-stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch radar stats: ${response.status}`);
      }
      const data = await response.json();
      console.log('✅ Received Radar Stats at', timestamp);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Play alert sound for new high-priority opportunities
  useEffect(() => {
    if (settings.soundEnabled && opportunities.length > alertCount) {
      const newAlerts = opportunities.slice(0, opportunities.length - alertCount);
      const highPriorityAlerts = newAlerts.filter(alert => 
        alert.severity === 'critical' || alert.severity === 'high'
      );
      
      if (highPriorityAlerts.length > 0) {
        // Play notification sound
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUZBDSH0fPTgzEGKGLg6KhNEAc7kt+qVRQKOJLZqGEcBjO46YdPaYVJ'); // Basic notification sound
        audio.play().catch(() => {}); // Ignore errors if audio doesn't play
      }
    }
    setAlertCount(opportunities.length);
  }, [opportunities.length, alertCount, settings.soundEnabled]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'sweep': return <Target className="h-4 w-4" />;
      case 'unusual_volume': return <Volume2 className="h-4 w-4" />;
      case 'momentum': return <TrendingUp className="h-4 w-4" />;
      case 'reversal': return <TrendingDown className="h-4 w-4" />;
      case 'breakout': return <Zap className="h-4 w-4" />;
      case 'flow_imbalance': return <Activity className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const filteredOpportunities = opportunities.filter(alert => 
    alert.confidence >= settings.minConfidence &&
    (settings.alertTypes.length === 0 || settings.alertTypes.includes(alert.alertType)) &&
    (settings.sectors.length === 0 || settings.sectors.includes(alert.sector))
  ).slice(0, settings.maxAlerts);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radar className="h-8 w-8 text-blue-600" />
            Options Opportunity Radar
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time AI-powered options opportunity detection and alerts
          </p>
        </div>
        <div className="flex gap-2">
          <div className="text-sm text-gray-600 flex items-center">
            Last scan: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </div>
          <Button
            onClick={() => setIsActive(!isActive)}
            variant={isActive ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isActive ? 'Pause' : 'Start'} Radar
          </Button>
          <Button onClick={() => refetch()} disabled={isLoading}>
            <Activity className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Scan Now
          </Button>
        </div>
      </div>

      {/* Radar Status Panel */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
              <div className="text-sm text-gray-600">Status</div>
            </div>
            <div className="text-xl font-bold">{isActive ? 'Active' : 'Paused'}</div>
            <div className="text-xs text-gray-500">
              Scan Rate: {radarStats.scanRate || 0}/min
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-gray-600">Opportunities</div>
            </div>
            <div className="text-2xl font-bold">{filteredOpportunities.length}</div>
            <div className="text-xs text-gray-500">
              Found: {radarStats.opportunitiesFound || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div className="text-sm text-gray-600">Scanned</div>
            </div>
            <div className="text-2xl font-bold">{radarStats.totalScanned || 0}</div>
            <div className="text-xs text-gray-500">Securities</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
            <div className="text-2xl font-bold">{radarStats.avgConfidence?.toFixed(0) || 0}%</div>
            <div className="text-xs text-gray-500">AI Score</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-gray-600">Top Sector</div>
            </div>
            <div className="text-lg font-bold">{radarStats.topSector || 'N/A'}</div>
            <div className="text-xs text-gray-500">Most Active</div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Radar Configuration
          </CardTitle>
          <CardDescription>
            Configure detection sensitivity and alert parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Sensitivity: {settings.sensitivity}/10</Label>
              <Slider
                value={[settings.sensitivity]}
                onValueChange={(value) => setSettings({...settings, sensitivity: value[0]})}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="text-xs text-gray-500">
                Higher = More alerts, Lower = Higher quality
              </div>
            </div>

            <div className="space-y-2">
              <Label>Min Confidence: {settings.minConfidence}%</Label>
              <Slider
                value={[settings.minConfidence]}
                onValueChange={(value) => setSettings({...settings, minConfidence: value[0]})}
                max={95}
                min={50}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Refresh Rate: {settings.refreshInterval}s</Label>
              <Slider
                value={[settings.refreshInterval]}
                onValueChange={(value) => setSettings({...settings, refreshInterval: value[0]})}
                max={60}
                min={1}
                step={1}
                className="w-full"
              />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4 mt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Sound Alerts</Label>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => setSettings({...settings, soundEnabled: checked})}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Auto Refresh</Label>
              <Switch
                checked={settings.autoRefresh}
                onCheckedChange={(checked) => setSettings({...settings, autoRefresh: checked})}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Alert Types</Label>
              <Select value="" onValueChange={() => {}}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sweep">Sweep Orders</SelectItem>
                  <SelectItem value="unusual_volume">Unusual Volume</SelectItem>
                  <SelectItem value="momentum">Momentum</SelectItem>
                  <SelectItem value="reversal">Reversal</SelectItem>
                  <SelectItem value="breakout">Breakout</SelectItem>
                  <SelectItem value="flow_imbalance">Flow Imbalance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Max Alerts</Label>
              <Select 
                value={settings.maxAlerts.toString()} 
                onValueChange={(value) => setSettings({...settings, maxAlerts: parseInt(value)})}
              >
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Opportunities Feed */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Opportunities List */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Live Opportunities ({filteredOpportunities.length})</span>
                <Badge variant="outline" className="animate-pulse">
                  {isActive ? 'LIVE' : 'PAUSED'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time opportunities sorted by confidence and severity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-auto">
                {filteredOpportunities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {isActive ? 'Scanning for opportunities...' : 'Radar is paused'}
                  </div>
                ) : (
                  filteredOpportunities.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getAlertTypeIcon(alert.alertType)}
                            <div>
                              <div className="font-bold text-lg">{alert.ticker}</div>
                              <div className="text-sm text-gray-600">{alert.sector}</div>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium text-green-600">{alert.confidence}%</div>
                          <div className="text-xs text-gray-500">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2">
                        <div className="text-sm font-medium">{alert.description}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {alert.details.optionType.toUpperCase()} ${alert.details.strike} • 
                          {formatCurrency(alert.details.premium)} • 
                          Vol: {alert.details.volume.toLocaleString()}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <span className={alert.analysis.sentiment === 'bullish' ? 'text-green-600' : 
                                         alert.analysis.sentiment === 'bearish' ? 'text-red-600' : 'text-gray-600'}>
                            {alert.analysis.sentiment.toUpperCase()}
                          </span>
                        </div>
                        <div>POP: {alert.analysis.probabilityOfProfit}%</div>
                        <div>R/R: {alert.analysis.riskReward.toFixed(1)}</div>
                        {alert.analysis.institutionalActivity && <Badge variant="outline">INST</Badge>}
                        {alert.analysis.darkPoolActivity && <Badge variant="outline">DARK</Badge>}
                      </div>

                      <Progress value={alert.confidence} className="mt-2 h-1" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Details Panel */}
        <div>
          {selectedAlert ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedAlert.ticker}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedAlert(null)}
                  >
                    ×
                  </Button>
                </CardTitle>
                <CardDescription>{selectedAlert.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Option Details */}
                <div>
                  <h4 className="font-medium mb-2">Option Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Type: {selectedAlert.details.optionType.toUpperCase()}</div>
                    <div>Strike: ${selectedAlert.details.strike}</div>
                    <div>Expiry: {selectedAlert.details.expiry}</div>
                    <div>Premium: {formatCurrency(selectedAlert.details.premium)}</div>
                    <div>Volume: {selectedAlert.details.volume.toLocaleString()}</div>
                    <div>OI: {selectedAlert.details.openInterest.toLocaleString()}</div>
                    <div>Delta: {selectedAlert.details.delta.toFixed(2)}</div>
                    <div>Gamma: {selectedAlert.details.gamma.toFixed(3)}</div>
                  </div>
                </div>

                {/* Analysis */}
                <div>
                  <h4 className="font-medium mb-2">AI Analysis</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sentiment:</span>
                      <Badge variant={selectedAlert.analysis.sentiment === 'bullish' ? 'default' : 'destructive'}>
                        {selectedAlert.analysis.sentiment.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Prob of Profit:</span>
                      <span className="font-medium">{selectedAlert.analysis.probabilityOfProfit}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Risk/Reward:</span>
                      <span className="font-medium">{selectedAlert.analysis.riskReward.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time Decay:</span>
                      <span className="font-medium">{selectedAlert.analysis.timeDecay.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                <div>
                  <h4 className="font-medium mb-2">AI Recommendation</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Action:</span>
                      <Badge className={
                        selectedAlert.recommendation.action === 'buy' ? 'bg-green-600' :
                        selectedAlert.recommendation.action === 'sell' ? 'bg-red-600' :
                        selectedAlert.recommendation.action === 'watch' ? 'bg-yellow-600' :
                        'bg-gray-600'
                      }>
                        {selectedAlert.recommendation.action.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs">{selectedAlert.recommendation.reasoning}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Entry: ${selectedAlert.recommendation.entryPrice.toFixed(2)}</div>
                      <div>Stop: ${selectedAlert.recommendation.stopLoss.toFixed(2)}</div>
                      <div>Target: ${selectedAlert.recommendation.profitTarget.toFixed(2)}</div>
                      <div>Timeframe: {selectedAlert.recommendation.timeframe}</div>
                    </div>
                  </div>
                </div>

                {/* Catalysts */}
                {selectedAlert.analysis.catalysts.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Catalysts</h4>
                    <div className="space-y-1">
                      {selectedAlert.analysis.catalysts.map((catalyst, index) => (
                        <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                          {catalyst}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">
                    Trade
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    Watch
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Radar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div>Select an opportunity to view detailed analysis</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}