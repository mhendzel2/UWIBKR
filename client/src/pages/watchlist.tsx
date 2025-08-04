// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  Plus, Download, Upload, AlertTriangle,
  TrendingUp, TrendingDown, Users, Bell, BellOff, FileText,
  DollarSign, Activity, Newspaper, Target, RefreshCw
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function WatchlistPage() {
  const [newSymbols, setNewSymbols] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [currentList, setCurrentList] = useState('default');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([]);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [expandedSymbols, setExpandedSymbols] = useState<string[]>([]);
  const queryClient = useQueryClient();

  // Fetch watchlist
  const { data: watchlists } = useQuery({
    queryKey: ['/api/watchlist/lists'],
  });

  const { data: watchlist, isLoading: watchlistLoading, dataUpdatedAt: watchlistUpdatedAt } = useQuery({
    queryKey: [`/api/watchlist?list=${currentList}`],
    refetchInterval: 30000,
  });

  const symbolsQuery = (watchlist || []).filter((w: any) => w.enabled).map((w: any) => w.symbol).join(',');

  // Fetch market alerts
  const { data: alertsData } = useQuery({
    queryKey: ['/api/intelligence/alerts'],
    refetchInterval: 10000
  });

  // Ensure alerts is always an array - handle API response structure
  const alerts = (() => {
    if (!alertsData) return [];
    if (Array.isArray(alertsData)) return alertsData;
    // Handle case where API returns object with alert arrays
    if (alertsData.darkPool || alertsData.insiderTrades || alertsData.analystChanges) {
      const allAlerts = [
        ...(alertsData.darkPool ? [alertsData.darkPool] : []),
        ...(Array.isArray(alertsData.insiderTrades) ? alertsData.insiderTrades : []),
        ...(Array.isArray(alertsData.analystChanges) ? alertsData.analystChanges : []),
        ...(Array.isArray(alertsData.newsAlerts) ? alertsData.newsAlerts : [])
      ].filter(Boolean);
      return allAlerts;
    }
    return [];
  })();

  useEffect(() => {
    if (!symbolsQuery) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${window.location.host}/ws`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', channel: 'quotes' }));
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'quote_update' && msg.data?.symbol) {
          setQuotes((prev) => ({
            ...prev,
            [msg.data.symbol]: { ...msg.data, timestamp: msg.timestamp }
          }));
        }
      } catch {
        // ignore parse errors
      }
    };
    return () => {
      ws.close();
    };
  }, [symbolsQuery]);

  // Fetch GEX levels on demand
  const { data: gexLevels, dataUpdatedAt: gexUpdatedAt, refetch: refetchGex, isFetching: gexLoading } = useQuery({
    queryKey: [`/api/gex/levels?list=${currentList}`],
    enabled: false,
  });

  useEffect(() => {
    refetchGex();
  }, [currentList, refetchGex]);

  const gexMap = useMemo(() => {
    const map: Record<string, any> = {};
    (gexLevels || []).forEach((g: any) => {
      map[g.symbol] = g;
    });
    return map;
  }, [gexLevels]);

  // Fetch intelligence for selected symbol
  const { data: intelligence } = useQuery({
    queryKey: ['/api/intelligence', selectedSymbol],
    enabled: !!selectedSymbol,
    refetchInterval: 120000
  });

  const { data: uwStockData } = useQuery({
    queryKey: ['/api/unusual-whales/stock', selectedSymbol],
    enabled: !!selectedSymbol,
    refetchOnMount: true
  });

  // Add symbols mutation
  const addSymbolsMutation = useMutation({
    mutationFn: (data: { symbols: string[], options?: any }) =>
      apiRequest('POST', '/api/watchlist/add', { ...data, list: currentList }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist?list=${currentList}`] });
      setNewSymbols('');
      setShowAddDialog(false);
    }
  });

  // Remove symbols mutation
  const removeSymbolsMutation = useMutation({
    mutationFn: (data: { symbols: string[] }) =>
      apiRequest('DELETE', '/api/watchlist/remove', { ...data, list: currentList }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/watchlist?list=${currentList}`] });
    }
  });

  const createWatchlistMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest('POST', '/api/watchlist/create', { name }),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['/api/watchlist/lists'] });
      setCurrentList(name);
      setShowCreateDialog(false);
      setNewListName('');
    }
  });

  const updateGexMutation = useMutation({
    mutationFn: (symbols: string[]) =>
      apiRequest('POST', '/api/gex/update', { list: currentList, symbols }),
    onSuccess: () => {
      refetchGex();
    }
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) =>
      apiRequest('POST', `/api/intelligence/alerts/${alertId}/acknowledge`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/intelligence/alerts'] });
    }
  });

  const handleAddSymbols = () => {
    const symbols = newSymbols.split(',').map(s => s.trim().toUpperCase()).filter(s => s.length > 0);
    if (symbols.length > 0) {
      addSymbolsMutation.mutate({ symbols });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const fileContent = e.target?.result as string;

          // Auto-detect data type from filename
          let dataType = 'historical';
          if (file.name.toLowerCase().includes('options')) {
            dataType = 'options';
          } else if (file.name.toLowerCase().includes('watchlist')) {
            dataType = 'watchlist';
          }

          let uploadResult;
          if (dataType === 'watchlist') {
            uploadResult = await apiRequest('POST', '/api/watchlist/import-csv', {
              csv: fileContent,
              list: currentList
            });
          } else {
            uploadResult = await apiRequest('POST', '/api/data/upload', {
              fileName: file.name,
              fileContent,
              dataType
            });
          }
          
          // Refresh data after successful upload
          queryClient.invalidateQueries({ queryKey: [`/api/watchlist?list=${currentList}`] });
          queryClient.invalidateQueries({ queryKey: [`/api/gex/levels?list=${currentList}`] });
          
          alert(`Successfully imported ${uploadResult.importResult.imported} records from ${file.name}`);
        };
        
        reader.readAsText(file);
      } catch (error) {
        console.error('File upload failed:', error);
        alert('Failed to upload file. Please check the format and try again.');
      }
    }
  };

  const toggleSelect = (symbol: string) => {
    setSelectedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const toggleDetails = (symbol: string) => {
    setExpandedSymbols((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol]
    );
  };

  const clearSelection = () => setSelectedSymbols([]);

  const handleRemoveSelected = () => {
    if (selectedSymbols.length > 0) {
      removeSymbolsMutation.mutate({ symbols: selectedSymbols });
      clearSelection();
    }
  };


  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getAlertIcon = (type: string) => {
    const icons = {
      dark_pool: Activity,
      insider: Users,
      analyst: Target,
      news: Newspaper,
      volume: TrendingUp,
      price: DollarSign
    };
    return icons[type] || AlertTriangle;
  };

  if (watchlistLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading watchlist...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Watchlist & Intelligence</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track stocks with GEX levels, dark pool activity, insider trades, and analyst updates
          </p>
          {watchlistUpdatedAt && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(watchlistUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <Select value={currentList} onValueChange={setCurrentList}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Watchlist" />
            </SelectTrigger>
            <SelectContent>
              {(watchlists || []).map((w: string) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Watchlist
          </Button>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Symbols
          </Button>
          <label className="cursor-pointer">
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {/* Barchart Import Instructions */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Download className="h-5 w-5 mt-0.5 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">Barchart Excel Integration</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Use your 2-week Barchart subscription to download historical data. 
                Upload CSV files here or follow the detailed guide for step-by-step instructions.
              </p>
              <div className="flex items-center space-x-2 mt-3">
                <Button variant="outline" size="sm" onClick={() => window.open('/BARCHART_EXCEL_GUIDE.md', '_blank')}>
                  <FileText className="mr-2 h-4 w-4" />
                  Full Guide
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('/DOWNLOAD_INSTRUCTIONS.md', '_blank')}>
                  <Download className="mr-2 h-4 w-4" />
                  Quick Start
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts.length > 0 && alerts.filter((alert: any) => !alert.acknowledged).length > 0 && (
        <Alert className="border-orange-200 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            You have {alerts.filter((alert: any) => !alert.acknowledged).length} unacknowledged alerts
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="watchlist" className="space-y-4">
        <TabsList>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="intelligence">Market Intelligence</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="gex">GEX Levels</TabsTrigger>
        </TabsList>

        <TabsContent value="watchlist" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Done' : 'Edit'}
            </Button>
          </div>
          {isEditing ? (
            <>
              <div className="space-y-2">
                {(watchlist || []).map((item: any) => (
                  <div key={item.symbol} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedSymbols.includes(item.symbol)}
                      onCheckedChange={() => toggleSelect(item.symbol)}
                    />
                    <span>{item.symbol}</span>
                  </div>
                ))}
              </div>
              {selectedSymbols.length > 0 && (
                <div className="flex space-x-2">
                  <Button variant="destructive" size="sm" onClick={handleRemoveSelected}>
                    Remove Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(watchlist || []).map((item: any) => {
                const quote = quotes[item.symbol] || {};
                const price = typeof quote.last === 'number' ? quote.last : item.price;
                const change = typeof quote.change === 'number' ? quote.change : item.change;
                const changePercent = typeof quote.changePct === 'number' ? quote.changePct : item.changePercent;
                const gex = gexMap[item.symbol];
                return (
                  <Card key={item.symbol} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedSymbol(item.symbol)}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{item.symbol}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDetails(item.symbol);
                            updateGexMutation.mutate([item.symbol]);
                          }}
                        >
                          {expandedSymbols.includes(item.symbol) ? 'Hide' : 'Update'}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {typeof price === 'number' && (
                          <div>
                            Price: ${price.toFixed(2)}
                            {typeof change === 'number' && (
                              <span className={`ml-2 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {change >= 0 ? '+' : ''}{change.toFixed(2)}
                                {typeof changePercent === 'number' && ` (${changePercent.toFixed(2)}%)`}
                              </span>
                            )}
                          </div>
                        )}
                        {quote.timestamp && (
                          <div className="text-xs text-gray-500">
                            Price updated: {new Date(quote.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                        {gex && (
                          <div>
                            Net Gamma: {gex.netGamma?.toFixed(2)}
                            <div className="text-xs text-gray-500">
                              GEX updated: {new Date(gex.date).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                        {expandedSymbols.includes(item.symbol) && (
                          <>
                            {item.sector && <div>Sector: {item.sector}</div>}
                            {item.marketCap && <div>Market Cap: ${(item.marketCap / 1e9).toFixed(1)}B</div>}
                            {item.avgVolume && <div>Avg Volume: {(item.avgVolume / 1e6).toFixed(1)}M</div>}
                            <div className="text-xs text-gray-500">
                              Updated: {new Date(item.lastUpdated || Date.now()).toLocaleString()}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="intelligence" className="space-y-4">
          {selectedSymbol ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">{selectedSymbol} Market Intelligence</h3>
                <Button variant="outline" onClick={() => setSelectedSymbol(null)}>
                  Back to List
                </Button>
              </div>

              {intelligence && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Dark Pool Activity */}
                  {intelligence.darkPool && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Activity className="mr-2 h-5 w-5" />
                          Dark Pool Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span>Dark Pool Ratio:</span>
                            <span className={`font-medium ${intelligence.darkPool.darkPoolRatio > 0.4 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {(intelligence.darkPool.darkPoolRatio * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Volume:</span>
                            <span>{(intelligence.darkPool.darkPoolVolume / 1e6).toFixed(1)}M</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Sentiment:</span>
                            <Badge variant={intelligence.darkPool.sentiment === 'bullish' ? 'default' : 
                                          intelligence.darkPool.sentiment === 'bearish' ? 'destructive' : 'secondary'}>
                              {intelligence.darkPool.sentiment}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Insider Trades */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Insider Trades
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {intelligence.insiderTrades.slice(0, 3).map((trade: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{trade.insider}</div>
                                <div className="text-sm text-gray-600">{trade.title}</div>
                              </div>
                              <Badge variant={trade.transactionType === 'buy' ? 'default' : 'destructive'}>
                                {trade.transactionType.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="mt-2 text-sm">
                              {trade.shares.toLocaleString()} shares @ ${trade.price.toFixed(2)}
                            </div>
                            <div className="text-sm font-medium">
                              Value: ${trade.value.toLocaleString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analyst Updates */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Target className="mr-2 h-5 w-5" />
                        Analyst Updates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {intelligence.analystUpdates.slice(0, 3).map((update: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="font-medium">{update.firm}</div>
                                <div className="text-sm text-gray-600">{update.reasoning}</div>
                              </div>
                              <Badge variant={update.action === 'upgrade' ? 'default' : 
                                            update.action === 'downgrade' ? 'destructive' : 'secondary'}>
                                {update.action.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="mt-2 flex justify-between text-sm">
                              <span>{update.previousRating} → {update.newRating}</span>
                              <span>${update.newTarget.toFixed(0)} target</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* News Alerts */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Newspaper className="mr-2 h-5 w-5" />
                        Recent News
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {intelligence.newsAlerts.slice(0, 3).map((news: any, index: number) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-medium">{news.headline}</div>
                              <Badge variant={news.importance === 'high' ? 'default' :
                                            news.importance === 'critical' ? 'destructive' : 'secondary'}>
                                {news.importance}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">{news.summary}</div>
                            <div className="flex justify-between mt-2 text-xs text-gray-500">
                              <span>{news.source}</span>
                              <span>{new Date(news.publishedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {uwStockData?.news && uwStockData.news.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Newspaper className="mr-2 h-5 w-5" />
                          Unusual Whales Headlines
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {uwStockData.news.slice(0, 3).map((n: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="text-sm font-medium">{n.headline || n.title}</div>
                              <div className="text-xs text-gray-500 mt-1">{n.summary}</div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {uwStockData && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <TrendingUp className="mr-2 h-5 w-5" />
                          Unusual Whales Stock Data
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {uwStockData.stockState && (
                            <div>Price: ${uwStockData.stockState.price?.toFixed(2)}</div>
                          )}
                          {uwStockData.maxPain && (
                            <div>Max Pain: ${uwStockData.maxPain?.toFixed(2)}</div>
                          )}
                          {Array.isArray(uwStockData.netPremTicks) && uwStockData.netPremTicks.length > 0 && (
                            <div>Net Prem Ticks: {uwStockData.netPremTicks[uwStockData.netPremTicks.length-1]?.value}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Newspaper className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">Select a Symbol</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a symbol from your watchlist to view detailed market intelligence
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.map((alert: any) => {
              const IconComponent = getAlertIcon(alert.type);
              return (
                <Card key={alert.id} className={`${alert.acknowledged ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <IconComponent className="h-5 w-5 mt-0.5 text-gray-600" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline">{alert.symbol}</Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlertMutation.mutate(alert.id)}
                        >
                          <Bell className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="gex" className="space-y-4">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => updateGexMutation.mutate([])}
              disabled={updateGexMutation.isPending || gexLoading}
            >
              {updateGexMutation.isPending || gexLoading ? 'Loading...' : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(gexLevels || []).map((gex: any) => (
              <Card key={gex.symbol}>
                <CardHeader>
                  <CardTitle>{gex.symbol} GEX Levels</CardTitle>
                  <CardDescription>
                    Current price: ${gex.currentPrice?.toFixed(2)}
                    {gexUpdatedAt && (
                      <span className="text-xs block mt-1">
                        Updated: {new Date(gexUpdatedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Gamma Flip:</span>
                      <span className="font-medium">${gex.gammaFlip?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Call Wall:</span>
                      <span className="font-medium text-red-600">${gex.callWall?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Put Wall:</span>
                      <span className="font-medium text-green-600">${gex.putWall?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Net Gamma:</span>
                      <span className={`font-medium ${gex.netGamma >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {gex.netGamma?.toFixed(0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GEX Score:</span>
                      <span className="font-medium">{gex.gexScore?.toFixed(1)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Symbols Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Symbols to Watchlist</DialogTitle>
            <DialogDescription>
              Enter comma-separated symbols (e.g., AAPL, MSFT, GOOGL)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter symbols separated by commas..."
              value={newSymbols}
              onChange={(e) => setNewSymbols(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddSymbols}
                disabled={addSymbolsMutation.isPending || !newSymbols.trim()}
              >
                {addSymbolsMutation.isPending ? 'Adding...' : 'Add Symbols'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Watchlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Watchlist</DialogTitle>
            <DialogDescription>Enter a name for the watchlist</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Watchlist name"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createWatchlistMutation.mutate(newListName)}
                disabled={createWatchlistMutation.isPending || !newListName.trim()}
              >
                {createWatchlistMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}