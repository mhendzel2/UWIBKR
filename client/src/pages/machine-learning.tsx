import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  TrendingUp, 
  Settings, 
  Play, 
  Zap, 
  BarChart3, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu
} from "lucide-react";

// Define types for API responses
interface MLStatus {
  isModelLoaded: boolean;
  modelArchitecture: string;
  parameters: number;
  trainingDataSize: number;
  transformerEnabled: boolean;
  accuracy: number;
  isTraining: boolean;
}

interface TransformerStats {
  parameters: number;
  layers: number;
  memoryUsage: string;
  isTraining: boolean;
}

interface Signal {
  id: string;
  symbol: string;
  type: string;
  premiumSize: number;
}

interface AnalysisResponse {
  traditional_analysis: {
    confidence: number;
    expectedReturn: number;
    riskScore: number;
  };
  transformer_analysis?: {
    score: number;
    trend: string;
    market_regime: string;
    risk_assessment: string;
  };
  combined_score: number;
  recommendation: string;
}

export default function MachineLearning() {
  const [selectedSignal, setSelectedSignal] = useState<any>(null);
  const [transformerEnabled, setTransformerEnabled] = useState(false);
  const queryClient = useQueryClient();

  // Get ML model status
  const { data: mlStatus, isLoading: mlLoading } = useQuery<MLStatus>({
    queryKey: ['/api/ml/status'],
    refetchInterval: 5000
  });

  // Get transformer stats
  const { data: transformerStats } = useQuery<TransformerStats>({
    queryKey: ['/api/ml/transformer-stats'],
    enabled: transformerEnabled
  });

  // Get signals for analysis
  const { data: signals } = useQuery<Signal[]>({
    queryKey: ['/api/signals'],
    select: (data) => data?.slice(0, 5) // Get first 5 signals for testing
  });

  // Enable/disable transformer
  const enableTransformerMutation = useMutation({
    mutationFn: (enable: boolean) => apiRequest('/api/ml/enable-transformer', 'POST', { enable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ml/status'] });
    }
  });

  // Analyze signal with transformer
  const analyzeSignalMutation = useMutation<AnalysisResponse, unknown, Signal>({
    mutationFn: async (signal) => {
      const response = await apiRequest('/api/ml/analyze-with-transformer', 'POST', { signal });
      return response.json() as Promise<AnalysisResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ml/status'] });
    }
  });

  // Train transformer
  const trainTransformerMutation = useMutation({
    mutationFn: (marketSequences: any[]) => apiRequest('/api/ml/train-transformer', 'POST', { marketSequences }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ml/transformer-stats'] });
    }
  });

  const handleEnableTransformer = async (enabled: boolean) => {
    setTransformerEnabled(enabled);
    await enableTransformerMutation.mutateAsync(enabled);
  };

  const handleAnalyzeSignal = async (signal: any) => {
    setSelectedSignal(signal);
    await analyzeSignalMutation.mutateAsync(signal);
  };

  const handleTrainTransformer = async () => {
    // Create sample market sequences for training
    const sampleSequences = Array(10).fill(null).map(() => ({
      prices: Array(60).fill(0).map(() => 100 + Math.random() * 20),
      volumes: Array(60).fill(0).map(() => Math.floor(Math.random() * 1000000)),
      timestamps: Array(60).fill(0).map((_, i) => Date.now() - i * 24 * 60 * 60 * 1000),
      features: Array(60).fill(0).map(() => Array(5).fill(0).map(() => Math.random())),
      labels: [Math.random(), Math.floor(Math.random() * 3), Math.random()]
    }));
    
    await trainTransformerMutation.mutateAsync(sampleSequences);
  };

  if (mlLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Cpu className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Loading ML system...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Machine Learning Models</h1>
          <p className="text-muted-foreground">Advanced AI models for options trading analysis</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span className="text-sm font-medium">AI Engine</span>
          <Badge variant={mlStatus?.isModelLoaded ? "default" : "secondary"}>
            {mlStatus?.isModelLoaded ? "Active" : "Standby"}
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transformer">Transformer Model</TabsTrigger>
          <TabsTrigger value="analysis">Signal Analysis</TabsTrigger>
          <TabsTrigger value="training">Model Training</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Traditional ML Model Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Neural Network</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mlStatus?.isModelLoaded ? 'Active' : 'Inactive'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {mlStatus?.modelArchitecture || 'Traditional ML model'}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Parameters:</span>
                    <span>{mlStatus?.parameters || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Training Data:</span>
                    <span>{mlStatus?.trainingDataSize || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transformer Model Status */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transformer Model</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mlStatus?.transformerEnabled ? 'Enabled' : 'Disabled'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Advanced attention-based model
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enable Transformer</span>
                    <Switch
                      checked={transformerEnabled}
                      onCheckedChange={handleEnableTransformer}
                      disabled={enableTransformerMutation.isPending}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mlStatus?.accuracy ? `${(mlStatus.accuracy * 100).toFixed(1)}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Model accuracy
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Training Status:</span>
                    <Badge variant={mlStatus?.isTraining ? "default" : "secondary"}>
                      {mlStatus?.isTraining ? "Training" : "Ready"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Architecture Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Model Architecture</CardTitle>
              <CardDescription>
                Current ML system configuration and capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Traditional Neural Network</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Input Layer (7 features)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Hidden Layers (64→32→16 neurons)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="text-sm">Output Layer (4 predictions)</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-3">Transformer Model</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm">Multi-Head Attention (8 heads)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                      <span className="text-sm">Encoder Layers (6 layers)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                      <span className="text-sm">Sequence Length (60 timesteps)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transformer" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Transformer Model Configuration</CardTitle>
              <CardDescription>
                Advanced transformer settings for financial time series analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {transformerStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Model Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Parameters:</span>
                        <span>{transformerStats.parameters?.toLocaleString() || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Layers:</span>
                        <span>{transformerStats.layers || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Usage:</span>
                        <span>{transformerStats.memoryUsage || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Training Status:</span>
                        <Badge variant={transformerStats.isTraining ? "default" : "secondary"}>
                          {transformerStats.isTraining ? "Training" : "Ready"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Model Configuration</h4>
                    <div className="space-y-2 text-sm">
                      <div>• Sequence Length: 60 timesteps</div>
                      <div>• Model Dimension: 128</div>
                      <div>• Attention Heads: 8</div>
                      <div>• Feed Forward: 512 neurons</div>
                      <div>• Encoder Layers: 6</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-4">
                <Button 
                  onClick={() => handleEnableTransformer(!transformerEnabled)}
                  disabled={enableTransformerMutation.isPending}
                  variant={transformerEnabled ? "destructive" : "default"}
                >
                  {enableTransformerMutation.isPending ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-2 h-4 w-4" />
                      {transformerEnabled ? 'Disable' : 'Enable'} Transformer
                    </>
                  )}
                </Button>

                {transformerEnabled && (
                  <Button 
                    onClick={handleTrainTransformer}
                    disabled={trainTransformerMutation.isPending}
                    variant="outline"
                  >
                    {trainTransformerMutation.isPending ? (
                      <>
                        <Clock className="mr-2 h-4 w-4 animate-spin" />
                        Training...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Train Model
                      </>
                    )}
                  </Button>
                )}
              </div>

              {trainTransformerMutation.isSuccess && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Transformer model training completed successfully!
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Signal Analysis</CardTitle>
              <CardDescription>
                Analyze trading signals with transformer-enhanced ML models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Signal Selection */}
                <div>
                  <h4 className="font-medium mb-3">Available Signals</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {signals?.map((signal: any, index: number) => (
                      <div 
                        key={signal.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedSignal?.id === signal.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedSignal(signal)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{signal.symbol}</div>
                            <div className="text-sm text-muted-foreground">
                              {signal.type} • ${(signal.premiumSize / 1000).toFixed(0)}K
                            </div>
                          </div>
                          <Badge variant={signal.type === 'CALL' ? 'default' : 'destructive'}>
                            {signal.type}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analysis Results */}
                <div>
                  <h4 className="font-medium mb-3">Analysis Results</h4>
                  {selectedSignal ? (
                    <div className="space-y-4">
                      <Button 
                        onClick={() => handleAnalyzeSignal(selectedSignal)}
                        disabled={analyzeSignalMutation.isPending || !transformerEnabled}
                        className="w-full"
                      >
                        {analyzeSignalMutation.isPending ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Activity className="mr-2 h-4 w-4" />
                            Analyze with Transformer
                          </>
                        )}
                      </Button>

                      {!transformerEnabled && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Enable the transformer model to perform enhanced analysis.
                          </AlertDescription>
                        </Alert>
                      )}

                      {analyzeSignalMutation.data && (
                        <div className="space-y-3">
                          <div className="p-3 border rounded-lg">
                            <h5 className="font-medium mb-2">Traditional Analysis</h5>
                            <div className="text-sm space-y-1">
                              <div>Confidence: {(analyzeSignalMutation.data.traditional_analysis.confidence * 100).toFixed(1)}%</div>
                              <div>Expected Return: {(analyzeSignalMutation.data.traditional_analysis.expectedReturn * 100).toFixed(1)}%</div>
                              <div>Risk Score: {(analyzeSignalMutation.data.traditional_analysis.riskScore * 100).toFixed(1)}%</div>
                            </div>
                          </div>

                          {analyzeSignalMutation.data.transformer_analysis && (
                            <div className="p-3 border rounded-lg">
                              <h5 className="font-medium mb-2">Transformer Analysis</h5>
                              <div className="text-sm space-y-1">
                                <div>Score: {(analyzeSignalMutation.data.transformer_analysis.score * 100).toFixed(1)}%</div>
                                <div>Trend: {analyzeSignalMutation.data.transformer_analysis.trend}</div>
                                <div>Market Regime: {analyzeSignalMutation.data.transformer_analysis.market_regime}</div>
                                <div>Risk Assessment: {analyzeSignalMutation.data.transformer_analysis.risk_assessment}</div>
                              </div>
                            </div>
                          )}

                          <div className="p-3 border rounded-lg bg-primary/5">
                            <h5 className="font-medium mb-2">Combined Analysis</h5>
                            <div className="text-sm space-y-1">
                              <div>Combined Score: {(analyzeSignalMutation.data.combined_score * 100).toFixed(1)}%</div>
                              <div className="flex items-center space-x-2">
                                <span>Recommendation:</span>
                                <Badge variant={
                                  analyzeSignalMutation.data.recommendation.includes('Buy') ? 'default' : 
                                  analyzeSignalMutation.data.recommendation.includes('Sell') ? 'destructive' : 
                                  'secondary'
                                }>
                                  {analyzeSignalMutation.data.recommendation}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Select a signal to analyze
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Model Training</CardTitle>
              <CardDescription>
                Train and optimize ML models with historical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    Model training requires historical market data. Import your Barchart Excel data first for optimal results.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Training Data</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Historical Records:</span>
                        <span>{mlStatus?.trainingDataSize || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Training Status:</span>
                        <Badge variant={mlStatus?.isTraining ? "default" : "secondary"}>
                          {mlStatus?.isTraining ? "Training" : "Ready"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Actions</h4>
                    <div className="space-y-2">
                      <Button 
                        onClick={handleTrainTransformer}
                        disabled={trainTransformerMutation.isPending || !transformerEnabled}
                        className="w-full"
                      >
                        {trainTransformerMutation.isPending ? (
                          <>
                            <Clock className="mr-2 h-4 w-4 animate-spin" />
                            Training Transformer...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Train Transformer Model
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => window.location.href = '/watchlist'}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Import Training Data
                      </Button>
                    </div>
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