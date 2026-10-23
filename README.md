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

Facilitators only: a University of Idaho MindRouter key (prefix `mr2_`) pasted or passed via `?key=...` is routed to the University's own models through the lakehouse proxy instead of Google. The site does not advertise this; mint a workshop-specific MindRouter key and revoke it afterward.

Pass via URL: `?key=YOUR_KEY` (stored in sessionStorage, stripped from URL, cleared on tab close).

## Part of the AI4RA Workshop

Used as an interactive activity in the [REACH 2026 AI4RA Workshop](https://ui-insight.github.io/REACHWorkshop2026/) — Data Lakehouse session.

## Contributing

Contributions are welcome by pull request. By submitting a contribution you agree that it will be licensed under the [Apache License, Version 2.0](LICENSE), the same license as the project, and you represent that you have the right to license it under those terms. Contributions keep the attribution in [NOTICE](NOTICE) intact.

## License

Copyright 2026 Nathan Layman.

Licensed under the [Apache License, Version 2.0](LICENSE). The [NOTICE](NOTICE) file carries four attributions: Nathan Layman as the author, the University of Idaho, the AI4RA project, and the National Science Foundation award that funded the work. Under Section 4(d) of the license, anyone who redistributes this software or a derivative work must keep all four. To cite the project, use [CITATION.cff](CITATION.cff).

## Acknowledgments

Data Crawler Carl is a project of [AI4RA](https://github.com/AI4RA) at the University of Idaho. This material is based upon work supported by the National Science Foundation under the GRANTED program, [NSF Award #2427549](https://www.nsf.gov/awardsearch/show-award?AWD_ID=2427549), "Crossing the Innovation Valley of Death: Democratizing Data and Artificial Intelligence for Research Administration." Any opinions, findings, conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.
