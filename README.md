# Data Crawler Carl

AI-powered CSV data explorer that runs entirely in your browser. Upload any CSV, query it with natural language and SQL, and visualize results with auto-generated charts.

## How it works

1. **Upload a CSV** — parsed with PapaParse, loaded into an in-browser SQLite database (sql.js WebAssembly)
2. **Ask questions** — natural language queries sent to the AI provider that issued your key, along with your data schema
3. **Auto-execute SQL** — SQL in the model's responses runs against your local database, results shown inline
4. **Safe charts** — Chart specs are parsed as JSON and rendered with Plotly.js (bar/scatter only, no code execution)

No data leaves your browser except what is sent to that provider: your questions, the column names, a 5-row sample, and the results of the queries that run.

## Try it

**Live:** [ui-insight.github.io/data-crawler-carl](https://ui-insight.github.io/data-crawler-carl/)

**Local:**
```bash
python3 -m http.server 4173 -d docs
# Open http://localhost:4173
```

## API Key

Requires an API key. A [Google Gemini key](https://aistudio.google.com/app/apikey) is the free option: there is no application, and a project with no billing account stays on the free tier, though Google asks for a quick phone check on some projects. On that tier Google may use what you send to improve its products, so don't use sensitive data. The site's **API Key** dialog has the steps. The key's prefix picks the backend, so a key is only sent to the provider that issued it:

| Key starts with | Backend | Model (set in `docs/js/api.js`) |
|---|---|---|
| `sk-ant-` | Anthropic Claude | `claude-haiku-5-5` |
| `sk-or-` | OpenRouter | `anthropic/claude-haiku-5.5` |
| `sk-` (other) | OpenAI | `gpt-6-luna` |
| anything else | Google Gemini | `gemini-3.5-flash-lite` |

Anthropic, OpenAI, and OpenRouter keys have no free tier for these models: each message is billed to the account that owns the key, so set a spending limit. A Claude or ChatGPT chat subscription does not include API access. OpenRouter forwards requests to the model's own provider, which is Anthropic for the default model.

A University of Idaho MindRouter key (prefix `mr2_`) pasted or passed via `?key=...` is routed to the University's own models through the lakehouse proxy instead. The site does not advertise this; use a dedicated MindRouter key and revoke it when you're done sharing it.

Pass via URL: `?key=YOUR_KEY` (stored in sessionStorage, stripped from URL, cleared on tab close).

## Contributing

Contributions are welcome by pull request. By submitting a contribution you agree that it will be licensed under the [Apache License, Version 2.0](LICENSE), the same license as the project, and you represent that you have the right to license it under those terms. Contributions keep the attribution in [NOTICE](NOTICE) intact.

## License

Copyright 2026 Nathan Layman.

Licensed under the [Apache License, Version 2.0](LICENSE). The [NOTICE](NOTICE) file carries four attributions: Nathan Layman as the author, the University of Idaho, the AI4RA project, and the National Science Foundation award that funded the work. Under Section 4(d) of the license, anyone who redistributes this software or a derivative work must keep all four. To cite the project, use [CITATION.cff](CITATION.cff).

## Third-party software

The site loads these open source libraries from public CDNs. Each stays under its own license; full notices are in [NOTICE](NOTICE).

| Library | Use | License |
|---|---|---|
| [PapaParse](https://github.com/mholt/PapaParse) 5.4.1 | CSV parsing | MIT |
| [sql.js](https://github.com/sql-js/sql.js) 1.10.3 | SQLite in WebAssembly (SQLite itself is public domain) | MIT |
| [Plotly.js](https://github.com/plotly/plotly.js) 2.35.2 | Charts | MIT |
| [marked](https://github.com/markedjs/marked) | Markdown rendering | MIT |
| [@google/genai](https://github.com/googleapis/js-genai) | Gemini SDK | Apache-2.0 |
| [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) | Claude SDK | Apache-2.0 |

## Acknowledgments

Data Crawler Carl is a project of [AI4RA](https://github.com/AI4RA) at the University of Idaho. This material is based upon work supported by the National Science Foundation under the GRANTED program, [NSF Award #2427549](https://www.nsf.gov/awardsearch/show-award?AWD_ID=2427549), "Crossing the Innovation Valley of Death: Democratizing Data and Artificial Intelligence for Research Administration." Any opinions, findings, conclusions or recommendations expressed in this material are those of the author and do not necessarily reflect the views of the National Science Foundation.
