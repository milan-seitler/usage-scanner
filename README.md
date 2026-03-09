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
- Prompt detail grouped view that rolls up one user prompt into a single execution episode
- Project and dashboard tables with token breakdown tooltips, pricing columns, and direct row navigation
- Token usage charts with simple time-range controls

Notes:

- Codex currently provides the richest local detail, including transcript events, tool calls, tool outputs, and token checkpoints.
- Cursor currently contributes prompt history on this machine, but not equivalent token/event depth.

## Pricing

Prompt and session pricing is estimated locally from recovered usage snapshots.

Current pricing coverage includes:

- `GPT-5.4`
- `GPT-5.3-Codex`
- `GPT-5.2`
- `GPT-5.2-Codex`
- `GPT-5.1-Codex`
- `GPT-5.1-Codex-Max`
- `GPT-5.1-Codex-Mini`
- generic `Codex` fallback

Pricing is calculated as:

```text
uncached_input * input_rate
+ cached_input * cached_input_rate
+ output * output_rate
```

Important:

- `cached input` is a subset of `input`, not an additional bucket on top of input
- `session total` is derived from `input + output`
- cost estimates only use profiles that have been mapped locally in `lib/pricing.ts`

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

If the dev server starts returning a white screen or missing chunk/module errors after a refactor, the usual recovery path is:

```bash
rm -rf .next
npm run dev
```
