import { useQuery } from "@tanstack/react-query";
import { tradingApi } from "@/lib/tradingApi";
import { cn } from "@/lib/utils";

export default function OptionsFlowPanel() {
  const { data: optionsFlow = [], isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['/api/options-flow'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const formatPremium = (premium: string | number) => {
    const value = typeof premium === 'string' ? parseFloat(premium) : premium;
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'BULLISH':
        return 'text-green-400';
      case 'BEARISH':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'C' 
      ? 'bg-green-500/10 border-green-500/20 text-green-400'
      : 'bg-red-500/10 border-red-500/20 text-red-400';
  };

  if (isLoading) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl">
        <div className="p-6 border-b border-dark-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Live Options Flow</h3>
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

  const flowData = optionsFlow;

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Live Options Flow</h3>
            <p className="text-sm text-dark-400">Unusual Whales Premium Data</p>
          </div>
          {dataUpdatedAt && (
            <p className="text-xs text-gray-500">
              Updated: {new Date(dataUpdatedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>
      
      <div className="p-6">
        <div className="space-y-3">
          {flowData.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-water text-4xl text-dark-400 mb-4"></i>
              <p className="text-dark-400">No flow data available</p>
              <p className="text-sm text-dark-500">Waiting for unusual options activity...</p>
            </div>
          ) : (
            flowData.slice(0, 5).map((flow: any) => (
              <div key={flow.id} className="flex items-center justify-between py-3 border-b border-dark-700 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center border",
                    getTypeColor(flow.type)
                  )}>
                    <span className="text-xs font-bold">{flow.type}</span>
                  </div>
                  <div>
                    <div className="font-medium">{flow.symbol}</div>
                    <div className="text-sm text-dark-400">
                      {flow.volume.toLocaleString()} contracts × 
                      <span className="font-mono ml-1">${flow.price}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg">
                    {formatPremium(flow.premium)}
                  </div>
                  <div className="text-sm">
                    <span className={getSentimentColor(flow.sentiment)}>
                      {flow.sentiment}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-dark-700">
          <button className="w-full py-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
            View Full Options Flow →
          </button>
        </div>
      </div>
    </div>
  );
}
