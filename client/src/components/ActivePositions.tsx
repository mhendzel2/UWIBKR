import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import { tradingApi } from "@/lib/tradingApi";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function ActivePositions() {
  const { positions } = useRealTimeData();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const closeMutation = useMutation({
    mutationFn: (positionId: string) => tradingApi.closePosition(positionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
      toast({
        title: "Position Closed",
        description: "Position has been successfully closed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Close Failed",
        description: error.message || "Failed to close position",
        variant: "destructive",
      });
    },
  });

  const openPositions = positions.filter(p => p.status === 'open');

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return num >= 0 ? `+$${Math.abs(num)}` : `-$${Math.abs(num)}`;
  };

  const getPnLColor = (pnl: string) => {
    return parseFloat(pnl) >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <h3 className="text-lg font-semibold">Active Positions</h3>
        <p className="text-sm text-dark-400">Real-time P&L tracking</p>
      </div>
      
      <div className="p-6 space-y-4">
        {openPositions.length === 0 ? (
          <div className="text-center py-8">
            <i className="fas fa-wallet text-4xl text-dark-400 mb-4"></i>
            <p className="text-dark-400">No open positions</p>
            <p className="text-sm text-dark-500">Execute signals to see positions here</p>
          </div>
        ) : (
          openPositions.slice(0, 4).map((position) => (
            <div key={position.id} className="border border-dark-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium">{position.ticker}</h4>
                  <p className="text-sm text-dark-400">{position.strategy}</p>
                </div>
                <div className="text-right">
                  <div className={cn("font-mono", getPnLColor(position.pnl))}>
                    {formatCurrency(position.pnl)}
                  </div>
                  <div className={cn("text-xs", getPnLColor(position.pnlPercent))}>
                    {parseFloat(position.pnlPercent) >= 0 ? '+' : ''}{position.pnlPercent}%
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Entry:</span>
                  <span className="font-mono">${position.entryPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Current:</span>
                  <span className="font-mono">${position.currentPrice || position.entryPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Quantity:</span>
                  <span className="font-mono">{position.quantity} contract{position.quantity !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-dark-600 flex justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => closeMutation.mutate(position.id)}
                  disabled={closeMutation.isPending}
                  className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-3 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border-blue-500/20 text-xs"
                >
                  Manage
                </Button>
              </div>
            </div>
          ))
        )}
        
        {openPositions.length > 0 && (
          <button className="w-full mt-4 py-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
            View All Positions →
          </button>
        )}
      </div>
    </div>
  );
}
