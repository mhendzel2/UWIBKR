// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Target, 
  AlertTriangle,
  FileText,
  Calculator,
  Filter,
  Download,
  Plus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTradeSchema, insertTradeAssessmentSchema, type Trade, type TradeAssessment } from "@shared/schema";
import { z } from "zod";

type TradeWithAssessments = Trade & {
  assessments?: TradeAssessment[];
};

export default function TradesPage() {
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTicker, setFilterTicker] = useState<string>("");
  const [selectedTrade, setSelectedTrade] = useState<TradeWithAssessments | null>(null);
  const [assessmentDialogOpen, setAssessmentDialogOpen] = useState(false);
  const [tradeDialogOpen, setTradeDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const safeJson = async (response: Response) => {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  };

  // Fetch trades with filtering
  const { data: trades = [], isLoading: tradesLoading, error: tradesError } = useQuery<Trade[]>({
    queryKey: ['/api/trades', filterStatus, filterTicker],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterTicker) params.append('ticker', filterTicker);
      const response = await fetch(`/api/trades?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch trades');
      return (await safeJson(response)) || [];
    },
  });

  // Fetch trade statistics
  const { data: stats } = useQuery({
    queryKey: ['/api/trades/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/trades/statistics');
      if (!response.ok) return null;
      return safeJson(response);
    },
  });

  // Fetch performance metrics
  const { data: performance = [], error: performanceError } = useQuery({
    queryKey: ['/api/performance'],
    queryFn: async () => {
      const response = await fetch('/api/performance');
      if (!response.ok) return [];
      return (await safeJson(response)) || [];
    },
  });

  // Trade creation form
  const tradeForm = useForm<z.infer<typeof insertTradeSchema>>({
    resolver: zodResolver(insertTradeSchema),
    defaultValues: {
      ticker: "",
      strategy: "swing",
      tradeType: "BUY_TO_OPEN",
      quantity: 1,
      entryPrice: "0",
      commission: "0",
      fees: "0",
      status: "open",
      executionTime: new Date(),
    },
  });

  // Assessment creation form
  const assessmentForm = useForm<z.infer<typeof insertTradeAssessmentSchema>>({
    resolver: zodResolver(insertTradeAssessmentSchema),
    defaultValues: {
      assessmentType: "human_review",
      assessor: "user",
      riskRating: "MEDIUM",
    },
  });

  // Create trade mutation
  const createTradeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof insertTradeSchema>) => {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/statistics'] });
      setTradeDialogOpen(false);
      tradeForm.reset();
    },
  });

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async ({ tradeId, data }: { tradeId: string; data: z.infer<typeof insertTradeAssessmentSchema> }) => {
      const response = await fetch(`/api/trades/${tradeId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      setAssessmentDialogOpen(false);
      assessmentForm.reset();
    },
  });

  // Update trade mutation (for closing trades)
  const updateTradeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trade> }) => {
      const response = await fetch(`/api/trades/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/statistics'] });
    },
  });

  const onCreateTrade = (data: z.infer<typeof insertTradeSchema>) => {
    createTradeMutation.mutate(data);
  };

  const onCreateAssessment = (data: z.infer<typeof insertTradeAssessmentSchema>) => {
    if (selectedTrade) {
      createAssessmentMutation.mutate({ 
        tradeId: selectedTrade.id, 
        data: { ...data, tradeId: selectedTrade.id }
      });
    }
  };

  const closeTrade = (trade: Trade, exitPrice: string) => {
    const realizedPnl = (parseFloat(exitPrice) - parseFloat(trade.entryPrice)) * trade.quantity;
    updateTradeMutation.mutate({
      id: trade.id,
      data: {
        status: 'closed',
        exitPrice,
        realizedPnl: realizedPnl.toString(),
        closeTime: new Date(),
      },
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      closed: "default",
      partially_filled: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  };

  const getPnLColor = (pnl: string | null) => {
    if (!pnl) return "text-gray-500";
    const value = parseFloat(pnl);
    return value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-500";
  };

  const formatCurrency = (value: string | number | null) => {
    if (!value) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof value === 'string' ? parseFloat(value) : value);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Trade Tracking</h1>
        <div className="flex gap-2">
          <Dialog open={tradeDialogOpen} onOpenChange={setTradeDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />New Trade</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Trade</DialogTitle>
              </DialogHeader>
              <Form {...tradeForm}>
                <form onSubmit={tradeForm.handleSubmit(onCreateTrade)} className="space-y-4">
                  <FormField
                    control={tradeForm.control}
                    name="ticker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticker</FormLabel>
                        <FormControl>
                          <Input placeholder="AAPL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tradeForm.control}
                    name="strategy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Strategy</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select strategy" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="swing">Swing Trading</SelectItem>
                            <SelectItem value="day_trading">Day Trading</SelectItem>
                            <SelectItem value="leap">LEAP Options</SelectItem>
                            <SelectItem value="covered_call">Covered Call</SelectItem>
                            <SelectItem value="iron_condor">Iron Condor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tradeForm.control}
                    name="tradeType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trade Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select trade type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BUY">BUY</SelectItem>
                            <SelectItem value="SELL">SELL</SelectItem>
                            <SelectItem value="BUY_TO_OPEN">BUY TO OPEN</SelectItem>
                            <SelectItem value="SELL_TO_CLOSE">SELL TO CLOSE</SelectItem>
                            <SelectItem value="BUY_TO_CLOSE">BUY TO CLOSE</SelectItem>
                            <SelectItem value="SELL_TO_OPEN">SELL TO OPEN</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={tradeForm.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={tradeForm.control}
                      name="entryPrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Entry Price</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createTradeMutation.isPending}>
                    {createTradeMutation.isPending ? "Creating..." : "Create Trade"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any).totalTrades || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(stats as any).openTrades || 0} open, {(stats as any).closedTrades || 0} closed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(stats as any).winRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {(stats as any).winningTrades || 0} winning trades
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPnLColor(((stats as any).totalRealizedPnl || 0).toString())}`}>
                {formatCurrency((stats as any).totalRealizedPnl || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Net: {formatCurrency((stats as any).netPnl || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getPnLColor(((stats as any).totalUnrealizedPnl || 0).toString())}`}>
                {formatCurrency((stats as any).totalUnrealizedPnl || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Open positions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="trades" className="w-full">
        <TabsList>
          <TabsTrigger value="trades">Active Trades</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
          <TabsTrigger value="analytics">Performance Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="partially_filled">Partial</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Filter by ticker..."
                  value={filterTicker}
                  onChange={(e) => setFilterTicker(e.target.value)}
                  className="w-40"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trades Table */}
          <Card>
            <CardHeader>
              <CardTitle>Trades</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Entry Price</TableHead>
                      <TableHead>Current/Exit Price</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tradesError ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-destructive">Failed to load trades</TableCell>
                      </TableRow>
                    ) : tradesLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">Loading trades...</TableCell>
                      </TableRow>
                    ) : (trades as Trade[]).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">No trades found</TableCell>
                      </TableRow>
                    ) : (
                      (trades as Trade[]).map((trade) => (
                        <TableRow key={trade.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-medium">{trade.ticker}</TableCell>
                          <TableCell>{trade.strategy}</TableCell>
                          <TableCell>{trade.tradeType}</TableCell>
                          <TableCell>{trade.quantity}</TableCell>
                          <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
                          <TableCell>
                            {trade.exitPrice ? formatCurrency(trade.exitPrice) : 
                             trade.fillPrice ? formatCurrency(trade.fillPrice) : '-'}
                          </TableCell>
                          <TableCell className={getPnLColor(trade.realizedPnl || trade.unrealizedPnl)}>
                            {formatCurrency(trade.realizedPnl || trade.unrealizedPnl)}
                          </TableCell>
                          <TableCell>{getStatusBadge(trade.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedTrade(trade)}
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                              {trade.status === 'open' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const exitPrice = prompt("Enter exit price:");
                                    if (exitPrice) closeTrade(trade, exitPrice);
                                  }}
                                >
                                  Close
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Exit</TableHead>
                      <TableHead>P&L</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(trades as Trade[]).filter(t => t.status === 'closed').map((trade) => (
                      <TableRow key={trade.id}>
                        <TableCell>
                          {new Date(trade.executionTime).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-medium">{trade.ticker}</TableCell>
                        <TableCell>{trade.strategy}</TableCell>
                        <TableCell>{formatCurrency(trade.entryPrice)}</TableCell>
                        <TableCell>{formatCurrency(trade.exitPrice)}</TableCell>
                        <TableCell className={getPnLColor(trade.realizedPnl)}>
                          {formatCurrency(trade.realizedPnl)}
                        </TableCell>
                        <TableCell>
                          {trade.closeTime && 
                            Math.round((new Date(trade.closeTime).getTime() - new Date(trade.executionTime).getTime()) / (1000 * 60 * 60 * 24))
                          } days
                        </TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                {performanceError ? (
                  <p className="text-destructive">Failed to load performance data</p>
                ) : (performance as any[]).length > 0 ? (
                  <div className="space-y-4">
                    {(performance as any[]).map((metric: any, index: number) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{metric.period}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(metric.startDate).toLocaleDateString()} - {new Date(metric.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Win Rate: {parseFloat(metric.winRate).toFixed(2)}%</div>
                          <div>Profit Factor: {parseFloat(metric.profitFactor).toFixed(2)}</div>
                          <div>Total P&L: {formatCurrency(metric.totalPnl)}</div>
                          <div>Max Drawdown: {formatCurrency(metric.maxDrawdown)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No performance data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trade Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button 
                    className="w-full" 
                    onClick={async () => {
                      // Trigger performance calculation
                      const startDate = new Date();
                      startDate.setMonth(startDate.getMonth() - 1);
                      await fetch('/api/performance/calculate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ startDate, endDate: new Date() })
                      });
                    }}
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Monthly Performance
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Generate comprehensive performance analysis for the last 30 days including win rate, profit factor, and risk metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Trade Assessment Dialog */}
      <Dialog open={assessmentDialogOpen} onOpenChange={setAssessmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trade Assessment</DialogTitle>
          </DialogHeader>
          {selectedTrade && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <span className="text-sm font-medium">Trade: </span>
                  <span>{selectedTrade.ticker} {selectedTrade.tradeType}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">P&L: </span>
                  <span className={getPnLColor(selectedTrade.realizedPnl || selectedTrade.unrealizedPnl)}>
                    {formatCurrency(selectedTrade.realizedPnl || selectedTrade.unrealizedPnl)}
                  </span>
                </div>
              </div>
              
              <Form {...assessmentForm}>
                <form onSubmit={assessmentForm.handleSubmit(onCreateAssessment)} className="space-y-4">
                  <FormField
                    control={assessmentForm.control}
                    name="assessmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ai_pre_trade">AI Pre-Trade</SelectItem>
                            <SelectItem value="ai_post_trade">AI Post-Trade</SelectItem>
                            <SelectItem value="human_review">Human Review</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={assessmentForm.control}
                    name="riskRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Risk Rating</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="LOW">Low Risk</SelectItem>
                            <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                            <SelectItem value="HIGH">High Risk</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={assessmentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add your assessment notes..."
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={createAssessmentMutation.isPending}>
                    {createAssessmentMutation.isPending ? "Saving..." : "Save Assessment"}
                  </Button>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}