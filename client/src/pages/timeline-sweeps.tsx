import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface SweepPoint {
  time: string;
  volume: number;
}

const sweepData: SweepPoint[] = [
  { time: "09:30", volume: 50 },
  { time: "09:45", volume: 120 },
  { time: "10:00", volume: 80 },
  { time: "10:15", volume: 150 },
  { time: "10:30", volume: 90 },
  { time: "10:45", volume: 200 },
  { time: "11:00", volume: 130 },
];

export default function TimelineSweepsPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Timeline Sweeps</h1>
        <p className="text-muted-foreground">
          Intraday sweep volume updated over time
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={sweepData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="volume" stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

