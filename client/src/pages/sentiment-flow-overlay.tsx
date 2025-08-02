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

interface OverlayPoint {
  time: string;
  sentiment: number; // -1 to 1
  flow: number; // contracts
}

const overlayData: OverlayPoint[] = [
  { time: "09:30", sentiment: 0.2, flow: 10000 },
  { time: "10:00", sentiment: -0.1, flow: 15000 },
  { time: "10:30", sentiment: 0.4, flow: 18000 },
  { time: "11:00", sentiment: 0.1, flow: 12000 },
  { time: "11:30", sentiment: -0.2, flow: 9000 },
  { time: "12:00", sentiment: 0.3, flow: 16000 },
];

export default function SentimentFlowOverlayPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Sentiment vs Flow Overlay</h1>
        <p className="text-muted-foreground">
          Comparing market sentiment to options flow volume
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={overlayData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis yAxisId="left" domain={[-1, 1]} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="sentiment"
            stroke="#8884d8"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="flow"
            stroke="#82ca9d"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

