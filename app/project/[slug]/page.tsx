import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, FolderSearch2, GitBranch, GitCommitHorizontal, MessagesSquare, Sparkles, Waypoints } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getProject } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    notFound();
  }

  const tokenTotal = project.prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
  const unknownPromptCount = project.prompts.filter((prompt) => prompt.totalTokens == null).length;
  const hasCodexSource = project.scannerSources.some((source) => source.toLowerCase().includes("codex"));

  return (
    <AppShell eyebrow="Project Drill-down" title={project.name}>
      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Card className="overflow-hidden border-border/70 bg-white/90">
          <CardHeader className="gap-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Link className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground" href="/">
                  <ArrowLeft className="h-4 w-4" />
                  Back to dashboard
                </Link>
                {project.scannerSources.map((source) => (
                  <Badge key={source} variant="outline">
                    {source}
                  </Badge>
                ))}
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                <FolderSearch2 className="h-3.5 w-3.5" />
                retrospective scan
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <CardTitle className="text-2xl">Repository usage profile</CardTitle>
                <CardDescription className="mt-2 max-w-2xl">
                  Tokens, prompt sessions, and Git activity reconstructed from the local traces available for this repository.
                </CardDescription>
              </div>
              <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Repository path</p>
                <p className="mt-2 break-all text-sm font-medium text-foreground">{project.repoPath}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <StatCard label="Known tokens" value={tokenTotal.toLocaleString()} hint="Totals from sources that expose token accounting directly." />
            <StatCard label="Prompt history only" value={String(unknownPromptCount)} hint="Sessions found without token totals, mostly from Cursor metadata." />
            <StatCard
              label="Prompt to commit links"
              value={String(project.commits.filter((commit) => commit.linkedPromptIds.length > 0).length)}
              hint="Commits that could be correlated back to at least one nearby prompt."
            />
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/85">
          <CardHeader>
            <CardTitle className="text-lg">Project signal</CardTitle>
            <CardDescription>What stands out in this repo right now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SignalRow icon={MessagesSquare} label="Prompt coverage" value={`${project.prompts.length} reconstructed sessions`} />
            <SignalRow icon={GitCommitHorizontal} label="Commit activity" value={`${project.commits.length} correlated Git events`} />
            <SignalRow icon={Waypoints} label="Best source" value={hasCodexSource ? "Codex detailed timeline" : "Prompt metadata only"} />
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              {hasCodexSource
                ? "Open a Codex-backed prompt to inspect the full event stream, including tool calls and token checkpoints."
                : "This project currently reads more like an audit log than a full transcript because its richest source is prompt metadata, not event-level traces."}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="border-border/70 bg-white/90">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Prompt sessions</CardTitle>
                <CardDescription>Every reconstructed session remains drillable at the prompt level.</CardDescription>
              </div>
              <Badge variant="secondary">session table</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Linked commit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.prompts.map((prompt) => (
                  <TableRow key={prompt.id} className="bg-white/55">
                    <TableCell className="w-[44%]">
                      <Link className="block space-y-1" href={`/project/${project.slug}/prompt/${prompt.id}`}>
                        <div className="font-medium">{prompt.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(prompt.startedAt)} via {prompt.source}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {prompt.totalTokens != null ? prompt.totalTokens.toLocaleString() : "Unavailable"}
                      </div>
                      {prompt.totalTokens != null ? (
                        <div className="text-xs text-muted-foreground">
                          {(prompt.inputTokens ?? 0).toLocaleString()} in / {(prompt.outputTokens ?? 0).toLocaleString()} out
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Token totals unavailable from this source</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{prompt.model}</div>
                      <div className="text-xs text-muted-foreground">{prompt.source}</div>
                    </TableCell>
                    <TableCell>
                      {prompt.linkedCommitId ? (
                        <Link className="inline-flex items-center gap-1 text-sm font-medium text-primary" href={`/project/${project.slug}/commit/${prompt.linkedCommitId}`}>
                          {prompt.linkedCommitId}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unlinked</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-white/85">
            <CardHeader>
              <CardTitle>Commit correlation</CardTitle>
              <CardDescription>Git events turn prompt spend into concrete engineering work.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {project.commits.map((commit) => (
                <Link
                  key={commit.id}
                  href={`/project/${project.slug}/commit/${commit.id}`}
                  className="block rounded-2xl border border-border/80 bg-muted/35 p-4 transition hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="font-medium">{commit.message}</div>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <GitCommitHorizontal className="h-3.5 w-3.5" />
                          {commit.id}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="h-3.5 w-3.5" />
                          {commit.branch}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary">{commit.linkedPromptIds.length} prompts</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(commit.committedAt)}</span>
                    <span>{commit.filesChanged} files</span>
                    <span>+{commit.insertions} / -{commit.deletions}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-slate-950 text-slate-50">
            <CardHeader>
              <CardTitle className="text-lg text-slate-50">Reading guide</CardTitle>
              <CardDescription className="text-slate-300">
                Follow the same path as the reference dashboards: project first, then a single deep artifact.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <GuideStep icon={Sparkles} text="Start with the largest token session to find the expensive investigation or implementation burst." />
              <GuideStep icon={MessagesSquare} text="Open the prompt detail page to inspect the actual conversation and tool activity." />
              <GuideStep icon={GitCommitHorizontal} text="Compare the nearby commit to see whether the spend translated into real code changes." />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <InsightCard
          icon={MessagesSquare}
          title="Prompt-level visibility"
          text="Every prompt keeps source, time, summary, and token totals when the local source actually exposes them."
        />
        <InsightCard
          icon={GitCommitHorizontal}
          title="Commit-level accountability"
          text="Each commit page rolls up the prompts that fed into it, so cost maps cleanly to shipped code."
        />
        <InsightCard
          icon={GitBranch}
          title="Project-centric view"
          text="The dashboard stays anchored on repositories first, so spend naturally follows the codebase instead of the tool."
        />
      </section>
    </AppShell>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  text
}: {
  icon: typeof MessagesSquare;
  title: string;
  text: string;
}) {
  return (
    <Card className="border-border/70 bg-white/85">
      <CardHeader>
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{text}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SignalRow({
  icon: Icon,
  label,
  value
}: {
  icon: typeof MessagesSquare;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/85 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function GuideStep({
  icon: Icon,
  text
}: {
  icon: typeof Sparkles;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4 text-slate-100" />
      </div>
      <p className="text-sm leading-6 text-slate-200">{text}</p>
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
