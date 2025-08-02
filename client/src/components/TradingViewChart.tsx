import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const timeframes = [
  { value: "1M", label: "1M" },
  { value: "5M", label: "5M", active: true },
  { value: "15M", label: "15M" },
  { value: "1H", label: "1H" },
  { value: "1D", label: "1D" },
];

const symbols = [
  { value: "SPY", label: "SPY" },
  { value: "QQQ", label: "QQQ" },
  { value: "AAPL", label: "AAPL" },
  { value: "TSLA", label: "TSLA" },
];

export default function TradingViewChart() {
  const [selectedSymbol, setSelectedSymbol] = useState("SPY");
  const [selectedTimeframe, setSelectedTimeframe] = useState("5M");
  const [lastUpdate] = useState(new Date().toLocaleTimeString());

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Market Analysis</h3>
            <p className="text-xs text-gray-500 mt-1">
              Last updated: {lastUpdate}
            </p>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-20 bg-dark-700 border-dark-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((symbol) => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white border-blue-500">
              <i className="fas fa-sync-alt text-xs"></i>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {/* Chart Container */}
        <div className="h-96 bg-dark-900 border border-dark-600 rounded-lg flex items-center justify-center relative overflow-hidden">
          {/* Placeholder for TradingView Chart */}
          <div className="absolute inset-0 bg-gradient-to-br from-dark-800 to-dark-900"></div>
          <div className="relative z-10 text-center">
            <i className="fas fa-chart-line text-4xl text-dark-400 mb-2"></i>
            <p className="text-dark-400 font-medium">TradingView Chart Integration</p>
            <p className="text-sm text-dark-500">Real-time price action with technical analysis</p>
            <p className="text-xs text-dark-600 mt-2">Symbol: {selectedSymbol} | Timeframe: {selectedTimeframe}</p>
          </div>
          
          {/* Simulated candlestick pattern overlay */}
          <div className="absolute inset-0 opacity-20">
            <svg width="100%" height="100%" viewBox="0 0 800 400" className="text-green-400">
              <path
                d="M50,200 L150,180 L250,220 L350,160 L450,200 L550,140 L650,180 L750,120"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
        </div>
        
        {/* Chart Controls */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {timeframes.map((tf) => (
              <Button
                key={tf.value}
                size="sm"
                variant={selectedTimeframe === tf.value ? "default" : "outline"}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={
                  selectedTimeframe === tf.value
                    ? "px-3 py-1 bg-blue-500 text-white"
                    : "px-3 py-1 bg-dark-700 hover:bg-dark-600 text-dark-300 border-dark-600"
                }
              >
                {tf.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-dark-400">Last Update:</span>
            <span className="font-mono text-dark-200">{lastUpdate}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
