import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SummaryRow = {
  slug: string;
  name: string;
  repoPath: string;
  promptCount: number;
  commitCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  unknownPromptCount: number;
  sources: string[];
};

export function ProjectSummaryTable({ rows }: { rows: SummaryRow[] }) {
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow>
          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project</TableHead>
          <TableHead className="w-[180px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Source</TableHead>
          <TableHead className="w-[140px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Activity</TableHead>
          <TableHead className="w-[120px] text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Tokens</TableHead>
          <TableHead className="w-[120px] text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Detail</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slug}>
            <TableCell className="font-medium text-foreground">{row.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {compactSourceLabel(row.sources)}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">{row.promptCount} prompts</div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatCompactTokens(row.totalTokens)}</TableCell>
            <TableCell className="text-right">
              <Button href={`/project/${row.slug}`} variant="outline" size="sm" className="gap-2">
                Open
                <ArrowRight className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatCompactTokens(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
}

function compactSourceLabel(sources: string[]) {
  if (sources.includes("Codex sessions") && sources.includes("Cursor workspaceStorage")) return "Codex + Cursor";
  if (sources.includes("Codex sessions")) return "Codex sessions";
  if (sources.includes("Cursor workspaceStorage")) return "Cursor metadata";
  return sources[0] ?? "Unknown";
}
