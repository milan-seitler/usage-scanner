import { ChevronDown, Wrench } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Fragment, type ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { PromptCostPanel } from "@/components/prompt-cost-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjects, getPromptDetail, type PromptEvent, type PromptTimelineItem } from "@/lib/data";
import { estimateUsageCostUsd, formatUsd, resolveTokenPricingProfile, type TokenPricingProfile } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type TimelineView = "prompts" | "full";

export default async function PromptDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string; promptId: string }>;
  searchParams?: Promise<{ view?: string }>;
}) {
  const { slug, promptId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const detail = getPromptDetail(slug, promptId);
  const repoCount = getProjects().length;

  if (!detail) {
    notFound();
  }

  const { project, prompt, codexDetail, efficiency } = detail;
  const pricingProfile = resolveTokenPricingProfile(prompt.model);
  const view = normalizeTimelineView(resolvedSearchParams?.view);
  const promptGroups = codexDetail ? groupPromptEpisodes(codexDetail.events) : [];
  const promptCostChartData = buildPromptCostChartData(promptGroups, pricingProfile);
  const promptHeaderTitle = truncatePageTitle(promptGroups[0]?.userMessage ?? prompt.title);
  const breadcrumbTitle = truncateBreadcrumbTitle(promptGroups[0]?.userMessage ?? prompt.title);

  return (
    <AppShell
      title={promptHeaderTitle}
      section="prompt"
      repoCount={repoCount}
      breadcrumbs={
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="transition hover:text-foreground" href="/">
            Dashboard
          </Link>
          <span>/</span>
          <Link className="transition hover:text-foreground" href={`/project/${project.slug}`}>
            {project.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">{breadcrumbTitle}</span>
        </nav>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlainStatCard label="Model" value={prompt.model} />
        <PlainStatCard label="Cost" value={formatUsd(prompt.costUsd)} />
        <PlainStatCard
          label="Session total"
          value={<SessionTotalValue totalTokens={prompt.totalTokens} inputTokens={prompt.inputTokens} cachedInputTokens={prompt.cachedInputTokens} outputTokens={prompt.outputTokens} />}
        />
        <PlainStatCard label="Started" value={formatDateTime(prompt.startedAt)} />
      </section>

      <section className="grid gap-6">
        {promptCostChartData.length > 0 ? <PromptCostPanel data={promptCostChartData} /> : <EmptyState text="No thread-level cost data was recovered for this session." />}

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Session timeline</CardTitle>
            </div>
            <div className="inline-flex w-fit rounded-lg border border-border bg-muted p-1">
              <TimelineViewButton slug={project.slug} promptId={prompt.id} view={view} target="prompts" />
              <TimelineViewButton slug={project.slug} promptId={prompt.id} view={view} target="full" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {view === "prompts" && prompt.source === "Codex" && codexDetail ? (
              promptGroups.length > 0 ? (
                promptGroups.map((group) => <PromptGroupRow key={group.id} group={group} pricingProfile={pricingProfile} />)
              ) : (
                <EmptyState text="No prompt groups were recovered for this Codex session." />
              )
            ) : efficiency ? (
              <>
                {[...efficiency.items]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((item) => <TimelineItemRow key={item.id} item={item} />)}
                <RawCheckpointPanel checkpoints={efficiency.checkpoints} pricingProfile={pricingProfile} />
              </>
            ) : prompt.source === "Codex" && codexDetail ? (
              codexDetail.events.length > 0 ? (
                [...codexDetail.events]
                  .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  .map((event, index) => <LegacyTimelineRow key={`${event.timestamp}-${index}`} event={event} />)
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

function PlainStatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="gap-1 pb-5">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function SessionTotalValue({
  totalTokens,
  inputTokens,
  cachedInputTokens,
  outputTokens
}: {
  totalTokens: number | null;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}) {
  return (
    <span className="group relative inline-flex">
      <span className="border-b border-dashed border-muted-foreground/70 leading-none">{totalTokens != null ? formatCompactTokens(totalTokens) : "n/a"}</span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden min-w-[220px] rounded-lg border border-border bg-card p-3 text-left text-sm font-medium text-foreground shadow-xl group-hover:block">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Session breakdown</span>
        <span className="mt-2 block text-sm text-foreground">{renderNumber(inputTokens)} input</span>
        <span className="mt-1 block text-sm text-foreground">{renderNumber(cachedInputTokens)} cached</span>
        <span className="mt-1 block text-sm text-foreground">{renderNumber(outputTokens)} output</span>
      </span>
    </span>
  );
}

function TimelineViewButton({
  slug,
  promptId,
  view,
  target
}: {
  slug: string;
  promptId: string;
  view: TimelineView;
  target: TimelineView;
}) {
  const active = view === target;

  return (
    <Button
      href={`/project/${slug}/prompt/${promptId}?view=${target}`}
      variant="ghost"
      size="sm"
      className={cn(
        "rounded-md px-3 capitalize",
        active ? "bg-card text-foreground shadow-sm hover:bg-card" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {target}
    </Button>
  );
}

type PromptGroup = {
  id: string;
  startedAt: string;
  endedAt: string;
  userMessage: string;
  assistantMessage: string | null;
  tokenEvents: Array<Extract<PromptEvent, { kind: "token_count" }>>;
  aggregateUsage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  } | null;
};

function PromptGroupRow({
  group,
  pricingProfile
}: {
  group: PromptGroup;
  pricingProfile: TokenPricingProfile | null;
}) {
  const estimatedCost = group.aggregateUsage
    ? estimateUsageCostUsd(
        {
          inputTokens: group.aggregateUsage.inputTokens,
          cachedInputTokens: group.aggregateUsage.cachedInputTokens,
          outputTokens: group.aggregateUsage.outputTokens,
        },
        pricingProfile
      )
    : null;

  return (
    <details className="group rounded-xl border border-border bg-card">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{formatUsd(estimatedCost)}</Badge>
              <p className="text-xs font-medium text-muted-foreground">
                {formatTime(group.startedAt)} <span className="text-muted-foreground/70">·</span> {formatDuration(group.startedAt, group.endedAt)}
              </p>
            </div>
            <p className="line-clamp-2 text-sm font-medium text-foreground">{group.userMessage}</p>
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
        </div>
      </summary>
      <div className="space-y-4 border-t border-border px-4 py-4">
        <PromptMessageCard label="User message" text={group.userMessage} tone="user" />
        <PromptMessageCard label="Final assistant message" text={group.assistantMessage ?? "No assistant message captured for this group."} tone="assistant" />
        {group.aggregateUsage ? <PromptUsageCard usage={group.aggregateUsage} estimatedCost={estimatedCost} requestsCount={group.tokenEvents.length} /> : null}
      </div>
    </details>
  );
}

function PromptMessageCard({
  label,
  text,
  tone
}: {
  label: string;
  text: string;
  tone: "user" | "assistant";
}) {
  return (
    <div className={cn("rounded-lg border p-3", tone === "user" ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-muted")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="mt-2 space-y-3 text-sm text-foreground">
        {renderFormattedMessage(text)}
      </div>
    </div>
  );
}

function PromptUsageCard({
  usage,
  estimatedCost,
  requestsCount
}: {
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  estimatedCost: number | null;
  requestsCount: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Usage</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{formatCompactTokens(usage.inputTokens)} input</Badge>
        <Badge variant="secondary">{formatCompactTokens(usage.cachedInputTokens)} cached</Badge>
        <Badge variant="secondary">{formatCompactTokens(usage.outputTokens)} output</Badge>
        <Badge variant="secondary">{formatCompactTokens(usage.totalTokens)} total</Badge>
        {requestsCount > 1 ? <Badge variant="outline">{requestsCount} requests summed</Badge> : null}
        <Badge variant="outline">{formatUsd(estimatedCost)} est.</Badge>
      </div>
    </div>
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
    <div className="space-y-3 rounded-xl border border-border bg-muted p-4">
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
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Savings opportunities</p>
        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{text}</p>
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
    <details className={`group rounded-xl border ${item.kind === "message" ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-card"}`}>
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
    <details className="group rounded-xl border border-border bg-card">
      <summary className="cursor-pointer list-none p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-muted-foreground/70" />
            <p className="truncate text-sm font-medium text-foreground">Token checkpoint {inlineCount}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {lastCost != null ? <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">{formatUsd(lastCost)} last</span> : null}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">tokens</span>
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
      labelClassName: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300"
    };
  }

  if (item.subtitle.toLowerCase().includes("investigation")) {
    return {
      label: "investigation",
      dotClassName: "bg-amber-500",
      labelClassName: "bg-amber-500/12 text-amber-700 dark:text-amber-300"
    };
  }

  return {
    label: "implementation",
    dotClassName: "bg-blue-500",
    labelClassName: "bg-blue-500/12 text-blue-700 dark:text-blue-300"
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
    <details className="group rounded-xl border border-dashed border-border bg-card">
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
            <div key={`${checkpoint.timestamp}-${checkpoint.sessionTotalTokens}-${checkpoint.totalTokens}`} className="space-y-2 rounded-lg border border-border bg-muted px-3 py-2">
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
    <div className="rounded-lg border border-border bg-muted p-3">
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
    <details className="group rounded-xl border border-border bg-card">
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatDuration(startedAt: string, endedAt: string) {
  const durationMs = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalSeconds = Math.round(durationMs / 1000);

  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes < 60) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
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

function normalizeTimelineView(value: string | undefined): TimelineView {
  return value === "full" ? "full" : "prompts";
}

function groupPromptEpisodes(events: PromptEvent[]): PromptGroup[] {
  const groups: PromptGroup[] = [];
  let current: PromptGroup | null = null;

  events.forEach((event) => {
    if (event.kind === "message" && event.role === "user") {
      if (isSessionBootstrapMessage(event.text)) {
        return;
      }

      current = {
        id: `${event.timestamp}-${groups.length}`,
        startedAt: event.timestamp,
        endedAt: event.timestamp,
        userMessage: event.text,
        assistantMessage: null,
        tokenEvents: [],
        aggregateUsage: null,
      };
      groups.push(current);
      return;
    }

    if (!current) {
      return;
    }

    if (event.timestamp) {
      current.endedAt = event.timestamp;
    }

    if (event.kind === "message" && event.role === "assistant") {
      current.assistantMessage = event.text;
      return;
    }

    if (event.kind === "token_count") {
      current.tokenEvents.push(event);
      current.aggregateUsage = {
        inputTokens: current.tokenEvents.reduce((sum, item) => sum + item.inputTokens, 0),
        cachedInputTokens: current.tokenEvents.reduce((sum, item) => sum + item.cachedInputTokens, 0),
        outputTokens: current.tokenEvents.reduce((sum, item) => sum + item.outputTokens, 0),
        totalTokens: current.tokenEvents.reduce((sum, item) => sum + item.totalTokens, 0),
      };
    }
  });

  return groups;
}

function buildPromptCostChartData(groups: PromptGroup[], pricingProfile: TokenPricingProfile | null) {
  let cumulativeCostUsd = 0;
  let cumulativeTokens = 0;

  return groups
    .map((group, index) => {
      const totalTokens = group.aggregateUsage?.totalTokens ?? 0;
      const costUsd = group.aggregateUsage
        ? estimateUsageCostUsd(
            {
              inputTokens: group.aggregateUsage.inputTokens,
              cachedInputTokens: group.aggregateUsage.cachedInputTokens,
              outputTokens: group.aggregateUsage.outputTokens,
            },
            pricingProfile
          ) ?? 0
        : 0;

      cumulativeCostUsd += costUsd;
      cumulativeTokens += totalTokens;

      return {
        id: group.id,
        label: `P${index + 1}`,
        startedAt: formatTime(group.startedAt),
        promptPreview: truncatePromptPreview(group.userMessage),
        totalTokens,
        cumulativeTokens,
        costUsd,
        cumulativeCostUsd,
      };
    })
    .filter((point) => point.totalTokens > 0 || point.cumulativeTokens > 0 || point.costUsd > 0 || point.cumulativeCostUsd > 0);
}

function isSessionBootstrapMessage(text: string) {
  const normalized = text.trim();

  return (
    normalized.startsWith("# AGENTS.md instructions") ||
    normalized.startsWith("<environment_context>") ||
    normalized.includes("\n<environment_context>")
  );
}

function truncatePromptPreview(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
}

function truncatePageTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 120 ? `${normalized.slice(0, 120)}...` : normalized;
}

function truncateBreadcrumbTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 50 ? `${normalized.slice(0, 50)}...` : normalized;
}

function renderFormattedMessage(text: string) {
  const blocks = splitMessageBlocks(text);

  return blocks.map((block, index) => {
    if (block.type === "code") {
      return (
        <pre key={`code-${index}`} className="overflow-x-auto rounded-lg border border-border bg-slate-950/95 px-3 py-2 text-xs leading-6 text-slate-100">
          <code>{block.content}</code>
        </pre>
      );
    }

    if (block.type === "ul") {
      return (
        <ul key={`ul-${index}`} className="space-y-1 pl-5 text-sm leading-7 list-disc">
          {block.items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInlineMessageParts(item)}</li>
          ))}
        </ul>
      );
    }

    if (block.type === "ol") {
      return (
        <ol key={`ol-${index}`} className="space-y-1 pl-5 text-sm leading-7 list-decimal">
          {block.items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInlineMessageParts(item)}</li>
          ))}
        </ol>
      );
    }

    return (
      <p key={`p-${index}`} className="whitespace-pre-wrap leading-7 text-foreground">
        {renderInlineMessageParts(block.content)}
      </p>
    );
  });
}

function renderInlineMessageParts(text: string) {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code key={`code-inline-${index}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.95em] text-foreground">
          {part.slice(1, -1)}
        </code>
      );
    }

    const markdownLink = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (markdownLink) {
      const [, label, href] = markdownLink;
      const localFileLink = isLocalFileLink(href);
      const external = /^(https?:|mailto:)/.test(href);

      if (localFileLink) {
        return (
          <span
            key={`link-${index}`}
            className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.95em] text-foreground"
            title={href}
          >
            {label}
          </span>
        );
      }

      return (
        <a
          key={`link-${index}`}
          className="underline decoration-border underline-offset-4 transition hover:text-primary"
          href={href}
          rel={external ? "noreferrer noopener" : undefined}
          target={external ? "_blank" : undefined}
        >
          {label}
        </a>
      );
    }

    return <Fragment key={`text-${index}`}>{part}</Fragment>;
  });
}

function isLocalFileLink(href: string) {
  return /^(\/Users\/|\/home\/|\/tmp\/|\/var\/|\/opt\/|\/private\/|\/Volumes\/|[A-Za-z]:[\\/])/.test(href);
}

function splitMessageBlocks(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [{ type: "paragraph" as const, content: "" }];
  }

  const lines = normalized.split("\n");
  const blocks: Array<
    | { type: "paragraph"; content: string }
    | { type: "code"; content: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
  > = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ""));
        index += 1;
      }

      blocks.push({ type: "ul", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      blocks.push({ type: "ol", items });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const current = lines[index];
      const currentTrimmed = current.trim();

      if (!currentTrimmed || currentTrimmed.startsWith("```") || /^[-*]\s+/.test(currentTrimmed) || /^\d+\.\s+/.test(currentTrimmed)) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }

    blocks.push({ type: "paragraph", content: paragraphLines.join("\n") });
  }

  return blocks;
}
