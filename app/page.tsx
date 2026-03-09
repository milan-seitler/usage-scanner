import { AppShell } from "@/components/app-shell";
import { DashboardTokenChart } from "@/components/dashboard-token-chart";
import { ProjectSummaryTable } from "@/components/project-summary-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDailyTimeline, getProjectSummary, getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const summary = getProjectSummary();
  const timeline = getDailyTimeline();
  const projects = getProjects();

  const totals = summary.reduce(
    (acc, project) => {
      acc.tokens += project.totalTokens;
      acc.unknownPrompts += project.unknownPromptCount;
      acc.prompts += project.promptCount;
      acc.commits += project.commitCount;
      return acc;
    },
    { tokens: 0, unknownPrompts: 0, prompts: 0, commits: 0 }
  );
  return (
    <AppShell eyebrow="Retrospective Usage" title="Dashboard" section="dashboard" repoCount={projects.length}>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Known tokens" value={totals.tokens.toLocaleString()} hint="Codex totals where local logs exposed token accounting." />
        <MetricCard label="Prompt sessions" value={String(totals.prompts)} hint="Recovered from Codex and Cursor local session history." />
        <MetricCard label="Linked commits" value={String(totals.commits)} hint="Commits correlated to nearby prompt activity." />
        <MetricCard label="Active repos" value={String(projects.length)} hint="Repositories present in the reconstructed local dataset." />
      </section>

      <section>
        <Card className="border-border bg-white shadow-none">
          <CardHeader className="pb-4">
            <CardTitle>Total visitors</CardTitle>
            <CardDescription>Known input and output tokens over the last 90 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardTokenChart data={timeline} />
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="border-border bg-white shadow-none">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Start at the top level, then drill into prompts or commits.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ProjectSummaryTable rows={summary} />
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="border-border bg-white shadow-none">
      <CardHeader className="gap-1 pb-2">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
