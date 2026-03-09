# Repo Scanner

`repo-scanner` is a local dashboard for reconstructing AI assistant usage by project, currently focused on Codex workflows.

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

## Run locally

1. Copy the example environment file:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and set the required local paths:

```bash
REPO_SCANNER_PROJECTS_ROOT=/absolute/path/to/your/repos
REPO_SCANNER_CODEX_ROOT=/absolute/path/to/your/.codex
REPO_SCANNER_CURSOR_WORKSPACES=/absolute/path/to/Cursor/User/workspaceStorage
```

Typical macOS examples:

```bash
REPO_SCANNER_PROJECTS_ROOT=/Users/your-name/Developer/Projects
REPO_SCANNER_CODEX_ROOT=/Users/your-name/.codex
REPO_SCANNER_CURSOR_WORKSPACES=/Users/your-name/Library/Application Support/Cursor/User/workspaceStorage
```

3. If you want to try the experimental `Cursor Stats` route, also set:

```bash
CURSOR_ADMIN_API_KEY=...
CURSOR_TEAM_ID=...
CURSOR_STATS_LOOKBACK_DAYS=30
```

`Cursor Stats` note:

- this route is currently experimental
- it is intentionally not linked from the main UI
- it should be treated as incomplete until it has dedicated validation against real team data

4. Install dependencies:

```bash
npm install
```

5. Start the production server:

```bash
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000).

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
- None of your local path values or API keys should be committed.
