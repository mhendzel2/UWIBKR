import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis } from "recharts";

interface SectorSentimentProps {
  sector?: string;
}

export default function SectorSentimentPanel({ sector = "technology" }: SectorSentimentProps) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/sentiment/sector", sector, "tide-expiry"],
    queryFn: async () => {
      const res = await fetch(`/api/sentiment/sector/${sector}/tide-expiry`);
      if (!res.ok) throw new Error("Failed to fetch sector sentiment");
      return res.json();
    },
    refetchInterval: 60000,
  });

  if (isLoading || !data) {
    return (
      <div className="bg-dark-800 border border-dark-700 rounded-xl">
        <div className="p-6 border-b border-dark-700">
          <h3 className="text-lg font-semibold">Sector Sentiment</h3>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const gaugePercent = ((data.gauge + 1) / 2) * 100;
  const chartData = [
    { name: "Weekly", value: data.expiry.weekly },
    { name: "0DTE", value: data.expiry.zero_dte },
  ];

  return (
    <div className="bg-dark-800 border border-dark-700 rounded-xl">
      <div className="p-6 border-b border-dark-700">
        <h3 className="text-lg font-semibold">Sector Sentiment</h3>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex items-center space-x-2">
          {data.trend === "rising" ? (
            <ArrowUp className="h-4 w-4 text-green-400" />
          ) : (
            <ArrowDown className="h-4 w-4 text-red-400" />
          )}
          <span className="text-sm text-dark-400">
            {data.trend === "rising" ? "Net call premium rising" : "Net call premium falling"}
          </span>
        </div>
        <Progress value={gaugePercent} />
        <ChartContainer
          config={{ value: { label: "Net Premium", color: "hsl(var(--chart-1))" } }}
          className="h-40"
        >
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" />
          </BarChart>
        </ChartContainer>
      </div>
    </div>
  );
}
