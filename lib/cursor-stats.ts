import { cache } from "react";

const CURSOR_ADMIN_API_URL = "https://api.cursor.com";
const DEFAULT_LOOKBACK_DAYS = 30;
const MAX_EVENT_PAGES = 10;
const PAGE_SIZE = 100;

export type CursorUsageEvent = {
  id: string;
  timestamp: string;
  model: string;
  kind: string;
  userEmail: string;
  requestCount: number;
  requestCostUsd: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  totalTokens: number | null;
  isTokenBasedCall: boolean;
};

export type CursorStatsData = {
  configured: boolean;
  teamId: string | null;
  lookbackDays: number;
  error: string | null;
  events: CursorUsageEvent[];
  totals: {
    totalCostUsd: number;
    totalRequests: number;
    activeUsers: number;
    tokenBasedCalls: number;
  };
  daily: Array<{
    date: string;
    isoDate: string;
    costUsd: number;
    requests: number;
  }>;
  users: Array<{
    userEmail: string;
    requests: number;
    costUsd: number;
    models: number;
  }>;
  models: Array<{
    model: string;
    requests: number;
    costUsd: number;
    users: number;
  }>;
};

type CursorApiResponse = {
  items?: unknown[];
  events?: unknown[];
  data?: unknown[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

export const getCursorStatsData = cache(async (): Promise<CursorStatsData> => {
  const apiKey = process.env.CURSOR_ADMIN_API_KEY?.trim();
  const teamId = process.env.CURSOR_TEAM_ID?.trim() ?? null;
  const lookbackDays = readLookbackDays();

  if (!apiKey) {
    return emptyCursorStats({
      configured: false,
      teamId,
      lookbackDays,
      error: "Set CURSOR_ADMIN_API_KEY to enable Cursor Admin API usage reporting."
    });
  }

  try {
    const events = await fetchUsageEvents({ apiKey, teamId, lookbackDays });
    return buildCursorStats({ teamId, lookbackDays, events });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Cursor Admin API error.";
    return emptyCursorStats({
      configured: true,
      teamId,
      lookbackDays,
      error: message
    });
  }
});

async function fetchUsageEvents({
  apiKey,
  teamId,
  lookbackDays
}: {
  apiKey: string;
  teamId: string | null;
  lookbackDays: number;
}) {
  const headers = {
    Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    "Content-Type": "application/json",
  };
  const startDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();

  let cursor: string | null = null;
  const normalizedEvents: CursorUsageEvent[] = [];

  for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
    const response = await fetch(`${CURSOR_ADMIN_API_URL}/teams/filtered-usage-events`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        teamId: teamId ?? undefined,
        startDate,
        endDate,
        limit: PAGE_SIZE,
        cursor: cursor ?? undefined,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Cursor Admin API request failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as CursorApiResponse;
    const items = extractEventList(payload);
    normalizedEvents.push(...items.map(normalizeCursorEvent).filter((item): item is CursorUsageEvent => item !== null));

    cursor = typeof payload.nextCursor === "string" && payload.nextCursor ? payload.nextCursor : null;
    if (!payload.hasMore || !cursor) {
      break;
    }
  }

  return normalizedEvents.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

function extractEventList(payload: CursorApiResponse) {
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function normalizeCursorEvent(raw: unknown): CursorUsageEvent | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const timestamp = firstString(row.timestamp, row.createdAt, row.date);
  if (!timestamp) {
    return null;
  }

  const model = firstString(row.model, row.modelName) ?? "Unknown";
  const kind = firstString(row.kind, row.type) ?? "request";
  const userEmail = firstString(row.userEmail, row.email, row.userId) ?? "Unknown";
  const requestCosts = sumRequestCosts(row.requestsCosts);
  const tokenUsage = normalizeTokenUsage(row.tokenUsage);

  return {
    id: firstString(row.id, row.eventId) ?? `${timestamp}-${model}-${userEmail}-${kind}`,
    timestamp,
    model,
    kind,
    userEmail,
    requestCount: deriveRequestCount(row.requestsCosts),
    requestCostUsd: requestCosts,
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    cachedInputTokens: tokenUsage.cachedInputTokens,
    totalTokens: tokenUsage.totalTokens,
    isTokenBasedCall: Boolean(row.isTokenBasedCall),
  };
}

function normalizeTokenUsage(value: unknown) {
  if (!value || typeof value !== "object") {
    return {
      inputTokens: null,
      outputTokens: null,
      cachedInputTokens: null,
      totalTokens: null,
    };
  }

  const tokenUsage = value as Record<string, unknown>;
  const inputTokens = readNumber(tokenUsage.inputTokens, tokenUsage.input_tokens);
  const outputTokens = readNumber(tokenUsage.outputTokens, tokenUsage.output_tokens);
  const cachedInputTokens = readNumber(tokenUsage.cachedInputTokens, tokenUsage.cached_input_tokens);
  const totalTokens = readNumber(tokenUsage.totalTokens, tokenUsage.total_tokens)
    ?? (inputTokens != null || outputTokens != null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null);

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    totalTokens,
  };
}

function sumRequestCosts(value: unknown) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + sumRequestCosts(item), 0);
  }

  if (typeof value === "number") {
    return value;
  }

  if (!value || typeof value !== "object") {
    return 0;
  }

  const row = value as Record<string, unknown>;
  const usdValue = readNumber(row.usd, row.costUsd, row.value);
  if (usdValue != null) {
    return usdValue;
  }

  const centsValue = readNumber(row.cents, row.costCents, row.valueCents);
  return centsValue != null ? centsValue / 100 : 0;
}

function deriveRequestCount(value: unknown) {
  if (Array.isArray(value)) {
    return value.length;
  }

  return value == null ? 0 : 1;
}

function buildCursorStats({
  teamId,
  lookbackDays,
  events
}: {
  teamId: string | null;
  lookbackDays: number;
  events: CursorUsageEvent[];
}): CursorStatsData {
  const userMap = new Map<string, { userEmail: string; requests: number; costUsd: number; models: Set<string> }>();
  const modelMap = new Map<string, { model: string; requests: number; costUsd: number; users: Set<string> }>();
  const dailyMap = new Map<string, { date: string; isoDate: string; costUsd: number; requests: number }>();

  events.forEach((event) => {
    const userRow = userMap.get(event.userEmail) ?? {
      userEmail: event.userEmail,
      requests: 0,
      costUsd: 0,
      models: new Set<string>(),
    };
    userRow.requests += event.requestCount;
    userRow.costUsd += event.requestCostUsd;
    userRow.models.add(event.model);
    userMap.set(event.userEmail, userRow);

    const modelRow = modelMap.get(event.model) ?? {
      model: event.model,
      requests: 0,
      costUsd: 0,
      users: new Set<string>(),
    };
    modelRow.requests += event.requestCount;
    modelRow.costUsd += event.requestCostUsd;
    modelRow.users.add(event.userEmail);
    modelMap.set(event.model, modelRow);

    const isoDate = event.timestamp.slice(0, 10);
    const dailyRow = dailyMap.get(isoDate) ?? {
      date: formatChartDate(isoDate),
      isoDate,
      costUsd: 0,
      requests: 0,
    };
    dailyRow.costUsd += event.requestCostUsd;
    dailyRow.requests += event.requestCount;
    dailyMap.set(isoDate, dailyRow);
  });

  return {
    configured: true,
    teamId,
    lookbackDays,
    error: null,
    events,
    totals: {
      totalCostUsd: events.reduce((sum, event) => sum + event.requestCostUsd, 0),
      totalRequests: events.reduce((sum, event) => sum + event.requestCount, 0),
      activeUsers: userMap.size,
      tokenBasedCalls: events.filter((event) => event.isTokenBasedCall).length,
    },
    daily: Array.from(dailyMap.values()).sort((a, b) => a.isoDate.localeCompare(b.isoDate)),
    users: Array.from(userMap.values())
      .map((row) => ({
        userEmail: row.userEmail,
        requests: row.requests,
        costUsd: row.costUsd,
        models: row.models.size,
      }))
      .sort((a, b) => b.costUsd - a.costUsd || b.requests - a.requests || a.userEmail.localeCompare(b.userEmail)),
    models: Array.from(modelMap.values())
      .map((row) => ({
        model: row.model,
        requests: row.requests,
        costUsd: row.costUsd,
        users: row.users.size,
      }))
      .sort((a, b) => b.costUsd - a.costUsd || b.requests - a.requests || a.model.localeCompare(b.model)),
  };
}

function emptyCursorStats({
  configured,
  teamId,
  lookbackDays,
  error
}: {
  configured: boolean;
  teamId: string | null;
  lookbackDays: number;
  error: string | null;
}): CursorStatsData {
  return {
    configured,
    teamId,
    lookbackDays,
    error,
    events: [],
    totals: {
      totalCostUsd: 0,
      totalRequests: 0,
      activeUsers: 0,
      tokenBasedCalls: 0,
    },
    daily: [],
    users: [],
    models: [],
  };
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function readLookbackDays() {
  const raw = Number(process.env.CURSOR_STATS_LOOKBACK_DAYS ?? DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_LOOKBACK_DAYS;
  }

  return Math.round(raw);
}

function formatChartDate(isoDate: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
