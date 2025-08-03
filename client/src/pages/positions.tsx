import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Clock, X, Bell, Plus, Trash2, AlertTriangle } from "lucide-react";
import { Position, AccountAlert, InsertAccountAlert } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const accountAlertSchema = z.object({
  alertName: z.string().min(1, "Alert name is required"),
  condition: z.string().min(1, "Condition is required"),
  threshold: z.string().min(1, "Threshold is required"),
  ticker: z.string().optional(),
  isEnabled: z.boolean().default(true),
  notificationMethod: z.string().min(1, "Notification method is required"),
});

type AccountAlertFormData = z.infer<typeof accountAlertSchema>;

export default function PositionsPage() {
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: positions = [], isLoading } = useQuery<Position[]>({
    queryKey: ['/api/positions'],
  });

  const { data: accountAlerts = [] } = useQuery<AccountAlert[]>({
    queryKey: ['/api/account-alerts/demo-user'],
  });

  const form = useForm<AccountAlertFormData>({
    resolver: zodResolver(accountAlertSchema),
    defaultValues: {
      alertName: '',
      condition: '',
      threshold: '',
      ticker: '',
      isEnabled: true,
      notificationMethod: 'all',
    },
  });

  const createAlertMutation = useMutation({
    mutationFn: (data: InsertAccountAlert) => apiRequest('POST', '/api/account-alerts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-alerts'] });
      setAlertDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Account alert created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create account alert",
        variant: "destructive",
      });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiRequest('DELETE', `/api/account-alerts/${alertId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/account-alerts'] });
      toast({
        title: "Success",
        description: "Account alert deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account alert",
        variant: "destructive",
      });
    },
  });

  const onCreateAlert = (data: AccountAlertFormData) => {
    createAlertMutation.mutate({
      userId: 'demo-user',
      alertName: data.alertName,
      condition: data.condition,
      threshold: data.threshold,
      ticker: data.ticker || undefined,
      isEnabled: data.isEnabled,
      notificationMethod: data.notificationMethod,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Active Positions</h1>
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
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

  const formatCurrency = (value: string | number | null) => {
    if (!value) return '$0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const formatPercent = (value: string | number | null) => {
    if (!value) return '0%';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  };

  const formatTime = (timestamp: string | Date | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const totalPnL = positions.reduce((sum, pos) => sum + (pos.pnl ? parseFloat(pos.pnl) : 0), 0);
  const openPositions = positions.filter(pos => pos.status === 'open');
  const profitablePositions = positions.filter(pos => pos.pnl && parseFloat(pos.pnl) > 0);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Portfolio Positions</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {openPositions.length} Open
          </Badge>
          <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Add Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Account Alert</DialogTitle>
                <DialogDescription>
                  Set up automated alerts for your portfolio
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateAlert)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="alertName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alert Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Portfolio Stop Loss" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select alert condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="portfolio_value_above">Portfolio Value Above</SelectItem>
                            <SelectItem value="portfolio_value_below">Portfolio Value Below</SelectItem>
                            <SelectItem value="daily_pnl_above">Daily P&L Above</SelectItem>
                            <SelectItem value="daily_pnl_below">Daily P&L Below</SelectItem>
                            <SelectItem value="position_pnl_above">Position P&L Above</SelectItem>
                            <SelectItem value="position_pnl_below">Position P&L Below</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="threshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Threshold Amount ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="ticker"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticker (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="AAPL" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notificationMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notification Method</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="push">Push</SelectItem>
                            <SelectItem value="all">All Methods</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable Alert</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Start monitoring this alert immediately
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createAlertMutation.isPending}>
                      {createAlertMutation.isPending ? 'Creating...' : 'Create Alert'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAlertDialogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalPnL)}
            </div>
            <p className="text-xs text-muted-foreground">
              unrealized + realized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {openPositions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              active trades
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {positions.length > 0 ? Math.round((profitablePositions.length / positions.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              profitable trades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Position Details</CardTitle>
          <CardDescription>
            Current and historical trading positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Positions</h3>
              <p className="text-muted-foreground">
                Your trading positions will appear here once you execute trades.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Entry Price</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>P&L %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entry Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((position) => {
                  const pnl = position.pnl ? parseFloat(position.pnl) : 0;
                  const pnlPercent = position.pnlPercent ? parseFloat(position.pnlPercent) : 0;
                  
                  return (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.ticker}</TableCell>
                      <TableCell>{position.strategy}</TableCell>
                      <TableCell>{position.quantity}</TableCell>
                      <TableCell>{formatCurrency(position.entryPrice)}</TableCell>
                      <TableCell>{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatCurrency(pnl)}
                      </TableCell>
                      <TableCell className={pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {formatPercent(pnlPercent)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            position.status === 'open' ? 'default' : 
                            position.status === 'closed' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {position.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatTime(position.entryTime)}</TableCell>
                      <TableCell>
                        {position.status === 'open' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                            Close
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Account Alerts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Account Alerts ({accountAlerts.length})
          </CardTitle>
          <CardDescription>
            Automated alerts for portfolio monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountAlerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Account Alerts</h3>
              <p className="text-muted-foreground">
                Set up alerts to monitor your portfolio automatically.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alert Name</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead>Notification</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Triggered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountAlerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">{alert.alertName}</TableCell>
                    <TableCell>{alert.condition.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{formatCurrency(alert.threshold)}</TableCell>
                    <TableCell>{alert.ticker || 'All'}</TableCell>
                    <TableCell className="capitalize">{alert.notificationMethod}</TableCell>
                    <TableCell>
                      <Badge variant={alert.isEnabled ? 'default' : 'secondary'}>
                        {alert.isEnabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatTime(alert.lastTriggered)}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteAlertMutation.mutate(alert.id)}
                        disabled={deleteAlertMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}