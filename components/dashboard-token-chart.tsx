"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatUsd } from "@/lib/pricing";

type ChartPoint = {
  isoDate?: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

type RangeKey = "7d" | "30d" | "90d" | "all";
export type UsageMetric = "tokens" | "price";

const tokenChartConfig = {
  totalTokens: {
    label: "Total",
    color: "hsl(var(--chart-1))"
  }
} satisfies ChartConfig;

const priceChartConfig = {
  costUsd: {
    label: "Cost",
    color: "hsl(var(--chart-2))"
  }
} satisfies ChartConfig;

export function DashboardTokenChart({ data }: { data: ChartPoint[] }) {
  return <TokenBarChart data={data} />;
}

export function TokenBarChart({
  data,
  className = "h-[220px]",
  range = "30d",
  metric = "tokens"
}: {
  data: ChartPoint[];
  className?: string;
  range?: RangeKey;
  metric?: UsageMetric;
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
  const dataKey = metric === "price" ? "costUsd" : "totalTokens";
  const barColor = metric === "price" ? "hsl(var(--chart-2))" : "hsl(var(--chart-1))";
  const chartConfig = metric === "price" ? priceChartConfig : tokenChartConfig;

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
        <YAxis
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
          tickFormatter={(value: number) => (metric === "price" ? formatCompactUsd(value) : formatCompactTokens(value))}
        />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={formatTooltipDate} formatter={(value: number) => [metric === "price" ? formatUsd(value) : `${value.toLocaleString()} tokens`]} />}
        />
        <Bar
          dataKey={dataKey}
          fill={barColor}
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

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatCompactUsd(value: number) {
  if (value >= 1000) return `$${Math.round(value).toLocaleString()}`;
  if (value >= 100) return `$${Math.round(value)}`;
  if (value >= 10) return `$${value.toFixed(0)}`;
  if (value >= 1) return `$${value.toFixed(1)}`;
  if (value === 0) return "$0";
  return "<$1";
}
