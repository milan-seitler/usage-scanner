# Repo Scanner

`repo-scanner` is a small local dashboard for reconstructing AI assistant usage by project.

It scans local machine traces, groups them by repository, and lets you drill down from:

1. project spend and activity
2. prompt/session detail
3. correlated Git commits

## What it reads

The current app reads from:

- Codex session logs in `~/.codex/sessions` and `~/.codex/archived_sessions`
- Cursor workspace history in `~/Library/Application Support/Cursor/User/workspaceStorage`
- Git repositories under `/Users/your-name/Developer/Projects`

## Current behavior

- Project dashboard with known token totals and source visibility
- Project drill-down with prompt and commit correlation
- Prompt detail page with Codex event timelines
- Commit detail page showing the prompt sessions linked to a commit

Notes:

- Codex currently provides the richest local detail, including transcript events, tool calls, tool outputs, and token checkpoints.
- Cursor currently contributes prompt history on this machine, but not equivalent token/event depth.

## Run locally

Install dependencies:

```bash
npm install
```

Start the production server:

```bash
npm run build
npm start
```

For local development:

```bash
npm run dev
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
- `lib/data.ts` local ingestion and correlation logic

## Caveats

- This is a local retrospective scanner, not a hosted analytics product.
- Data quality depends on what each source leaves behind on disk.
- Next.js dev mode on this machine has shown occasional stale-cache/runtime issues; `npm run build && npm start` is the most reliable path for verification.
