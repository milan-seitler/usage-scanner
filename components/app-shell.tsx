import Link from "next/link";
import { FolderGit2, LayoutDashboard, Search, ScanSearch, Sparkles, Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";

type AppSection = "dashboard" | "project" | "prompt";

export function AppShell({
  children,
  title,
  eyebrow,
  className,
  section = "dashboard",
  repoCount
}: {
  children: React.ReactNode;
  title: string;
  eyebrow: string;
  className?: string;
  section?: AppSection;
  repoCount?: number;
}) {
  const connectedReposLabel = typeof repoCount === "number" ? String(repoCount) : "Live";

  return (
    <main className={cn("min-h-screen", className)}>
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 md:px-6 lg:px-8">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[1.5rem] border border-border/70 bg-white/80 p-4 shadow-sm backdrop-blur xl:flex xl:flex-col">
          <div className="flex items-center gap-3 rounded-2xl px-3 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Repo Scanner</p>
              <p className="text-xs text-muted-foreground">Local AI activity intelligence</p>
            </div>
          </div>

          <div className="mt-6 space-y-1">
            <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={section === "dashboard"} />
            <NavGhost icon={Waypoints} label="Project Drilldowns" active={section === "project"} />
            <NavGhost icon={Sparkles} label="Prompt Timelines" active={section === "prompt"} />
          </div>

          <div className="mt-8 rounded-2xl border border-border/70 bg-muted/40 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">Live sources</p>
            <div className="mt-4 space-y-3 text-sm">
              <SourceChip label="Codex sessions" />
              <SourceChip label="Cursor workspaceStorage" />
              <SourceChip label="Git history" />
            </div>
          </div>

          <div className="mt-auto rounded-2xl bg-slate-950 px-4 py-4 text-slate-50">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-300">
              <FolderGit2 className="h-3.5 w-3.5" />
              Connected repos
            </div>
            <p className="mt-3 text-3xl font-semibold leading-none">{connectedReposLabel}</p>
            <p className="mt-2 text-sm text-slate-300">
              {typeof repoCount === "number"
                ? "Repositories with reconstructed prompt or commit activity."
                : "Repositories under active retrospective scanning."}
            </p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <header className="rounded-[1.5rem] border border-border/70 bg-white/80 px-5 py-5 shadow-sm backdrop-blur md:px-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-primary">
                    <ScanSearch className="h-3.5 w-3.5" />
                    {eyebrow}
                  </div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                      Retrospective AI usage from local IDE databases, hidden agent logs, and Git history.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                    <Search className="h-4 w-4" />
                    Search projects, prompts, commits
                  </div>
                  <Link className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90" href="/">
                    Overview
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <MiniPanel label="Primary source" value="Codex" hint="Full transcript + tool stream + token events" />
                <MiniPanel label="Secondary source" value="Cursor" hint="Prompt history when token totals are missing" />
                <MiniPanel label="Correlation layer" value="Git" hint="Links spend to commits, branches, and change volume" />
              </div>
            </div>
          </header>

          {children}
        </div>
      </div>
    </main>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      href={href}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function NavGhost({
  icon: Icon,
  label,
  active
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        active ? "bg-muted/70 text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function SourceChip({ label }: { label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm">
      <span className="h-2 w-2 rounded-full bg-accent" />
      {label}
    </div>
  );
}

function MiniPanel({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/90 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
