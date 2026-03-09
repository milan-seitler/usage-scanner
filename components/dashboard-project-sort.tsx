"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type DashboardSortKey = "tokens-desc" | "tokens-asc" | "price-desc" | "price-asc" | "last-edit-desc" | "last-edit-asc";

export function DashboardProjectSort({ initialSort }: { initialSort: DashboardSortKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="relative">
      <select
        aria-label="Sort projects"
        className="h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-11 text-sm text-foreground shadow-sm outline-none"
        defaultValue={initialSort}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          router.push(`?${params.toString()}`);
        }}
      >
        <option value="tokens-desc">Most tokens</option>
        <option value="tokens-asc">Fewest tokens</option>
        <option value="price-desc">Highest cost</option>
        <option value="price-asc">Lowest cost</option>
        <option value="last-edit-desc">Latest edit</option>
        <option value="last-edit-asc">Oldest edit</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
