import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProject, getProjects, getPromptDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  const repoCount = getProjects().length;

  if (!project) {
    notFound();
  }

  const tokenTotal = project.prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
  const linkedCommits = project.commits.filter((commit) => commit.linkedPromptIds.length > 0).length;
  const bestSource = project.scannerSources.some((source) => source.toLowerCase().includes("codex")) ? "Codex" : "Cursor";
  const promptRows = project.prompts.slice(0, 3).map((prompt) => {
    const detail = getPromptDetail(project.slug, prompt.id);
    const lastEventTs = detail?.codexDetail?.events.at(-1)?.timestamp;

    return {
      id: prompt.id,
      title: prompt.title,
      source: shortSource(prompt.source),
      started: formatAbsoluteDate(prompt.startedAt),
      lastEdit: lastEventTs ? formatRelativeTime(lastEventTs) : "n/a",
      tokens: prompt.totalTokens != null ? formatCompactTokens(prompt.totalTokens) : "n/a"
    };
  });

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
        <PlainStatCard label="Linked commits" value={String(linkedCommits)} meta="shipped" />
        <PlainStatCard label="Best source" value={bestSource} meta="rich" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <Card className="border-border bg-white shadow-none">
          <CardHeader>
            <CardTitle>Prompt sessions</CardTitle>
            <CardDescription>Recovered sessions from local logs and IDE history for this repository.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prompt</TableHead>
                    <TableHead className="w-[150px]">Source</TableHead>
                    <TableHead className="w-[140px]">Started</TableHead>
                    <TableHead className="w-[120px]">Last edit</TableHead>
                    <TableHead className="w-[120px]">Tokens</TableHead>
                    <TableHead className="w-[120px] text-right">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promptRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium text-foreground">{row.title}</TableCell>
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
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {promptRows.length} prompt sessions</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm">
                    1
                  </Button>
                  <Button variant="outline" size="sm" disabled>
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-none">
          <CardHeader>
            <CardTitle>Commit correlation</CardTitle>
            <CardDescription>Recent commits linked back to the nearby prompt activity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-0 pt-0">
            {project.commits.slice(0, 2).map((commit, index) => (
              <div
                key={commit.id}
                className={index === 0 ? "border-b border-border py-3" : "py-3"}
              >
                <p className="text-sm font-medium text-foreground">{commit.message}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{commit.branch}</span>
                  <span>+{commit.insertions} / -{commit.deletions}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
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
