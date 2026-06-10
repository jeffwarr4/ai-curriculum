# pathfinder.ai — AI Learning Curriculum

A free, honest alternative to low-quality "get rich with AI" courses.

Takes a 6-question profile quiz and generates a personalized, ordered learning path from real, free resources (Anthropic Academy, fast.ai, DeepLearning.AI, Kaggle, Harvard CS50, Karpathy, and more).

**No email capture. No sign-up wall. No certificate upsells.**

---

## Getting started

```bash
npm install
npm run dev
```

- Frontend runs at http://localhost:5173
- Backend API at http://localhost:3001

## Project structure

```
src/
  frontend/       # Vite + React app
  server/
    index.js      # Express server
    recommend.js  # Recommendation engine
  data/
    curriculum.json  # All course data
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run frontend + backend concurrently |
| `npm run build` | Build frontend for production |
| `npm start` | Run production server |

## Adding courses

Edit `src/data/curriculum.json`. Each course needs:
- `id`, `title`, `provider`, `url`
- `duration_hours`, `difficulty`, `type`
- `tags` (see below for valid tags)
- `description` — honest 1–2 sentences
- `prerequisite_ids`
- `access_model`: `free` | `free_account` | `free_with_upsell` | `free_audit`
- `access_note` (only for upsell/audit — one sentence explaining the friction)

Valid tags: `no-code`, `prompting`, `python-basics`, `ml-fundamentals`, `llm-concepts`, `api-usage`, `agents`, `fine-tuning`, `data-science`, `practical-project`, `career-focused`, `research-oriented`

## Design principles

- No red warning icons, no aggressive CTAs
- Access friction shown honestly with quiet badges
- Prerequisite chain enforced — no course appears before its dependencies
- Every path ends with a concrete project suggestion
