import React from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  Scatter,
} from "recharts";

interface GammaPoint {
  strike: number;
  expiry: number; // days to expiry
  gamma: number;
}

const gammaData: GammaPoint[] = [
  { strike: 90, expiry: 7, gamma: 40 },
  { strike: 100, expiry: 7, gamma: 75 },
  { strike: 110, expiry: 7, gamma: 60 },
  { strike: 90, expiry: 30, gamma: 30 },
  { strike: 100, expiry: 30, gamma: 55 },
  { strike: 110, expiry: 30, gamma: 35 },
  { strike: 90, expiry: 60, gamma: 20 },
  { strike: 100, expiry: 60, gamma: 45 },
  { strike: 110, expiry: 60, gamma: 25 },
];

export default function GammaSurfacePage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">3D Gamma Surface</h1>
        <p className="text-muted-foreground">
          Bubble size represents gamma by strike and days to expiry
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid />
          <XAxis
            type="number"
            dataKey="strike"
            name="Strike"
            unit=""
          />
          <YAxis
            type="number"
            dataKey="expiry"
            name="Days to Expiry"
            unit="d"
          />
          <ZAxis
            type="number"
            dataKey="gamma"
            name="Gamma"
            range={[60, 400]}
          />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={gammaData} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

