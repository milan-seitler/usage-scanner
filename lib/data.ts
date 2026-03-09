import { cache } from "react";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const PROJECTS_ROOT = "/Users/your-name/Developer/Projects";
const CODEX_ROOT = "/Users/your-name/.codex";
const CURSOR_WORKSPACES = "/Users/your-name/Library/Application Support/Cursor/User/workspaceStorage";
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
  const bucket = new Map<string, { date: string; inputTokens: number; outputTokens: number }>();

  getProjects().forEach((project) => {
    project.prompts.forEach((prompt) => {
      if (prompt.totalTokens == null) {
        return;
      }

      const date = prompt.startedAt.slice(0, 10);
      const current = bucket.get(date) ?? { date, inputTokens: 0, outputTokens: 0 };
      current.inputTokens += prompt.inputTokens ?? 0;
      current.outputTokens += prompt.outputTokens ?? 0;
      bucket.set(date, current);
    });
  });

  return Array.from(bucket.values()).sort((a, b) => a.date.localeCompare(b.date));
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

  return { project, prompt, commit, codexDetail };
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
      costUsd: null,
      summary: parsed.summary,
    });
  });
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
  const usageTotals: Required<CodexTokenUsage> = {
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
      model = row.payload?.originator === "codex_cli_rs" ? "Codex CLI" : "Codex Desktop";
      title = sessionIndex.get(id) ?? title;
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
      const lastUsage = row.payload?.info?.last_token_usage as CodexTokenUsage | undefined;
      if (lastUsage) {
        usageTotals.input_tokens += lastUsage.input_tokens ?? 0;
        usageTotals.cached_input_tokens += lastUsage.cached_input_tokens ?? 0;
        usageTotals.output_tokens += lastUsage.output_tokens ?? 0;
        usageTotals.total_tokens += lastUsage.total_tokens ?? 0;
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
      usageTotals.total_tokens > 0
        ? "Recovered from Codex session logs with aggregated per-event token usage and project cwd."
        : "Recovered from Codex session logs. This session did not expose token usage events.",
    inputTokens: usageTotals.total_tokens > 0 ? usageTotals.input_tokens : null,
    cachedInputTokens: usageTotals.total_tokens > 0 ? usageTotals.cached_input_tokens : null,
    outputTokens: usageTotals.total_tokens > 0 ? usageTotals.output_tokens : null,
    totalTokens: usageTotals.total_tokens > 0 ? usageTotals.total_tokens : null,
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
      const lastUsage = row.payload?.info?.last_token_usage;
      if (lastUsage) {
        events.push({
          kind: "token_count",
          timestamp,
          inputTokens: Number(lastUsage.input_tokens ?? 0),
          cachedInputTokens: Number(lastUsage.cached_input_tokens ?? 0),
          outputTokens: Number(lastUsage.output_tokens ?? 0),
          totalTokens: Number(lastUsage.total_tokens ?? 0),
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
