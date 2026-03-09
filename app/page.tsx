import { DashboardProjectSort } from "@/components/dashboard-project-sort";
import { AppShell } from "@/components/app-shell";
import { ProjectTokenPanel } from "@/components/project-token-panel";
import { ProjectSummaryTable } from "@/components/project-summary-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/pricing";
import { getDailyTimeline, getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

type DashboardSortKey = "tokens-desc" | "tokens-asc" | "price-desc" | "price-asc" | "last-edit-desc" | "last-edit-asc";

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ sort?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const timeline = getDailyTimeline();
  const projects = getProjects();
  const sort = normalizeDashboardSort(resolvedSearchParams?.sort);

  const summary = projects
    .map((project) => {
      const lastPromptAt = project.prompts.at(0)?.startedAt ?? null;
      const lastCommitAt = project.commits.at(0)?.committedAt ?? null;
      const lastEditAt = [lastPromptAt, lastCommitAt].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;

      return {
        slug: project.slug,
        name: project.name,
        sources: [...project.scannerSources],
        lastEditAt,
        lastEdit: lastEditAt ? formatRelativeTime(lastEditAt) : "n/a",
        priceValue: project.prompts.reduce((sum, prompt) => sum + (prompt.costUsd ?? 0), 0),
        price: formatUsd(project.prompts.reduce((sum, prompt) => sum + (prompt.costUsd ?? 0), 0)),
        inputTokens: project.prompts.reduce((sum, prompt) => sum + (prompt.inputTokens ?? 0), 0),
        cachedInputTokens: project.prompts.reduce((sum, prompt) => sum + (prompt.cachedInputTokens ?? 0), 0),
        outputTokens: project.prompts.reduce((sum, prompt) => sum + (prompt.outputTokens ?? 0), 0),
        totalTokens: project.prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0),
      };
    })
    .sort((a, b) => compareDashboardRows(a, b, sort));

  const totals = summary.reduce(
    (acc, project) => {
      acc.tokens += project.totalTokens;
      acc.prompts += 1;
      acc.price += project.priceValue;
      acc.input += project.inputTokens;
      acc.cached += project.cachedInputTokens;
      acc.output += project.outputTokens;
      return acc;
    },
    { tokens: 0, prompts: 0, price: 0, input: 0, cached: 0, output: 0 }
  );
  return (
    <AppShell title="Dashboard" section="dashboard" repoCount={projects.length}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cost" value={formatUsd(totals.price)} />
        <MetricCard
          label="Tokens"
          value={<TokenSummaryValue totalTokens={totals.tokens} inputTokens={totals.input} cachedInputTokens={totals.cached} outputTokens={totals.output} />}
        />
        <MetricCard label="Threads" value={String(projects.reduce((sum, project) => sum + project.prompts.length, 0))} />
        <MetricCard label="Active repos" value={String(projects.length)} />
      </section>

      <section>
        <ProjectTokenPanel data={timeline} title="Usage" />
      </section>

      <section>
        <Card className="border-border bg-white shadow-none">
          <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle>Projects</CardTitle>
            <DashboardProjectSort initialSort={sort} />
          </CardHeader>
          <CardContent className="pt-0">
            <ProjectSummaryTable rows={summary} />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
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

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${Math.round(value / 100) / 10}K`;
  return value.toString();
}

function normalizeDashboardSort(value?: string): DashboardSortKey {
  if (value === "tokens-asc" || value === "price-desc" || value === "price-asc" || value === "last-edit-desc" || value === "last-edit-asc") {
    return value;
  }

  return "tokens-desc";
}

function compareDashboardRows(
  a: { slug: string; totalTokens: number; priceValue: number; lastEditAt: string | null },
  b: { slug: string; totalTokens: number; priceValue: number; lastEditAt: string | null },
  sort: DashboardSortKey
) {
  if (sort === "tokens-asc") return a.totalTokens - b.totalTokens || a.slug.localeCompare(b.slug);
  if (sort === "price-desc") return b.priceValue - a.priceValue || a.slug.localeCompare(b.slug);
  if (sort === "price-asc") return a.priceValue - b.priceValue || a.slug.localeCompare(b.slug);
  if (sort === "last-edit-desc") return String(b.lastEditAt ?? "").localeCompare(String(a.lastEditAt ?? ""));
  if (sort === "last-edit-asc") return String(a.lastEditAt ?? "").localeCompare(String(b.lastEditAt ?? ""));
  return b.totalTokens - a.totalTokens || a.slug.localeCompare(b.slug);
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
