import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Activity, TrendingUp, Shield, Brain, Target, Clock, FlaskConical, Zap } from "lucide-react";

interface TestOrderRequest {
  symbol: string;
  action: string;
  orderType: string;
  totalQuantity: number;
  secType: string;
  testMode?: boolean;
}

interface AgentDecision {
  agentId: string;
  action: string;
  confidence: number;
  reasoning: string;
  riskAssessment: {
    riskScore: number;
    positionSize: number;
    maxLoss: number;
    probabilityOfSuccess: number;
  };
}

interface TestOrderResponse {
  success: boolean;
  order: {
    orderId: string;
    symbol: string;
    status: string;
    reason: string;
    timestamp: string;
    agentDecisions: Array<{
      symbol: string;
      finalAction: string;
      consensusScore: number;
      participatingAgents: AgentDecision[];
    }>;
  };
  agentAnalysis: {
    totalDecisions: number;
    hasConsensus: boolean;
    participatingAgents: number;
  };
  system: {
    agentWeights: Record<string, number>;
    totalSystemDecisions: number;
  };
}

type AgentStatus = {
  status: 'active' | 'inactive';
  agents: Record<string, number>;
  totalDecisions: number;
};

const defaultAgentStatus: AgentStatus = {
  status: 'inactive',
  agents: {},
  totalDecisions: 0,
};

export default function TestOrders() {
  const [orderForm, setOrderForm] = useState<TestOrderRequest>({
    symbol: '',
    action: 'BUY',
    orderType: 'MKT',
    totalQuantity: 100,
    secType: 'STK'
  });
  
  const [testMode, setTestMode] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get agent system status
  const { data: agentStatus } = useQuery({
    queryKey: ['/api/agents/status'],
    initialData: defaultAgentStatus,
  });

  // Submit test order mutation
  const submitTestOrderMutation = useMutation({
    mutationFn: async (order: TestOrderRequest) => {
      const response = await fetch('/api/test-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order),
      });
      
      if (!response.ok) {
        const errorDetails = await response.json();
        throw new Error(`Failed to submit test order: ${errorDetails.message || response.statusText}`);
      }
      
      return response.json() as Promise<TestOrderResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: `Test Order ${data.order.status}`,
        description: `${data.order.symbol} order ${data.order.orderId} - ${data.order.reason}`,
        variant: data.order.status === 'SUBMITTED' ? 'default' : 'destructive'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/agents/status'] });
    },
    onError: (error) => {
      toast({
        title: "Test Order Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmitOrder = () => {
    if (!orderForm.symbol.trim()) {
      toast({
        title: "Missing Symbol",
        description: "Please enter a stock symbol",
        variant: "destructive"
      });
      return;
    }

    submitTestOrderMutation.mutate({ ...orderForm, testMode });
  };

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'market_intelligence': return <Brain className="h-4 w-4" />;
      case 'technical_analysis': return <TrendingUp className="h-4 w-4" />;
      case 'risk_management': return <Shield className="h-4 w-4" />;
      case 'sentiment_analysis': return <Activity className="h-4 w-4" />;
      case 'execution': return <Target className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "bg-green-500";
    if (confidence >= 0.4) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Add a dynamic class for width
  const dynamicWidthClass = (weight: number) => `w-[${weight * 100}%] bg-blue-600 h-2 rounded-full`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Multi-Agent Test Orders</h1>
          <p className="text-muted-foreground">Test order execution through the AI agent system</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Activity className="h-4 w-4 mr-2" />
            {agentStatus?.status === 'active' ? 'System Active' : 'System Inactive'}
          </Badge>
          
          <div className="flex items-center space-x-2">
            <FlaskConical className={`h-4 w-4 ${testMode ? 'text-orange-500' : 'text-gray-400'}`} />
            <Switch 
              checked={testMode} 
              onCheckedChange={setTestMode}
              className="data-[state=checked]:bg-orange-500"
            />
            <Label className={`text-sm font-medium ${testMode ? 'text-orange-500' : 'text-gray-600'}`}>
              Test Mode {testMode ? 'ON' : 'OFF'}
            </Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Form */}
        <Card className={testMode ? 'border-orange-500/50 bg-orange-50/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Submit Test Order</span>
              {testMode && <Zap className="h-5 w-5 text-orange-500" />}
            </CardTitle>
            <CardDescription>
              {testMode 
                ? "Auto-execution mode: Orders will execute without human approval for ML training"
                : "Execute a test order through the multi-agent trading system with approval gates"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={orderForm.symbol}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={orderForm.totalQuantity}
                  onChange={(e) => setOrderForm(prev => ({ ...prev, totalQuantity: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={orderForm.action} onValueChange={(value) => setOrderForm(prev => ({ ...prev, action: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="orderType">Order Type</Label>
                <Select value={orderForm.orderType} onValueChange={(value) => setOrderForm(prev => ({ ...prev, orderType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MKT">Market</SelectItem>
                    <SelectItem value="LMT">Limit</SelectItem>
                    <SelectItem value="STP">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="secType">Security Type</Label>
              <Select value={orderForm.secType} onValueChange={(value) => setOrderForm(prev => ({ ...prev, secType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STK">Stock</SelectItem>
                  <SelectItem value="OPT">Option</SelectItem>
                  <SelectItem value="FUT">Future</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleSubmitOrder} 
              disabled={submitTestOrderMutation.isPending}
              className={`w-full ${testMode ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
            >
              {submitTestOrderMutation.isPending 
                ? 'Processing...' 
                : testMode 
                  ? 'Auto-Execute Order' 
                  : 'Submit Test Order'
              }
            </Button>
          </CardContent>
        </Card>

        {/* Agent System Status */}
        <Card>
          <CardHeader>
            <CardTitle>Agent System Status</CardTitle>
            <CardDescription>Current agent weights and system health</CardDescription>
          </CardHeader>
          <CardContent>
            {agentStatus ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Agents</span>
                  <Badge>{Object.keys(agentStatus.agents).length}</Badge>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(agentStatus.agents).map(([agentId, weight]) => (
                    <div key={agentId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getAgentIcon(agentId)}
                        <span className="text-sm font-medium capitalize">
                          {agentId.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={dynamicWidthClass(weight)}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {(weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex justify-between items-center text-sm">
                  <span>Total System Decisions</span>
                  <span className="font-medium">{agentStatus.totalDecisions}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                Loading agent status...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Latest Test Order Result */}
      {submitTestOrderMutation.data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Latest Test Order Result</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">
                    {submitTestOrderMutation.data.order.symbol} - {submitTestOrderMutation.data.order.orderId}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(submitTestOrderMutation.data.order.timestamp).toLocaleString()}
                  </p>
                </div>
                <Badge variant={submitTestOrderMutation.data.order.status === 'SUBMITTED' ? 'default' : 'destructive'}>
                  {submitTestOrderMutation.data.order.status}
                </Badge>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{submitTestOrderMutation.data.order.reason}</p>
              </div>

              {submitTestOrderMutation.data.order.agentDecisions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Agent Decisions</h4>
                  <div className="space-y-3">
                    {submitTestOrderMutation.data.order.agentDecisions[0].participatingAgents.map((agent) => (
                      <div key={agent.agentId} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center space-x-2">
                            {getAgentIcon(agent.agentId)}
                            <span className="font-medium capitalize">
                              {agent.agentId.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${getConfidenceColor(agent.confidence)}`}></div>
                            <span className="text-sm">{(agent.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{agent.reasoning}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>Risk Score: {agent.riskAssessment.riskScore}/10</div>
                          <div>Position: ${agent.riskAssessment.positionSize}</div>
                          <div>Max Loss: ${agent.riskAssessment.maxLoss}</div>
                          <div>Success Rate: {(agent.riskAssessment.probabilityOfSuccess * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}