import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { ProjectPromptSort } from "@/components/project-prompt-sort";
import { ProjectTokenPanel } from "@/components/project-token-panel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsd } from "@/lib/pricing";
import { getProject, getProjects, getPromptDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

type PromptSortKey = "date-desc" | "date-asc" | "tokens-desc" | "tokens-asc" | "price-desc" | "price-asc";

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
  const totalInputTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.inputTokens ?? 0), 0);
  const totalCachedInputTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.cachedInputTokens ?? 0), 0);
  const totalOutputTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.outputTokens ?? 0), 0);
  const tokenChartData = buildDailyTokenChart(project.prompts);
  const totalSpend = project.prompts.reduce((sum, prompt) => sum + (prompt.costUsd ?? 0), 0);
  const promptRows = project.prompts.map((prompt) => {
    const detail = getPromptDetail(project.slug, prompt.id);
    const lastEventTs = detail?.codexDetail?.events.at(-1)?.timestamp;
    const firstPromptMessage = detail?.codexDetail ? getFirstActualPromptTitle(detail.codexDetail.events) : null;

    return {
      id: prompt.id,
      title: firstPromptMessage ?? prompt.title,
      startedAt: prompt.startedAt,
      started: formatAbsoluteDate(prompt.startedAt),
      lastEdit: lastEventTs ? formatRelativeTime(lastEventTs) : "n/a",
      priceValue: prompt.costUsd ?? -1,
      price: formatUsd(prompt.costUsd),
      inputTokens: prompt.inputTokens,
      cachedInputTokens: prompt.cachedInputTokens,
      outputTokens: prompt.outputTokens,
      tokensValue: prompt.totalTokens ?? -1,
      tokens: prompt.totalTokens != null ? formatCompactTokens(prompt.totalTokens) : "n/a"
    };
  }).sort((a, b) => comparePromptRows(a, b, sort));

  return (
    <AppShell
      title={project.name}
      subtitle={project.repoPath}
      section="project"
      repoCount={repoCount}
      breadcrumbs={
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link className="transition hover:text-foreground" href="/">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground">{project.name}</span>
        </nav>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <PlainStatCard label="Cost" value={formatUsd(totalSpend)} />
        <PlainStatCard
          label="Known tokens"
          value={
            <TokenSummaryValue
              totalTokens={tokenTotal}
              inputTokens={totalInputTokens}
              cachedInputTokens={totalCachedInputTokens}
              outputTokens={totalOutputTokens}
            />
          }
        />
        <PlainStatCard label="Threads" value={String(project.prompts.length)} />
      </section>

      <section className="grid gap-6">
        {tokenChartData.some((point) => point.inputTokens > 0 || point.outputTokens > 0) ? <ProjectTokenPanel data={tokenChartData} /> : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Token totals are not available for the recovered sessions in this project.
          </div>
        )}

        <Card className="border-border bg-white shadow-none">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Threads</CardTitle>
            </div>
            <ProjectPromptSort initialSort={sort} />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Thread</TableHead>
                    <TableHead className="w-[140px]">Date</TableHead>
                    <TableHead className="w-[120px]">Last edit</TableHead>
                    <TableHead className="w-[120px]">Cost</TableHead>
                    <TableHead className="w-[120px]">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promptRows.map((row) => (
                    <TableRow key={row.id} className="cursor-pointer">
                      <TableCell className="max-w-[34rem]">
                        <Link className="block -m-4 p-4" href={`/project/${project.slug}/prompt/${row.id}`}>
                          <p className="line-clamp-2 text-sm font-medium text-foreground">{row.title}</p>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground"><Link className="block -m-4 p-4" href={`/project/${project.slug}/prompt/${row.id}`}>{row.started}</Link></TableCell>
                      <TableCell className="text-sm text-muted-foreground"><Link className="block -m-4 p-4" href={`/project/${project.slug}/prompt/${row.id}`}>{row.lastEdit}</Link></TableCell>
                      <TableCell className="text-sm text-muted-foreground"><Link className="block -m-4 p-4" href={`/project/${project.slug}/prompt/${row.id}`}>{row.price}</Link></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <Link className="block -m-4 p-4" href={`/project/${project.slug}/prompt/${row.id}`}>
                          <TokenValue
                            total={row.tokens}
                            inputTokens={row.inputTokens}
                            cachedInputTokens={row.cachedInputTokens}
                            outputTokens={row.outputTokens}
                          />
                        </Link>
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

function PlainStatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="gap-1 pb-5">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function TokenSummaryValue({
  totalTokens,
  inputTokens,
  cachedInputTokens,
  outputTokens
}: {
  totalTokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}) {
  return (
    <span className="group relative inline-flex">
      <span className="border-b border-dashed border-slate-400/80 leading-none">{formatCompactTokens(totalTokens)}</span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden min-w-[220px] rounded-lg border border-border bg-white p-3 text-left text-sm font-medium text-foreground shadow-xl group-hover:block">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Token breakdown</span>
        <span className="mt-2 block text-sm text-foreground">{formatCompactTokens(inputTokens)} input</span>
        <span className="mt-1 block text-sm text-foreground">{formatCompactTokens(cachedInputTokens)} cached</span>
        <span className="mt-1 block text-sm text-foreground">{formatCompactTokens(outputTokens)} output</span>
      </span>
    </span>
  );
}

function TokenValue({
  total,
  inputTokens,
  cachedInputTokens,
  outputTokens
}: {
  total: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}) {
  return (
    <span className="group relative inline-flex">
      <span className="border-b border-dashed border-slate-400/80 leading-none">{total}</span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden min-w-[220px] rounded-lg border border-border bg-white p-3 text-left text-sm font-medium text-foreground shadow-xl group-hover:block">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Token breakdown</span>
        <span className="mt-2 block text-sm text-foreground">{renderTokenNumber(inputTokens)} input</span>
        <span className="mt-1 block text-sm text-foreground">{renderTokenNumber(cachedInputTokens)} cached</span>
        <span className="mt-1 block text-sm text-foreground">{renderTokenNumber(outputTokens)} output</span>
      </span>
    </span>
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
  prompts: Array<{ startedAt: string; inputTokens: number | null; outputTokens: number | null; costUsd: number | null }>
) {
  const bucket = new Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }>();

  prompts.forEach((prompt) => {
    const dateKey = prompt.startedAt.slice(0, 10);
    const current = bucket.get(dateKey) ?? {
      date: formatPromptChartDate(prompt.startedAt),
      isoDate: dateKey,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0
    };

    current.inputTokens += prompt.inputTokens ?? 0;
    current.outputTokens += prompt.outputTokens ?? 0;
    current.costUsd += prompt.costUsd ?? 0;
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

function renderTokenNumber(value: number | null) {
  return value == null ? "n/a" : formatCompactTokens(value);
}

function normalizePromptSort(value?: string): PromptSortKey {
  if (value === "date-asc" || value === "tokens-desc" || value === "tokens-asc" || value === "price-desc" || value === "price-asc") {
    return value;
  }

  return "date-desc";
}

function comparePromptRows(
  a: { startedAt: string; tokensValue: number; priceValue: number },
  b: { startedAt: string; tokensValue: number; priceValue: number },
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

  if (sort === "price-desc") {
    return b.priceValue - a.priceValue || b.startedAt.localeCompare(a.startedAt);
  }

  if (sort === "price-asc") {
    return a.priceValue - b.priceValue || b.startedAt.localeCompare(a.startedAt);
  }

  return b.startedAt.localeCompare(a.startedAt);
}

function fillDailyChartGaps(bucket: Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }>) {
  const keys = Array.from(bucket.keys()).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) {
    return [];
  }

  const days: Array<{ date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }> = [];
  let current = new Date(`${keys[0]}T00:00:00Z`);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`);

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    days.push(
      bucket.get(isoDate) ?? {
        date: formatPromptChartDate(isoDate),
        isoDate,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0
      }
    );
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function getFirstActualPromptTitle(events: Array<{ kind: string; role?: string; text?: string }>) {
  const match = events.find((event) => event.kind === "message" && event.role === "user" && typeof event.text === "string" && !isBootstrapPrompt(event.text));
  return match?.text ? truncatePromptTitle(match.text) : null;
}

function isBootstrapPrompt(text: string) {
  const normalized = text.trim();
  return normalized.startsWith("# AGENTS.md instructions") || normalized.startsWith("<environment_context>") || normalized.includes("\n<environment_context>");
}

function truncatePromptTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 100 ? `${normalized.slice(0, 100)}...` : normalized;
}
