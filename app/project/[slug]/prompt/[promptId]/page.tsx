import { ChevronDown, Wrench } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjects, getPromptDetail, type PromptEvent, type PromptTimelineItem } from "@/lib/data";
import { estimateUsageCostUsd, formatUsd, resolveTokenPricingProfile, type TokenPricingProfile } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PromptDetailPage({
  params
}: {
  params: Promise<{ slug: string; promptId: string }>;
}) {
  const { slug, promptId } = await params;
  const detail = getPromptDetail(slug, promptId);
  const repoCount = getProjects().length;

  if (!detail) {
    notFound();
  }

  const { project, prompt, commit, codexDetail, efficiency } = detail;
  const pricingProfile = resolveTokenPricingProfile(prompt.model);

  return (
    <AppShell eyebrow="Prompt Detail" title={prompt.title} section="prompt" repoCount={repoCount}>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="max-w-3xl text-sm text-muted-foreground">
              Prompt detail view for one session, tied back to repo, tokens, and commit outcome.
            </p>
          </div>
          <Button href={`/project/${project.slug}`} variant="outline">
            Back to project
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <PlainStatCard label="Model" value={prompt.model} />
        <PlainStatCard label="Session total" value={prompt.totalTokens != null ? formatCompactTokens(prompt.totalTokens) : "n/a"} />
        <PlainStatCard label="Estimated cost" value={formatUsd(prompt.costUsd)} />
        <PlainStatCard label="Started" value={formatTime(prompt.startedAt)} />
        <PlainStatCard label="Linked commit" value={commit?.id ?? "None"} />
      </section>

      <section className="grid gap-6">
        <Card className="border-border bg-white shadow-none">
          <CardHeader>
            <CardTitle>Recovered session metadata</CardTitle>
            <CardDescription>
              This is the level recovered from local IDE databases and agent logs. Session totals use the latest cumulative token snapshot. Estimated cost uses the current {pricingProfile?.label ?? "model"} pricing profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3 pt-0">
            <MiniMetaCard label="Session input" value={renderNumber(prompt.inputTokens)} />
            <MiniMetaCard label="Session output" value={renderNumber(prompt.outputTokens)} />
            <MiniMetaCard label="Session cached" value={renderNumber(prompt.cachedInputTokens)} />
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-none">
          <CardHeader>
            <CardTitle>Session timeline</CardTitle>
            <CardDescription>Grouped into work episodes, then reframed around efficiency diagnosis and savings opportunities.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {efficiency ? (
              <>
                <EfficiencyOverview overview={efficiency.overview} />
                {efficiency.items.map((item) => <TimelineItemRow key={item.id} item={item} />)}
                <RawCheckpointPanel checkpoints={efficiency.checkpoints} pricingProfile={pricingProfile} />
              </>
            ) : prompt.source === "Codex" && codexDetail ? (
              codexDetail.events.length > 0 ? (
                codexDetail.events.map((event, index) => <LegacyTimelineRow key={`${event.timestamp}-${index}`} event={event} />)
              ) : (
                <EmptyState text="No detailed events were found for this Codex session." />
              )
            ) : (
              <EmptyState text="Full transcript detail is not available from the current Cursor workspace data shape." />
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function PlainStatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="gap-1 pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function MiniMetaCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="gap-1 pb-1">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EfficiencyOverview({
  overview
}: {
  overview: {
    totalEstimatedTokens: number;
    wasteSignal: string;
    likelyCause: string;
    howToReduceNextTime: string;
    savingsOpportunities: string[];
  };
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Token efficiency</p>
          <p className="text-xs text-muted-foreground">Estimated from grouped session episodes and nearby token checkpoints.</p>
        </div>
        <Badge variant="secondary">{formatCompactTokens(overview.totalEstimatedTokens)} total</Badge>
      </div>
      <div className="grid gap-3 md:grid-cols-[220px_220px_1fr]">
        <OverviewStat title="Likely waste signal" value={overview.wasteSignal} text="Estimated source of avoidable token spend." />
        <OverviewStat title="Estimated cause" value={overview.likelyCause} text="Best-effort diagnosis from grouped episodes." />
        <OverviewStat title="Suggested next change" value={overview.howToReduceNextTime} text="Recommended prompt/process adjustment." />
      </div>
      <div className="rounded-lg border border-border bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Savings opportunities</p>
        <div className="mt-2 space-y-1.5 text-sm text-slate-600">
          {overview.savingsOpportunities.map((item, index) => (
            <p key={item}>
              {index + 1}. {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ title, value, text }: { title: string; value: string; text: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{text}</p>
    </div>
  );
}

function TimelineItemRow({ item }: { item: PromptTimelineItem }) {
  if (item.kind === "token_checkpoint") {
    return <TokenCheckpointRow item={item} />;
  }

  const actionType = getActionType(item);
  const title = item.kind === "message" ? item.subtitle : item.title;

  return (
    <details className={`group rounded-xl border ${item.kind === "message" ? "border-emerald-200 bg-emerald-50/60" : "border-border bg-white"}`}>
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${actionType.dotClassName}`} />
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${actionType.labelClassName}`}>{actionType.label}</span>
            <p className="text-xs font-medium text-foreground">{formatTime(item.timestamp)}</p>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
          </div>
        </div>
      </summary>
      <div className="border-t border-border px-4 py-4">
        <div className="space-y-3">
          {item.rawEvents.map((event, index) => (
            <RawEvidence key={`${item.id}-${index}`} event={event} />
          ))}
        </div>
      </div>
    </details>
  );
}

function TokenCheckpointRow({ item }: { item: PromptTimelineItem }) {
  const checkpoint = item.rawEvents[0]?.kind === "token_count" ? item.rawEvents[0] : null;
  const pricingProfile = resolveTokenPricingProfile("Codex");
  const lastCost = checkpoint
    ? estimateUsageCostUsd(
        {
          inputTokens: checkpoint.inputTokens,
          cachedInputTokens: checkpoint.cachedInputTokens,
          outputTokens: checkpoint.outputTokens,
        },
        pricingProfile
      )
    : null;
  const inlineCount = checkpoint
    ? `${formatCompactTokens(checkpoint.totalTokens)} last / ${formatCompactTokens(checkpoint.sessionTotalTokens)} session`
    : `${formatCompactTokens(item.estimatedTotalTokens)} last`;

  return (
    <details className="group rounded-xl border border-border bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
            <p className="truncate text-sm font-medium text-foreground">Token checkpoint {inlineCount}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lastCost != null ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">{formatUsd(lastCost)} last</span> : null}
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">tokens</span>
            <p className="text-xs font-medium text-foreground">{formatTime(item.timestamp)}</p>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
          </div>
        </div>
      </summary>
      <div className="border-t border-border px-4 py-4">
        {item.rawEvents.map((event, index) => (
          <RawEvidence key={`${item.id}-${index}`} event={event} />
        ))}
      </div>
    </details>
  );
}

function getActionType(item: PromptTimelineItem) {
  if (item.kind === "message") {
    return {
      label: "user",
      dotClassName: "bg-emerald-500",
      labelClassName: "bg-emerald-50 text-emerald-700"
    };
  }

  if (item.subtitle.toLowerCase().includes("investigation")) {
    return {
      label: "investigation",
      dotClassName: "bg-amber-500",
      labelClassName: "bg-amber-50 text-amber-700"
    };
  }

  return {
    label: "implementation",
    dotClassName: "bg-blue-500",
    labelClassName: "bg-blue-50 text-blue-700"
  };
}

function RawCheckpointPanel({
  checkpoints,
  pricingProfile
}: {
  checkpoints: Array<{
    timestamp: string;
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
    sessionInputTokens: number;
    sessionCachedInputTokens: number;
    sessionOutputTokens: number;
    sessionTotalTokens: number;
  }>;
  pricingProfile: TokenPricingProfile | null;
}) {
  return (
    <details className="group rounded-xl border border-dashed border-border bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Raw token checkpoints</p>
            <p className="mt-1 text-xs text-muted-foreground">Each checkpoint shows both last-request usage and cumulative session total from the underlying session log.</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="border-t border-border px-4 py-4">
        <div className="space-y-2">
          {checkpoints.map((checkpoint) => (
            <div key={`${checkpoint.timestamp}-${checkpoint.sessionTotalTokens}-${checkpoint.totalTokens}`} className="space-y-2 rounded-lg border border-border bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-foreground">{formatTime(checkpoint.timestamp)}</p>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Last request</p>
                <Badge variant="outline">{formatCompactTokens(checkpoint.inputTokens)} input</Badge>
                <Badge variant="outline">{formatCompactTokens(checkpoint.cachedInputTokens)} cached</Badge>
                <Badge variant="outline">{formatCompactTokens(checkpoint.outputTokens)} output</Badge>
                <Badge variant="secondary">{formatCompactTokens(checkpoint.totalTokens)} total</Badge>
                {pricingProfile ? (
                  <Badge variant="outline">
                    {formatUsd(
                      estimateUsageCostUsd(
                        {
                          inputTokens: checkpoint.inputTokens,
                          cachedInputTokens: checkpoint.cachedInputTokens,
                          outputTokens: checkpoint.outputTokens,
                        },
                        pricingProfile
                      )
                    )}{" "}
                    est.
                  </Badge>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session total</p>
                <Badge variant="outline">{formatCompactTokens(checkpoint.sessionInputTokens)} input</Badge>
                <Badge variant="outline">{formatCompactTokens(checkpoint.sessionCachedInputTokens)} cached</Badge>
                <Badge variant="outline">{formatCompactTokens(checkpoint.sessionOutputTokens)} output</Badge>
                <Badge variant="secondary">{formatCompactTokens(checkpoint.sessionTotalTokens)} total</Badge>
                {pricingProfile ? (
                  <Badge variant="outline">
                    {formatUsd(
                      estimateUsageCostUsd(
                        {
                          inputTokens: checkpoint.sessionInputTokens,
                          cachedInputTokens: checkpoint.sessionCachedInputTokens,
                          outputTokens: checkpoint.sessionOutputTokens,
                        },
                        pricingProfile
                      )
                    )}{" "}
                    est.
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}

function RawEvidence({ event }: { event: PromptEvent }) {
  const meta = getEventMeta(event);

  return (
    <div className="rounded-lg border border-border bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
        <p className="text-xs font-medium text-foreground">{formatTime(event.timestamp)}</p>
      </div>
      <div className="mt-3">{renderEventContent(event)}</div>
    </div>
  );
}

function LegacyTimelineRow({ event }: { event: PromptEvent }) {
  const meta = getEventMeta(event);

  return (
    <details className="group rounded-xl border border-border bg-white">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-sm font-semibold text-foreground">{meta.title}</p>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
          <p className="text-xs font-medium text-foreground">{formatTime(event.timestamp)}</p>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{meta.preview}</p>
      </summary>
      <div className="border-t border-border px-4 py-4">{renderEventContent(event)}</div>
    </details>
  );
}

function renderEventContent(event: PromptEvent) {
  if (event.kind === "message") {
    return <p className="text-sm text-muted-foreground">{event.text}</p>;
  }

  if (event.kind === "tool_call") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>{event.toolName}</span>
        </div>
        <pre className="whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-50">
          {event.argumentsText || "No arguments captured"}
        </pre>
      </div>
    );
  }

  if (event.kind === "tool_output") {
    return (
      <pre className="whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-3 text-xs leading-5 text-slate-50">
        {event.outputText || "No output captured"}
      </pre>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Last request</span>
        <Badge variant="secondary">{event.inputTokens.toLocaleString()} input</Badge>
        <Badge variant="secondary">{event.cachedInputTokens.toLocaleString()} cached</Badge>
        <Badge variant="secondary">{event.outputTokens.toLocaleString()} output</Badge>
        <Badge variant="secondary">{event.totalTokens.toLocaleString()} total</Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session total</span>
        <Badge variant="outline">{event.sessionInputTokens.toLocaleString()} input</Badge>
        <Badge variant="outline">{event.sessionCachedInputTokens.toLocaleString()} cached</Badge>
        <Badge variant="outline">{event.sessionOutputTokens.toLocaleString()} output</Badge>
        <Badge variant="outline">{event.sessionTotalTokens.toLocaleString()} total</Badge>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text}</div>;
}

function getEventMeta(event: PromptEvent) {
  if (event.kind === "message") {
    return {
      title: event.text,
      label: "message",
      badgeVariant: "secondary" as const,
      preview: event.text
    };
  }

  if (event.kind === "tool_call") {
    return {
      title: `Assistant emits ${event.toolName}`,
      label: "tool_call",
      badgeVariant: "outline" as const,
      preview: event.argumentsText || "No arguments captured"
    };
  }

  if (event.kind === "tool_output") {
    return {
      title: `Tool output from ${event.toolName}`,
      label: "tool_output",
      badgeVariant: "outline" as const,
      preview: event.outputText || "No output captured"
    };
  }

  return {
    title: "Token checkpoint recorded for this session",
    label: "token_count",
    badgeVariant: "default" as const,
    preview: `${event.inputTokens.toLocaleString()} input, ${event.outputTokens.toLocaleString()} output, ${event.totalTokens.toLocaleString()} total`
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function renderNumber(value: number | null) {
  return value == null ? "n/a" : formatCompactTokens(value);
}

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return value.toString();
}
