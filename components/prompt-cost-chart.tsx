"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";

type PromptCostPoint = {
  id: string;
  label: string;
  startedAt: string;
  promptPreview: string;
  costUsd: number;
  cumulativeCostUsd: number;
};

type CostMode = "prompt" | "cumulative";

const chartConfig = {
  costUsd: {
    label: "Prompt cost",
    color: "hsl(var(--chart-2))"
  },
  cumulativeCostUsd: {
    label: "Cumulative cost",
    color: "hsl(var(--chart-1))"
  }
} satisfies ChartConfig;

export function PromptCostChart({ data, mode }: { data: PromptCostPoint[]; mode: CostMode }) {
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
              tickFormatter={(value: number) => formatUsdAxis(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.startedAt ?? _label}
                  formatter={(value: number, _name, item) => [formatUsdValue(value), item.payload?.promptPreview]}
                />
              }
            />
            <Bar dataKey="costUsd" fill="var(--color-costUsd)" radius={[4, 4, 0, 0]} minPointSize={6} />
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
              tickFormatter={(value: number) => formatUsdAxis(value)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => payload?.[0]?.payload?.startedAt ?? _label}
                  formatter={(value: number, _name, item) => [formatUsdValue(value), item.payload?.promptPreview]}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="cumulativeCostUsd"
              stroke="var(--color-cumulativeCostUsd)"
              fill="var(--color-cumulativeCostUsd)"
              fillOpacity={0.18}
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--color-cumulativeCostUsd)", strokeWidth: 0 }}
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
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}
