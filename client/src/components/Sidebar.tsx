import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/", label: "Dashboard", icon: "fas fa-tachometer-alt" },
  { href: "/morning-update", label: "Morning Update", icon: "fas fa-sun" },
  { href: "/ai-signals", label: "AI Signals", icon: "fas fa-brain" },
  { href: "/ai-agents", label: "AI Agents", icon: "fas fa-users" },
  { href: "/training-mode", label: "Training Mode", icon: "fas fa-target" },
  { href: "/test-orders", label: "Test Orders", icon: "fas fa-flask" },
  { href: "/machine-learning", label: "ML Engine", icon: "fas fa-cogs" },
  { href: "/macro", label: "Macro Dashboard", icon: "fas fa-globe" },
  { href: "/watchlist", label: "Watchlist & Intelligence", icon: "fas fa-list-alt" },
  { href: "/flow", label: "Options Flow", icon: "fas fa-water" },
  { href: "/options-screener", label: "Options Screener", icon: "fas fa-search" },
  { href: "/options-heatmap", label: "Options Heat Map", icon: "fas fa-fire" },
  { href: "/options-radar", label: "Options Radar", icon: "fas fa-satellite-dish" },
  { href: "/short-expiry", label: "0-5 DTE Dashboard", icon: "fas fa-clock" },
  { href: "/leaps", label: "LEAP Analysis", icon: "fas fa-calendar-alt" },
  { href: "/risk", label: "Risk Management", icon: "fas fa-shield-alt" },
  { href: "/positions", label: "Positions", icon: "fas fa-wallet" },
  { href: "/portfolios", label: "Portfolio Manager", icon: "fas fa-briefcase" },
  { href: "/trades", label: "Trade Management", icon: "fas fa-file-contract" },
  { href: "/analytics", label: "Analytics", icon: "fas fa-chart-area" },
  { href: "/reports", label: "Performance Reports", icon: "fas fa-file-chart-line" },
  { href: "/portfolio", label: "Portfolio Optimization", icon: "fas fa-balance-scale" },
  { href: "/news", label: "News & Sentiment", icon: "fas fa-newspaper" },
  { href: "/charts", label: "Advanced Charts", icon: "fas fa-chart-line" },
  { href: "/visual-transformer", label: "Visual Transformer", icon: "fas fa-eye" },
  { href: "/sentiment-heatmap", label: "Sentiment Heatmap", icon: "fas fa-fire" },
  { href: "/fundamentals", label: "Fundamentals Analysis", icon: "fas fa-building" },
  { href: "/settings", label: "Settings", icon: "fas fa-cog" },
];

interface SystemStatus {
  service: string;
  status: 'connected' | 'active' | 'processing' | 'disconnected' | 'error';
  indicator: string;
}

const systemStatuses: SystemStatus[] = [
  { service: "IBKR TWS", status: "connected", indicator: "bg-green-500" },
  { service: "Unusual Whales", status: "active", indicator: "bg-green-500" },
  { service: "Gemini AI", status: "processing", indicator: "bg-yellow-500 animate-pulse" },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-dark-800 border-r border-dark-700 flex flex-col">
      {/* Logo and Brand */}
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <i className="fas fa-chart-line text-white text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Trader Pro</h1>
            <p className="text-xs text-dark-400">Options Flow Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  isActive
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "hover:bg-dark-700 text-dark-300 hover:text-dark-100"
                )}
              >
                <i className={`${item.icon} w-4`}></i>
                <span className={isActive ? "font-medium" : ""}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-dark-700">
        <div className="space-y-2">
          {systemStatuses.map((status) => (
            <div key={status.service} className="flex items-center justify-between text-xs">
              <span className="text-dark-400">{status.service}</span>
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 ${status.indicator} rounded-full`}></div>
                <span className={cn(
                  status.status === 'connected' || status.status === 'active' ? 'text-green-400' :
                  status.status === 'processing' ? 'text-yellow-400' :
                  'text-red-400'
                )}>
                  {status.status === 'connected' ? 'Connected' :
                   status.status === 'active' ? 'Active' :
                   status.status === 'processing' ? 'Processing' :
                   'Disconnected'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
