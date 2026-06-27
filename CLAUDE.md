# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**pathfinder.ai** — a free AI learning app with two entry points:
1. A 6-question quiz; the backend scores answers against 7 hard-coded learning paths and returns a personalized, ordered list of free courses from `src/data/curriculum.json`.
2. **Build & Learn** (`/discover`) — a chat with "Spark," an AI mentor (via the Claude API) that helps teenagers find a personal project to build, ending in a structured project blueprint.

The results page also has a **Go Deeper** feature that calls the Claude API with web search to find additional free courses beyond the curated list.

## Dev Commands

```bash
# Install all dependencies (root + frontend)
npm install && cd src/frontend && npm install

# Run full stack (frontend :5173, backend :3001)
npm run dev

# Backend only (Express on :3001, --watch mode)
npm run dev:server

# Frontend only (Vite on :5173)
npm run dev:frontend

# Lint frontend
cd src/frontend && npm run lint

# Production build + serve
npm run build && npm start
```

No test suite exists. No TypeScript.

**Requires `ANTHROPIC_API_KEY`** in a local `.env` (see `.env.example`) for the Go Deeper and Build & Learn features to return real results. Without it, both fail gracefully (see Key Constraints).

## Architecture

**Frontend** (`src/frontend/`) — React 19 SPA bundled with Vite, routed with `react-router-dom`.
- `vite.config.js` proxies `/api/*` to `localhost:3001`, so fetch calls use relative paths.
- `App.jsx` only defines two routes: `/` → `pages/Home.jsx`, `/discover` → `pages/Discover.jsx`.
- `pages/Home.jsx` holds the original 3-stage flow: Landing → Quiz → Results.
- Quiz answers can be pre-loaded from `?answers=<encoded>` URL param for shareable links.
- `pages/Discover.jsx` is the Spark chat UI (Build & Learn) — see below.

**Backend** (`src/server/`) — Express on port 3001. `require("dotenv").config()` runs first to load `.env`.
- `POST /api/recommend` — main quiz endpoint; calls `recommend(answers)` in `recommend.js`.
- `POST /api/feedback` — appends to a local `feedback.json` file (not committed).
- `POST /api/discover` — **Go Deeper**: takes `{ answers, courses }`, calls Claude (`claude-sonnet-4-6`) with the `web_search` tool to find supplemental free courses not already in the curated list. Always returns HTTP 200 with `{ courses: [...], error: boolean }` — failures are logged server-side with a timestamp, never surfaced to the user as an error.
- `POST /api/spark` — **Build & Learn**: takes `{ messages }` (full chat history), forwards to Claude (`claude-sonnet-4-6`) with the `SPARK_SYSTEM_PROMPT` system prompt, returns `{ reply }` or `{ error }` (HTTP 500 on failure).
- In production (`NODE_ENV=production`), serves the built frontend from `src/frontend/dist` and falls back all unknown routes to `index.html` (this also makes client-side routes like `/discover` work on full page load).

**Recommendation engine** (`src/server/recommend.js`) — pure function, no database.
- `recommend(answers)` maps quiz answers → course candidates → topological sort (prerequisites first) → caps at 8 courses → annotates each with a "why this for you" string.
- `topologicalSort(selectedIds)` uses DFS over `prerequisite_ids` to enforce ordering.
- **`answers.goal` is multi-select** — an array of up to 2 values (backwards-compatible: a bare string is normalized to a 1-item array). Each matching path is additive: candidates from all selected goals are merged via `addPath()`, deduplicated, then sorted/capped — so picking 2 goals blends both paths rather than picking one exclusively.
- `generateProfileSummary` and `getProjectCard` also normalize `goal` to an array and join goal labels with "and" when summarizing.

**Build & Learn / Spark chat** (`src/frontend/src/pages/Discover.jsx` + `SPARK_SYSTEM_PROMPT` in `src/server/index.js`):
- 4 stages driven entirely by the system prompt: Explore interests → Shape the idea → Scope it down → Blueprint. The frontend's `detectStageAdvance()` advances the stage-pill UI via keyword heuristics on each AI reply (e.g. mentions of "build/creating/existing" → stage 2) — this is approximate, not authoritative; the model doesn't explicitly report its stage.
- On mount, the page silently sends an opening message to `/api/spark` and displays only the AI's reply (the opening user message is flagged `hidden: true` and excluded from rendering, but still sent as context on later turns).
- The model's final-stage reply contains a `[BLUEPRINT]...[/BLUEPRINT]` block in a fixed `KEY: value` pipe-delimited format; `parseBlueprint()`/`splitMessage()` in `Discover.jsx` parse it into a `BlueprintCard` (project name, tagline, milestones, and two college/internship application blurbs — "starting out" and "when you finish").
- Editing the mentor's behavior means editing `SPARK_SYSTEM_PROMPT` in `src/server/index.js`, not the frontend.

**Data** (`src/data/curriculum.json`) — single source of truth for all curated courses (Go Deeper results are synthesized at request time and not persisted here).
- Editing this file is the primary way to add/remove/update curated courses.
- Required fields: `id`, `title`, `provider`, `url`, `duration_hours`, `difficulty`, `type`, `tags`, `description`, `prerequisite_ids`, `access_model`.
- Valid `tags`: `no-code`, `prompting`, `python-basics`, `ml-fundamentals`, `llm-concepts`, `api-usage`, `agents`, `fine-tuning`, `data-science`, `practical-project`, `career-focused`, `research-oriented`.
- Valid `access_model`: `free`, `free_account`, `free_with_upsell`, `free_audit`.

## Key Constraints

- The "why this for you" strings in `recommend.js` are hardcoded by course ID. Adding a new course requires adding a matching entry there, or it falls back to a generic string.
- Course ordering is purely topological; within a path bucket, the order depends on the array order in `curriculum.json`.
- There is no database or auth — `feedback.json` is written locally and is gitignored.
- `ANTHROPIC_API_KEY` must come from `process.env` — never hardcode it. `/api/discover` and `/api/spark` both fail silently/gracefully if it's missing or the call errors (see error-handling notes above); check `pm2 logs` on the VPS, not the browser, when debugging either feature.
- The Anthropic web search tool used by `/api/discover` is token-hungry — the prompt explicitly caps it at ~2 searches to avoid blowing through per-minute rate limits on lower API tiers.
- Production deploys go through the `vps-deploy` skill (`.claude/skills/vps-deploy/`) — frontend changes need a full rebuild (`npm run build` + `pm2 reload`), backend-only changes just need `pm2 restart`.
