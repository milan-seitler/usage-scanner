"use client";

import * as React from "react";

import { PromptCostChart, type UsageMetric } from "@/components/prompt-cost-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export function PromptCostPanel({ data }: { data: PromptCostPoint[] }) {
  const [mode, setMode] = React.useState<CostMode>("prompt");
  const [metric, setMetric] = React.useState<UsageMetric>("price");

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Usage</CardTitle>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          <div className="inline-flex w-fit rounded-lg border border-border bg-muted p-1">
            <Button type="button" variant={metric === "price" ? "default" : "ghost"} size="sm" onClick={() => setMetric("price")}>
              Cost
            </Button>
            <Button type="button" variant={metric === "tokens" ? "default" : "ghost"} size="sm" onClick={() => setMetric("tokens")}>
              Tokens
            </Button>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-border bg-muted p-1">
            <Button type="button" variant={mode === "prompt" ? "default" : "ghost"} size="sm" onClick={() => setMode("prompt")}>
              Per prompt
            </Button>
            <Button type="button" variant={mode === "cumulative" ? "default" : "ghost"} size="sm" onClick={() => setMode("cumulative")}>
              Cumulative
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <PromptCostChart data={data} mode={mode} metric={metric} />
      </CardContent>
    </Card>
  );
}
