import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, 
  Upload, 
  Brain, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Camera, 
  Layers,
  Zap,
  Settings,
  Play,
  Download
} from "lucide-react";

interface ChartAnalysis {
  id: string;
  symbol: string;
  chartType: 'candlestick' | 'line' | 'volume' | 'technical';
  timeframe: string;
  patterns: Array<{
    type: string;
    confidence: number;
    coordinates: { x: number; y: number; width: number; height: number };
    description: string;
  }>;
  trends: Array<{
    direction: 'bullish' | 'bearish' | 'sideways';
    strength: number;
    timeHorizon: string;
  }>;
  supportResistance: Array<{
    level: number;
    type: 'support' | 'resistance';
    strength: number;
    touches: number;
  }>;
  prediction: {
    nextMove: 'up' | 'down' | 'sideways';
    confidence: number;
    targetPrice: number;
    timeframe: string;
  };
  riskAssessment: {
    volatility: number;
    momentum: number;
    liquidity: number;
    overallRisk: number;
  };
  timestamp: string;
}

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  trainingEpochs: number;
  lastUpdated: string;
}

export default function VisualTransformerPage() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'volume' | 'technical'>('candlestick');
  const [timeframe, setTimeframe] = useState('1D');
  const [analysisMode, setAnalysisMode] = useState<'realtime' | 'upload' | 'batch'>('realtime');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { toast } = useToast();

  // Get visual transformer model status
  const { data: modelStatus } = useQuery({
    queryKey: ['/api/visual-transformer/status'],
    refetchInterval: 10000
  });

  // Get latest chart analysis
  const { data: latestAnalysis, isLoading: analysisLoading } = useQuery<ChartAnalysis>({
    queryKey: ['/api/visual-transformer/analysis', selectedSymbol, chartType, timeframe],
    refetchInterval: 5000,
    enabled: analysisMode === 'realtime'
  });

  // Get model performance metrics
  const { data: metrics } = useQuery<ModelMetrics>({
    queryKey: ['/api/visual-transformer/metrics']
  });

  // Analyze chart mutation
  const analyzeChartMutation = useMutation({
    mutationFn: async (params: { symbol: string; chartType: string; timeframe: string; imageData?: string }) => {
      const response = await fetch('/api/visual-transformer/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Chart Analysis Complete",
        description: "Visual transformer has analyzed the chart data"
      });
    }
  });

  // Train model mutation
  const trainModelMutation = useMutation({
    mutationFn: async (params: { epochs: number; batchSize: number; learningRate: number }) => {
      const response = await fetch('/api/visual-transformer/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      if (!response.ok) throw new Error('Training failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model Training Started",
        description: "Visual transformer training has begun"
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedImage(file);
      
      // Convert to base64 for analysis
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        analyzeChartMutation.mutate({
          symbol: 'UPLOAD',
          chartType: 'upload',
          timeframe: 'custom',
          imageData
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeChart = () => {
    analyzeChartMutation.mutate({
      symbol: selectedSymbol,
      chartType,
      timeframe
    });
  };

  // Add handlers for ensemble and multi-timeframe analysis
  const handleEnsembleAnalysis = async () => {
    try {
      const response = await fetch('/api/visual-transformer/ensemble-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          includeComplexPatterns: true
        })
      });
      
      if (!response.ok) throw new Error('Ensemble analysis failed');
      
      const result = await response.json();
      
      toast({
        title: "Ensemble Analysis Complete",
        description: `${result.ensemblePrediction.modelPredictions.length} models analyzed with ${(result.metrics.ensembleAgreement * 100).toFixed(1)}% agreement`
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not complete ensemble analysis",
        variant: "destructive"
      });
    }
  };

  const handleMultiTimeframeAnalysis = async () => {
    try {
      const response = await fetch('/api/visual-transformer/multi-timeframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: selectedSymbol,
          timeframes: ['1D', '4h', '1h', '15m']
        })
      });
      
      if (!response.ok) throw new Error('Multi-timeframe analysis failed');
      
      const result = await response.json();
      
      toast({
        title: "Multi-Timeframe Analysis Complete",
        description: `Confluence score: ${(result.analysis.confluenceScore * 100).toFixed(1)}%`
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not complete multi-timeframe analysis",
        variant: "destructive"
      });
    }
  };

  const drawAnalysisOverlay = (analysis: ChartAnalysis) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pattern overlays
    analysis.patterns.forEach(pattern => {
      ctx.strokeStyle = pattern.confidence > 0.8 ? '#22c55e' : pattern.confidence > 0.6 ? '#eab308' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(pattern.coordinates.x, pattern.coordinates.y, pattern.coordinates.width, pattern.coordinates.height);
      
      // Label
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '12px sans-serif';
      ctx.fillText(`${pattern.type} (${(pattern.confidence * 100).toFixed(0)}%)`, 
                   pattern.coordinates.x, pattern.coordinates.y - 5);
    });

    // Draw support/resistance levels
    analysis.supportResistance.forEach(level => {
      ctx.strokeStyle = level.type === 'support' ? '#3b82f6' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, level.level);
      ctx.lineTo(canvas.width, level.level);
      ctx.stroke();
      ctx.setLineDash([]);
    });
  };

  useEffect(() => {
    if (latestAnalysis && canvasRef.current) {
      drawAnalysisOverlay(latestAnalysis);
    }
  }, [latestAnalysis]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Visual Transformer</h1>
          <p className="text-muted-foreground">AI-powered chart pattern recognition and market analysis</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={(modelStatus as any)?.status === 'ready' ? 'default' : 'destructive'}>
            <Brain className="h-4 w-4 mr-1" />
            {(modelStatus as any)?.status || 'Loading'}
          </Badge>
          {metrics && (
            <Badge variant="outline">
              Accuracy: {(metrics.accuracy * 100).toFixed(1)}%
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Analysis Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as any)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="realtime">Real-time</TabsTrigger>
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="batch">Batch</TabsTrigger>
              </TabsList>

              <TabsContent value="realtime" className="space-y-4">
                <div>
                  <Label htmlFor="symbol">Symbol</Label>
                  <Input
                    id="symbol"
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                  />
                </div>
                
                <div>
                  <Label htmlFor="chartType">Chart Type</Label>
                  <Select value={chartType} onValueChange={(value) => setChartType(value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candlestick">Candlestick</SelectItem>
                      <SelectItem value="line">Line Chart</SelectItem>
                      <SelectItem value="volume">Volume</SelectItem>
                      <SelectItem value="technical">Technical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timeframe">Timeframe</Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1H">1 Hour</SelectItem>
                      <SelectItem value="1D">1 Day</SelectItem>
                      <SelectItem value="1W">1 Week</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleAnalyzeChart}
                  disabled={analyzeChartMutation.isPending}
                  className="w-full"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {analyzeChartMutation.isPending ? 'Analyzing...' : 'Analyze Chart'}
                </Button>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div>
                  <Label htmlFor="chartUpload">Upload Chart Image</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button 
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Select Image
                  </Button>
                </div>
                
                {uploadedImage && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {uploadedImage.name}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="batch" className="space-y-4">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                  <p>Batch analysis of multiple charts</p>
                  <p className="text-xs">Coming soon</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Main Analysis Display */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>Chart Analysis</span>
              {analysisLoading && <Zap className="h-4 w-4 animate-pulse text-blue-500" />}
            </CardTitle>
            <CardDescription>
              Visual transformer analysis with pattern recognition and trend detection
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Chart display area */}
              <div className="bg-gray-900 rounded-lg p-4 min-h-[400px] flex items-center justify-center relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="absolute top-0 left-0 pointer-events-none"
                />
                
                {analysisLoading ? (
                  <div className="text-center text-gray-400">
                    <Brain className="h-12 w-12 mx-auto mb-4 animate-pulse" />
                    <p>Analyzing chart patterns...</p>
                  </div>
                ) : latestAnalysis ? (
                  <div className="text-center text-gray-400">
                    <Camera className="h-12 w-12 mx-auto mb-4" />
                    <p>Chart: {latestAnalysis.symbol} ({latestAnalysis.timeframe})</p>
                    <p className="text-sm">Patterns detected: {latestAnalysis.patterns.length}</p>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <Layers className="h-12 w-12 mx-auto mb-4" />
                    <p>No chart data available</p>
                    <p className="text-sm">Configure analysis settings and click analyze</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Results */}
      {latestAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Detected Patterns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestAnalysis.patterns.slice(0, 3).map((pattern, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm">{pattern.type}</span>
                    <Badge variant={pattern.confidence > 0.8 ? 'default' : 'secondary'}>
                      {(pattern.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {latestAnalysis.trends.map((trend, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{trend.direction}</span>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className={`h-3 w-3 ${
                        trend.direction === 'bullish' ? 'text-green-500' : 
                        trend.direction === 'bearish' ? 'text-red-500' : 'text-gray-500'
                      }`} />
                      <span className="text-xs">{(trend.strength * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Price Prediction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Direction</span>
                  <Badge variant={latestAnalysis.prediction.nextMove === 'up' ? 'default' : 'destructive'}>
                    {latestAnalysis.prediction.nextMove.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Confidence</span>
                  <span className="text-sm">{(latestAnalysis.prediction.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Target</span>
                  <span className="text-sm">${latestAnalysis.prediction.targetPrice.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Volatility</span>
                  <Progress value={latestAnalysis.riskAssessment.volatility} className="w-16 h-2" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Momentum</span>
                  <Progress value={latestAnalysis.riskAssessment.momentum} className="w-16 h-2" />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Overall Risk</span>
                  <Badge variant={latestAnalysis.riskAssessment.overallRisk > 70 ? 'destructive' : 'default'}>
                    {latestAnalysis.riskAssessment.overallRisk}/100
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Model Performance */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Model Performance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{(metrics.accuracy * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{(metrics.precision * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Precision</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{(metrics.recall * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Recall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{(metrics.f1Score * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">F1 Score</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Training Epochs: {metrics.trainingEpochs}</span>
                <span>Last Updated: {new Date(metrics.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}