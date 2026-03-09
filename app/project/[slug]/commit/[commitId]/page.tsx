import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Files, GitBranch, GitCommitHorizontal, MessagesSquare } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCommitDetail, getProjects } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CommitDetailPage({
  params
}: {
  params: Promise<{ slug: string; commitId: string }>;
}) {
  const { slug, commitId } = await params;
  const detail = getCommitDetail(slug, commitId);
  const repoCount = getProjects().length;

  if (!detail) {
    notFound();
  }

  const { project, commit, prompts } = detail;
  const tokenTotal = prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
  const unknownPromptCount = prompts.filter((prompt) => prompt.totalTokens == null).length;

  return (
    <AppShell eyebrow="Commit Detail" title={commit.message} section="project" repoCount={repoCount}>
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-border/70 bg-white/90">
          <CardHeader className="gap-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground"
                href={`/project/${project.slug}`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back to project
              </Link>
              <div className="text-sm text-muted-foreground">{formatDate(commit.committedAt)}</div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <CardTitle className="text-2xl">Commit overview</CardTitle>
                <CardDescription className="mt-2 max-w-2xl">
                  Use the commit as the shipping anchor, then inspect which prompt sessions fed into it.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Diff footprint</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {commit.filesChanged} files, +{commit.insertions} / -{commit.deletions}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <SummaryStrip icon={GitCommitHorizontal} label="Commit" value={commit.id} />
            <SummaryStrip icon={GitBranch} label="Branch" value={commit.branch} />
            <SummaryStrip icon={MessagesSquare} label="Linked prompts" value={String(prompts.length)} />
            <SummaryStrip icon={Files} label="Files changed" value={String(commit.filesChanged)} />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="text-lg">Commit signal</CardTitle>
            <CardDescription>How much assistant activity fed this change.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricLine label="Known tokens linked">{tokenTotal.toLocaleString()}</MetricLine>
            <MetricLine label="Prompts without tokens">{String(unknownPromptCount)}</MetricLine>
            <MetricLine label="Author">{commit.author}</MetricLine>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader>
            <CardTitle>Commit footprint</CardTitle>
            <CardDescription>What shipped, when it shipped, and how much AI spend fed into it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetricLine label="Committed">{formatDate(commit.committedAt)}</MetricLine>
            <MetricLine label="Author">{commit.author}</MetricLine>
            <MetricLine label="Diff size">{`+${commit.insertions} / -${commit.deletions}`}</MetricLine>
            <MetricLine label="Known tokens linked">{tokenTotal.toLocaleString()}</MetricLine>
            <MetricLine label="Prompts without tokens">{String(unknownPromptCount)}</MetricLine>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle>Prompt sessions feeding this commit</CardTitle>
            <CardDescription>One commit can aggregate several AI-assisted work sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cached input</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="bg-white/55">
                    <TableCell>
                      <Link className="block space-y-1" href={`/project/${project.slug}/prompt/${prompt.id}`}>
                        <div className="font-medium">{prompt.title}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(prompt.startedAt)}</div>
                      </Link>
                    </TableCell>
                    <TableCell>{prompt.totalTokens != null ? prompt.totalTokens.toLocaleString() : "Unavailable"}</TableCell>
                    <TableCell>{prompt.cachedInputTokens != null ? prompt.cachedInputTokens.toLocaleString() : "n/a"}</TableCell>
                    <TableCell>{prompt.source}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function SummaryStrip({
  icon: Icon,
  label,
  value
}: {
  icon: typeof GitCommitHorizontal;
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

function MetricLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/45 p-4">
      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{children}</div>
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
