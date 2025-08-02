import React from "react";

interface WhaleScore {
  symbol: string;
  score: number; // 0-1
}

const scores: WhaleScore[] = [
  { symbol: "AAPL", score: 0.95 },
  { symbol: "TSLA", score: 0.7 },
  { symbol: "NVDA", score: 0.85 },
  { symbol: "MSFT", score: 0.6 },
  { symbol: "AMZN", score: 0.4 },
  { symbol: "META", score: 0.3 },
  { symbol: "NFLX", score: 0.8 },
  { symbol: "GOOG", score: 0.5 },
];

const getColor = (score: number) => {
  const hue = score * 120; // red to green
  return `hsl(${hue}, 70%, 50%)`;
};

export default function WhaleScoreHeatMapPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Whale Score Heatmap</h1>
        <p className="text-muted-foreground">
          Higher scores indicate stronger institutional interest
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {scores.map((s) => (
          <div
            key={s.symbol}
            className="p-4 rounded text-center text-white"
            style={{ backgroundColor: getColor(s.score) }}
          >
            <div className="text-lg font-semibold">{s.symbol}</div>
            <div className="text-sm">{(s.score * 100).toFixed(0)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

