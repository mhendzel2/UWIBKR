import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  Zap, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

interface AgentMetrics {
  weights: Record<string, number>;
  performance: Record<string, any>;
  totalDecisions: number;
}

interface AgentPerformance {
  totalDecisions: number;
  averageConfidence: number;
  successRate: number;
}

interface AgentStatus {
  agents: Record<string, number>;
  performance: Record<string, AgentPerformance>;
  totalDecisions: number;
}

interface AgentHealth {
  status: string;
  activeAgents: number;
}

interface AgentDecision {
  agentId: string;
  symbol: string;
  action: string;
  confidence: number;
  reasoning: string;
  riskAssessment: {
    riskScore: number;
    positionSize: number;
    maxLoss: number;
    probabilityOfSuccess: number;
  };
  timestamp: string;
}

interface ConsensusDecision {
  symbol: string;
  finalAction: string;
  consensusScore: number;
  participatingAgents: AgentDecision[];
  riskApproved: boolean;
  humanApprovalRequired: boolean;
  executionRecommendation: any;
}

export default function AIAgentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<any>({});

  // Fetch agent system status
  const { data: agentStatus, isLoading: statusLoading } = useQuery<AgentStatus>({
    queryKey: ['/api/agents/status'],
    refetchInterval: 5000
  });

  // Fetch agent health
  const { data: agentHealth } = useQuery<AgentHealth>({
    queryKey: ['/api/agents/health'],
    refetchInterval: 10000
  });

  // Multi-agent analysis mutation
  const analysisMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/agents/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Analysis failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Multi-Agent Analysis Complete",
        description: `Processed ${data.decisions.length} consensus decisions`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
    },
    onError: () => {
      toast({
        title: "Analysis Failed",
        description: "Multi-agent analysis encountered an error",
        variant: "destructive"
      });
    }
  });

  // Performance update mutation
  const performanceUpdateMutation = useMutation({
    mutationFn: async (tradeOutcomes: any[]) => {
      const response = await fetch('/api/agents/update-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeOutcomes })
      });
      if (!response.ok) throw new Error('Performance update failed');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agent Performance Updated",
        description: "Agent weights have been recalibrated based on trade outcomes"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
    }
  });

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'market_intelligence': return <BarChart3 className="h-5 w-5" />;
      case 'technical_analysis': return <TrendingUp className="h-5 w-5" />;
      case 'risk_management': return <Shield className="h-5 w-5" />;
      case 'sentiment_analysis': return <Brain className="h-5 w-5" />;
      case 'execution': return <Zap className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getAgentName = (agentType: string) => {
    switch (agentType) {
      case 'market_intelligence': return 'Market Intelligence';
      case 'technical_analysis': return 'Technical Analysis';
      case 'risk_management': return 'Risk Management';
      case 'sentiment_analysis': return 'Sentiment Analysis';
      case 'execution': return 'Execution';
      default: return agentType;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY_CALLS': return 'bg-green-500';
      case 'BUY_PUTS': return 'bg-red-500';
      case 'HOLD': return 'bg-gray-500';
      case 'CLOSE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const runAnalysis = () => {
    if (!selectedSymbol) {
      toast({
        title: "Symbol Required",
        description: "Please select a symbol to analyze",
        variant: "destructive"
      });
      return;
    }

    // Get current market data for analysis
    analysisMutation.mutate({
      optionsFlow: analysisData.optionsFlow || [],
      marketData: analysisData.marketData || {},
      news: analysisData.news || [],
      signals: analysisData.signals || []
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Trading Agents</h1>
          <p className="text-muted-foreground">
            Multi-agent system for sophisticated trading analysis
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={agentHealth?.status === 'healthy' ? 'default' : 'destructive'}>
            {agentHealth?.activeAgents || 0} Agents Active
          </Badge>
          {agentHealth?.status === 'healthy' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="analysis">Run Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="decisions">Recent Decisions</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Agent Status Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Agent Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agentStatus?.agents && Object.entries(agentStatus.agents).map(([agentType, weight]) => (
                    <div key={agentType} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAgentIcon(agentType)}
                        <span className="font-medium">{getAgentName(agentType)}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress value={(weight as number) * 100} className="w-20" />
                        <span className="text-sm text-muted-foreground">
                          {((weight as number) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>System Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{agentStatus?.totalDecisions || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Decisions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{agentHealth?.activeAgents || 0}</div>
                    <div className="text-sm text-muted-foreground">Active Agents</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">
                      {agentHealth?.status === 'healthy' ? '100%' : '0%'}
                    </div>
                    <div className="text-sm text-muted-foreground">System Health</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {analysisMutation.data?.decisions?.length || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Recent Consensus</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Agent Analysis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Symbol</Label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select symbol to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPY">SPY</SelectItem>
                      <SelectItem value="QQQ">QQQ</SelectItem>
                      <SelectItem value="AAPL">AAPL</SelectItem>
                      <SelectItem value="TSLA">TSLA</SelectItem>
                      <SelectItem value="NVDA">NVDA</SelectItem>
                      <SelectItem value="MSFT">MSFT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Analysis Type</Label>
                  <Select defaultValue="comprehensive">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="comprehensive">Comprehensive Analysis</SelectItem>
                      <SelectItem value="technical">Technical Focus</SelectItem>
                      <SelectItem value="fundamental">Fundamental Focus</SelectItem>
                      <SelectItem value="risk">Risk Assessment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={runAnalysis} 
                disabled={analysisMutation.isPending || !selectedSymbol}
                className="w-full"
              >
                {analysisMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running Multi-Agent Analysis...
                  </>
                ) : (
                  <>
                    <Target className="mr-2 h-4 w-4" />
                    Run Analysis
                  </>
                )}
              </Button>

              {/* Analysis Results */}
              {analysisMutation.data && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-lg font-semibold">Analysis Results</h3>
                  {analysisMutation.data.decisions.map((decision: ConsensusDecision, index: number) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{decision.symbol}</Badge>
                            <Badge className={getActionColor(decision.finalAction)}>
                              {decision.finalAction}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Consensus Score</div>
                            <div className="text-lg font-bold">
                              {(decision.consensusScore * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Agent Decisions</div>
                            <div className="space-y-2">
                              {decision.participatingAgents.map((agent, agentIndex) => (
                                <div key={agentIndex} className="flex items-center justify-between text-sm">
                                  <span className="flex items-center space-x-1">
                                    {getAgentIcon(agent.agentId)}
                                    <span>{getAgentName(agent.agentId)}</span>
                                  </span>
                                  <Badge variant="outline" className="text-xs">
                                    {(agent.confidence * 100).toFixed(0)}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Risk Assessment</div>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Risk Approved:</span>
                                <Badge variant={decision.riskApproved ? 'default' : 'destructive'}>
                                  {decision.riskApproved ? 'Yes' : 'No'}
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span>Human Approval:</span>
                                <Badge variant={decision.humanApprovalRequired ? 'destructive' : 'default'}>
                                  {decision.humanApprovalRequired ? 'Required' : 'Not Required'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {agentStatus?.performance && Object.entries(agentStatus.performance).map(([agentId, perf]: [string, any]) => (
                  <div key={agentId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAgentIcon(agentId)}
                        <span className="font-medium">{getAgentName(agentId)}</span>
                      </div>
                      <Badge variant="outline">
                        {perf.totalDecisions || 0} decisions
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Avg Confidence</div>
                        <div className="font-medium">
                          {((perf.averageConfidence || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Success Rate</div>
                        <div className="font-medium">
                          {((perf.successRate || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Weight</div>
                        <div className="font-medium">
                          {((agentStatus.agents[agentId] || 0) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6">
                <Button 
                  onClick={() => performanceUpdateMutation.mutate([])}
                  disabled={performanceUpdateMutation.isPending}
                  variant="outline"
                >
                  {performanceUpdateMutation.isPending ? 'Updating...' : 'Recalibrate Weights'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Decisions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                Run an analysis to see recent agent decisions
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Configure agent weights and risk parameters for the multi-agent system.
              </div>
              
              <Button variant="outline" disabled>
                Advanced Configuration (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}