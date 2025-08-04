import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Target, Shield, AlertTriangle, Calendar, Download, Filter } from 'lucide-react';

interface PerformanceOverview {
  totalPnL: number;
  avgTradeReturn: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface MonthlyPerformance {
  month: string;
  pnl: number;
  trades: number;
}

interface TopPerformer {
  ticker: string;
  trades: number;
  winRate: number;
  totalReturn: number;
  avgReturn: number;
}

interface RecentActivity {
  description: string;
  date: string;
  impact: number;
}

interface StrategyPerformance {
  strategy: string;
  totalPnL: number;
  winRate: number;
  avgReturn: number;
  trades: number;
  sharpeRatio: number;
}

interface SectorAnalysis {
  sector: string;
  allocation: number;
  trades: number;
  winRate: number;
  totalPnL: number;
}

interface RiskMetrics {
  valueAtRisk: number;
  expectedShortfall: number;
  beta: number;
  volatility: number;
  informationRatio: number;
}

interface PerformanceReport {
  overview: PerformanceOverview;
  monthlyPerformance: MonthlyPerformance[];
  topPerformers: TopPerformer[];
  recentActivity: RecentActivity[];
  strategyPerformance: StrategyPerformance[];
  riskMetrics: RiskMetrics;
  sectorAnalysis: SectorAnalysis[];
}

interface RiskCompliance {
  portfolioRiskOk: boolean;
  positionSizeOk: boolean;
  sectorConcentrationOk: boolean;
}

interface RiskReport {
  concentrationRisk: number;
  maxPositionSize: number;
  compliance?: RiskCompliance;
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('1M');

  // Fetch performance report
  const { data: performanceReport, isLoading: performanceLoading } = useQuery<PerformanceReport>({
    queryKey: ['/api/reports/performance', selectedPeriod],
    refetchInterval: 30000,
  });

  // Fetch risk report
  const { data: riskReport } = useQuery<RiskReport>({
    queryKey: ['/api/reports/risk'],
    refetchInterval: 60000,
  });

  const exportReport = async (format: string) => {
    try {
      const response = await fetch(`/api/reports/export?format=${format}&period=${selectedPeriod}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-report-${selectedPeriod}.${format}`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (performanceLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading performance reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Reports</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive trading performance analytics and insights
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1W">1 Week</SelectItem>
              <SelectItem value="1M">1 Month</SelectItem>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => exportReport('pdf')} className="bg-blue-600 hover:bg-blue-700">
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(performanceReport?.overview?.totalPnL || 0).toLocaleString()}
            </div>
            <div className="flex items-center space-x-2 text-sm">
              {(performanceReport?.overview?.totalPnL || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`${(performanceReport?.overview?.totalPnL || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {((performanceReport?.overview?.avgTradeReturn || 0) * 100).toFixed(1)}% avg
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((performanceReport?.overview?.winRate || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {performanceReport?.overview?.totalTrades || 0} total trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Factor</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(performanceReport?.overview?.profitFactor || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Gross profit / Gross loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(performanceReport?.overview?.sharpeRatio || 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Risk-adjusted returns
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="strategy">Strategy Analysis</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
          <TabsTrigger value="sectors">Sector Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance</CardTitle>
                <CardDescription>P&L and trade count by month</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={performanceReport?.monthlyPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'pnl' ? `$${value.toLocaleString()}` : value,
                      name === 'pnl' ? 'P&L' : 'Trades'
                    ]} />
                    <Area type="monotone" dataKey="pnl" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
                    <Bar dataKey="trades" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Tickers</CardTitle>
                <CardDescription>Best performers by total return</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(performanceReport?.topPerformers || [] as TopPerformer[]).slice(0, 8).map((performer: TopPerformer, index: number) => (
                    <div key={performer.ticker} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
                          index < 3 ? 'bg-yellow-500' : 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{performer.ticker}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {performer.trades} trades • {(performer.winRate * 100).toFixed(0)}% win rate
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${performer.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(performer.totalReturn * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(performer.avgReturn * 100).toFixed(1)}% avg
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest trading activities and their impact</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(performanceReport?.recentActivity || [] as RecentActivity[]).slice(0, 10).map((activity: RecentActivity, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{activity.description}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{activity.date}</div>
                      </div>
                    </div>
                    <div className={`font-medium ${activity.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.impact >= 0 ? '+' : ''}${activity.impact.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategy" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Performance</CardTitle>
                <CardDescription>Performance breakdown by trading strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceReport?.strategyPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="strategy" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'totalPnL' ? `$${value.toLocaleString()}` : 
                      name === 'winRate' ? `${(value * 100).toFixed(1)}%` :
                      name === 'avgReturn' ? `${(value * 100).toFixed(1)}%` : value,
                      name === 'totalPnL' ? 'Total P&L' :
                      name === 'winRate' ? 'Win Rate' :
                      name === 'avgReturn' ? 'Avg Return' : name
                    ]} />
                    <Bar dataKey="totalPnL" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Strategy Details */}
            <Card>
              <CardHeader>
                <CardTitle>Strategy Metrics</CardTitle>
                <CardDescription>Detailed performance metrics by strategy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(performanceReport?.strategyPerformance || [] as StrategyPerformance[]).map((strategy: StrategyPerformance, index: number) => (
                    <div key={strategy.strategy} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{strategy.strategy.toUpperCase()}</h4>
                        <Badge variant={strategy.totalPnL >= 0 ? 'default' : 'destructive'}>
                          {strategy.totalPnL >= 0 ? 'Profitable' : 'Loss'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Trades:</span>
                          <div className="font-medium">{strategy.trades}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Win Rate:</span>
                          <div className="font-medium">{(strategy.winRate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Avg Return:</span>
                          <div className="font-medium">{(strategy.avgReturn * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Sharpe Ratio:</span>
                          <div className="font-medium">{strategy.sharpeRatio.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>Portfolio risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Value at Risk (5%)</div>
                      <div className="text-lg font-bold">{((performanceReport?.riskMetrics?.valueAtRisk || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Expected Shortfall</div>
                      <div className="text-lg font-bold">{((performanceReport?.riskMetrics?.expectedShortfall || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Portfolio Beta</div>
                      <div className="text-lg font-bold">{(performanceReport?.riskMetrics?.beta || 0).toFixed(2)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Volatility</div>
                      <div className="text-lg font-bold">{((performanceReport?.riskMetrics?.volatility || 0) * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown:</span>
                      <span className="font-medium text-red-600">
                        {((performanceReport?.overview?.maxDrawdown || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Information Ratio:</span>
                      <span className="font-medium">
                        {(performanceReport?.riskMetrics?.informationRatio || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Compliance */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Compliance</CardTitle>
                <CardDescription>Risk limit monitoring and compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskReport ? (
                    <>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Portfolio Risk</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Current: {(riskReport.concentrationRisk * 100).toFixed(1)}% | Limit: 5%
                          </div>
                        </div>
                        <Badge variant={riskReport.compliance?.portfolioRiskOk ? 'default' : 'destructive'}>
                          {riskReport.compliance?.portfolioRiskOk ? 'OK' : 'Alert'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Position Size</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Max: ${(riskReport.maxPositionSize || 0).toLocaleString()}
                          </div>
                        </div>
                        <Badge variant={riskReport.compliance?.positionSizeOk ? 'default' : 'destructive'}>
                          {riskReport.compliance?.positionSizeOk ? 'OK' : 'Alert'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Sector Concentration</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Max sector exposure limit: 25%
                          </div>
                        </div>
                        <Badge variant={riskReport.compliance?.sectorConcentrationOk ? 'default' : 'destructive'}>
                          {riskReport.compliance?.sectorConcentrationOk ? 'OK' : 'Alert'}
                        </Badge>
                      </div>
                    </>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sectors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sector Allocation Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sector Allocation</CardTitle>
                <CardDescription>Portfolio allocation by sector</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={performanceReport?.sectorAnalysis || []}
                      dataKey="allocation"
                      nameKey="sector"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      label={({sector, allocation}) => `${sector}: ${(allocation * 100).toFixed(1)}%`}
                    >
                      {(performanceReport?.sectorAnalysis || [] as SectorAnalysis[]).map((entry: SectorAnalysis, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sector Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Sector Performance</CardTitle>
                <CardDescription>Performance metrics by sector</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(performanceReport?.sectorAnalysis || [] as SectorAnalysis[]).map((sector: SectorAnalysis, index: number) => (
                    <div key={sector.sector} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{sector.sector}</h4>
                        <Badge style={{ backgroundColor: COLORS[index % COLORS.length] }} className="text-white">
                          {(sector.allocation * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Trades:</span>
                          <div className="font-medium">{sector.trades}</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Win Rate:</span>
                          <div className="font-medium">{(sector.winRate * 100).toFixed(1)}%</div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">P&L:</span>
                          <div className={`font-medium ${sector.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${sector.totalPnL.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
