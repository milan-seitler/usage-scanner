import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  DollarSign,
  FolderGit2,
  GitCommitHorizontal,
  Wrench
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getProjects, getPromptDetail, type PromptEvent } from "@/lib/data";

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

  const { project, prompt, commit, codexDetail } = detail;

  return (
    <AppShell eyebrow="Prompt Detail" title={prompt.title} section="prompt" repoCount={repoCount}>
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-border/70 bg-white/90">
          <CardHeader className="gap-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
                  href={`/project/${project.slug}`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to project
                </Link>
                <Badge variant="outline">{prompt.source}</Badge>
                <Badge variant="secondary">{prompt.model}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">{formatDate(prompt.startedAt)}</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <CardTitle className="text-2xl">Session overview</CardTitle>
                <CardDescription className="mt-2 max-w-2xl">
                  Inspect the actual prompt, the tool activity around it, and the commit it likely fed into.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{prompt.summary}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <InfoStrip icon={Bot} label="Model" value={prompt.model} />
            <InfoStrip icon={DollarSign} label="Known tokens" value={prompt.totalTokens != null ? prompt.totalTokens.toLocaleString() : "Unavailable"} />
            <InfoStrip icon={FolderGit2} label="Repo" value={project.name} />
            <InfoStrip icon={GitCommitHorizontal} label="Linked commit" value={commit?.id ?? "None"} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="text-lg">What this page proves</CardTitle>
            <CardDescription>The dashboard should stay explainable down to a single session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ReadingChip label="Transcript" value={prompt.source === "Codex" ? "event-level" : "summary-level"} />
            <ReadingChip label="Tool trace" value={prompt.source === "Codex" ? "available" : "not exposed"} />
            <ReadingChip label="Token accounting" value={prompt.totalTokens != null ? "known" : "unavailable"} />
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              {prompt.source === "Codex"
                ? "This session is detailed enough to read like a real assistant timeline rather than a billing row."
                : "Cursor currently contributes a thinner historical trace on this machine, so this page stays honest about the missing depth."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle>Recovered session metadata</CardTitle>
            <CardDescription>This is the level you’d get from local IDE databases or agent logs.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DataBlock label="Started">{formatDate(prompt.startedAt)}</DataBlock>
            <DataBlock label="Input tokens">{renderNumber(prompt.inputTokens)}</DataBlock>
            <DataBlock label="Output tokens">{renderNumber(prompt.outputTokens)}</DataBlock>
            <DataBlock label="Total tokens">{renderNumber(prompt.totalTokens)}</DataBlock>
            <DataBlock label="Cached input">{renderNumber(prompt.cachedInputTokens)}</DataBlock>
            <DataBlock label="Repo path">{prompt.repoPath}</DataBlock>
            <DataBlock label="Prompt id">{prompt.id}</DataBlock>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle>Correlation summary</CardTitle>
            <CardDescription>Spend is only useful when it can be tied back to delivered work.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commit ? (
              <div className="rounded-2xl border border-border/80 bg-background/85 p-4">
                <p className="text-sm font-medium">{commit.message}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Committed {formatDate(commit.committedAt)} on {commit.branch}
                </p>
                <Link className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary" href={`/project/${project.slug}/commit/${commit.id}`}>
                  Open commit detail
                  <ChevronDown className="-rotate-90 h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                No correlated commit yet. In a real scanner pass, this would remain unmatched until a nearby Git event is found.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border/70 bg-white/90">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Session timeline</CardTitle>
                <CardDescription>
                  {prompt.source === "Codex"
                    ? "Raw local event stream for this Codex session: messages, tool calls, tool outputs, and token-count checkpoints."
                    : "Cursor currently exposes prompt history on this machine, but not the full per-event tool and response timeline."}
                </CardDescription>
              </div>
              <Badge variant="secondary">{prompt.source === "Codex" ? "expandable log" : "metadata only"}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {prompt.source === "Codex" && codexDetail ? (
              codexDetail.events.length > 0 ? (
                <div className="relative pl-6">
                  <div className="absolute bottom-0 left-[11px] top-0 w-px bg-border/80" />
                  <div className="space-y-4">
                    {codexDetail.events.map((event, index) => (
                      <TimelineEvent key={`${event.timestamp}-${index}`} event={event} />
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyTimeline text="No detailed events were found for this Codex session." />
              )
            ) : (
              <EmptyTimeline text="Full transcript detail is not available from the current Cursor workspace data shape. This page shows the prompt-level metadata that is available." />
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function InfoStrip({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Bot;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-lg font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DataBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/45 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-medium">{children}</p>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function renderNumber(value: number | null) {
  return value == null ? "Unavailable" : value.toLocaleString();
}

function TimelineEvent({ event }: { event: PromptEvent }) {
  const meta = getEventMeta(event);

  if (event.kind === "message") {
    return (
      <TimelineDisclosure
        badgeVariant={event.role === "user" ? "default" : "secondary"}
        dotClassName={meta.dotClassName}
        label={meta.label}
        preview={truncate(event.text, 220)}
        timestamp={event.timestamp}
      >
        <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{event.text}</pre>
      </TimelineDisclosure>
    );
  }

  if (event.kind === "token_count") {
    return (
      <TimelineDisclosure
        badgeVariant="outline"
        dotClassName={meta.dotClassName}
        label={meta.label}
        preview={`${event.totalTokens.toLocaleString()} total, ${event.inputTokens.toLocaleString()} input, ${event.outputTokens.toLocaleString()} output`}
        timestamp={event.timestamp}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <MetricMini label="Input" value={event.inputTokens.toLocaleString()} />
          <MetricMini label="Cached" value={event.cachedInputTokens.toLocaleString()} />
          <MetricMini label="Output" value={event.outputTokens.toLocaleString()} />
          <MetricMini label="Total" value={event.totalTokens.toLocaleString()} />
        </div>
      </TimelineDisclosure>
    );
  }

  if (event.kind === "tool_call") {
    return (
      <TimelineDisclosure
        badgeVariant="outline"
        dotClassName={meta.dotClassName}
        label={meta.label}
        sublabel={event.toolName}
        preview={truncate(event.argumentsText || "No arguments captured", 220)}
        timestamp={event.timestamp}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="h-4 w-4" />
          <span>Status: {event.status}</span>
          {event.callId ? <span>Call: {event.callId}</span> : null}
        </div>
        {event.argumentsText ? (
          <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/50 p-3 text-xs leading-5 text-foreground">
            {event.argumentsText}
          </pre>
        ) : null}
      </TimelineDisclosure>
    );
  }

  return (
    <TimelineDisclosure
      badgeVariant="outline"
      dotClassName={meta.dotClassName}
      label={meta.label}
      sublabel={event.toolName}
      preview={truncate(event.outputText || "No output captured", 220)}
      timestamp={event.timestamp}
    >
      {event.callId ? <p className="mt-2 text-xs text-muted-foreground">Call: {event.callId}</p> : null}
      <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/50 p-3 text-xs leading-5 text-foreground">
        {event.outputText}
      </pre>
    </TimelineDisclosure>
  );
}

function TimelineDisclosure({
  badgeVariant,
  children,
  dotClassName,
  label,
  preview,
  sublabel,
  timestamp
}: {
  badgeVariant: "default" | "secondary" | "outline";
  children: React.ReactNode;
  dotClassName: string;
  label: string;
  preview: string;
  sublabel?: string;
  timestamp: string;
}) {
  return (
    <details className="group relative">
      <summary className="list-none">
        <div className="absolute -left-6 top-5 flex h-5 w-5 items-center justify-center rounded-full bg-background">
          <span className={`h-3 w-3 rounded-full ${dotClassName}`} />
        </div>
        <div className="cursor-pointer rounded-2xl border border-border/80 bg-background/85 p-4 transition hover:bg-background">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={badgeVariant}>{label}</Badge>
                {sublabel ? <Badge variant="secondary">{sublabel}</Badge> : null}
                <span className="text-xs text-muted-foreground">{formatDate(timestamp)}</span>
              </div>
              <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{preview}</p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/70 text-muted-foreground transition group-open:rotate-180">
              <ChevronDown className="h-4 w-4" />
            </div>
          </div>
        </div>
      </summary>
      <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 p-4">{children}</div>
    </details>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background/80 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function EmptyTimeline({ text }: { text: string }) {
  return <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text}</div>;
}

function ReadingChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/85 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function truncate(text: string, maxLength: number) {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength - 1)}...`;
}

function getEventMeta(event: PromptEvent) {
  switch (event.kind) {
    case "message":
      return {
        label: event.role,
        dotClassName:
          event.role === "user"
            ? "bg-primary"
            : event.role === "assistant"
              ? "bg-accent"
              : "bg-chart-4"
      };
    case "tool_call":
      return {
        label: "tool call",
        dotClassName: "bg-chart-3"
      };
    case "tool_output":
      return {
        label: "tool output",
        dotClassName: "bg-chart-4"
      };
    case "token_count":
      return {
        label: "token count",
        dotClassName: "bg-accent"
      };
  }
}
