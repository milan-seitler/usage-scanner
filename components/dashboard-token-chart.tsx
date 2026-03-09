"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type ChartPoint = {
  isoDate?: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
};

type RangeKey = "7d" | "30d" | "90d" | "all";

const chartConfig = {
  totalTokens: {
    label: "Total",
    color: "hsl(var(--chart-1))"
  }
} satisfies ChartConfig;

export function DashboardTokenChart({ data }: { data: ChartPoint[] }) {
  return <TokenBarChart data={data} />;
}

export function TokenBarChart({
  data,
  className = "h-[220px]",
  range = "30d"
}: {
  data: ChartPoint[];
  className?: string;
  range?: RangeKey;
}) {
  const normalizedData = React.useMemo(
    () =>
      data.map((point) => ({
        ...point,
        isoDate: point.isoDate ?? point.date,
        totalTokens: point.inputTokens + point.outputTokens
      })),
    [data]
  );
  const visibleData = React.useMemo(() => filterChartRange(normalizedData, range), [normalizedData, range]);

  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart data={visibleData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }} barCategoryGap="12%">
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
          content={<ChartTooltipContent labelFormatter={formatTooltipDate} formatter={(value: number) => [`${value.toLocaleString()} tokens`]} />}
        />
        <Bar
          dataKey="totalTokens"
          fill="hsl(var(--chart-1))"
          radius={[4, 4, 0, 0]}
          minPointSize={6}
        />
      </BarChart>
    </ChartContainer>
  );
}

function filterChartRange<
  T extends {
    isoDate: string;
  }
>(data: T[], range: RangeKey) {
  if (range === "all" || data.length === 0) {
    return data;
  }

  const dayCount = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return data.slice(Math.max(0, data.length - dayCount));
}

function formatTooltipDate(_label: string, payload?: Array<{ payload?: { isoDate?: string; date?: string } }>) {
  const isoDate = payload?.[0]?.payload?.isoDate;
  if (!isoDate) {
    return _label;
  }

  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
