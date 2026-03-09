"use client";

import * as React from "react";

import { PromptCostChart } from "@/components/prompt-cost-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PromptCostPoint = {
  id: string;
  label: string;
  startedAt: string;
  promptPreview: string;
  costUsd: number;
  cumulativeCostUsd: number;
};

type CostMode = "prompt" | "cumulative";

export function PromptCostPanel({ data }: { data: PromptCostPoint[] }) {
  const [mode, setMode] = React.useState<CostMode>("prompt");

  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Prompt cost progression</CardTitle>
        <div className="inline-flex w-fit rounded-lg border border-border bg-slate-50 p-1">
          <Button type="button" variant={mode === "prompt" ? "default" : "ghost"} size="sm" onClick={() => setMode("prompt")}>
            Per prompt
          </Button>
          <Button type="button" variant={mode === "cumulative" ? "default" : "ghost"} size="sm" onClick={() => setMode("cumulative")}>
            Cumulative
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <PromptCostChart data={data} mode={mode} />
      </CardContent>
    </Card>
  );
}
