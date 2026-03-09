"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PromptSortKey = "date-desc" | "date-asc" | "tokens-desc" | "tokens-asc" | "price-desc" | "price-asc";

export function ProjectPromptSort({ initialSort }: { initialSort: PromptSortKey }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      aria-label="Sort prompt sessions"
      className="h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground shadow-sm outline-none"
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
      <option value="price-desc">Highest price</option>
      <option value="price-asc">Lowest price</option>
    </select>
  );
}
