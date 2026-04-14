# Data Crawler Carl

AI-powered CSV data explorer that runs entirely in your browser. Upload any CSV, query it with natural language and SQL, and visualize results with auto-generated charts.

## How it works

1. **Upload a CSV** — parsed with PapaParse, loaded into an in-browser SQLite database (sql.js WebAssembly)
2. **Ask questions** — natural language queries sent to Google Gemini along with your data schema
3. **Auto-execute SQL** — SQL in Gemini's responses runs against your local database, results shown inline
4. **Safe charts** — Chart specs are parsed as JSON and rendered with Plotly.js (bar/scatter only, no code execution)

No data leaves your browser except the schema sample sent to Gemini for context.

## Try it

**Live:** [ui-insight.github.io/data-crawler-carl](https://ui-insight.github.io/data-crawler-carl/)

**Local:**
```bash
python3 -m http.server 4173 -d docs
# Open http://localhost:4173
```

## API Key

Requires a [Google Gemini API key](https://aistudio.google.com/app/apikey) (free tier works).

Pass via URL: `?key=YOUR_KEY` (stored in sessionStorage, stripped from URL, cleared on tab close).

## Part of the AI4RA Workshop

Used as an interactive activity in the [REACH 2026 AI4RA Workshop](https://ui-insight.github.io/REACHWorkshop2026/) — Data Lakehouse session.
