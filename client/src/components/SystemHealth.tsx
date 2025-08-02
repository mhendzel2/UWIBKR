import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function SystemHealth() {
  const { data: systemHealth } = useQuery({
    queryKey: ['/api/system/health'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const healthData = systemHealth ?? [];

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
        {healthData.length === 0 && (
          <div className="pt-4 border-t border-dark-700 text-sm text-dark-400">
            No performance metrics available
          </div>
        )}
      </div>
    </div>
  );
}
