# Repo Scanner

`repo-scanner` is a local dashboard for reconstructing AI assistant usage by project, currently focused on Codex workflows.

It is designed for localhost use against sensitive machine-local traces. By default the app now blocks non-local requests unless you explicitly opt out with `REPO_SCANNER_ALLOW_REMOTE=true`.

It scans local machine traces, groups them by repository, and lets you drill down from:

1. project spend and activity
2. prompt/session detail
3. project-level usage breakdowns

## Data sources

The app reads from local machine traces:

- Codex session logs under the configured Codex home
- Cursor workspace history under the configured Cursor workspace storage root
- Git repositories under the configured projects root

Current focus:

- the main product flow is Codex-first
- the most exercised and validated path in the app is the Codex ingestion, project dashboard, and prompt-detail experience

Optional:

- Cursor Admin API usage events for an experimental `Cursor Stats` scaffold when `CURSOR_ADMIN_API_KEY` is configured

## Features

- Project dashboard with known token totals and source visibility
- Project drill-down with prompt history and usage summaries
- Prompt detail page with Codex event timelines
- Prompt detail grouped view that rolls up one user prompt into a single execution episode
- Project and dashboard tables with token breakdown tooltips, pricing columns, and direct row navigation
- Token usage charts with simple time-range controls

Experimental:

- `Cursor Stats` exists as a hidden scaffold and is not part of the main verified product flow yet

Prompt and session pricing is estimated locally from recovered usage snapshots:

```text
uncached_input * input_rate
+ cached_input * cached_input_rate
+ output * output_rate
```

## Prerequisites

- Node.js 20+ and npm
- `git` on your `PATH`
- `sqlite3` on your `PATH` for Cursor workspace ingestion
- A machine that already has local Git repos plus Codex and/or Cursor traces to scan

Tested path defaults are macOS-oriented:

- `~/Developer/Projects`
- `~/.codex`
- `~/Library/Application Support/Cursor/User/workspaceStorage`

If your machine uses different roots, override them in `.env.local`.

## Run locally

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` if you need to override the default local scan roots:

```bash
REPO_SCANNER_PROJECTS_ROOT=/absolute/path/to/your/repos
REPO_SCANNER_CODEX_ROOT=/absolute/path/to/your/.codex
REPO_SCANNER_CURSOR_WORKSPACES=/absolute/path/to/Cursor/User/workspaceStorage
```

If you keep the default macOS-style folders, you can leave those three variables unset.

3. Keep the app local-only unless you have your own auth boundary in front of it:

```bash
REPO_SCANNER_ALLOW_REMOTE=false
```

4. If you want to try the experimental `Cursor Stats` route, also set:

```bash
CURSOR_ADMIN_API_KEY=...
CURSOR_TEAM_ID=...
CURSOR_STATS_LOOKBACK_DAYS=30
```

`Cursor Stats` note:

- this route is currently experimental
- it is intentionally not linked from the main UI
- it should be treated as incomplete until it has dedicated validation against real team data
- the UI masks user emails, but the underlying data should still be treated as sensitive

5. Install dependencies:

```bash
npm install
```

6. Start the production server:

```bash
npm run build
npm start
```

For local development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

Run the two non-interactive checks before publishing or opening a PR:

```bash
npm run lint
npm run build
```

## First run

If your configured roots do not contain any matching traces yet, the dashboard will load with an empty-state message instead of project rows.

That usually means one of these is true:

- `.env.local` points at the wrong roots
- the machine does not have local Codex/Cursor traces yet
- `git` or `sqlite3` is missing from `PATH`
- the repos you want to scan live outside `REPO_SCANNER_PROJECTS_ROOT`

## Scan Scope And Limits

- Repository discovery only walks one and two directory levels under `REPO_SCANNER_PROJECTS_ROOT`
- Git history is limited to the last 90 days and at most 40 commits per repo
- Codex ingestion keeps at most 250 recovered sessions per repo
- Cursor ingestion keeps at most 120 recovered generations per repo

These limits keep the dashboard responsive, but they also mean missing older data is not always a bug.

## Tech stack

- Next.js App Router
- Tailwind CSS
- shadcn-style component structure
- Recharts for charts

## Repository layout

- `app/` route pages
- `components/` UI and app shell
- `lib/data.ts` local ingestion and data aggregation logic

## Caveats

- This is a local retrospective scanner, not a hosted analytics product.
- Data quality depends on what each source leaves behind on disk.
- The app expects machine-specific local paths; configure them through environment variables instead of editing source.
- Prompt detail pages can surface sensitive transcript and tool-output content from local Codex logs.
- Do not expose this app to a network without adding your own authentication and transport controls first.
- None of your local path values or API keys should be committed.
