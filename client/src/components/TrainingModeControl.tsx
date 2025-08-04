import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Settings, 
  Target, 
  TrendingUp, 
  Brain, 
  AlertTriangle, 
  CheckCircle,
  Play,
  Pause,
  BarChart3,
  DollarSign,
  Zap,
  Shield
} from 'lucide-react';

interface TrainingModeConfig {
  autoExecuteTrades: boolean;
  restrictToWatchlist: boolean;
  maxPositionSize: number;
  maxDailyTrades: number;
  riskPerTrade: number;
  enabledStrategies: string[];
  minConfidenceThreshold: number;
  geminiUsage: 'sentiment_only' | 'disabled' | 'full';
}

interface TrainingModeStatus {
  isEnabled: boolean;
  config: TrainingModeConfig;
  stats: {
    tradesExecuted: number;
    dailyTradeCount: number;
    totalPnl: number;
  };
  statusReport: string;
}

interface RecommendationItem {
  type: 'warning' | 'info';
  title: string;
  message: string;
  action?: string;
}

interface TrainingRecommendations {
  recommendations: RecommendationItem[];
}

interface PerformanceMetrics {
  successRate: number;
  avgReturnPerTrade: number;
  riskMetrics: {
    sharpeRatio: number;
    maxDrawdown: number;
  };
}

interface DetailedStats {
  performance: PerformanceMetrics;
}

export default function TrainingModeControl() {
  const [configEditing, setConfigEditing] = useState(false);
  const [tempConfig, setTempConfig] = useState<Partial<TrainingModeConfig>>({});
  const queryClient = useQueryClient();

  // Fetch training mode status
  const { data: trainingStatus, isLoading } = useQuery<TrainingModeStatus>({
    queryKey: ['/api/training/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch detailed stats
  const { data: detailedStats } = useQuery<DetailedStats>({
    queryKey: ['/api/training/stats'],
    refetchInterval: 10000,
  });

  // Fetch recommendations
  const { data: recommendations } = useQuery<TrainingRecommendations>({
    queryKey: ['/api/training/recommendations'],
    refetchInterval: 30000,
  });

  // Toggle training mode mutation
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const response = await fetch('/api/training/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('Failed to toggle training mode');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/status'] });
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: any) => {
      const response = await fetch('/api/training/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update config');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/training/status'] });
      setConfigEditing(false);
    },
  });

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  const handleConfigSave = () => {
    updateConfigMutation.mutate(tempConfig);
  };

  const startConfigEdit = () => {
    setTempConfig(trainingStatus?.config || {});
    setConfigEditing(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading training mode status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = trainingStatus?.stats.dailyTradeCount || 0;
  const maxDaily = trainingStatus?.config.maxDailyTrades || 10;
  const progressPercent = (progress / maxDaily) * 100;

  return (
    <div className="space-y-6">
      {/* Main Training Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-6 w-6 text-blue-600" />
              <CardTitle>Training Mode</CardTitle>
              <Badge variant={trainingStatus?.isEnabled ? "default" : "secondary"}>
                {trainingStatus?.isEnabled ? 'ACTIVE' : 'INACTIVE'}
              </Badge>
            </div>
            <Switch
              checked={trainingStatus?.isEnabled || false}
              onCheckedChange={handleToggle}
              disabled={toggleMutation.isPending}
            />
          </div>
          <CardDescription>
            Automatically execute trades on watchlist symbols for ML training data collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className={trainingStatus?.isEnabled ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              {trainingStatus?.isEnabled 
                ? "🎯 Training mode is ACTIVE - All qualifying trades will be executed automatically for ML optimization"
                : "⏸️ Training mode is DISABLED - Manual approval required for all trades"
              }
            </AlertDescription>
          </Alert>

          {trainingStatus?.isEnabled && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Daily Trades</span>
                <span className="text-sm text-gray-600">{progress}/{maxDaily}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-lg font-bold">{trainingStatus?.stats.tradesExecuted || 0}</div>
                  <div className="text-xs text-gray-600">Total Trades</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">${(trainingStatus?.stats.totalPnl || 0).toFixed(0)}</div>
                  <div className="text-xs text-gray-600">Training P&L</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{((trainingStatus?.config.minConfidenceThreshold || 0.7) * 100).toFixed(0)}%</div>
                  <div className="text-xs text-gray-600">Min Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">${trainingStatus?.config.maxPositionSize || 1000}</div>
                  <div className="text-xs text-gray-600">Max Position</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Training Configuration
            </CardTitle>
            <Button 
              variant="outline" 
              onClick={configEditing ? () => setConfigEditing(false) : startConfigEdit}
              disabled={updateConfigMutation.isPending}
            >
              {configEditing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
          <CardDescription>
            Configure automated trading parameters for ML data collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Position Size ($)</Label>
                  <Input
                    type="number"
                    value={tempConfig.maxPositionSize || 1000}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, maxPositionSize: Number(e.target.value) }))}
                    min="100"
                    max="10000"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Max Daily Trades</Label>
                  <Input
                    type="number"
                    value={tempConfig.maxDailyTrades || 10}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, maxDailyTrades: Number(e.target.value) }))}
                    min="1"
                    max="50"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Risk Per Trade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={tempConfig.riskPerTrade || 0.5}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, riskPerTrade: Number(e.target.value) }))}
                    min="0.1"
                    max="5"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Min Confidence Threshold</Label>
                  <Input
                    type="number"
                    step="0.05"
                    value={tempConfig.minConfidenceThreshold || 0.7}
                    onChange={(e) => setTempConfig(prev => ({ ...prev, minConfidenceThreshold: Number(e.target.value) }))}
                    min="0.5"
                    max="0.95"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Gemini Usage</Label>
                  <Select 
                    value={tempConfig.geminiUsage || 'sentiment_only'}
                    onValueChange={(value: 'sentiment_only' | 'disabled' | 'full') => 
                      setTempConfig(prev => ({ ...prev, geminiUsage: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sentiment_only">Sentiment Only</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                      <SelectItem value="full">Full Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={tempConfig.restrictToWatchlist !== false}
                      onCheckedChange={(checked) => setTempConfig(prev => ({ ...prev, restrictToWatchlist: checked }))}
                    />
                    <Label>Restrict to Watchlist</Label>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={handleConfigSave} disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
                <Button variant="outline" onClick={() => setConfigEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Max Position Size</Label>
                <div className="text-lg">${trainingStatus?.config.maxPositionSize?.toLocaleString() || 1000}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Risk Per Trade</Label>
                <div className="text-lg">{trainingStatus?.config.riskPerTrade || 0.5}%</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gemini Usage</Label>
                <Badge variant={trainingStatus?.config.geminiUsage === 'sentiment_only' ? 'default' : 'secondary'}>
                  {trainingStatus?.config.geminiUsage?.replace('_', ' ').toUpperCase() || 'SENTIMENT ONLY'}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Watchlist Restriction</Label>
                <Badge variant={trainingStatus?.config.restrictToWatchlist ? 'default' : 'secondary'}>
                  {trainingStatus?.config.restrictToWatchlist ? 'ENABLED' : 'DISABLED'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {recommendations?.recommendations && recommendations.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Training Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.recommendations.map((rec: RecommendationItem, index: number) => (
                <Alert key={index} className={
                  rec.type === 'warning' ? 'border-yellow-200 bg-yellow-50' : 'border-blue-200 bg-blue-50'
                }>
                  {rec.type === 'warning' ? 
                    <AlertTriangle className="h-4 w-4" /> : 
                    <CheckCircle className="h-4 w-4" />
                  }
                  <AlertDescription>
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-sm mt-1">{rec.message}</div>
                    {rec.action && (
                      <div className="text-xs text-gray-600 mt-1">💡 {rec.action}</div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Summary */}
      {detailedStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Training Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <div className="text-xl font-bold">
                  {((detailedStats.performance?.successRate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Success Rate</div>
              </div>
              
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <DollarSign className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <div className="text-xl font-bold">
                  ${(detailedStats.performance?.avgReturnPerTrade || 0).toFixed(0)}
                </div>
                <div className="text-xs text-gray-600">Avg Return</div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <BarChart3 className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <div className="text-xl font-bold">
                  {(detailedStats.performance?.riskMetrics?.sharpeRatio || 0).toFixed(2)}
                </div>
                <div className="text-xs text-gray-600">Sharpe Ratio</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Shield className="h-6 w-6 mx-auto mb-2 text-orange-600" />
                <div className="text-xl font-bold">
                  {((detailedStats.performance?.riskMetrics?.maxDrawdown || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Max Drawdown</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
