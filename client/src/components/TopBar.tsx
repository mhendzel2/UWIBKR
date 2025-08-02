import { useQuery } from "@tanstack/react-query";
import { tradingApi } from "@/lib/tradingApi";
import { cn } from "@/lib/utils";

export default function TopBar() {
  const { data: account } = useQuery({
    queryKey: ['/api/account'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: riskStatus } = useQuery({
    queryKey: ['/api/risk/status'],
    refetchInterval: 2000, // Refresh every 2 seconds
  });

  const formatCurrency = (value: number | undefined) => {
    if (!value) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatPnL = (value: number | undefined) => {
    if (!value) return '$0.00';
    const formatted = formatCurrency(Math.abs(value));
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const getRiskStatusColor = () => {
    if (riskStatus?.emergencyStop) return 'border-red-500/20 bg-red-500/10 text-red-400';
    if (riskStatus?.tradingPaused) return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400';
    return 'border-green-500/20 bg-green-500/10 text-green-400';
  };

  const getRiskStatusText = () => {
    if (riskStatus?.emergencyStop) return 'EMERGENCY STOP';
    if (riskStatus?.tradingPaused) return 'PAUSED';
    return 'NORMAL';
  };

  const getRiskStatusIcon = () => {
    if (riskStatus?.emergencyStop) return 'fas fa-stop-circle';
    if (riskStatus?.tradingPaused) return 'fas fa-pause-circle';
    return 'fas fa-shield-check';
  };

  return (
    <header className="h-16 bg-dark-800 border-b border-dark-700 flex items-center justify-between px-6">
      <div className="flex items-center space-x-6">
        <h2 className="text-xl font-semibold">Trading Dashboard</h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-dark-400">Market:</span>
            <span className="text-green-400 font-medium">OPEN</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-dark-400">Account:</span>
            <span className="font-mono text-dark-100">
              {formatCurrency(account?.netLiquidation)}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-dark-400">Day P&L:</span>
            <span className={cn(
              "font-mono",
              account && account.realizedPnL + account.unrealizedPnL >= 0 
                ? "text-green-400" 
                : "text-red-400"
            )}>
              {account ? formatPnL(account.realizedPnL + account.unrealizedPnL) : '$0.00'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Risk Status Indicator */}
        <div className={cn(
          "flex items-center space-x-2 px-3 py-1 border rounded-lg",
          getRiskStatusColor()
        )}>
          <i className={`${getRiskStatusIcon()} text-sm`}></i>
          <span className="text-sm font-medium">Risk: {getRiskStatusText()}</span>
        </div>
        
        {/* Notifications */}
        <button className="relative p-2 hover:bg-dark-700 rounded-lg transition-colors">
          <i className="fas fa-bell text-dark-400"></i>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            3
          </span>
        </button>
        
        {/* User Menu */}
        <button className="flex items-center space-x-2 hover:bg-dark-700 px-3 py-2 rounded-lg transition-colors">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">JD</span>
          </div>
          <span className="text-sm">John Doe</span>
          <i className="fas fa-chevron-down text-dark-400 text-xs"></i>
        </button>
      </div>
    </header>
  );
}
