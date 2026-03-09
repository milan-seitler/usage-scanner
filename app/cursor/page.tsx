import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatUsd } from "@/lib/pricing";
import { getCursorStatsData } from "@/lib/cursor-stats";

export const dynamic = "force-dynamic";

export default async function CursorStatsPage() {
  const data = await getCursorStatsData();

  return (
    <AppShell
      title="Cursor Stats"
      subtitle="Team-level usage and billing view from the Cursor Admin API. This section is isolated from the local repo scanner."
      section="cursor"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cost" value={formatUsd(data.totals.totalCostUsd)} />
        <MetricCard label="Requests" value={formatInteger(data.totals.totalRequests)} />
        <MetricCard label="Active users" value={formatInteger(data.totals.activeUsers)} />
        <MetricCard label="Token-based calls" value={formatInteger(data.totals.tokenBasedCalls)} />
      </section>

      {data.error ? (
        <section>
          <Card className="border-border bg-card shadow-none">
            <CardHeader>
              <CardTitle>{data.configured ? "Cursor API unavailable" : "Cursor API not configured"}</CardTitle>
              <CardDescription>
                {data.error}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Expected env vars: <code>CURSOR_ADMIN_API_KEY</code>, optional <code>CURSOR_TEAM_ID</code>, optional <code>CURSOR_STATS_LOOKBACK_DAYS</code>.</p>
              <p>This page is safe to ship without a key. It will stay in a read-only empty state until the env is configured on the host.</p>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Top spenders across the last {data.lookbackDays} days.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="w-[120px]">Cost</TableHead>
                    <TableHead className="w-[120px]">Requests</TableHead>
                    <TableHead className="w-[120px]">Models</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.slice(0, 12).map((row) => (
                    <TableRow key={row.userEmail}>
                      <TableCell className="font-medium text-foreground">{row.userEmail}</TableCell>
                      <TableCell>{formatUsd(row.costUsd)}</TableCell>
                      <TableCell>{formatInteger(row.requests)}</TableCell>
                      <TableCell>{formatInteger(row.models)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState text="No Cursor Admin API usage events were loaded for this window." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Models</CardTitle>
            <CardDescription>Spend and request volume by Cursor model.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.models.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="w-[100px]">Cost</TableHead>
                    <TableHead className="w-[100px]">Reqs</TableHead>
                    <TableHead className="w-[90px]">Users</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.models.slice(0, 10).map((row) => (
                    <TableRow key={row.model}>
                      <TableCell className="font-medium text-foreground">{row.model}</TableCell>
                      <TableCell>{formatUsd(row.costUsd)}</TableCell>
                      <TableCell>{formatInteger(row.requests)}</TableCell>
                      <TableCell>{formatInteger(row.users)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState text="Model breakdown will appear once Cursor Admin API data is available." />
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Daily usage</CardTitle>
            <CardDescription>Cost and request volume for the current lookback window.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.daily.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[120px]">Cost</TableHead>
                    <TableHead className="w-[120px]">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...data.daily].reverse().slice(0, 14).map((row) => (
                    <TableRow key={row.isoDate}>
                      <TableCell className="font-medium text-foreground">{row.date}</TableCell>
                      <TableCell>{formatUsd(row.costUsd)}</TableCell>
                      <TableCell>{formatInteger(row.requests)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState text="Daily usage will appear here after the first successful Cursor Admin API fetch." />
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none">
          <CardHeader>
            <CardTitle>Recent events</CardTitle>
            <CardDescription>
              Raw usage events are intentionally lightweight here: time, user, model, kind, cost and token hints when present.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {data.events.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Kind</TableHead>
                    <TableHead className="w-[90px]">Cost</TableHead>
                    <TableHead className="w-[110px]">Tokens</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.slice(0, 20).map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(event.timestamp)}</TableCell>
                      <TableCell className="max-w-[16rem] truncate font-medium text-foreground">{event.userEmail}</TableCell>
                      <TableCell>{event.model}</TableCell>
                      <TableCell className="text-muted-foreground">{event.kind}</TableCell>
                      <TableCell>{formatUsd(event.requestCostUsd)}</TableCell>
                      <TableCell>{event.totalTokens != null ? formatInteger(event.totalTokens) : "n/a"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState text="Recent Cursor events will show up here once the API is configured." />
            )}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="gap-1 pb-5">
        <CardDescription className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">{text}</div>;
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
