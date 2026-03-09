import Link from "next/link";
import { LayoutDashboard, ScanSearch } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppSection = "dashboard" | "project" | "prompt";

export function AppShell({
  children,
  title,
  eyebrow,
  breadcrumbs,
  subtitle,
  className,
  section = "dashboard",
  repoCount
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  breadcrumbs?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
  section?: AppSection;
  repoCount?: number;
}) {
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
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-6 md:px-8">
            <header className="border-b border-border pb-5">
              <div className="space-y-3">
                {breadcrumbs ? <div>{breadcrumbs}</div> : null}
                {eyebrow ? (
                  <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted-foreground">
                    <ScanSearch className="h-3.5 w-3.5" />
                    {eyebrow}
                  </div>
                ) : null}
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
                  {subtitle ? <div className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">{subtitle}</div> : null}
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
