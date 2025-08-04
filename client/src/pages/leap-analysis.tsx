import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Calendar, DollarSign, Target, BarChart3, Zap, AlertTriangle, Settings } from "lucide-react";

interface LEAPTrade {
  id: string;
  ticker: string;
  optionChain: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  daysToExpiry: number;
  originalPremium: number;
  originalPrice: number;
  originalVolume: number;
  originalOpenInterest: number;
  tradeDate: string;
  currentPrice?: number;
  currentOpenInterest?: number;
  premiumChange?: number;
  premiumChangePercent?: number;
  openInterestChange?: number;
  openInterestChangePercent?: number;
  probabilityScore: number;
  sector: string;
  marketCap: string;
  underlyingPrice: number;
  moneyness: number;
  alertRule: string;
  hassweep: boolean;
  volumeOiRatio: number;
  conviction: 'low' | 'medium' | 'high' | 'exceptional';
}

interface LEAPAnalysisData {
  trades: LEAPTrade[];
  summary: {
    totalPremium?: number;
    highConviction?: number;
    avgProbabilityScore?: number;
    topSectors?: Array<{ sector: string; count: number }>;
  };
}

interface StringencyMetrics {
  successRate: number;
  avgReturn: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  avgWinDuration: number;
}

interface TradeAnalysis {
  timeDecay?: {
    daysElapsed?: number;
    daysRemaining?: number;
    timeDecayRate?: number;
  };
  riskReward?: {
    maxLoss: number;
    breakeven: number;
    profitPotential: string;
  };
  probabilityAssessment?: {
    overallScore?: number;
    factors?: Record<string, string | number>;
  };
  recommendedActions?: string[];
}

interface TradeDetails {
  analysis?: TradeAnalysis;
}

export default function LEAPAnalysisPage() {
  const [selectedTrade, setSelectedTrade] = useState<LEAPTrade | null>(null);
  const [selectedLeapIds, setSelectedLeapIds] = useState<string[]>([]);
  const [stringencyLevel, setStringencyLevel] = useState(5);
  const [trainingMode, setTrainingMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: leapData, isLoading, error, dataUpdatedAt: leapUpdatedAt, refetch } = useQuery<LEAPAnalysisData>({
    queryKey: ['/api/leaps/analyze', stringencyLevel],
    queryFn: async () => {
      const timestamp = new Date().toLocaleTimeString();
      console.log('🔄 Fetching LEAP analysis at', timestamp, 'for stringency level', stringencyLevel);
      const params = new URLSearchParams();
      if (stringencyLevel !== 3) {
        params.append('stringency', stringencyLevel.toString());
      }
      // Add timestamp to prevent caching
      params.append('_t', Date.now().toString());
      const url = `/api/leaps/analyze${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load LEAP analysis: ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      console.log('✅ Received LEAP data at', timestamp, '- Trades:', data.trades?.length, 'Total Premium:', data.summary?.totalPremium);
      return data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds instead of 5 minutes
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  });

  // Fetch stringency metrics for training mode
  const { data: stringencyMetrics } = useQuery<StringencyMetrics>({
    queryKey: ['/api/options/stringency-metrics', stringencyLevel],
    enabled: trainingMode,
  });

  const trades = leapData?.trades || [];
  const summary = leapData?.summary || {};

  console.log('🔍 LEAP Analysis Debug:', {
    isLoading,
    error: error?.message,
    tradesCount: trades.length,
    lastUpdated: leapUpdatedAt ? new Date(leapUpdatedAt).toLocaleTimeString() : 'Never',
    stringencyLevel,
    totalPremium: summary.totalPremium,
    highConviction: summary.highConviction
  });

  const { data: tradeDetails, isLoading: loadingDetails, error: detailsError } = useQuery<TradeDetails>({
    queryKey: ['/api/leaps', selectedTrade?.id, 'details'],
    enabled: !!selectedTrade?.id,
    retry: 3,
    staleTime: 60000
  });

  const analysis = tradeDetails?.analysis || {};

  const updatePricesMutation = useMutation({
    mutationFn: async (leapIds: string[]) => {
      const response = await fetch('/api/leaps/update-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leapIds }),
      });
      if (!response.ok) throw new Error('Failed to update prices');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leaps/analyze'] });
    },
  });

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getConvictionColor = (conviction: string) => {
    switch (conviction) {
      case 'exceptional': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getProbabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const adjustStringency = (level: number) => {
    setStringencyLevel(level);
  };

  const getStringencyColor = (level: number) => {
    if (level >= 8) return 'text-red-600';
    if (level >= 6) return 'text-orange-600';
    if (level >= 4) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">LEAP Analysis</h1>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Failed to load LEAP analysis: {(error as Error).message}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">LEAP Analysis - Past Week</h1>
          {leapUpdatedAt && (
            <p className="text-sm text-gray-600 mt-1">
              Last updated: {new Date(leapUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Label>Training Mode</Label>
            <Switch
              checked={trainingMode}
              onCheckedChange={setTrainingMode}
            />
          </div>
          <Button 
            onClick={() => updatePricesMutation.mutate(selectedLeapIds)}
            disabled={selectedLeapIds.length === 0 || updatePricesMutation.isPending}
            size="sm"
          >
            {updatePricesMutation.isPending ? 'Updating...' : 'Update Selected Prices'}
          </Button>
          <Badge variant="outline">
            {trades.length} High-Probability LEAPs
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total LEAPs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
            <p className="text-xs text-muted-foreground">
              High probability trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Premium</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalPremium || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Institutional commitment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Conviction</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary.highConviction || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Exceptional + High rated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getProbabilityColor(summary.avgProbabilityScore || 0)}`}>
              {(summary.avgProbabilityScore || 0).toFixed(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Probability score
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stringency Control Panel for LEAP Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            LEAP Analysis Stringency & Performance Metrics
          </CardTitle>
          <CardDescription>
            Adjust analysis stringency and monitor LEAP success rates in training mode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <Label>Stringency Level: {stringencyLevel}/10</Label>
                <Slider
                  value={[stringencyLevel]}
                  onValueChange={(value) => adjustStringency(value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full mt-2"
                />
                <div className={`text-sm mt-1 ${getStringencyColor(stringencyLevel)}`}>
                  {stringencyLevel >= 8 ? 'Ultra High - Institutional Grade LEAPs Only' :
                   stringencyLevel >= 6 ? 'High - Premium LEAP Opportunities' :
                   stringencyLevel >= 4 ? 'Medium - Balanced Long-Term Approach' :
                   'Low - Volume-Based LEAP Detection'}
                </div>
              </div>

              {trainingMode && stringencyMetrics && (
                <div className="space-y-2">
                  <h4 className="font-medium">LEAP Performance at Current Stringency</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Success Rate: <span className="font-medium text-green-600">{stringencyMetrics.successRate.toFixed(1)}%</span></div>
                    <div>Avg Return: <span className="font-medium">{(stringencyMetrics.avgReturn * 100).toFixed(1)}%</span></div>
                    <div>Win Rate: <span className="font-medium">{stringencyMetrics.winRate.toFixed(1)}%</span></div>
                    <div>Profit Factor: <span className="font-medium">{stringencyMetrics.profitFactor.toFixed(2)}</span></div>
                    <div>Sharpe Ratio: <span className="font-medium">{stringencyMetrics.sharpeRatio.toFixed(2)}</span></div>
                    <div>Avg Hold Time: <span className="font-medium">{stringencyMetrics.avgWinDuration.toFixed(0)} days</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">LEAP Analysis Factors</h4>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Minimum DTE:</span>
                  <span className="font-medium">{stringencyLevel >= 7 ? '180+ days' : stringencyLevel >= 5 ? '120+ days' : '90+ days'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Min Premium:</span>
                  <span className="font-medium">${stringencyLevel >= 8 ? '2M+' : stringencyLevel >= 6 ? '1M+' : stringencyLevel >= 4 ? '500K+' : '250K+'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Volume/OI Ratio:</span>
                  <span className="font-medium">{stringencyLevel >= 7 ? '3.0+' : stringencyLevel >= 5 ? '2.0+' : '1.0+'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sweep Detection:</span>
                  <span className="font-medium">{stringencyLevel >= 6 ? 'Required' : 'Optional'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Institutional Flow:</span>
                  <span className="font-medium">{stringencyLevel >= 8 ? 'Required' : stringencyLevel >= 5 ? 'Preferred' : 'Optional'}</span>
                </div>
              </div>
              
              {trainingMode && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium text-blue-700">Training Mode Active:</span>
                    <div className="text-blue-600 mt-1">
                      Collecting performance data for stringency optimization. 
                      All LEAP trades are being tracked for success rate analysis.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trades">LEAP Trades</TabsTrigger>
          <TabsTrigger value="analysis">Sector Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>High-Probability LEAP Trades</CardTitle>
              <CardDescription>
                Institutional LEAP positions with 365+ days to expiry and $500K+ premium
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Strike</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>OI Change</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Conviction</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map((trade: LEAPTrade) => (
                      <TableRow key={trade.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedLeapIds.includes(trade.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLeapIds([...selectedLeapIds, trade.id]);
                              } else {
                                setSelectedLeapIds(selectedLeapIds.filter(id => id !== trade.id));
                              }
                            }}
                            aria-label={`Select ${trade.ticker} LEAP trade`}
                            title={`Select ${trade.ticker} LEAP trade for price updates`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{trade.ticker}</TableCell>
                        <TableCell>
                          <Badge variant={trade.type === 'call' ? 'default' : 'secondary'}>
                            {trade.type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>${trade.strike}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(trade.expiry).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(trade.originalPremium)}</TableCell>
                        <TableCell>{trade.originalVolume.toLocaleString()}</TableCell>
                        <TableCell>
                          {trade.openInterestChangePercent ? (
                            <span className={trade.openInterestChangePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatPercent(trade.openInterestChangePercent)}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={trade.probabilityScore} className="w-16" />
                            <span className={`text-sm font-medium ${getProbabilityColor(trade.probabilityScore)}`}>
                              {trade.probabilityScore}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getConvictionColor(trade.conviction)}>
                            {trade.conviction.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedTrade(trade)}
                              >
                                Analyze
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>
                                  {trade.ticker} {trade.type.toUpperCase()} ${trade.strike} - {new Date(trade.expiry).toLocaleDateString()}
                                </DialogTitle>
                                <DialogDescription>
                                  Detailed LEAP analysis and recommendations
                                </DialogDescription>
                              </DialogHeader>
                              
                              {loadingDetails ? (
                                <div className="p-8 text-center">Loading detailed analysis...</div>
                              ) : detailsError ? (
                                <div className="p-8 text-center text-red-600">
                                  Failed to load detailed analysis. Please try again.
                                </div>
                              ) : tradeDetails && analysis && Object.keys(analysis).length > 0 ? (
                                <div className="space-y-6">
                                  {/* Trade Overview */}
                                  <div className="grid gap-4 md:grid-cols-3">
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Original Trade</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-1 text-sm">
                                          <div>Price: ${trade.originalPrice}</div>
                                          <div>Premium: {formatCurrency(trade.originalPremium)}</div>
                                          <div>Date: {new Date(trade.tradeDate).toLocaleDateString()}</div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Current Status</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-1 text-sm">
                                          <div>Price: ${trade.currentPrice?.toFixed(2) || 'N/A'}</div>
                                          <div className={trade.premiumChangePercent && trade.premiumChangePercent > 0 ? 'text-green-600' : 'text-red-600'}>
                                            Change: {trade.premiumChangePercent ? formatPercent(trade.premiumChangePercent) : 'N/A'}
                                          </div>
                                          <div>Days Left: {analysis.timeDecay?.daysRemaining || trade.daysToExpiry}</div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                    
                                    <Card>
                                      <CardHeader className="pb-2">
                                        <CardTitle className="text-sm">Risk Profile</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-1 text-sm">
                                          <div>Max Loss: {analysis.riskReward?.maxLoss ? formatCurrency(analysis.riskReward.maxLoss) : 'N/A'}</div>
                                          <div>Breakeven: ${analysis.riskReward?.breakeven?.toFixed(2) || 'N/A'}</div>
                                          <div>Potential: {analysis.riskReward?.profitPotential || 'N/A'}</div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Probability Breakdown */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Probability Assessment</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                          <div>
                                            <div className="text-sm font-medium mb-2">Overall Score</div>
                                            <div className="flex items-center gap-2">
                                              <Progress value={analysis.probabilityAssessment?.overallScore || trade.probabilityScore} className="flex-1" />
                                              <span className={`font-semibold ${getProbabilityColor(analysis.probabilityAssessment?.overallScore || trade.probabilityScore)}`}>
                                                {analysis.probabilityAssessment?.overallScore || trade.probabilityScore}%
                                              </span>
                                            </div>
                                          </div>
                                          <div>
                                            <div className="text-sm font-medium mb-2">Factors</div>
                                            <div className="space-y-1 text-sm">
                                              {analysis.probabilityAssessment?.factors && Object.entries(analysis.probabilityAssessment.factors).map(([key, value]) => (
                                                <div key={key} className="flex justify-between">
                                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                                                  <span className="font-medium">{value}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Time Decay Analysis */}
                                  <Card>
                                    <CardHeader>
                                      <CardTitle>Time Decay Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid gap-4 md:grid-cols-3">
                                        <div>
                                          <div className="text-sm text-gray-600">Days Elapsed</div>
                                          <div className="text-lg font-semibold">{analysis.timeDecay?.daysElapsed || 0}</div>
                                        </div>
                                        <div>
                                          <div className="text-sm text-gray-600">Days Remaining</div>
                                          <div className="text-lg font-semibold">{analysis.timeDecay?.daysRemaining || trade.daysToExpiry}</div>
                                        </div>
                                        <div>
                                          <div className="text-sm text-gray-600">Time Decay Rate</div>
                                          <div className="text-lg font-semibold">{analysis.timeDecay?.timeDecayRate?.toFixed(1) || 0}%</div>
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>

                                  {/* Recommendations */}
                                  {analysis.recommendedActions && analysis.recommendedActions.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Recommendations</CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-2">
                                          {analysis.recommendedActions.map((recommendation: string, index: number) => (
                                            <div key={index} className="flex items-start gap-2">
                                              <Target className="h-4 w-4 mt-0.5 text-blue-600" />
                                              <span className="text-sm">{recommendation}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}
                                </div>
                              ) : (
                                <div className="p-8 text-center text-gray-600">
                                  Click "Analyze" to load detailed analysis for this LEAP trade.
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Sectors</CardTitle>
                <CardDescription>LEAP activity by sector</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.topSectors?.map((sector, index: number) => (
                  <div key={sector.sector} className="flex items-center justify-between py-2">
                    <span className="text-sm">{sector.sector}</span>
                    <Badge variant="outline">{sector.count} trades</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conviction Distribution</CardTitle>
                <CardDescription>Quality assessment of LEAP trades</CardDescription>
              </CardHeader>
              <CardContent>
                {['exceptional', 'high', 'medium', 'low'].map(conviction => {
                  const count = trades.filter((t: LEAPTrade) => t.conviction === conviction).length;
                  return (
                    <div key={conviction} className="flex items-center justify-between py-2">
                      <span className="text-sm capitalize">{conviction}</span>
                      <Badge className={getConvictionColor(conviction)}>{count}</Badge>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}