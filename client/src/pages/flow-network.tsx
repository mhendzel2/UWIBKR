import React from "react";
import { ResponsiveContainer, Sankey, Tooltip } from "recharts";

const data = {
  nodes: [
    { name: "Equities" },
    { name: "ETF" },
    { name: "Options" },
    { name: "Futures" },
  ],
  links: [
    { source: 0, target: 2, value: 300 },
    { source: 1, target: 2, value: 160 },
    { source: 2, target: 3, value: 80 },
  ],
};

export default function FlowNetworkPage() {
  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Flow Network</h1>
        <p className="text-muted-foreground">
          Sample cross-asset flow relationships visualized as a Sankey diagram
        </p>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <Sankey
          data={data}
          nodePadding={40}
          link={{ stroke: "#8884d8" }}
          node={{
            cursor: "pointer",
            nodeWidth: 15,
            stroke: "#555",
          }}
        >
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
}

