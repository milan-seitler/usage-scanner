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
  gpt52: {
    id: "gpt52",
    label: "GPT-5.2",
    inputUsdPer1M: 1.75,
    cachedInputUsdPer1M: 0.175,
    outputUsdPer1M: 14,
    sourceLabel: "OpenAI pricing"
  },
  gpt52Codex: {
    id: "gpt52Codex",
    label: "GPT-5.2 Codex",
    inputUsdPer1M: 1.75,
    cachedInputUsdPer1M: 0.175,
    outputUsdPer1M: 14,
    sourceLabel: "OpenAI pricing"
  },
  gpt53Codex: {
    id: "gpt53Codex",
    label: "GPT-5.3 Codex",
    inputUsdPer1M: 1.75,
    cachedInputUsdPer1M: 0.175,
    outputUsdPer1M: 14,
    sourceLabel: "OpenAI pricing"
  },
  gpt51CodexMax: {
    id: "gpt51CodexMax",
    label: "GPT-5.1 Codex Max",
    inputUsdPer1M: 1.25,
    cachedInputUsdPer1M: 0.125,
    outputUsdPer1M: 10,
    sourceLabel: "OpenAI pricing"
  },
  gpt51CodexMini: {
    id: "gpt51CodexMini",
    label: "GPT-5.1 Codex Mini",
    inputUsdPer1M: 0.25,
    cachedInputUsdPer1M: 0.025,
    outputUsdPer1M: 2,
    sourceLabel: "OpenAI pricing"
  },
  gpt51Codex: {
    id: "gpt51Codex",
    label: "GPT-5.1 Codex",
    inputUsdPer1M: 1.25,
    cachedInputUsdPer1M: 0.125,
    outputUsdPer1M: 10,
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
  const normalized = model.toLowerCase().replace(/[_\s]+/g, "-").trim();
  if (normalized.includes("gpt-5.4")) {
    return TOKEN_PRICING_PROFILES.gpt54;
  }

  if (normalized.includes("gpt-5.3-codex")) {
    return TOKEN_PRICING_PROFILES.gpt53Codex;
  }

  if (normalized.includes("gpt-5.2-codex")) {
    return TOKEN_PRICING_PROFILES.gpt52Codex;
  }

  if (normalized === "gpt-5.2" || normalized.startsWith("gpt-5.2-")) {
    return TOKEN_PRICING_PROFILES.gpt52;
  }

  if (normalized.includes("gpt-5.1-codex-max")) {
    return TOKEN_PRICING_PROFILES.gpt51CodexMax;
  }

  if (normalized.includes("gpt-5.1-codex-mini")) {
    return TOKEN_PRICING_PROFILES.gpt51CodexMini;
  }

  if (normalized.includes("gpt-5.1-codex")) {
    return TOKEN_PRICING_PROFILES.gpt51Codex;
  }

  if (normalized.includes("gpt-5.3") && normalized.includes("codex")) {
    return TOKEN_PRICING_PROFILES.gpt53Codex;
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
