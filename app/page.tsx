import { ArrowRight, ChevronRight, Database, FolderSearch2, GitCommitHorizontal, Sparkles, TrendingUp } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { OverviewChart } from "@/components/overview-chart";
import { ProjectSummaryTable } from "@/components/project-summary-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <AppShell eyebrow="Retrospective Usage" title="AI spend by project, prompt, and commit" section="dashboard" repoCount={projects.length}>
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <Card className="overflow-hidden border-primary/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),rgba(14,165,233,0.03))]">
          <CardHeader className="pb-3">
            <CardDescription className="text-primary">Command center</CardDescription>
            <CardTitle className="max-w-xl text-3xl leading-tight">
              Track which repositories are burning tokens, which prompts caused it, and what actually shipped afterward.
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 sm:grid-cols-3">
              <HeroStat label="Known tokens" value={totals.tokens.toLocaleString()} />
              <HeroStat label="Prompt sessions" value={String(totals.prompts)} />
              <HeroStat label="Linked commits" value={String(totals.commits)} />
            </div>
            <Button href={projects[0] ? `/project/${projects[0].slug}` : "/"} className="rounded-full">
              Open live drill-down
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <MetricCard label="Known tokens" value={totals.tokens.toLocaleString()} hint="Codex totals include cached context when the local logs report it" />
        <MetricCard label="Prompt sessions" value={String(totals.prompts)} hint="Recovered from Codex and Cursor local storage" />
        <MetricCard label="Unpriced sessions" value={String(totals.unknownPrompts)} hint="Prompt history found, but token totals were not exposed" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.7fr_0.95fr]">
        <Card>
          <CardHeader>
                <CardTitle>Token burn over time</CardTitle>
                <CardDescription>Known input and output tokens reconstructed from live local session logs, including cached context where reported.</CardDescription>
                <CardAction>
                  <Badge variant="outline">shadcn chart</Badge>
                </CardAction>
          </CardHeader>
          <CardContent>
            <OverviewChart data={timeline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scanning pipeline</CardTitle>
            <CardDescription>Compact model of how local machine traces turn into a project intelligence view.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SourceLine icon={Database} title="IDE workspace DBs" text="Cursor workspaceStorage currently yields prompt history here; Codex session logs carry the detailed token accounting." />
            <SourceLine icon={FolderSearch2} title="Hidden agent folders" text="JSON or markdown logs from .cline, .claude, and .aider history files." />
            <SourceLine icon={GitCommitHorizontal} title="Git correlation" text="Commits linked to nearby prompt sessions so spend is grounded in actual work shipped." />
            <div className="rounded-2xl border border-border/70 bg-muted/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" />
                Highest observed activity
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {summary[0]?.name ?? "No data"} is currently the most active repository in the reconstructed dataset.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Start at the project level, then drill into prompts or commits.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProjectSummaryTable rows={summary} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current data quality</CardTitle>
            <CardDescription>Some sources are richer than others. The UI keeps that visible instead of smoothing it over.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-background p-4">
              <p className="text-sm font-medium">Connected sources on this machine</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(new Set(projects.flatMap((project) => project.scannerSources))).map((source) => (
                  <Badge key={source} variant="secondary">
                    {source}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-border bg-muted/25 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-accent" />
                <p className="text-sm text-muted-foreground">
                  Cursor currently contributes real prompt history here, but its local workspace DB does not expose token totals in the same way Codex session logs do.
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Suggested next move</p>
              <p className="mt-2 text-sm text-foreground">
                Start with the most active repo, inspect a Codex-backed prompt timeline, then compare it to the correlated commit stream.
              </p>
            </div>
            <Button href={projects[0] ? `/project/${projects[0].slug}` : "/"} className="w-full justify-between rounded-full">
              Open top active repository
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="bg-white/85">
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function SourceLine({
  icon: Icon,
  title,
  text
}: {
  icon: typeof Database;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background p-4">
      <div className="rounded-xl bg-muted p-2">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}
