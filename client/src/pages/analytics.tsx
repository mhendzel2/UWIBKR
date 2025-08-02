import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  PieChart, 
  Target, 
  Shield, 
  DollarSign,
  Calendar,
  Clock,
  Activity,
  Award,
  AlertTriangle
} from "lucide-react";
import { useState } from "react";

interface PerformanceOverview {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalPnl: number;
  totalReturn: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  winRate: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
  recoveryFactor: number;
}

interface StrategyPerformance {
  strategy: string;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  averageHoldTime: number;
  sharpeRatio: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
}

interface MonthlyPerformance {
  month: string;
  trades: number;
  pnl: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  return: number;
}

interface RiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  beta: number;
  alpha: number;
  informationRatio: number;
  treynorRatio: number;
  calmarRatio: number;
  sortinoRatio: number;
}

export default function AnalyticsPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all');

  const { data: overview, isLoading: loadingOverview } = useQuery<PerformanceOverview>({
    queryKey: ['/api/analytics/performance-overview'],
  });

  const { data: strategyPerformance = [], isLoading: loadingStrategy } = useQuery<StrategyPerformance[]>({
    queryKey: ['/api/analytics/strategy-performance'],
  });

  const { data: monthlyPerformance = [], isLoading: loadingMonthly } = useQuery<MonthlyPerformance[]>({
    queryKey: ['/api/analytics/monthly-performance'],
  });

  const { data: riskMetrics, isLoading: loadingRisk } = useQuery<RiskMetrics>({
    queryKey: ['/api/analytics/risk-metrics'],
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getPerformanceColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 60) return 'text-green-600';
    if (winRate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loadingOverview) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Performance Analytics</h1>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
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

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Analytics Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            Live Analytics
          </Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(overview?.totalPnl || 0)}`}>
              {formatCurrency(overview?.totalPnl || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(overview?.totalReturn || 0)} total return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getWinRateColor(overview?.winRate || 0)}`}>
              {formatPercentage(overview?.winRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.winningTrades || 0} wins, {overview?.losingTrades || 0} losses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(overview?.profitFactor || 0)}`}>
              {(overview?.profitFactor || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              gross profit / gross loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(overview?.sharpeRatio || 0)}`}>
              {(overview?.sharpeRatio || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              risk-adjusted returns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.totalTrades || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              executed positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Trade</CardTitle>
            <Award className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(overview?.largestWin || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              largest winner
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Worst Trade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(overview?.largestLoss || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              largest loser
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPercentage(overview?.maxDrawdown || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              maximum decline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="strategy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="strategy">Strategy Performance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Metrics</TabsTrigger>
          <TabsTrigger value="trades">Trade Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategy Performance Breakdown</CardTitle>
              <CardDescription>
                Performance metrics by trading strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStrategy ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : strategyPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Strategy Data</h3>
                  <p className="text-muted-foreground">
                    Execute some trades to see strategy performance analysis
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Profit Factor</TableHead>
                      <TableHead>Total P&L</TableHead>
                      <TableHead>Sharpe Ratio</TableHead>
                      <TableHead>Max DD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {strategyPerformance.map((strategy) => (
                      <TableRow key={strategy.strategy}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="capitalize">
                            {strategy.strategy}
                          </Badge>
                        </TableCell>
                        <TableCell>{strategy.totalTrades}</TableCell>
                        <TableCell className={getWinRateColor(strategy.winRate)}>
                          {formatPercentage(strategy.winRate)}
                        </TableCell>
                        <TableCell className={getPerformanceColor(strategy.profitFactor)}>
                          {strategy.profitFactor.toFixed(2)}
                        </TableCell>
                        <TableCell className={getPerformanceColor(strategy.totalPnl)}>
                          {formatCurrency(strategy.totalPnl)}
                        </TableCell>
                        <TableCell>{strategy.sharpeRatio.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          {formatPercentage(strategy.maxDrawdown)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Performance Analysis</CardTitle>
              <CardDescription>
                Month-by-month trading performance breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMonthly ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : monthlyPerformance.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Monthly Data</h3>
                  <p className="text-muted-foreground">
                    Trade for multiple months to see monthly performance trends
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Trades</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Win Rate</TableHead>
                      <TableHead>Profit Factor</TableHead>
                      <TableHead>Max DD</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyPerformance.map((month) => (
                      <TableRow key={month.month}>
                        <TableCell className="font-medium">{month.month}</TableCell>
                        <TableCell>{month.trades}</TableCell>
                        <TableCell className={getPerformanceColor(month.pnl)}>
                          {formatCurrency(month.pnl)}
                        </TableCell>
                        <TableCell className={getWinRateColor(month.winRate)}>
                          {formatPercentage(month.winRate)}
                        </TableCell>
                        <TableCell>{month.profitFactor.toFixed(2)}</TableCell>
                        <TableCell className="text-red-600">
                          {formatPercentage(month.maxDrawdown)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk-Adjusted Returns</CardTitle>
                <CardDescription>
                  Risk metrics for portfolio evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingRisk ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                      <div className="text-xl font-bold">{(overview?.sharpeRatio || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sortino Ratio</div>
                      <div className="text-xl font-bold">{(riskMetrics?.sortinoRatio || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Calmar Ratio</div>
                      <div className="text-xl font-bold">{(riskMetrics?.calmarRatio || 0).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Information Ratio</div>
                      <div className="text-xl font-bold">{(riskMetrics?.informationRatio || 0).toFixed(2)}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Exposure</CardTitle>
                <CardDescription>
                  Portfolio risk measurements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingRisk ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-sm text-muted-foreground">Value at Risk (95%)</div>
                      <div className="text-xl font-bold text-red-600">
                        {formatCurrency(riskMetrics?.valueAtRisk || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Expected Shortfall</div>
                      <div className="text-xl font-bold text-red-600">
                        {formatCurrency(riskMetrics?.expectedShortfall || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Maximum Drawdown</div>
                      <div className="text-xl font-bold text-red-600">
                        {formatPercentage(overview?.maxDrawdown || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Beta</div>
                      <div className="text-xl font-bold">{(riskMetrics?.beta || 0).toFixed(2)}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trades" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trade Analysis</CardTitle>
              <CardDescription>
                Detailed analysis of trading patterns and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-muted-foreground">Average Win</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(overview?.averageWin || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average Loss</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(overview?.averageLoss || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Win/Loss Ratio</div>
                  <div className="text-xl font-bold">
                    {overview?.averageLoss ? (Math.abs(overview.averageWin / overview.averageLoss)).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}