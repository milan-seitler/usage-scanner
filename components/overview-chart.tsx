"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type ChartPoint = {
  date: string;
  inputTokens: number;
  outputTokens: number;
};

export function OverviewChart({ data }: { data: ChartPoint[] }) {
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

  return (
    <ChartContainer config={chartConfig}>
      <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="tokensIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="tokensOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,116,96,0.22)" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="date"
          tickLine={false}
          tickMargin={10}
          tick={{ fontSize: 12, fill: "rgba(61,73,77,0.8)" }}
        />
        <YAxis axisLine={false} tickLine={false} tickMargin={12} tick={{ fontSize: 12, fill: "rgba(61,73,77,0.8)" }} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value: number) => [`${value.toLocaleString()} tokens`]}
            />
          }
        />
        <Area type="monotone" dataKey="inputTokens" stroke="hsl(var(--chart-1))" fill="url(#tokensIn)" strokeWidth={2.5} />
        <Area type="monotone" dataKey="outputTokens" stroke="hsl(var(--chart-2))" fill="url(#tokensOut)" strokeWidth={2.5} />
      </AreaChart>
    </ChartContainer>
  );
}
