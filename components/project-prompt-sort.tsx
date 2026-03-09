"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type PromptSortKey = "date-desc" | "date-asc" | "tokens-desc" | "tokens-asc" | "price-desc" | "price-asc";

export function ProjectPromptSort({ initialSort }: { initialSort: PromptSortKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <div className="relative">
      <select
        aria-label="Sort threads"
        className="h-10 appearance-none rounded-lg border border-border bg-white pl-3 pr-11 text-sm text-foreground shadow-sm outline-none"
        defaultValue={initialSort}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          router.push(`?${params.toString()}`);
        }}
      >
        <option value="date-desc">Newest first</option>
        <option value="date-asc">Oldest first</option>
        <option value="tokens-desc">Most tokens</option>
        <option value="tokens-asc">Fewest tokens</option>
        <option value="price-desc">Highest cost</option>
        <option value="price-asc">Lowest cost</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
