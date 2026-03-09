"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type ChartPoint = {
  date: string;
  inputTokens: number;
  outputTokens: number;
};

const chartConfig = {
  inputTokens: {
    label: "Input",
    color: "hsl(var(--chart-1))"
  },
  outputTokens: {
    label: "Output",
    color: "hsl(var(--chart-2))"
  }
} satisfies ChartConfig;

export function DashboardTokenChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartContainer config={chartConfig} className="h-[220px]">
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboard-tokens-in" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.14} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="dashboard-tokens-out" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.12} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.18)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
        />
        <YAxis axisLine={false} tickLine={false} tickMargin={10} tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent formatter={(value: number) => [`${value.toLocaleString()} tokens`]} />}
        />
        <Area type="monotone" dataKey="inputTokens" stroke="hsl(var(--chart-1))" fill="url(#dashboard-tokens-in)" strokeWidth={2} />
        <Area type="monotone" dataKey="outputTokens" stroke="hsl(var(--chart-2))" fill="url(#dashboard-tokens-out)" strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}
