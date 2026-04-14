# CLAUDE.md — Data Crawler Carl

## Project

Data Crawler Carl is a browser-based AI data explorer. Upload any CSV, query it with natural language or SQL, and visualize results with auto-generated charts. No server required — everything runs in the browser.

## Tech stack

- **SQLite (sql.js)** — WebAssembly-compiled SQLite for in-browser SQL queries
- **PapaParse** — CSV parsing with type inference
- **Plotly.js** — Chart rendering (bar and scatter only, parameterized — no eval)
- **Google Gemini** — AI chat via `@google/genai` SDK loaded from ESM CDN
- **Vanilla JS** — ES modules, no build step, no framework

## Architecture

```
docs/js/
├── key-manager.js    — ?key= URL param → sessionStorage
├── gemini-api.js     — Gemini SDK bridge (lazy-loaded from CDN)
├── sql-engine.js     — sql.js wrapper: loadCSV(), executeSQL()
├── chart-renderer.js — Safe Plotly rendering from JSON specs
├── csv-explorer.js   — Reusable UI component (tabs, table, chat, upload)
└── app.js            — Standalone config (system prompt, presets)
```

## Key design decisions

- **No eval / no Function()** — Gemini returns JSON chart specs, we validate and call Plotly ourselves
- **Only bar and scatter** chart types — intentionally limited for safety
- **sessionStorage** for API keys — never persisted to disk, cleared on tab close
- **SQL blocks auto-execute** — ```` ```sql ```` in Gemini responses runs against local SQLite
- **Chart blocks render** — ```` ```chart ```` JSON specs are validated then rendered via Plotly

## Local preview

```bash
python3 -m http.server 4173 -d docs
```

Then open http://localhost:4173

## Deployment

GitHub Pages from `docs/` on `main` branch. Workflow in `.github/workflows/pages.yml`.

## Related repos

- **REACHWorkshop2026** — Workshop site that links to this tool from slide decks
- **promptulus** — Similar pattern: standalone AI tool on GitHub Pages
