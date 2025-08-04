import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Volume2, Clock, Calendar, Search, Filter } from "lucide-react";
import { OptionsFlow, HistoricalData } from "@shared/schema";
import { useState } from "react";

export default function OptionsFlowPage() {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [timeframe, setTimeframe] = useState<string>('1d');
  const [startDate, setStartDate] = useState<string>(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const { data: optionsFlow = [], isLoading: loadingFlow } = useQuery<OptionsFlow[]>({
    queryKey: ['/api/flow-alerts'],
    queryFn: async () => {
      const response = await fetch('/api/flow-alerts');
      if (!response.ok) throw new Error('Failed to fetch flow alerts');
      return response.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const { data: historicalFlow = [], isLoading: loadingHistorical } = useQuery<HistoricalData[]>({
    queryKey: ['/api/historical/options_flow', selectedSymbol, timeframe, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        startDate,
        endDate,
        ...(selectedSymbol && { symbol: selectedSymbol }),
        limit: '100'
      });
      const response = await fetch(`/api/historical/options_flow?${params}`);
      if (!response.ok) throw new Error('Failed to fetch historical data');
      return response.json();
    },
  });

  if (loadingFlow) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Options Flow</h1>
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

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatTime = (timestamp: string | Date | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Options Flow Analysis</h1>
        <Badge variant="outline" className="text-sm">
          Live Data
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Flow Volume</CardTitle>
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {optionsFlow.reduce((sum, flow) => sum + flow.volume, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              contracts traded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Premium Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                optionsFlow.reduce((sum, flow) => sum + parseFloat(flow.premium), 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              total premium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bullish Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {optionsFlow.filter(flow => flow.sentiment === 'BULLISH').length}
            </div>
            <p className="text-xs text-muted-foreground">
              call activities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bearish Flow</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {optionsFlow.filter(flow => flow.sentiment === 'BEARISH').length}
            </div>
            <p className="text-xs text-muted-foreground">
              put activities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="live" className="space-y-6">
        <TabsList>
          <TabsTrigger value="live">Live Flow</TabsTrigger>
          <TabsTrigger value="historical">Historical Data</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <Card>
            <CardHeader>
              <CardTitle>Live Options Flow</CardTitle>
              <CardDescription>
                Real-time unusual options activity from institutional traders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {optionsFlow.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Options Flow Data</h3>
                  <p className="text-muted-foreground">
                    Waiting for unusual options activity to be detected...
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Premium</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Ask Side %</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optionsFlow.map((flow) => (
                      <TableRow key={flow.id}>
                        <TableCell className="font-medium">{flow.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={flow.type === 'CALL' ? 'default' : 'secondary'}>
                            {flow.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{flow.volume.toLocaleString()}</TableCell>
                        <TableCell>{formatCurrency(flow.premium)}</TableCell>
                        <TableCell>{formatCurrency(flow.price)}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              flow.sentiment === 'BULLISH' ? 'default' : 
                              flow.sentiment === 'BEARISH' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {flow.sentiment}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {flow.askSidePercentage ? `${parseFloat(flow.askSidePercentage).toFixed(1)}%` : 'N/A'}
                        </TableCell>
                        <TableCell>{formatTime(flow.timestamp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historical">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Historical Options Flow
              </CardTitle>
              <CardDescription>
                Query historical options flow data with custom filters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filters */}
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol (Optional)</Label>
                  <Input
                    id="symbol"
                    placeholder="e.g. AAPL"
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button className="w-full" disabled={loadingHistorical}>
                    <Search className="h-4 w-4 mr-2" />
                    {loadingHistorical ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </div>

              {/* Historical Results */}
              {loadingHistorical ? (
                <div className="text-center py-8">
                  <div className="animate-spin mx-auto h-8 w-8 border-2 border-primary border-t-transparent rounded-full mb-4"></div>
                  <p className="text-muted-foreground">Loading historical data...</p>
                </div>
              ) : historicalFlow.length === 0 ? (
                <div className="text-center py-8">
                  <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Historical Data Found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or date range.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date/Time</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Timeframe</TableHead>
                      <TableHead>Open</TableHead>
                      <TableHead>High</TableHead>
                      <TableHead>Low</TableHead>
                      <TableHead>Close</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicalFlow.map((data) => (
                      <TableRow key={data.id}>
                        <TableCell>{formatTime(data.timestamp)}</TableCell>
                        <TableCell className="font-medium">{data.symbol || 'N/A'}</TableCell>
                        <TableCell>{data.timeframe}</TableCell>
                        <TableCell>{data.openPrice ? formatCurrency(data.openPrice) : 'N/A'}</TableCell>
                        <TableCell>{data.highPrice ? formatCurrency(data.highPrice) : 'N/A'}</TableCell>
                        <TableCell>{data.lowPrice ? formatCurrency(data.lowPrice) : 'N/A'}</TableCell>
                        <TableCell>{data.closePrice ? formatCurrency(data.closePrice) : 'N/A'}</TableCell>
                        <TableCell>{data.volume ? data.volume.toLocaleString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}