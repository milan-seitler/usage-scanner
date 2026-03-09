import Link from "next/link";
import { LayoutDashboard, ScanSearch, Sparkles, Waypoints } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
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
    <main className={cn("min-h-screen bg-white text-foreground", className)}>
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-white xl:flex xl:flex-col">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div>
                <p className="text-sm font-semibold">Repo Scanner</p>
                <p className="text-xs text-muted-foreground">Local AI activity overview</p>
              </div>
            </div>
          </div>

          <div className="space-y-1 px-3 py-4">
            <NavItem href="/" icon={LayoutDashboard} label="Dashboard" active={section === "dashboard"} />
            <NavGhost icon={Waypoints} label="Project Drilldowns" active={section === "project"} />
            <NavGhost icon={Sparkles} label="Prompt Timelines" active={section === "prompt"} />
          </div>

          <div className="px-5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Live sources</p>
            <div className="mt-3 space-y-2 text-sm">
              <SourceChip label="Codex sessions" />
              <SourceChip label="Cursor workspaceStorage" />
              <SourceChip label="Git history" />
            </div>
          </div>

          <div className="mt-auto border-t border-border px-5 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Connected repos</p>
            <p className="mt-2 text-2xl font-semibold leading-none">{connectedReposLabel}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {typeof repoCount === "number" ? "Repositories with reconstructed activity." : "Repositories under active retrospective scanning."}
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-6 md:px-8">
            <header className="border-b border-border pb-5">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    <ScanSearch className="h-3.5 w-3.5" />
                    {eyebrow}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
                    Track AI activity across repositories, prompts, and correlated commits.
                  </p>
                </div>
              </div>
            </header>

            {children}
          </div>
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
        buttonVariants({ variant: "ghost", size: "sm" }),
        "w-full justify-start gap-3 px-3 text-sm font-medium",
        active ? "bg-accent text-foreground hover:bg-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        buttonVariants({ variant: "ghost", size: "sm" }),
        "w-full justify-start gap-3 px-3 text-sm font-medium",
        active ? "bg-muted/70 text-foreground hover:bg-muted/70" : "text-muted-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </div>
  );
}

function SourceChip({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="justify-start gap-2 rounded-md px-3 py-2 text-sm font-normal">
      <span className="h-2 w-2 rounded-full bg-accent" />
      {label}
    </Badge>
  );
}
