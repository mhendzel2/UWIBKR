import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tradingApi } from "@/lib/tradingApi";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function RiskManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: riskStatus } = useQuery({
    queryKey: ['/api/risk/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: account } = useQuery({
    queryKey: ['/api/account'],
    refetchInterval: 5000,
  });

  const emergencyStopMutation = useMutation({
    mutationFn: () => tradingApi.emergencyStop(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk/status'] });
      toast({
        title: "Emergency Stop Activated",
        description: "All trading has been halted immediately",
        variant: "destructive",
      });
    },
  });

  const pauseTradingMutation = useMutation({
    mutationFn: () => tradingApi.pauseTrading(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk/status'] });
      toast({
        title: "Trading Paused",
        description: "Trading has been temporarily paused",
      });
    },
  });

  const resumeTradingMutation = useMutation({
    mutationFn: () => tradingApi.resumeTrading(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/risk/status'] });
      toast({
        title: "Trading Resumed",
        description: "Trading has been resumed",
      });
    },
  });

  // Calculate metrics
  const maxDrawdown = -2.3; // Mock value
  const portfolioHeat = 34; // Mock value
  const dailyLossUsed = 2500;
  const dailyLossLimit = riskStatus?.dailyLossLimit || 5000;
  const positionSizeUsed = 8500;
  const positionSizeLimit = riskStatus?.maxPositionSize || 15000;

  const dailyLossProgress = (dailyLossUsed / dailyLossLimit) * 100;
  const positionSizeProgress = (positionSizeUsed / positionSizeLimit) * 100;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <h3 className="text-lg font-semibold">Risk Management</h3>
        <p className="text-sm text-dark-400">Real-time monitoring and controls</p>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-dark-700/50 rounded-lg">
            <div className="text-2xl font-bold font-mono text-green-400">
              {maxDrawdown}%
            </div>
            <div className="text-sm text-dark-400 mt-1">Max Drawdown</div>
            <div className="text-xs text-green-400">Within Limits</div>
          </div>
          <div className="text-center p-4 bg-dark-700/50 rounded-lg">
            <div className="text-2xl font-bold font-mono text-blue-400">
              {portfolioHeat}%
            </div>
            <div className="text-sm text-dark-400 mt-1">Portfolio Heat</div>
            <div className="text-xs text-blue-400">Moderate Risk</div>
          </div>
        </div>
        
        {/* Risk Parameters */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Daily Loss Limit</span>
              <span className="text-sm font-mono">
                ${dailyLossUsed.toLocaleString()} / ${dailyLossLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(dailyLossProgress, 100)}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-dark-400">Position Size Limit</span>
              <span className="text-sm font-mono">
                ${positionSizeUsed.toLocaleString()} / ${positionSizeLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(positionSizeProgress, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Emergency Controls */}
        <div className="flex space-x-3 pt-4 border-t border-dark-700">
          <Button
            onClick={() => emergencyStopMutation.mutate()}
            disabled={emergencyStopMutation.isPending || riskStatus?.emergencyStop}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <i className="fas fa-stop-circle mr-2"></i>
            {riskStatus?.emergencyStop ? 'STOPPED' : 'Emergency Stop'}
          </Button>
          
          {riskStatus?.tradingPaused ? (
            <Button
              onClick={() => resumeTradingMutation.mutate()}
              disabled={resumeTradingMutation.isPending || riskStatus?.emergencyStop}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
            >
              <i className="fas fa-play mr-2"></i>
              Resume Trading
            </Button>
          ) : (
            <Button
              onClick={() => pauseTradingMutation.mutate()}
              disabled={pauseTradingMutation.isPending || riskStatus?.emergencyStop}
              className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              <i className="fas fa-pause mr-2"></i>
              Pause Trading
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
