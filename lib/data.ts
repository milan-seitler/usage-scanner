import { cache } from "react";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { estimateUsageCostUsd, resolveTokenPricingProfile } from "@/lib/pricing";

const HOME_DIR = os.homedir();
const PROJECTS_ROOT = path.resolve(process.env.REPO_SCANNER_PROJECTS_ROOT ?? path.join(HOME_DIR, "Developer/Projects"));
const CODEX_ROOT = path.resolve(process.env.REPO_SCANNER_CODEX_ROOT ?? path.join(HOME_DIR, ".codex"));
const CURSOR_WORKSPACES = path.resolve(
  process.env.REPO_SCANNER_CURSOR_WORKSPACES ?? path.join(HOME_DIR, "Library/Application Support/Cursor/User/workspaceStorage")
);
const MAX_CODEX_SESSIONS = 250;
const MAX_CURSOR_GENERATIONS = 120;
const MAX_GIT_COMMITS = 40;

type PromptSource = "Codex" | "Cursor";

export type PromptRecord = {
  id: string;
  startedAt: string;
  source: PromptSource;
  model: string;
  title: string;
  repoPath: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedInputTokens: number | null;
  totalTokens: number | null;
  costUsd: number | null;
  summary: string;
  linkedCommitId?: string;
};

export type PromptEvent =
  | {
      kind: "message";
      timestamp: string;
      role: "user" | "assistant" | "developer" | "system";
      text: string;
    }
  | {
      kind: "tool_call";
      timestamp: string;
      toolName: string;
      status: string;
      argumentsText: string;
      callId?: string;
    }
  | {
      kind: "tool_output";
      timestamp: string;
      toolName: string;
      outputText: string;
      callId?: string;
    }
  | {
      kind: "token_count";
      timestamp: string;
      inputTokens: number;
      cachedInputTokens: number;
      outputTokens: number;
      totalTokens: number;
      sessionInputTokens: number;
      sessionCachedInputTokens: number;
      sessionOutputTokens: number;
      sessionTotalTokens: number;
    };

export type CommitRecord = {
  id: string;
  committedAt: string;
  message: string;
  author: string;
  branch: string;
  filesChanged: number;
  insertions: number;
  deletions: number;
  linkedPromptIds: string[];
};

export type ProjectRecord = {
  slug: string;
  name: string;
  repoPath: string;
  scannerSources: string[];
  prompts: PromptRecord[];
  commits: CommitRecord[];
};

type ProjectSummary = {
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

type CodexTokenUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
};

type MutableProject = {
  slug: string;
  name: string;
  repoPath: string;
  scannerSources: Set<string>;
  prompts: PromptRecord[];
  commits: CommitRecord[];
};

type CodexSessionDetail = {
  events: PromptEvent[];
};

export type PromptTimelineItem = {
  id: string;
  kind: "message" | "assistant_work" | "token_checkpoint";
  title: string;
  subtitle: string;
  timestamp: string;
  signal: string;
  tokenHint: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedTotalTokens: number;
  rawEvents: PromptEvent[];
};

export type PromptTokenCheckpoint = {
  timestamp: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  sessionInputTokens: number;
  sessionCachedInputTokens: number;
  sessionOutputTokens: number;
  sessionTotalTokens: number;
};

export type PromptEfficiencyOverview = {
  totalEstimatedTokens: number;
  wasteSignal: string;
  likelyCause: string;
  howToReduceNextTime: string;
  savingsOpportunities: string[];
};

export const getProjects = cache((): ProjectRecord[] => {
  const repos = findGitRepos(PROJECTS_ROOT);
  const projectMap = new Map<string, MutableProject>();

  repos.forEach((repoPath) => {
    const slug = path.basename(repoPath);
    projectMap.set(slug, {
      slug,
      name: slug,
      repoPath,
      scannerSources: new Set(["Git"]),
      prompts: [],
      commits: [],
    });
  });

  scanCodexSessions(projectMap);
  scanCursorWorkspaces(projectMap);

  projectMap.forEach((project) => {
    project.commits = scanGitCommits(project.repoPath);
    correlatePromptsToCommits(project.prompts, project.commits);
  });

  return Array.from(projectMap.values())
    .filter((project) => project.prompts.length > 0 || project.commits.length > 0)
    .sort((a, b) => {
      const tokenDelta =
        sumKnownTokens(b.prompts) - sumKnownTokens(a.prompts);
      if (tokenDelta !== 0) {
        return tokenDelta;
      }

      return b.prompts.length - a.prompts.length;
    })
    .map((project) => ({
      slug: project.slug,
      name: project.name,
      repoPath: project.repoPath,
      scannerSources: Array.from(project.scannerSources).sort(),
      prompts: project.prompts.sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
      commits: project.commits.sort((a, b) => b.committedAt.localeCompare(a.committedAt)),
    }));
});

export function getProject(slug: string) {
  return getProjects().find((project) => project.slug === slug);
}

export function getProjectSummary(): ProjectSummary[] {
  return getProjects().map((project) => {
    const inputTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.inputTokens ?? 0), 0);
    const outputTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.outputTokens ?? 0), 0);
    const totalTokens = project.prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
    const unknownPromptCount = project.prompts.filter((prompt) => prompt.totalTokens == null).length;

    return {
      slug: project.slug,
      name: project.name,
      repoPath: project.repoPath,
      promptCount: project.prompts.length,
      commitCount: project.commits.length,
      inputTokens,
      outputTokens,
      totalTokens,
      unknownPromptCount,
      sources: project.scannerSources,
    };
  });
}

export function getDailyTimeline() {
  const bucket = new Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }>();

  getProjects().forEach((project) => {
    project.prompts.forEach((prompt) => {
      if (prompt.totalTokens == null) {
        return;
      }

      const date = prompt.startedAt.slice(0, 10);
      const current = bucket.get(date) ?? { date, isoDate: date, inputTokens: 0, outputTokens: 0, costUsd: 0 };
      current.inputTokens += prompt.inputTokens ?? 0;
      current.outputTokens += prompt.outputTokens ?? 0;
      current.costUsd += prompt.costUsd ?? 0;
      bucket.set(date, current);
    });
  });

  return fillDailyTokenGaps(bucket);
}

export function getPromptDetail(projectSlug: string, promptId: string) {
  const project = getProject(projectSlug);
  if (!project) return null;

  const prompt = project.prompts.find((item) => item.id === promptId);
  if (!prompt) return null;

  const commit = prompt.linkedCommitId
    ? project.commits.find((item) => item.id === prompt.linkedCommitId) ?? null
    : null;

  const codexDetail = prompt.source === "Codex" ? readCodexSessionDetail(prompt.id) : null;
  const efficiency = codexDetail ? derivePromptEfficiency(codexDetail.events) : null;

  return { project, prompt, commit, codexDetail, efficiency };
}

export function getCommitDetail(projectSlug: string, commitId: string) {
  const project = getProject(projectSlug);
  if (!project) return null;

  const commit = project.commits.find((item) => item.id === commitId);
  if (!commit) return null;

  const prompts = project.prompts.filter((prompt) => commit.linkedPromptIds.includes(prompt.id));
  return { project, commit, prompts };
}

function scanCodexSessions(projectMap: Map<string, MutableProject>) {
  const sessionIndex = readCodexSessionIndex();
  const files = collectFiles(path.join(CODEX_ROOT, "sessions"), 6, (name) => name.endsWith(".jsonl"))
    .concat(collectFiles(path.join(CODEX_ROOT, "archived_sessions"), 2, (name) => name.endsWith(".jsonl")))
    .sort()
    .slice(-MAX_CODEX_SESSIONS);

  files.forEach((filePath) => {
    const parsed = parseCodexSession(filePath, sessionIndex);
    if (!parsed || !parsed.cwd.startsWith(`${PROJECTS_ROOT}/`)) {
      return;
    }

    const project = ensureProject(projectMap, parsed.cwd);
    project.scannerSources.add("Codex sessions");
    project.prompts.push({
      id: parsed.id,
      startedAt: parsed.startedAt,
      source: "Codex",
      model: parsed.model,
      title: parsed.title,
      repoPath: parsed.cwd,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
      cachedInputTokens: parsed.cachedInputTokens,
      totalTokens: parsed.totalTokens,
      costUsd: parsed.costUsd,
      summary: parsed.summary,
    });
  });
}

function derivePromptEfficiency(events: PromptEvent[]) {
  const items: PromptTimelineItem[] = [];
  const checkpoints: PromptTokenCheckpoint[] = [];
  let checkpointTotals = { input: 0, output: 0, total: 0 };

  events.forEach((event, index) => {
    if (event.kind === "token_count") {
      const deltaInput = Math.max(0, event.inputTokens - checkpointTotals.input);
      const deltaOutput = Math.max(0, event.outputTokens - checkpointTotals.output);
      const deltaTotal = Math.max(0, event.totalTokens - checkpointTotals.total);

      checkpoints.push({
        timestamp: event.timestamp,
        inputTokens: event.inputTokens,
        cachedInputTokens: event.cachedInputTokens,
        outputTokens: event.outputTokens,
        totalTokens: event.totalTokens,
        sessionInputTokens: event.sessionInputTokens,
        sessionCachedInputTokens: event.sessionCachedInputTokens,
        sessionOutputTokens: event.sessionOutputTokens,
        sessionTotalTokens: event.sessionTotalTokens,
      });

      items.push({
        id: `${event.timestamp}-token-${index}`,
        kind: "token_checkpoint",
        title: "Token checkpoint",
        subtitle: "Last request usage with cumulative session total",
        timestamp: event.timestamp,
        signal: `Last request ${formatCompactTokenCount(event.totalTokens)}; session total ${formatCompactTokenCount(event.sessionTotalTokens)}.`,
        tokenHint: `${formatCompactTokenCount(event.totalTokens)} last`,
        estimatedInputTokens: deltaInput,
        estimatedOutputTokens: deltaOutput,
        estimatedTotalTokens: deltaTotal,
        rawEvents: [event],
      });

      checkpointTotals = {
        input: event.inputTokens,
        output: event.outputTokens,
        total: event.totalTokens,
      };
      return;
    }

    const item = toTimelineItem(event, index);
    if (item) {
      items.push(item);
    }
  });

  items.forEach(finalizeTimelineItem);

  const costlyItems = items.filter((item) => item.kind === "assistant_work");
  const mostExpensiveEpisode = costlyItems.reduce<PromptTimelineItem | null>((current, item) => {
    if (!current) return item;
    return item.estimatedTotalTokens > current.estimatedTotalTokens ? item : current;
  }, null);

  const overview: PromptEfficiencyOverview = {
    totalEstimatedTokens: costlyItems.reduce((sum, item) => sum + item.estimatedTotalTokens, 0),
    wasteSignal: mostExpensiveEpisode
      ? mostExpensiveEpisode.subtitle.toLowerCase().includes("investigation") && mostExpensiveEpisode.estimatedInputTokens >= mostExpensiveEpisode.estimatedOutputTokens
        ? "High input before edits"
        : "Heavy work episode"
      : "No strong waste signal",
    likelyCause: mostExpensiveEpisode
      ? mostExpensiveEpisode.subtitle.toLowerCase().includes("investigation")
        ? "Repeated inspection and restatement before implementation."
        : "Implementation work carried both context load and execution."
      : "Limited detailed event evidence.",
    howToReduceNextTime: mostExpensiveEpisode
      ? mostExpensiveEpisode.subtitle.toLowerCase().includes("investigation")
        ? "Ask for a short diagnosis first, then approve implementation in a second turn."
        : "Constrain the implementation target and expected diff before the assistant starts coding."
      : "Keep the ask narrow and avoid broad exploratory prompts.",
    savingsOpportunities: [
      "Stop after the first concrete mismatch diagnosis instead of repeating the same conclusion.",
      "Name target files early so repo inspection stays narrow.",
      "Separate exploration from implementation when the first step is a judgment call."
    ],
  };

  return {
    overview,
    items: items.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    checkpoints: checkpoints.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  };
}

function toTimelineItem(event: PromptEvent, index: number): PromptTimelineItem | null {
  if (event.kind === "message") {
    if (event.role === "user") {
      return {
        id: `${event.timestamp}-message-${index}`,
        kind: "message",
        title: "User turn",
        subtitle: summarizeText(event.text),
        timestamp: event.timestamp,
        signal: "Decision request or clarification before more work.",
        tokenHint: "~0 minimal",
        estimatedInputTokens: 0,
        estimatedOutputTokens: 0,
        estimatedTotalTokens: 0,
        rawEvents: [event],
      };
    }

    return {
      id: `${event.timestamp}-assistant-${index}`,
      kind: "assistant_work",
      title: "Assistant work - message",
      subtitle: inferAssistantSubtitle(event.text),
      timestamp: event.timestamp,
      signal: "",
      tokenHint: "~0 minimal",
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedTotalTokens: 0,
      rawEvents: [event],
    };
  }

  if (event.kind === "tool_call" || event.kind === "tool_output") {
    return {
      id: `${event.timestamp}-${event.kind}-${index}`,
      kind: "assistant_work",
      title: `Assistant work - ${event.kind.replace("_", " ")}`,
      subtitle: classifyToolSubtitle(event.toolName),
      timestamp: event.timestamp,
      signal: "",
      tokenHint: "~0 minimal",
      estimatedInputTokens: 0,
      estimatedOutputTokens: 0,
      estimatedTotalTokens: 0,
      rawEvents: [event],
    };
  }

  return null;
}

function finalizeTimelineItem(item: PromptTimelineItem) {
  if (item.kind === "message" || item.kind === "token_checkpoint") return;

  const mostlyInput = item.estimatedInputTokens > item.estimatedOutputTokens * 1.6;
  const hintPrefix = item.estimatedTotalTokens > 0 ? formatCompactTokenCount(item.estimatedTotalTokens) : "~0";

  item.tokenHint =
    item.estimatedTotalTokens === 0
      ? "~0 minimal"
      : mostlyInput
        ? `${hintPrefix} mostly input`
        : `${hintPrefix} mixed`;

  item.signal =
    item.subtitle.toLowerCase().includes("investigation")
      ? mostlyInput
        ? "Low efficiency: heavy context load before a small structural conclusion."
        : "Useful diagnosis, but still mostly exploratory token spend."
      : mostlyInput
        ? "Implementation moved forward, but carried extra context overhead."
        : "Better use of tokens: work moved toward an actual implementation."
}

function summarizeText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > 64 ? `${normalized.slice(0, 63)}…` : normalized;
}

function inferAssistantSubtitle(text: string) {
  const normalized = text.toLowerCase();
  if (/(implement|change|update|patch|build|apply|replace|refactor)/.test(normalized)) {
    return "Implementation";
  }

  return "Investigation";
}

function classifyToolSubtitle(toolName: string) {
  const normalized = toolName.toLowerCase();
  if (/(apply_patch|write|edit|replace|create|save|set|delete|move)/.test(normalized)) {
    return "Implementation";
  }

  return "Investigation";
}

function formatCompactTokenCount(value: number) {
  if (value >= 1_000_000) return `${Math.round((value / 1_000_000) * 10) / 10}M`;
  if (value >= 1_000) return `${Math.round(value / 1000)}K`;
  return String(value);
}

function fillDailyTokenGaps(bucket: Map<string, { date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }>) {
  const keys = Array.from(bucket.keys()).sort((a, b) => a.localeCompare(b));
  if (keys.length === 0) {
    return [];
  }

  const days: Array<{ date: string; isoDate: string; inputTokens: number; outputTokens: number; costUsd: number }> = [];
  const current = new Date(`${keys[0]}T00:00:00Z`);
  const end = new Date(`${keys[keys.length - 1]}T00:00:00Z`);

  while (current <= end) {
    const isoDate = current.toISOString().slice(0, 10);
    days.push(
      bucket.get(isoDate) ?? {
        date: isoDate,
        isoDate,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0
      }
    );
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return days;
}

function scanCursorWorkspaces(projectMap: Map<string, MutableProject>) {
  if (!existsSync(CURSOR_WORKSPACES)) {
    return;
  }

  const workspaceDirs = readdirSync(CURSOR_WORKSPACES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(CURSOR_WORKSPACES, entry.name));

  workspaceDirs.forEach((workspaceDir) => {
    const workspaceJson = path.join(workspaceDir, "workspace.json");
    const dbPath = path.join(workspaceDir, "state.vscdb");
    if (!existsSync(workspaceJson) || !existsSync(dbPath)) {
      return;
    }

    const repoPath = readCursorWorkspacePath(workspaceJson);
    if (!repoPath || !repoPath.startsWith(`${PROJECTS_ROOT}/`)) {
      return;
    }

    const generations = readCursorGenerations(dbPath);
    if (generations.length === 0) {
      return;
    }

    const project = ensureProject(projectMap, repoPath);
    project.scannerSources.add("Cursor workspaceStorage");

    generations.slice(-MAX_CURSOR_GENERATIONS).forEach((generation) => {
      project.prompts.push({
        id: generation.id,
        startedAt: new Date(generation.unixMs).toISOString(),
        source: "Cursor",
        model: generation.type === "composer" ? "Cursor composer" : "Cursor",
        title: generation.textDescription || "Cursor prompt",
        repoPath,
        inputTokens: null,
        outputTokens: null,
        cachedInputTokens: null,
        totalTokens: null,
        costUsd: null,
        summary: "Recovered from Cursor workspace storage. The current local DB shape exposes prompt history but not token totals.",
      });
    });
  });
}

function findGitRepos(root: string) {
  const repos: string[] = [];
  const firstLevel = safeReadDirs(root);

  firstLevel.forEach((dir) => {
    if (existsSync(path.join(dir, ".git"))) {
      repos.push(dir);
      return;
    }

    safeReadDirs(dir).forEach((nested) => {
      if (existsSync(path.join(nested, ".git"))) {
        repos.push(nested);
      }
    });
  });

  return repos;
}

function safeReadDirs(dir: string) {
  if (!existsSync(dir)) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(dir, entry.name))
    .filter((fullPath) => {
      const name = path.basename(fullPath);
      return ![".git", "node_modules", ".next", "dist", "build", ".pnpm-store"].includes(name);
    });
}

function readCodexSessionIndex() {
  const sessionIndexPath = path.join(CODEX_ROOT, "session_index.jsonl");
  const map = new Map<string, string>();

  if (!existsSync(sessionIndexPath)) {
    return map;
  }

  const lines = readFileSync(sessionIndexPath, "utf8").split("\n").filter(Boolean);
  lines.forEach((line) => {
    try {
      const row = JSON.parse(line) as { id?: string; thread_name?: string };
      if (row.id && row.thread_name) {
        map.set(row.id, row.thread_name);
      }
    } catch {
      // Ignore malformed lines.
    }
  });

  return map;
}

function parseCodexSession(filePath: string, sessionIndex: Map<string, string>) {
  const lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);

  let id = "";
  let cwd = "";
  let startedAt = "";
  let model = "Codex";
  let title = "";
  let firstUserText = "";
  const latestUsage: Required<CodexTokenUsage> = {
    input_tokens: 0,
    cached_input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
  };

  for (const line of lines) {
    let row: any;

    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    if (row.type === "session_meta") {
      id = row.payload?.id ?? id;
      cwd = row.payload?.cwd ?? cwd;
      startedAt = row.payload?.timestamp ?? startedAt;
      title = sessionIndex.get(id) ?? title;
      continue;
    }

    if (row.type === "turn_context" && typeof row.payload?.model === "string" && row.payload.model.trim()) {
      model = row.payload.model.trim();
      continue;
    }

    if (!firstUserText && row.type === "response_item" && row.payload?.type === "message" && row.payload?.role === "user") {
      const text = row.payload?.content?.find?.((item: any) => item.type === "input_text")?.text;
      if (typeof text === "string" && text.trim()) {
        firstUserText = text.trim();
      }
      continue;
    }

    if (!firstUserText && row.type === "event_msg" && row.payload?.type === "user_message" && typeof row.payload.message === "string") {
      firstUserText = row.payload.message.trim();
      continue;
    }

    if (row.type === "event_msg" && row.payload?.type === "token_count") {
      const totalUsage = row.payload?.info?.total_token_usage as CodexTokenUsage | undefined;
      const lastUsage = row.payload?.info?.last_token_usage as CodexTokenUsage | undefined;
      const preferredUsage = totalUsage ?? lastUsage;

      if (preferredUsage) {
        latestUsage.input_tokens = preferredUsage.input_tokens ?? 0;
        latestUsage.cached_input_tokens = preferredUsage.cached_input_tokens ?? 0;
        latestUsage.output_tokens = preferredUsage.output_tokens ?? 0;
        latestUsage.total_tokens = preferredUsage.total_tokens ?? 0;
      }
    }
  }

  if (!id || !cwd || !startedAt) {
    return null;
  }

  const cleanTitle = (title || firstUserText || "Codex session").replace(/\s+/g, " ").slice(0, 120);

  return {
    id,
    cwd,
    startedAt,
    model,
    title: cleanTitle,
    summary:
      latestUsage.total_tokens > 0
        ? "Recovered from Codex session logs using the latest session token-usage snapshot and project cwd."
        : "Recovered from Codex session logs. This session did not expose token usage events.",
    inputTokens: latestUsage.total_tokens > 0 ? latestUsage.input_tokens : null,
    cachedInputTokens: latestUsage.total_tokens > 0 ? latestUsage.cached_input_tokens : null,
    outputTokens: latestUsage.total_tokens > 0 ? latestUsage.output_tokens : null,
    totalTokens: latestUsage.total_tokens > 0 ? latestUsage.total_tokens : null,
    costUsd:
      latestUsage.total_tokens > 0
        ? estimateUsageCostUsd(
            {
              inputTokens: latestUsage.input_tokens,
              cachedInputTokens: latestUsage.cached_input_tokens,
              outputTokens: latestUsage.output_tokens,
            },
            resolveTokenPricingProfile(model)
          )
        : null,
  };
}

function readCodexSessionDetail(sessionId: string): CodexSessionDetail | null {
  const filePath = findCodexSessionFile(sessionId);
  if (!filePath) {
    return null;
  }

  const events: PromptEvent[] = [];
  const lines = readFileSync(filePath, "utf8").split("\n").filter(Boolean);

  for (const line of lines) {
    let row: any;

    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const timestamp = typeof row.timestamp === "string" ? row.timestamp : "";

    if (row.type === "response_item" && row.payload?.type === "message") {
      const role = row.payload?.role;
      const text = extractMessageText(row.payload?.content);
      if (
        (role === "user" || role === "assistant" || role === "developer" || role === "system") &&
        text
      ) {
        events.push({
          kind: "message",
          timestamp,
          role,
          text,
        });
      }
      continue;
    }

    if (row.type === "event_msg" && row.payload?.type === "token_count") {
      const totalUsage = row.payload?.info?.total_token_usage;
      const lastUsage = row.payload?.info?.last_token_usage;
      if (lastUsage || totalUsage) {
        events.push({
          kind: "token_count",
          timestamp,
          inputTokens: Number(lastUsage.input_tokens ?? 0),
          cachedInputTokens: Number(lastUsage.cached_input_tokens ?? 0),
          outputTokens: Number(lastUsage.output_tokens ?? 0),
          totalTokens: Number(lastUsage.total_tokens ?? 0),
          sessionInputTokens: Number(totalUsage?.input_tokens ?? lastUsage?.input_tokens ?? 0),
          sessionCachedInputTokens: Number(totalUsage?.cached_input_tokens ?? lastUsage?.cached_input_tokens ?? 0),
          sessionOutputTokens: Number(totalUsage?.output_tokens ?? lastUsage?.output_tokens ?? 0),
          sessionTotalTokens: Number(totalUsage?.total_tokens ?? lastUsage?.total_tokens ?? 0),
        });
      }
      continue;
    }

    if (row.type === "response_item" && row.payload?.type === "function_call") {
      events.push({
        kind: "tool_call",
        timestamp,
        toolName: row.payload?.name ?? "tool",
        status: "requested",
        argumentsText: stringifyToolPayload(row.payload?.arguments),
        callId: row.payload?.call_id,
      });
      continue;
    }

    if (row.type === "response_item" && row.payload?.type === "custom_tool_call") {
      events.push({
        kind: "tool_call",
        timestamp,
        toolName: row.payload?.name ?? "custom_tool",
        status: row.payload?.status ?? "completed",
        argumentsText: stringifyToolPayload(row.payload?.input),
        callId: row.payload?.call_id,
      });
      continue;
    }

    if (row.type === "response_item" && row.payload?.type === "function_call_output") {
      events.push({
        kind: "tool_output",
        timestamp,
        toolName: "tool output",
        outputText: stringifyToolPayload(row.payload?.output),
        callId: row.payload?.call_id,
      });
      continue;
    }

    if (row.type === "response_item" && row.payload?.type === "custom_tool_call_output") {
      events.push({
        kind: "tool_output",
        timestamp,
        toolName: "custom tool output",
        outputText: stringifyToolPayload(row.payload?.output),
        callId: row.payload?.call_id,
      });
    }
  }

  return { events };
}

function collectFiles(root: string, maxDepth: number, matcher: (name: string) => boolean) {
  const results: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (!existsSync(dir) || depth > maxDepth) {
      return;
    }

    readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        return;
      }

      if (entry.isFile() && matcher(entry.name)) {
        results.push(fullPath);
      }
    });
  };

  walk(root, 0);
  return results;
}

function findCodexSessionFile(sessionId: string) {
  const roots = [path.join(CODEX_ROOT, "sessions"), path.join(CODEX_ROOT, "archived_sessions")];

  for (const root of roots) {
    const files = collectFiles(root, 6, (name) => name.endsWith(".jsonl"));
    const match = files.find((filePath) => filePath.includes(sessionId));
    if (match) {
      return match;
    }
  }

  return null;
}

function readCursorWorkspacePath(workspaceJsonPath: string) {
  try {
    const raw = JSON.parse(readFileSync(workspaceJsonPath, "utf8")) as { folder?: string };
    if (!raw.folder?.startsWith("file://")) {
      return null;
    }

    return decodeURIComponent(raw.folder.replace("file://", ""));
  } catch {
    return null;
  }
}

function readCursorGenerations(dbPath: string) {
  try {
    const output = execFileSync(
      "sqlite3",
      [
        dbPath,
        "SELECT value FROM ItemTable WHERE key='aiService.generations';",
      ],
      { encoding: "utf8" },
    ).trim();

    if (!output) {
      return [];
    }

    const parsed = JSON.parse(output) as Array<{
      unixMs?: number;
      generationUUID?: string;
      type?: string;
      textDescription?: string;
    }>;

    return parsed
      .filter((item) => typeof item.unixMs === "number" && typeof item.generationUUID === "string")
      .map((item) => ({
        id: item.generationUUID as string,
        unixMs: item.unixMs as number,
        type: item.type ?? "cursor",
        textDescription: item.textDescription ?? "",
      }));
  } catch {
    return [];
  }
}

function ensureProject(projectMap: Map<string, MutableProject>, repoPath: string) {
  const slug = path.basename(repoPath);
  const existing = projectMap.get(slug);
  if (existing) {
    return existing;
  }

  const created: MutableProject = {
    slug,
    name: slug,
    repoPath,
    scannerSources: new Set<string>(),
    prompts: [],
    commits: [],
  };
  projectMap.set(slug, created);
  return created;
}

function scanGitCommits(repoPath: string): CommitRecord[] {
  if (!existsSync(path.join(repoPath, ".git"))) {
    return [];
  }

  const format = ["__COMMIT__", "%H", "%cI", "%s", "%an", "%D"].join("%x1f");

  try {
    const output = execFileSync(
      "git",
      [
        "-C",
        repoPath,
        "log",
        `--pretty=format:${format}`,
        "--shortstat",
        `-n`,
        String(MAX_GIT_COMMITS),
        "--since=90 days ago",
      ],
      { encoding: "utf8" },
    );

    const commits: CommitRecord[] = [];
    let current: CommitRecord | null = null;

    output.split("\n").forEach((line) => {
      if (line.startsWith("__COMMIT__")) {
        if (current) {
          commits.push(current);
        }

        const [, hash, committedAt, message, author, refs] = line.split("\u001f");
        current = {
          id: hash.slice(0, 7),
          committedAt,
          message,
          author,
          branch: extractBranch(refs),
          filesChanged: 0,
          insertions: 0,
          deletions: 0,
          linkedPromptIds: [],
        };
        return;
      }

      if (!current) {
        return;
      }

      if (line.includes("file changed") || line.includes("files changed")) {
        const filesMatch = line.match(/(\d+) files? changed/);
        const insertionsMatch = line.match(/(\d+) insertions?\(\+\)/);
        const deletionsMatch = line.match(/(\d+) deletions?\(-\)/);
        current.filesChanged = Number(filesMatch?.[1] ?? 0);
        current.insertions = Number(insertionsMatch?.[1] ?? 0);
        current.deletions = Number(deletionsMatch?.[1] ?? 0);
      }
    });

    if (current) {
      commits.push(current);
    }

    return commits;
  } catch {
    return [];
  }
}

function correlatePromptsToCommits(prompts: PromptRecord[], commits: CommitRecord[]) {
  prompts.forEach((prompt) => {
    const promptTs = new Date(prompt.startedAt).getTime();
    let bestMatch: CommitRecord | undefined;
    let bestDelta = Number.POSITIVE_INFINITY;

    commits.forEach((commit) => {
      const commitTs = new Date(commit.committedAt).getTime();
      const delta = commitTs - promptTs;
      if (delta < 0 || delta > 1000 * 60 * 60 * 6) {
        return;
      }

      if (delta < bestDelta) {
        bestDelta = delta;
        bestMatch = commit;
      }
    });

    if (bestMatch == null) {
      return;
    }

    prompt.linkedCommitId = bestMatch.id;
    if (!bestMatch.linkedPromptIds.includes(prompt.id)) {
      bestMatch.linkedPromptIds.push(prompt.id);
    }
  });
}

function extractBranch(refs: string) {
  const headRef = refs
    .split(",")
    .map((part) => part.trim())
    .find((part) => part.startsWith("HEAD -> "));

  return headRef?.replace("HEAD -> ", "") || "detached";
}

function sumKnownTokens(prompts: PromptRecord[]) {
  return prompts.reduce((sum, prompt) => sum + (prompt.totalTokens ?? 0), 0);
}

function extractMessageText(content: unknown) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (item && typeof item === "object") {
        const typed = item as { type?: string; text?: string };
        if (
          (typed.type === "input_text" || typed.type === "output_text") &&
          typeof typed.text === "string"
        ) {
          return typed.text;
        }
      }

      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

function stringifyToolPayload(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
