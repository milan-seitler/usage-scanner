"use client";

import * as React from "react";

import { TokenBarChart } from "@/components/dashboard-token-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ChartPoint = {
  isoDate?: string;
  date: string;
  inputTokens: number;
  outputTokens: number;
};

type RangeKey = "7d" | "30d" | "90d" | "all";

export function ProjectTokenPanel({ data, title = "Token consumption" }: { data: ChartPoint[]; title?: string }) {
  const [range, setRange] = React.useState<RangeKey>("30d");

  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="inline-flex w-fit rounded-lg border border-border bg-slate-50 p-1">
          {(["7d", "30d", "90d", "all"] as const).map((option) => (
            <Button
              key={option}
              type="button"
              variant={range === option ? "default" : "ghost"}
              size="sm"
              onClick={() => setRange(option)}
            >
              {option === "all" ? "All" : option.toUpperCase()}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <TokenBarChart data={data} className="h-[200px]" range={range} />
      </CardContent>
    </Card>
  );
}
