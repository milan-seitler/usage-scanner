import Link from "next/link";
import { ArrowRight, GitCommitHorizontal, MessagesSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    <Table className="min-w-[960px]">
      <TableHeader>
        <TableRow>
          <TableHead>Project</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Sources</TableHead>
          <TableHead>Activity</TableHead>
          <TableHead className="text-right">Drill down</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.slug} className="bg-white/60">
            <TableCell className="w-[28%]">
              <div className="space-y-2">
                <div className="font-medium">{row.name}</div>
                <div className="text-xs text-muted-foreground">{row.repoPath}</div>
                <div className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  retrospective scan
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium">{row.totalTokens.toLocaleString()} known tokens</div>
                <div className="text-xs text-muted-foreground">
                  {row.inputTokens.toLocaleString()} in / {row.outputTokens.toLocaleString()} out
                  {row.unknownPromptCount > 0 ? `, ${row.unknownPromptCount} prompts without token data` : ""}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex max-w-[240px] flex-wrap gap-2">
                {row.sources.map((source) => (
                  <Badge key={source} variant="secondary">
                    {source}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1">
                  <MessagesSquare className="h-3.5 w-3.5" />
                  {row.promptCount} prompts
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1">
                  <GitCommitHorizontal className="h-3.5 w-3.5" />
                  {row.commitCount} commits
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Link className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-primary shadow-sm" href={`/project/${row.slug}`}>
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
