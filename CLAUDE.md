# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**pathfinder.ai** — a free AI learning curriculum generator. Users take a 6-question quiz; the backend scores their answers against 7 hard-coded learning paths and returns a personalized, ordered list of free courses from `src/data/curriculum.json`.

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

## Architecture

**Frontend** (`src/frontend/`) — React 19 SPA bundled with Vite.
- `vite.config.js` proxies `/api/*` to `localhost:3001`, so fetch calls use relative paths.
- App state is 3 stages: Landing → Quiz → Results (managed in `App.jsx`).
- Quiz answers can be pre-loaded from `?answers=<encoded>` URL param for shareable links.

**Backend** (`src/server/`) — Express on port 3001.
- `POST /api/recommend` — main endpoint; calls `recommend(answers)` in `recommend.js`.
- `POST /api/feedback` — appends to a local `feedback.json` file (not committed).
- In production (`NODE_ENV=production`), serves the built frontend from `src/frontend/dist` and falls back all unknown routes to `index.html`.

**Recommendation engine** (`src/server/recommend.js`) — pure function, no database.
- `recommend(answers)` maps quiz answers → one of 7 path buckets → filters `curriculum.json` by tags → topological sort (prerequisites first) → caps at 8 courses → annotates each with a "why this for you" string.
- `topologicalSort(selectedIds)` uses DFS over `prerequisite_ids` to enforce ordering.
- Path selection is driven primarily by `goal` and `devBackground` fields; `timePerWeek === 0` (< 3 hrs) filters to shorter courses.

**Data** (`src/data/curriculum.json`) — single source of truth for all courses.
- Editing this file is the primary way to add/remove/update courses.
- Required fields: `id`, `title`, `provider`, `url`, `duration_hours`, `difficulty`, `type`, `tags`, `description`, `prerequisite_ids`, `access_model`.
- Valid `tags`: `no-code`, `prompting`, `python-basics`, `ml-fundamentals`, `llm-concepts`, `api-usage`, `agents`, `fine-tuning`, `data-science`, `practical-project`, `career-focused`, `research-oriented`.
- Valid `access_model`: `free`, `free_account`, `free_with_upsell`, `free_audit`.

## Key Constraints

- The "why this for you" strings in `recommend.js` are hardcoded by course ID. Adding a new course requires adding a matching entry there, or it falls back to a generic string.
- Course ordering is purely topological; within a path bucket, the order depends on the array order in `curriculum.json`.
- There is no database or auth — `feedback.json` is written locally and is gitignored.
