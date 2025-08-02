import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Plus, RefreshCw, Settings, Activity, TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const portfolioSchema = z.object({
  name: z.string().min(1, "Portfolio name is required"),
  description: z.string().optional(),
  type: z.enum(["paper", "live"]),
  ibkrAccountId: z.string().optional(),
  riskProfile: z.enum(["conservative", "moderate", "aggressive"])
});

type Portfolio = {
  id: string;
  userId: string;
  name: string;
  description?: string;
  type: "paper" | "live";
  ibkrAccountId?: string;
  riskProfile: "conservative" | "moderate" | "aggressive";
  performance?: {
    totalValue: number;
    dayPnL: number;
    totalPnL: number;
    percentChange: number;
    positionCount: number;
  };
  syncedAt?: string;
};

type PortfolioPosition = {
  id: string;
  portfolioId: string;
  symbol: string;
  secType: string;
  quantity: number;
  avgCost: string;
  marketPrice?: string;
  marketValue?: string;
  unrealizedPnL?: string;
  contractDetails: any;
  lastUpdated: Date;
};

type PortfolioTransaction = {
  id: string;
  portfolioId: string;
  symbol: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: string;
  fees: string;
  contractDetails: any;
  executionTime: Date;
};

export default function PortfolioPage() {
  const [selectedPortfolio, setSelectedPortfolio] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch portfolios with performance data
  const { data: portfolios = [], isLoading, error } = useQuery({
    queryKey: ["/api/portfolios"],
    retry: 3,
    staleTime: 30000, // 30 seconds
  });

  // Fetch detailed portfolio data when one is selected
  const { data: selectedPortfolioData, isLoading: isDetailLoading } = useQuery({
    queryKey: ["/api/portfolios", selectedPortfolio],
    enabled: !!selectedPortfolio,
    retry: 2,
  });

  // Create portfolio mutation
  const createPortfolioMutation = useMutation({
    mutationFn: (data: z.infer<typeof portfolioSchema>) => 
      fetch("/api/portfolios", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data) 
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setIsCreateOpen(false);
      toast({ title: "Portfolio created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create portfolio", variant: "destructive" });
    },
  });

  // Sync portfolio mutation
  const syncPortfolioMutation = useMutation({
    mutationFn: (portfolioId: string) => 
      fetch(`/api/portfolios/${portfolioId}/sync`, { method: "POST" }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolio, "positions"] });
      toast({ title: "Portfolio synced successfully" });
    },
    onError: () => {
      toast({ title: "Failed to sync portfolio", variant: "destructive" });
    },
  });

  const form = useForm<z.infer<typeof portfolioSchema>>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "paper",
      riskProfile: "moderate"
    },
  });

  const onSubmit = (data: z.infer<typeof portfolioSchema>) => {
    createPortfolioMutation.mutate(data);
  };

  const formatCurrency = (value?: string | number) => {
    if (value === undefined || value === null) return "$--";
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return "$--";
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2 
    }).format(num);
  };

  const formatPercent = (current?: string, cost?: string) => {
    if (!current || !cost) return "--";
    const currentVal = parseFloat(current);
    const costVal = parseFloat(cost);
    const percent = ((currentVal - costVal) / costVal) * 100;
    return `${percent.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading portfolios...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-500">Error loading portfolios. Please try refreshing.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portfolio Management</h1>
          <p className="text-muted-foreground">
            Manage your trading portfolios and track performance
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Set up a new portfolio for tracking your trades
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Trading Portfolio" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Portfolio description..."
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select portfolio type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="paper">Paper Trading</SelectItem>
                          <SelectItem value="live">Live Trading</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Paper trading for practice, live trading for real money
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ibkrAccountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBKR Account ID (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="DU123456" {...field} />
                      </FormControl>
                      <FormDescription>
                        Link to your Interactive Brokers account
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="riskProfile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Profile</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select risk profile" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="conservative">Conservative</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPortfolioMutation.isPending}>
                    {createPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {portfolios.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PieChart className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Portfolios Yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first portfolio to start tracking your trades and performance
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Portfolio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {portfolios.map((portfolio) => (
            <Card 
              key={portfolio.id} 
              className={`cursor-pointer transition-colors ${
                selectedPortfolio === portfolio.id ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedPortfolio(portfolio.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                  <Badge variant={portfolio.type === 'live' ? 'default' : 'secondary'}>
                    {portfolio.type === 'live' ? 'Live' : 'Paper'}
                  </Badge>
                </div>
                {portfolio.description && (
                  <CardDescription>{portfolio.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Value</span>
                    <span className="font-semibold">{formatCurrency(portfolio.performance?.totalValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Daily P&L</span>
                    <div className="flex items-center">
                      {portfolio.performance?.dayPnL && portfolio.performance.dayPnL >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`font-semibold ${
                        portfolio.performance?.dayPnL && portfolio.performance.dayPnL >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(portfolio.performance?.dayPnL)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total P&L</span>
                    <div className="flex items-center">
                      {portfolio.performance?.totalPnL && portfolio.performance.totalPnL >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`font-semibold ${
                        portfolio.performance?.totalPnL && portfolio.performance.totalPnL >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {formatCurrency(portfolio.performance?.totalPnL)} ({portfolio.performance?.percentChange?.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Profile</span>
                    <Badge variant="outline" className="capitalize">
                      {portfolio.riskProfile}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedPortfolio && (
        <Tabs defaultValue="positions" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="positions">Positions</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncPortfolioMutation.mutate(selectedPortfolio)}
                disabled={syncPortfolioMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncPortfolioMutation.isPending ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          <TabsContent value="positions">
            <Card>
              <CardHeader>
                <CardTitle>Current Positions</CardTitle>
                <CardDescription>
                  Active positions in {portfolios.find(p => p.id === selectedPortfolio)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedPortfolioData?.positions || selectedPortfolioData.positions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No positions found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Avg Cost</TableHead>
                        <TableHead className="text-right">Market Price</TableHead>
                        <TableHead className="text-right">Market Value</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead className="text-right">%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPortfolioData?.positions?.map((position: any, index: number) => (
                        <TableRow key={position.id || index}>
                          <TableCell className="font-medium">{position.symbol}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{position.secType || 'STK'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{position.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(position.avgCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(position.marketPrice)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(position.marketValue)}</TableCell>
                          <TableCell className={`text-right ${
                            position.unrealizedPnL && parseFloat(position.unrealizedPnL) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatCurrency(position.unrealizedPnL)}
                          </TableCell>
                          <TableCell className={`text-right ${
                            position.unrealizedPnL && parseFloat(position.unrealizedPnL) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {formatPercent(position.marketPrice, position.avgCost)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Recent transactions for {portfolios.find(p => p.id === selectedPortfolio)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Transaction history will be available when trades are executed
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(portfolios.find(p => p.id === selectedPortfolio)?.performance?.totalValue)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily P&L</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(portfolios.find(p => p.id === selectedPortfolio)?.performance?.dayPnL)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(portfolios.find(p => p.id === selectedPortfolio)?.performance?.totalPnL)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Performance</CardTitle>
                  <PieChart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {portfolios.find(p => p.id === selectedPortfolio)?.performance?.percentChange?.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}