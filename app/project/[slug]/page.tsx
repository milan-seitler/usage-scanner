import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { TokenBarChart } from "@/components/dashboard-token-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProject, getProjects, getPromptDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

type PromptSortKey = "date-desc" | "date-asc" | "tokens-desc" | "tokens-asc";

export default async function ProjectPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ sort?: string }>;
}) {
  const { slug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const project = getProject(slug);
  const repoCount = getProjects().length;

  if (!project) {
    notFound();
  }

  const sort = normalizePromptSort(resolvedSearchParams?.sort);
  const tokenTotal = project.prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
  const bestSource = project.scannerSources.some((source) => source.toLowerCase().includes("codex")) ? "Codex" : "Cursor";
  const latestPrompt = project.prompts[0];
  const tokenChartData = buildDailyTokenChart(project.prompts);
  const promptRows = project.prompts.map((prompt) => {
    const detail = getPromptDetail(project.slug, prompt.id);
    const lastEventTs = detail?.codexDetail?.events.at(-1)?.timestamp;

    return {
      id: prompt.id,
      title: prompt.title,
      source: shortSource(prompt.source),
      startedAt: prompt.startedAt,
      started: formatAbsoluteDate(prompt.startedAt),
      lastEdit: lastEventTs ? formatRelativeTime(lastEventTs) : "n/a",
      tokensValue: prompt.totalTokens ?? -1,
      tokens: prompt.totalTokens != null ? formatCompactTokens(prompt.totalTokens) : "n/a"
    };
  }).sort((a, b) => comparePromptRows(a, b, sort));

  return (
    <AppShell eyebrow="Project Drill-down" title={project.name} section="project" repoCount={repoCount}>
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{project.repoPath}</p>
            <div className="flex flex-wrap gap-2">
              {project.scannerSources.map((source) => (
                <Badge key={source} variant="outline">
                  {sourceLabel(source)}
                </Badge>
              ))}
            </div>
          </div>
          <Button href="/" variant="outline">
            Back to dashboard
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PlainStatCard label="Known tokens" value={formatCompactTokens(tokenTotal)} meta="codex" />
        <PlainStatCard label="Prompt sessions" value={String(project.prompts.length)} meta="all" />
        <PlainStatCard label="Latest prompt" value={latestPrompt ? formatAbsoluteDate(latestPrompt.startedAt) : "n/a"} meta="activity" />
        <PlainStatCard label="Best source" value={bestSource} meta="rich" />
      </section>

      <section className="grid gap-6">
        <Card className="border-border bg-white shadow-none">
          <CardHeader className="pb-4">
            <CardTitle>Token consumption</CardTitle>
            <CardDescription>Known input and output tokens across this project&apos;s recovered prompt sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            {tokenChartData.some((point) => point.inputTokens > 0 || point.outputTokens > 0) ? (
              <TokenBarChart data={tokenChartData} className="h-[200px]" />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Token totals are not available for the recovered sessions in this project.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-none">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Prompt sessions</CardTitle>
              <CardDescription>Recovered sessions from local logs and IDE history for this repository.</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <SortButton slug={project.slug} currentSort={sort} family="date" targetSort={nextSort(sort, "date")} label={sortLabel(sort, "date")} />
              <SortButton slug={project.slug} currentSort={sort} family="tokens" targetSort={nextSort(sort, "tokens")} label={sortLabel(sort, "tokens")} />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="w-[150px]">Source</TableHead>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="w-[120px]">Last edit</TableHead>
                    <TableHead className="w-[120px]">Tokens consumed</TableHead>
                    <TableHead className="w-[120px] text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promptRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[34rem]">
                        <p className="line-clamp-2 text-sm font-medium text-foreground">{row.title}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.source}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.started}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.lastEdit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.tokens}</TableCell>
                      <TableCell className="text-right">
                        <Button href={`/project/${project.slug}/prompt/${row.id}`} variant="outline" size="sm">
                          Open
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function SortButton({
  slug,
  currentSort,
  family,
  targetSort,
  label
}: {
  slug: string;
  currentSort: PromptSortKey;
  family: "date" | "tokens";
  targetSort: PromptSortKey;
  label: string;
}) {
  const active = currentSort.startsWith(family);

  return (
    <Button
      href={`/project/${slug}?sort=${targetSort}`}
      variant={active ? "default" : "outline"}
      size="sm"
    >
      {label}
    </Button>
  );
}

function PlainStatCard({ label, value, meta }: { label: string; value: string; meta: string }) {
  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="gap-1 pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{meta}</p>
      </CardContent>
    </Card>
  );
}

function formatAbsoluteDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatPromptChartDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function buildDailyTokenChart(
  prompts: Array<{ startedAt: string; inputTokens: number | null; outputTokens: number | null }>
) {
  const bucket = new Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number }>();

  prompts.forEach((prompt) => {
    const dateKey = prompt.startedAt.slice(0, 10);
    const current = bucket.get(dateKey) ?? {
      date: formatPromptChartDate(prompt.startedAt),
      isoDate: dateKey,
      inputTokens: 0,
      outputTokens: 0
    };

    current.inputTokens += prompt.inputTokens ?? 0;
    current.outputTokens += prompt.outputTokens ?? 0;
    bucket.set(dateKey, current);
  });

  return fillDailyChartGaps(bucket);
}

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return value.toString();
}

function shortSource(source: string) {
  return source === "Codex" ? "Codex" : "Cursor";
}

function sourceLabel(source: string) {
  if (source.toLowerCase().includes("codex")) return "Codex sessions";
  if (source.toLowerCase().includes("cursor")) return "Cursor metadata";
  return "Git correlation";
}

function normalizePromptSort(value?: string): PromptSortKey {
  if (value === "date-asc" || value === "tokens-desc" || value === "tokens-asc") {
    return value;
  }

  return "date-desc";
}

function comparePromptRows(
  a: { startedAt: string; tokensValue: number },
  b: { startedAt: string; tokensValue: number },
  sort: PromptSortKey
) {
  if (sort === "date-asc") {
    return a.startedAt.localeCompare(b.startedAt);
  }

  if (sort === "tokens-desc") {
    return b.tokensValue - a.tokensValue || b.startedAt.localeCompare(a.startedAt);
  }

  if (sort === "tokens-asc") {
    return a.tokensValue - b.tokensValue || b.startedAt.localeCompare(a.startedAt);
  }

  return b.startedAt.localeCompare(a.startedAt);
}

function nextSort(currentSort: PromptSortKey, family: "date" | "tokens"): PromptSortKey {
  if (family === "date") {
    return currentSort === "date-desc" ? "date-asc" : "date-desc";
  }

  return currentSort === "tokens-desc" ? "tokens-asc" : "tokens-desc";
}

function sortLabel(currentSort: PromptSortKey, family: "date" | "tokens") {
  const active = currentSort.startsWith(family);
  const direction = active ? activeSortDirection(currentSort) : "desc";
  const title = family === "date" ? "Date" : "Tokens";
  return `${title} ${direction === "asc" ? "↑" : "↓"}`;
}

function activeSortDirection(sort: PromptSortKey) {
  return sort.endsWith("asc") ? "asc" : "desc";
}

function fillDailyChartGaps(bucket: Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number }>) {
  const keys = Array.from(bucket.keys()).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) {
    return [];
  }

  const days: Array<{ date: string; isoDate: string; inputTokens: number; outputTokens: number }> = [];
  let current = new Date(`${keys[0]}T00:00:00Z`);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`);

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    days.push(
      bucket.get(isoDate) ?? {
        date: formatPromptChartDate(isoDate),
        isoDate,
        inputTokens: 0,
        outputTokens: 0
      }
    );
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}
