import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tradingApi } from "@/lib/tradingApi";
import { TradingSignal } from "@/types/trading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TradeApprovalModal from "./TradeApprovalModal";

export default function AISignalsPanel() {
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: signals = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['/api/signals'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      tradingApi.approveSignal(id, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/signals'] });
      toast({
        title: "Signal Approved",
        description: "Trade signal has been approved and is ready for execution",
      });
      setShowModal(false);
      setSelectedSignal(null);
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve signal",
        variant: "destructive",
      });
    },
  });

  const handleApproveClick = (signal: TradingSignal) => {
    setSelectedSignal(signal);
    setShowModal(true);
  };

  const getConfidenceBadgeVariant = (confidence: string) => {
    const conf = parseFloat(confidence);
    if (conf >= 90) return "bg-green-500/10 border-green-500/20 text-green-400";
    if (conf >= 75) return "bg-yellow-500/10 border-yellow-500/20 text-yellow-400";
    return "bg-red-500/10 border-red-500/20 text-red-400";
  };

  const getStrategyColor = (strategy: string) => {
    switch (strategy.toLowerCase()) {
      case 'bull call spread':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'bear put spread':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'iron condor':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'long calendar spread':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl">
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Latest AI Signals</h3>
            {dataUpdatedAt && (
              <p className="text-xs text-gray-500">
                Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-dark-800 border border-dark-700 rounded-xl">
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Latest AI Signals</h3>
            <div className="flex items-center space-x-4">
              {dataUpdatedAt && (
                <p className="text-xs text-gray-500">
                  Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
                </p>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Live Processing</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {(signals as TradingSignal[]).length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-brain text-4xl text-dark-400 mb-4"></i>
              <p className="text-dark-400">No signals available</p>
              <p className="text-sm text-dark-500">AI is analyzing market data...</p>
            </div>
          ) : (
            (signals as TradingSignal[]).slice(0, 3).map((signal: TradingSignal) => (
              <div
                key={signal.id}
                className="border border-dark-600 rounded-lg p-4 hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center border",
                      getStrategyColor(signal.strategy)
                    )}>
                      <span className="font-bold text-sm">{signal.ticker}</span>
                    </div>
                    <div>
                      <h4 className="font-medium">{signal.strategy}</h4>
                      <p className="text-sm text-dark-400">{signal.expiry}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={cn(
                      "text-xs font-medium border",
                      getConfidenceBadgeVariant(signal.confidence)
                    )}>
                      {parseFloat(signal.confidence).toFixed(0)}% Conf
                    </Badge>
                    <div className="text-sm text-dark-400 mt-1">
                      {signal.createdAt ? new Date(signal.createdAt).toLocaleTimeString() : 'Just now'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-dark-400">Entry:</span>
                    <span className="font-mono ml-1">${signal.entryPrice}</span>
                  </div>
                  <div>
                    <span className="text-dark-400">Target:</span>
                    <span className="font-mono ml-1 text-green-400">${signal.targetPrice}</span>
                  </div>
                  <div>
                    <span className="text-dark-400">Risk:</span>
                    <span className="font-mono ml-1 text-red-400">${signal.maxRisk}</span>
                  </div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-dark-600 flex justify-between items-center">
                  <p className="text-sm text-dark-300 flex-1 mr-4">
                    {signal.reasoning.substring(0, 60)}...
                  </p>
                  <Button
                    onClick={() => handleApproveClick(signal)}
                    disabled={signal.status !== 'pending' || approveMutation.isPending}
                    size="sm"
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                  >
                    {signal.status === 'pending' ? 'Approve Trade' :
                     signal.status === 'approved' ? 'Approved' :
                     signal.status === 'executed' ? 'Executed' : 'Rejected'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedSignal && (
        <TradeApprovalModal
          signal={selectedSignal}
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedSignal(null);
          }}
          onApprove={(quantity) => {
            approveMutation.mutate({ id: selectedSignal.id, quantity });
          }}
          isLoading={approveMutation.isPending}
        />
      )}
    </>
  );
}
