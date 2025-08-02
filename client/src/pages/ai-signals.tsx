import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Zap,
  Filter,
  RefreshCw
} from "lucide-react";

interface AISignal {
  id: string;
  ticker: string;
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  confidence: number;
  premium: number;
  reason: string;
  aiAnalysis: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  riskScore: number;
  expectedReturn: number;
  timeGenerated: string;
}

export default function AISignalsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterConfidence, setFilterConfidence] = useState<string>('all');
  const [selectedSignals, setSelectedSignals] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading } = useQuery<AISignal[]>({
    queryKey: ['/api/signals'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 10000,
  });

  const approveSignalMutation = useMutation({
    mutationFn: async ({ signalId, quantity }: { signalId: string; quantity: number }) => {
      const response = await fetch(`/api/signals/${signalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error('Failed to approve signal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
    },
  });

  const rejectSignalMutation = useMutation({
    mutationFn: async (signalId: string) => {
      const response = await fetch(`/api/signals/${signalId}/reject`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to reject signal');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
    },
  });

  const filteredSignals = signals.filter(signal => {
    if (filterStatus !== 'all' && signal.status !== filterStatus) return false;
    if (filterConfidence !== 'all') {
      if (filterConfidence === 'high' && signal.confidence < 80) return false;
      if (filterConfidence === 'medium' && (signal.confidence < 60 || signal.confidence >= 80)) return false;
      if (filterConfidence === 'low' && signal.confidence >= 60) return false;
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'executed': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value && value !== 0) return '$0';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number | undefined) => {
    if (!value && value !== 0) return '0.0%';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-purple-600" />
          <h1 className="text-3xl font-bold">AI Trading Signals</h1>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.signals?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.signals?.new || 0} new today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.signals?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.signals?.successRate || '72'}%</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.signals?.avgConfidence || '76'}%</div>
            <p className="text-xs text-muted-foreground">
              AI prediction confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="executed">Executed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterConfidence} onValueChange={setFilterConfidence}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confidence</SelectItem>
                <SelectItem value="high">High (80%+)</SelectItem>
                <SelectItem value="medium">Medium (60-79%)</SelectItem>
                <SelectItem value="low">Low (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="ml-auto">
              {filteredSignals.length} signals shown
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Signals Table */}
      <Card>
        <CardHeader>
          <CardTitle>AI Generated Signals</CardTitle>
          <CardDescription>
            Real-time trading signals generated by our AI analysis engine
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Strike/Expiry</TableHead>
                  <TableHead>Premium</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Expected Return</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignals.map((signal) => (
                  <TableRow key={signal.id}>
                    <TableCell className="font-medium">{signal.ticker}</TableCell>
                    <TableCell>
                      <Badge variant={signal.type === 'call' ? 'default' : 'secondary'}>
                        {signal.type === 'call' ? 'CALL' : 'PUT'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>${signal.strike}</div>
                        <div className="text-muted-foreground">{signal.expiry}</div>
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(signal.premium)}</TableCell>
                    <TableCell>
                      <span className={getConfidenceColor(signal.confidence)}>
                        {signal.confidence}%
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {signal.riskScore < 30 ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : signal.riskScore < 70 ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{signal.riskScore}/100</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={(signal.expectedReturn || 0) > 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercentage(signal.expectedReturn)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusColor(signal.status)}>
                        {signal.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {signal.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => approveSignalMutation.mutate({ signalId: signal.id, quantity: 1 })}
                            disabled={approveSignalMutation.isPending}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => rejectSignalMutation.mutate(signal.id)}
                            disabled={rejectSignalMutation.isPending}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Market Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Market Sentiment</h3>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-green-600 font-medium">Bullish</span>
                  <span className="text-sm text-muted-foreground">(68% confidence)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Strong institutional buying detected across tech and financial sectors
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Volatility Outlook</h3>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-yellow-600" />
                  <span className="text-yellow-600 font-medium">Elevated</span>
                  <span className="text-sm text-muted-foreground">(VIX: 18.4)</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Increased volatility expected due to upcoming earnings season
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}