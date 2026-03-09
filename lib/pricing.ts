export type TokenPricingProfile = {
  id: string;
  label: string;
  inputUsdPer1M: number;
  cachedInputUsdPer1M: number;
  outputUsdPer1M: number;
  sourceLabel: string;
};

export const TOKEN_PRICING_PROFILES: Record<string, TokenPricingProfile> = {
  gpt54: {
    id: "gpt54",
    label: "GPT-5.4",
    inputUsdPer1M: 2.5,
    cachedInputUsdPer1M: 0.25,
    outputUsdPer1M: 15,
    sourceLabel: "OpenAI pricing"
  },
  gpt5Codex: {
    id: "gpt5Codex",
    label: "GPT-5 Codex",
    inputUsdPer1M: 1.25,
    cachedInputUsdPer1M: 0.125,
    outputUsdPer1M: 10,
    sourceLabel: "current pricing snapshot"
  }
};

export function resolveTokenPricingProfile(model: string): TokenPricingProfile | null {
  const normalized = model.toLowerCase();
  if (normalized.includes("gpt-5.4")) {
    return TOKEN_PRICING_PROFILES.gpt54;
  }

  if (normalized.includes("codex")) {
    return TOKEN_PRICING_PROFILES.gpt5Codex;
  }

  return null;
}

export function estimateUsageCostUsd(
  usage: {
    inputTokens: number;
    cachedInputTokens?: number;
    outputTokens: number;
  },
  profile: TokenPricingProfile | null
) {
  if (!profile) {
    return null;
  }

  const cachedInputTokens = Math.min(usage.cachedInputTokens ?? 0, usage.inputTokens);
  const uncachedInputTokens = Math.max(0, usage.inputTokens - cachedInputTokens);

  return (
    (uncachedInputTokens / 1_000_000) * profile.inputUsdPer1M +
    (cachedInputTokens / 1_000_000) * profile.cachedInputUsdPer1M +
    (usage.outputTokens / 1_000_000) * profile.outputUsdPer1M
  );
}

export function formatUsd(value: number | null) {
  if (value == null || Number.isNaN(value)) return "n/a";
  if (value === 0) return "$0.00";
  if (value < 0.01) return "<$0.01";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: value < 10 ? 2 : 0,
  }).format(value);
}
