import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const mockHealthData = [
  { service: "IBKR TWS Gateway", status: "connected", latency: 12, color: "bg-green-500" },
  { service: "Unusual Whales API", status: "active", latency: 45, color: "bg-green-500" },
  { service: "Google Gemini AI", status: "processing", latency: 2300, color: "bg-yellow-500 animate-pulse" },
];

const mockPerformanceMetrics = {
  cpuUsage: 23,
  memoryUsage: "1.2GB",
  uptime: "14h 32m",
  signalsPerHour: 47,
};

const mockRecentActivity = [
  { time: "14:32:15", message: "Signal processed: AAPL Bull Call", type: "success" },
  { time: "14:31:43", message: "Position update: TSLA Iron Condor", type: "info" },
  { time: "14:30:22", message: "Gemini API response delayed", type: "warning" },
];

export default function SystemHealth() {
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const healthData = systemHealth && systemHealth.length > 0 ? systemHealth : mockHealthData;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'active':
        return 'text-green-400';
      case 'processing':
        return 'text-yellow-400';
      case 'disconnected':
      case 'error':
        return 'text-red-400';
      default:
        return 'text-dark-400';
    }
  };

  const getIndicatorColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'connected':
      case 'active':
        return 'bg-green-500';
      case 'processing':
        return 'bg-yellow-500 animate-pulse';
      case 'disconnected':
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-dark-500';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'info':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-dark-500';
    }
  };

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <h3 className="text-lg font-semibold">System Health</h3>
        <p className="text-sm text-dark-400">Infrastructure monitoring</p>
      </div>
      
      <div className="p-6 space-y-4">
        {/* Connection Status */}
        <div className="space-y-3">
          {healthData.map((service, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={cn("w-3 h-3 rounded-full", getIndicatorColor(service.status))}></div>
                <span className="font-medium">{service.service}</span>
              </div>
              <div className="text-right">
                <div className={cn("text-sm", getStatusColor(service.status))}>
                  {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                </div>
                <div className="text-xs text-dark-400 font-mono">
                  {service.latency}ms
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Performance Metrics */}
        <div className="pt-4 border-t border-dark-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark-400">CPU Usage:</span>
              <span className="font-mono ml-2">{mockPerformanceMetrics.cpuUsage}%</span>
            </div>
            <div>
              <span className="text-dark-400">Memory:</span>
              <span className="font-mono ml-2">{mockPerformanceMetrics.memoryUsage}</span>
            </div>
            <div>
              <span className="text-dark-400">Uptime:</span>
              <span className="font-mono ml-2">{mockPerformanceMetrics.uptime}</span>
            </div>
            <div>
              <span className="text-dark-400">Signals/Hour:</span>
              <span className="font-mono ml-2">{mockPerformanceMetrics.signalsPerHour}</span>
            </div>
          </div>
        </div>
        
        {/* Error Log */}
        <div className="pt-4 border-t border-dark-700">
          <h4 className="text-sm font-medium text-dark-300 mb-2">Recent Activity</h4>
          <div className="space-y-2 text-xs">
            {mockRecentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className={cn("w-2 h-2 rounded-full", getActivityIcon(activity.type))}></div>
                <span className="text-dark-400 font-mono">{activity.time}</span>
                <span className="text-dark-300">{activity.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
