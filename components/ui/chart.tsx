"use client";

import * as React from "react";
import { TooltipProps } from "recharts";
import { ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a ChartContainer");
  }

  return context;
}

export function ChartContainer({
  children,
  config,
  className
}: {
  children: React.ReactNode;
  config: ChartConfig;
  className?: string;
}) {
  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn("h-[280px] w-full", className)}>
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(([key, value]) => `:root { --color-${key}: ${value.color}; }`)
              .join("\n")
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

export const ChartTooltip = Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  formatter
}: TooltipProps<number, string> & {
  hideLabel?: boolean;
}) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="grid min-w-[180px] gap-2 rounded-lg border bg-background/95 p-3 text-sm shadow-xl">
      <div className="font-medium text-foreground">{label}</div>
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const key = item.dataKey?.toString() ?? item.name?.toString() ?? "value";
          const entry = config[key];
          const value = typeof item.value === "number" ? item.value : 0;
          const name = item.name ?? key;
          const rendered = formatter ? formatter(value, name, item, 0, payload) : value;

          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry?.color ?? item.color }} />
                <span>{entry?.label ?? item.name}</span>
              </div>
              <div className="font-medium text-foreground">
                {Array.isArray(rendered) ? rendered[0] : rendered}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
