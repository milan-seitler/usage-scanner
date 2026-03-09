"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatUsd } from "@/lib/pricing";

type PromptCostPoint = {
  id: string;
  label: string;
  startedAt: string;
  promptPreview: string;
  totalTokens: number;
  cumulativeTokens: number;
  costUsd: number;
  cumulativeCostUsd: number;
};

type CostMode = "prompt" | "cumulative";
export type UsageMetric = "tokens" | "price";

const chartConfig = {
  totalTokens: {
    label: "Prompt tokens",
    color: "hsl(var(--chart-1))"
  },
  cumulativeTokens: {
    label: "Cumulative tokens",
    color: "hsl(var(--chart-1))"
  },
  costUsd: {
    label: "Prompt cost",
    color: "hsl(var(--chart-2))"
  },
  cumulativeCostUsd: {
    label: "Cumulative cost",
    color: "hsl(var(--chart-1))"
  }
} satisfies ChartConfig;

export function PromptCostChart({ data, mode, metric }: { data: PromptCostPoint[]; mode: CostMode; metric: UsageMetric }) {
  const isPrice = metric === "price";
  const barKey = isPrice ? "costUsd" : "totalTokens";
  const areaKey = isPrice ? "cumulativeCostUsd" : "cumulativeTokens";
  const colorVar = isPrice ? "var(--color-costUsd)" : "var(--color-totalTokens)";

  return (
    <ChartContainer config={chartConfig} className="h-[240px]">
        {mode === "prompt" ? (
          <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barCategoryGap="18%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.18)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
              tickFormatter={(value: number) => (isPrice ? formatUsdAxis(value) : formatTokensAxis(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.startedAt ?? _label}
                  formatter={(value: number, _name, item) => [isPrice ? formatUsdValue(value) : formatTokenValue(value), item.payload?.promptPreview]}
                />
              }
            />
            <Bar dataKey={barKey} fill={colorVar} radius={[4, 4, 0, 0]} minPointSize={6} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107,114,128,0.18)" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 11, fill: "rgba(107,114,128,0.9)" }}
              tickFormatter={(value: number) => (isPrice ? formatUsdAxis(value) : formatTokensAxis(value))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.startedAt ?? _label}
                  formatter={(value: number, _name, item) => [isPrice ? formatUsdValue(value) : formatTokenValue(value), item.payload?.promptPreview]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey={areaKey}
              stroke={colorVar}
              fill={colorVar}
              fillOpacity={0.18}
              strokeWidth={2.5}
              dot={{ r: 3, fill: colorVar, strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        )}
    </ChartContainer>
  );
}

function formatUsdAxis(value: number) {
  if (value === 0) return "$0";
  if (value < 0.01) return "<$0.01";
  return `$${value.toFixed(value < 1 ? 2 : 0)}`;
}

function formatUsdValue(value: number) {
  return formatUsd(value);
}

function formatTokensAxis(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

function formatTokenValue(value: number) {
  return `${value.toLocaleString()} tokens`;
}
