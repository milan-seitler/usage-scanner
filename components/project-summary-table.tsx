import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SummaryRow = {
  slug: string;
  name: string;
  sources: string[];
  lastEdit: string;
  price: string;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number;
};

export function ProjectSummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project</TableHead>
          <TableHead className="w-[220px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tools</TableHead>
          <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Last edit</TableHead>
          <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Cost</TableHead>
          <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tokens</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slug} className="cursor-pointer">
            <TableCell className="font-medium text-foreground">
              <Link className="block -m-4 p-4" href={`/project/${row.slug}`}>{row.name}</Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <Link className="block -m-4 p-4" href={`/project/${row.slug}`}>
                <div className="flex flex-nowrap items-center gap-2 whitespace-nowrap">
                  {getToolBadges(row.sources).map((source) => (
                    <Badge key={source} variant="outline" className="font-normal text-muted-foreground">
                      {source}
                    </Badge>
                  ))}
                </div>
              </Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <Link className="block -m-4 p-4" href={`/project/${row.slug}`}>{row.lastEdit}</Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <Link className="block -m-4 p-4" href={`/project/${row.slug}`}>{row.price}</Link>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              <Link className="block -m-4 p-4" href={`/project/${row.slug}`}>
                <TokenValue totalTokens={row.totalTokens} inputTokens={row.inputTokens} cachedInputTokens={row.cachedInputTokens} outputTokens={row.outputTokens} />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function getToolBadges(sources: string[]) {
  const badges: string[] = [];
  if (sources.some((source) => source.includes("Codex"))) badges.push("Codex");
  if (sources.some((source) => source.includes("Cursor"))) badges.push("Cursor");
  if (sources.some((source) => source.toLowerCase().includes("claude"))) badges.push("CC");
  return badges;
}

function formatCompactTokens(value: number | null | undefined) {
  if (value == null) return "n/a";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function TokenValue({
  totalTokens,
  inputTokens,
  cachedInputTokens,
  outputTokens
}: {
  totalTokens: number;
  inputTokens: number | null;
  cachedInputTokens: number | null;
  outputTokens: number | null;
}) {
  return (
    <span className="group relative inline-flex">
      <span className="border-b border-dashed border-muted-foreground/70 leading-none">{formatCompactTokens(totalTokens)}</span>
      <span className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden min-w-[220px] rounded-lg border border-border bg-card p-3 text-left text-sm font-medium text-foreground shadow-xl group-hover:block">
        <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Token breakdown</span>
        <span className="mt-2 block text-sm text-foreground">{formatCompactTokens(inputTokens)} input</span>
        <span className="mt-1 block text-sm text-foreground">{formatCompactTokens(cachedInputTokens)} cached</span>
        <span className="mt-1 block text-sm text-foreground">{formatCompactTokens(outputTokens)} output</span>
      </span>
    </span>
  );
}
