import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  Target, 
  Shield, 
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Settings,
  Zap
} from "lucide-react";
import { useState } from "react";

interface PortfolioMetrics {
  totalValue: number;
  totalReturn: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  beta: number;
  alpha: number;
  diversificationRatio: number;
}

interface PositionAllocation {
  symbol: string;
  currentWeight: number;
  targetWeight: number;
  currentValue: number;
  targetValue: number;
  rebalanceAmount: number;
  strategy: string;
  riskScore: number;
}

interface OptimizationScenario {
  name: string;
  objective: string;
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  allocations: { symbol: string; weight: number }[];
}

export default function PortfolioOptimizationPage() {
  const [riskTolerance, setRiskTolerance] = useState([5]);
  const [targetReturn, setTargetReturn] = useState([12]);
  const [maxPositionSize, setMaxPositionSize] = useState([20]);
  const [rebalanceThreshold, setRebalanceThreshold] = useState([5]);

  const { data: portfolioMetrics, isLoading: loadingMetrics } = useQuery<PortfolioMetrics>({
    queryKey: ['/api/portfolio/metrics'],
  });

  const { data: allocations = [], isLoading: loadingAllocations } = useQuery<PositionAllocation[]>({
    queryKey: ['/api/portfolio/allocations'],
  });

  const { data: scenarios = [], isLoading: loadingScenarios } = useQuery<OptimizationScenario[]>({
    queryKey: ['/api/portfolio/optimization-scenarios', riskTolerance[0], targetReturn[0]],
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

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600';
    if (score <= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loadingMetrics) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Portfolio Optimization</h1>
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
        <h1 className="text-3xl font-bold">Portfolio Optimization & Risk Management</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-3 h-3 mr-1" />
            Real-time Analysis
          </Badge>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Portfolio Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(portfolioMetrics?.totalValue || 125847)}
            </div>
            <p className={`text-xs ${getPerformanceColor(portfolioMetrics?.totalReturn || 8.4)}`}>
              {formatPercentage(portfolioMetrics?.totalReturn || 8.4)} total return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(portfolioMetrics?.sharpeRatio || 1.85).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              risk-adjusted returns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volatility</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPercentage(portfolioMetrics?.volatility || 18.2)}
            </div>
            <p className="text-xs text-muted-foreground">
              annualized volatility
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
              {formatPercentage(portfolioMetrics?.maxDrawdown || 12.3)}
            </div>
            <p className="text-xs text-muted-foreground">
              maximum decline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Optimization Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Optimization Parameters</CardTitle>
          <CardDescription>
            Adjust parameters to optimize portfolio allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <Label>Risk Tolerance: {riskTolerance[0]}/10</Label>
              <Slider
                value={riskTolerance}
                onValueChange={setRiskTolerance}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher values allow more aggressive positions
              </p>
            </div>

            <div className="space-y-3">
              <Label>Target Annual Return: {targetReturn[0]}%</Label>
              <Slider
                value={targetReturn}
                onValueChange={setTargetReturn}
                max={30}
                min={5}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Expected portfolio return target
              </p>
            </div>

            <div className="space-y-3">
              <Label>Max Position Size: {maxPositionSize[0]}%</Label>
              <Slider
                value={maxPositionSize}
                onValueChange={setMaxPositionSize}
                max={50}
                min={5}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Maximum allocation per position
              </p>
            </div>

            <div className="space-y-3">
              <Label>Rebalance Threshold: {rebalanceThreshold[0]}%</Label>
              <Slider
                value={rebalanceThreshold}
                onValueChange={setRebalanceThreshold}
                max={20}
                min={1}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Trigger rebalancing when allocation drifts
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button>
              <Zap className="w-4 h-4 mr-2" />
              Optimize Portfolio
            </Button>
            <Button variant="outline">
              Run Scenario Analysis
            </Button>
            <Button variant="outline">
              Rebalance Now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="allocations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="allocations">Current Allocations</TabsTrigger>
          <TabsTrigger value="scenarios">Optimization Scenarios</TabsTrigger>
          <TabsTrigger value="diversification">Diversification Analysis</TabsTrigger>
          <TabsTrigger value="correlation">Correlation Matrix</TabsTrigger>
        </TabsList>

        <TabsContent value="allocations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Allocations & Rebalancing</CardTitle>
              <CardDescription>
                Current vs target allocations with rebalancing recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAllocations ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : allocations.length === 0 ? (
                <div className="text-center py-8">
                  <PieChart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Positions</h3>
                  <p className="text-muted-foreground">
                    Add positions to see allocation analysis
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Rebalance</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Mock data for demonstration */}
                    {[
                      { symbol: 'NVDA', strategy: 'swing', currentWeight: 15.2, targetWeight: 12.0, currentValue: 19134, targetValue: 15102, rebalanceAmount: -4032, riskScore: 7.2 },
                      { symbol: 'SPY', strategy: 'hedge', currentWeight: 25.8, targetWeight: 30.0, currentValue: 32468, targetValue: 37754, rebalanceAmount: 5286, riskScore: 3.1 },
                      { symbol: 'QQQ', strategy: 'leap', currentWeight: 18.5, targetWeight: 20.0, currentValue: 23281, targetValue: 25169, rebalanceAmount: 1888, riskScore: 5.4 },
                      { symbol: 'TSLA', strategy: 'swing', currentWeight: 8.3, targetWeight: 8.0, currentValue: 10445, targetValue: 10068, rebalanceAmount: -377, riskScore: 8.9 },
                      { symbol: 'MSFT', strategy: 'swing', currentWeight: 12.7, targetWeight: 15.0, currentValue: 15982, targetValue: 18877, rebalanceAmount: 2895, riskScore: 4.2 }
                    ].map((allocation) => (
                      <TableRow key={allocation.symbol}>
                        <TableCell className="font-medium">{allocation.symbol}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {allocation.strategy}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatPercentage(allocation.currentWeight)}</div>
                            <div className="text-sm text-muted-foreground">{formatCurrency(allocation.currentValue)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatPercentage(allocation.targetWeight)}</div>
                            <div className="text-sm text-muted-foreground">{formatCurrency(allocation.targetValue)}</div>
                          </div>
                        </TableCell>
                        <TableCell className={getPerformanceColor(allocation.rebalanceAmount)}>
                          {formatCurrency(allocation.rebalanceAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={getRiskColor(allocation.riskScore)}>
                              {allocation.riskScore.toFixed(1)}
                            </span>
                            <Progress 
                              value={allocation.riskScore * 10} 
                              className="w-16 h-2"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            {Math.abs(allocation.rebalanceAmount) > 1000 ? 'Rebalance' : 'Hold'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Optimization Scenarios</CardTitle>
              <CardDescription>
                Compare different optimization strategies and outcomes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingScenarios ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {/* Mock scenarios for demonstration */}
                  {[
                    { name: 'Conservative Growth', objective: 'Minimize Risk', expectedReturn: 8.5, volatility: 12.2, sharpeRatio: 1.42, maxDrawdown: 8.1 },
                    { name: 'Balanced Momentum', objective: 'Risk-Adjusted Return', expectedReturn: 14.7, volatility: 18.3, sharpeRatio: 1.85, maxDrawdown: 12.4 },
                    { name: 'Aggressive Growth', objective: 'Maximize Return', expectedReturn: 22.1, volatility: 26.8, sharpeRatio: 1.63, maxDrawdown: 18.9 },
                    { name: 'Current Portfolio', objective: 'Current Allocation', expectedReturn: 12.3, volatility: 19.1, sharpeRatio: 1.71, maxDrawdown: 15.2 }
                  ].map((scenario, index) => (
                    <Card key={index} className={scenario.name === 'Balanced Momentum' ? 'border-blue-500' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{scenario.name}</h3>
                          {scenario.name === 'Balanced Momentum' && (
                            <Badge variant="default">Recommended</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{scenario.objective}</p>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Return</div>
                            <div className="font-medium text-green-600">{formatPercentage(scenario.expectedReturn)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Volatility</div>
                            <div className="font-medium">{formatPercentage(scenario.volatility)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Sharpe</div>
                            <div className="font-medium">{scenario.sharpeRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Max DD</div>
                            <div className="font-medium text-red-600">{formatPercentage(scenario.maxDrawdown)}</div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant={scenario.name === 'Balanced Momentum' ? 'default' : 'outline'}>
                            Apply Scenario
                          </Button>
                          <Button size="sm" variant="ghost">
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diversification" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Diversification Analysis</CardTitle>
              <CardDescription>
                Portfolio concentration and diversification metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Concentration Risk</span>
                      <span className="text-sm font-medium">Medium</span>
                    </div>
                    <Progress value={45} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Top 3 positions represent 45% of portfolio
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Sector Diversification</span>
                      <span className="text-sm font-medium">Good</span>
                    </div>
                    <Progress value={72} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Well distributed across 6 sectors
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Strategy Diversification</span>
                      <span className="text-sm font-medium">Excellent</span>
                    </div>
                    <Progress value={88} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Balanced across swing, LEAP, and hedge strategies
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Diversification Metrics</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Effective Number of Positions</span>
                      <span className="font-medium">6.2</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Herfindahl Index</span>
                      <span className="font-medium">0.16</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Diversification Ratio</span>
                      <span className="font-medium">0.82</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Portfolio Beta</span>
                      <span className="font-medium">1.15</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Correlation Matrix</CardTitle>
              <CardDescription>
                Correlation analysis between portfolio positions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Correlation Matrix</h3>
                <p className="text-muted-foreground">
                  Interactive correlation heatmap would be displayed here showing relationships between positions
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}