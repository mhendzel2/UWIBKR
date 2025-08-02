import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, AlertTriangle, TrendingDown, Settings, DollarSign } from "lucide-react";
import { RiskParameters } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function RiskManagementPage() {
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);

  const { data: riskStatus } = useQuery<{
    emergencyStop: boolean;
    tradingPaused: boolean;
  }>({
    queryKey: ['/api/risk/status'],
  });

  const { data: riskParams, isLoading } = useQuery<RiskParameters[]>({
    queryKey: ['/api/risk/parameters'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
  });

  const updateRiskMutation = useMutation({
    mutationFn: async (params: Partial<RiskParameters>) => {
      const response = await fetch('/api/risk/parameters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error('Failed to update risk parameters');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk/parameters'] });
      setEditMode(false);
      toast({ title: "Risk parameters updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update risk parameters", variant: "destructive" });
    },
  });

  const emergencyStopMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/risk/emergency-stop', {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to trigger emergency stop');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk/status'] });
      toast({ title: "Emergency stop activated" });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Risk Management</h1>
          <div className="grid gap-4 md:grid-cols-2">
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

  const currentParams = riskParams?.[0];
  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Risk Management</h1>
        <div className="flex items-center gap-2">
          <Badge 
            variant={riskStatus?.emergencyStop ? 'destructive' : 'default'}
          >
            {riskStatus?.emergencyStop ? 'EMERGENCY STOP' : 'ACTIVE'}
          </Badge>
          {riskStatus?.tradingPaused && (
            <Badge variant="secondary">TRADING PAUSED</Badge>
          )}
        </div>
      </div>

      {/* Risk Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Emergency Stop</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${riskStatus?.emergencyStop ? 'text-red-600' : 'text-green-600'}`}>
              {riskStatus?.emergencyStop ? 'ACTIVE' : 'OFF'}
            </div>
            <p className="text-xs text-muted-foreground">
              system protection
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Loss Limit</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentParams ? formatCurrency(currentParams.maxDailyLoss) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              maximum daily risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Position Size Limit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentParams ? formatCurrency(currentParams.maxPositionSize) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              per trade maximum
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Heat</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentParams ? `${parseFloat(currentParams.portfolioHeatLimit)}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              heat limit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Emergency Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency Controls
          </CardTitle>
          <CardDescription>
            Immediate risk protection measures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Emergency Stop</h3>
              <p className="text-sm text-muted-foreground">
                Immediately halt all trading and close open positions
              </p>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => emergencyStopMutation.mutate()}
              disabled={emergencyStopMutation.isPending || riskStatus?.emergencyStop}
            >
              {riskStatus?.emergencyStop ? 'ACTIVATED' : 'ACTIVATE'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risk Parameters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Risk Parameters
              </CardTitle>
              <CardDescription>
                Configure automated risk management settings
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentParams && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxDailyLoss">Maximum Daily Loss</Label>
                <Input
                  id="maxDailyLoss"
                  type="number"
                  disabled={!editMode}
                  defaultValue={currentParams.maxDailyLoss}
                  placeholder="10000"
                />
                <p className="text-xs text-muted-foreground">
                  Trading will stop when daily losses exceed this amount
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPositionSize">Maximum Position Size</Label>
                <Input
                  id="maxPositionSize"
                  type="number"
                  disabled={!editMode}
                  defaultValue={currentParams.maxPositionSize}
                  placeholder="5000"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum amount to risk on a single trade
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDrawdown">Maximum Drawdown (%)</Label>
                <Input
                  id="maxDrawdown"
                  type="number"
                  disabled={!editMode}
                  defaultValue={currentParams.maxDrawdown}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum portfolio decline from peak
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="portfolioHeatLimit">Portfolio Heat Limit (%)</Label>
                <Input
                  id="portfolioHeatLimit"
                  type="number"
                  disabled={!editMode}
                  defaultValue={currentParams.portfolioHeatLimit}
                  placeholder="25"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum percentage of portfolio at risk
                </p>
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Risk Management Enabled</h3>
              <p className="text-sm text-muted-foreground">
                Automatically enforce risk limits and stop losses
              </p>
            </div>
            <Switch 
              checked={currentParams?.isEnabled || false}
              disabled={!editMode}
            />
          </div>

          {editMode && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditMode(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  // Implementation would collect form data and call updateRiskMutation
                  toast({ title: "Feature coming soon", description: "Risk parameter updates will be implemented" });
                }}
                disabled={updateRiskMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}