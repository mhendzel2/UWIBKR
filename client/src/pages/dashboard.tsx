import { useQuery } from "@tanstack/react-query";
import { useRealTimeData } from "@/hooks/useRealTimeData";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import MetricCard from "@/components/MetricCard";
import AISignalsPanel from "@/components/AISignalsPanel";
import OptionsFlowPanel from "@/components/OptionsFlowPanel";
import SectorSentimentPanel from "@/components/SectorSentimentPanel";
import TradingViewChart from "@/components/TradingViewChart";
import ActivePositions from "@/components/ActivePositions";
import RiskManagement from "@/components/RiskManagement";
import SystemHealth from "@/components/SystemHealth";

export default function Dashboard() {
  const { signals, positions, account, isConnected } = useRealTimeData();

  const { data: stats, dataUpdatedAt: statsUpdatedAt } = useQuery({
    queryKey: ['/api/stats'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const calculateMetrics = () => {
    const activeSignals = signals.filter(s => s.status === 'pending').length;
    const openPositions = positions.filter(p => p.status === 'open').length;
    
    // Calculate win rate from closed positions
    const closedPositions = positions.filter(p => p.status === 'closed');
    const winningPositions = closedPositions.filter(p => parseFloat(p.pnl) > 0);
    const winRate = closedPositions.length > 0 ? 
      (winningPositions.length / closedPositions.length) * 100 : 0;

    // Mock AI confidence for now
    const aiConfidence = 89.4;

    return {
      activeSignals,
      winRate: winRate.toFixed(1),
      openPositions,
      aiConfidence: aiConfidence.toFixed(1),
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="p-6 space-y-6">
      {/* Header with timestamp */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Trading Dashboard</h1>
        {statsUpdatedAt && (
          <div className="text-sm text-gray-600">
            Last updated: {new Date(statsUpdatedAt).toLocaleTimeString()}
          </div>
        )}
      </div>

          {/* Top Row: Real-time Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Signals"
              value={metrics.activeSignals}
              subtitle="+3 new today"
              icon="fas fa-bolt"
              iconColor="text-yellow-400"
              subtitleColor="text-green-400"
            />
            
            <MetricCard
              title="Win Rate"
              value={`${metrics.winRate}%`}
              subtitle="+2.1% this week"
              icon="fas fa-percentage"
              iconColor="text-blue-400"
              subtitleColor="text-green-400"
            />
            
            <MetricCard
              title="Open Positions"
              value={metrics.openPositions}
              subtitle="$45,230 deployed"
              icon="fas fa-layer-group"
              iconColor="text-purple-400"
              subtitleColor="text-blue-400"
            />
            
            <MetricCard
              title="AI Confidence"
              value={`${metrics.aiConfidence}%`}
              subtitle="High confidence"
              icon="fas fa-brain"
              iconColor="text-green-400"
              subtitleColor="text-green-400"
            />
          </div>

          {/* Second Row: AI Signals, Options Flow, Sector Sentiment */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <AISignalsPanel />
            <OptionsFlowPanel />
            <SectorSentimentPanel />
          </div>

          {/* Third Row: Charts and Positions */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <TradingViewChart />
            </div>
            <ActivePositions />
          </div>

          {/* Bottom Row: Risk Management and System Health */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <RiskManagement />
            <SystemHealth />
          </div>
        </div>
  );
}
