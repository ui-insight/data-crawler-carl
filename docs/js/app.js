// Data Crawler Carl — standalone app config
import { getKey, setKey, readKeyFromURL } from './key-manager.js';
import { initAPI, hasAPIKey, callGemini } from './gemini-api.js';
import { createCSVExplorer } from './csv-explorer.js';

// Sample dataset for quick demo
const SAMPLE_CSV = `Name,Department,Role,Salary,Start_Date,City
Alice Chen,Engineering,Senior Engineer,125000,2019-03-15,Seattle
Bob Martinez,Marketing,Director,145000,2017-06-01,New York
Carol Davis,Engineering,Staff Engineer,155000,2016-11-20,Seattle
Dan Wilson,Sales,Account Manager,95000,2021-01-10,Chicago
Emily Brooks,Marketing,Analyst,78000,2022-05-22,New York
Frank Kim,Engineering,Junior Engineer,92000,2023-08-14,Austin
Grace Liu,Product,Product Manager,135000,2018-09-03,Seattle
Hank Patel,Sales,VP Sales,180000,2015-04-18,New York
Iris Johnson,Engineering,Senior Engineer,130000,2020-07-01,Austin
Jake Thompson,Product,Designer,105000,2021-12-05,Chicago
Karen Okafor,Marketing,Manager,115000,2019-10-28,Seattle
Leo Torres,Engineering,Principal Engineer,175000,2014-02-14,Seattle
Monica Reed,Sales,Account Executive,88000,2023-03-30,Chicago
Nathan Park,Product,Senior PM,150000,2017-08-12,New York
Olivia Grant,Engineering,Manager,160000,2016-05-09,Austin`;

const GENERIC_PRESETS = [
  { label: 'Summarize data',   text: 'Summarize this dataset. What are the key patterns and trends?' },
  { label: 'Show statistics',  text: 'Show summary statistics for the numeric columns.' },
  { label: 'Data quality',     text: 'Are there any data quality issues like missing values, duplicates, or outliers?' },
  { label: 'Plot something',   text: 'Pick the most interesting relationship or distribution in this dataset and create a chart to visualize it. Choose the best chart type for the data.' }
];

function buildSystemPrompt(columns, rowCount, csvSample) {
  return `You are an AI data analyst helping explore a dataset interactively.

You have access to a SQLite table called "data" with ${rowCount} rows and these columns: ${columns.join(', ')}

Here is a sample of the data (CSV format):

${csvSample}

Guidelines:
- Respond with clear, concise analysis formatted in markdown. Use tables, bullet points, and bold text.
- Keep responses focused and under 400 words.
- When analyzing monetary amounts, format them as currency ($125,000).
- You can write SQL queries using SQLite syntax. Put them in \`\`\`sql code blocks and they will be auto-executed against the data.
- CRITICAL: SQL queries are auto-executed and results appear inline right after each SQL block. You MUST NOT repeat, summarize, or restate query results in your text. Do NOT write markdown tables with result data. Do NOT list rows like "Department: X, Count: Y". The user already sees the real results — just refer to them naturally (e.g. "As shown above..." or "The results show that..."). Any numbers you write in prose MUST come from the actual query — do NOT guess or hallucinate values.
- Do NOT use window functions (SQLite limitation). Use subqueries instead.
- You can create charts by writing a JSON chart spec in a \`\`\`chart code block.
  Supported types: bar, scatter, line, pie, histogram, box, heatmap.
  Chart spec formats:
  - bar/scatter/line: { "type": "...", "x": [...], "y": [...], "title": "...", "xLabel": "...", "yLabel": "..." }
  - pie: { "type": "pie", "labels": [...], "values": [...], "title": "..." }
  - histogram: { "type": "histogram", "x": [...], "title": "...", "xLabel": "..." }
  - box: { "type": "box", "y": [...], "x": [...optional grouping...], "title": "..." }
  - heatmap: { "type": "heatmap", "z": [[...], ...], "x": [...], "y": [...], "title": "..." }
  Always hardcode the data arrays in chart specs (do not reference SQL results).
- TRENDLINES: For any chart with numeric x/y data, you CAN add a trendline by including "trendline": true in the chart spec JSON. This overlays a linear regression line. Use it whenever the user asks for trends, correlations, or trendlines.
- MODIFYING CHARTS: When the user asks to add a trendline, change a chart type, or modify a previous chart in any way, simply re-create the entire chart spec from scratch with the requested changes applied. You always have full control over chart output — just emit a new \`\`\`chart block with the updated spec.`;
}

function setupApiKeyNav(explorer) {
  var btn = document.getElementById('api-key-btn');
  var modal = document.getElementById('api-key-modal');
  var closeBtn = document.getElementById('api-key-close');
  var dot = document.getElementById('api-key-dot');
  var input = document.getElementById('api-key-input');
  var saveBtn = document.getElementById('api-key-save');
  var status = document.getElementById('api-key-status');

  if (!btn || !modal) return;

  function updateStatus() {
    if (hasAPIKey()) {
      dot.classList.add('connected');
      status.textContent = 'Key is set for this session.';
      status.className = 'api-key-status ok';
      input.value = '';
      input.placeholder = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (saved)';
    } else {
      dot.classList.remove('connected');
      status.textContent = '';
      status.className = 'api-key-status';
      input.placeholder = 'Paste your Gemini API key here...';
    }
  }

  btn.addEventListener('click', function () {
    updateStatus();
    modal.classList.add('visible');
  });

  closeBtn.addEventListener('click', function () {
    modal.classList.remove('visible');
  });

  modal.addEventListener('click', function (e) {
    if (e.target === modal) modal.classList.remove('visible');
  });

  saveBtn.addEventListener('click', function () {
    var val = input.value.trim();
    if (val) {
      setKey(val);
      initAPI(val);
      updateStatus();
      // Re-render explorer if it was showing the no-key state
      var container = document.getElementById('explorer');
      if (container && container.querySelector('.eda-no-key')) {
        explorer.destroy();
        Object.assign(explorer, createCSVExplorer(container, {
          defaultCSV: null,
          systemPromptBuilder: buildSystemPrompt,
          presetPrompts: GENERIC_PRESETS,
          onDataChange: function () { return GENERIC_PRESETS; },
          geminiCaller: callGemini,
          hasKey: hasAPIKey,
          getKey: getKey,
          setKey: setKey,
          initAPI: initAPI,
          showUpload: true
        }));
      }
    }
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') saveBtn.click();
  });

  updateStatus();
}

function init() {
  readKeyFromURL();

  var key = getKey();
  if (key && !hasAPIKey()) {
    initAPI(key);
  }

  var container = document.getElementById('explorer');
  if (!container) return;

  // Load sample button
  var sampleBtn = document.getElementById('load-sample');
  var explorer = null;

  explorer = createCSVExplorer(container, {
    defaultCSV: null,
    systemPromptBuilder: buildSystemPrompt,
    presetPrompts: GENERIC_PRESETS,
    onDataChange: function () {
      return GENERIC_PRESETS;
    },
    geminiCaller: callGemini,
    hasKey: hasAPIKey,
    getKey: getKey,
    setKey: setKey,
    initAPI: initAPI,
    showUpload: true
  });

  if (sampleBtn) {
    sampleBtn.addEventListener('click', function () {
      explorer.loadData(SAMPLE_CSV);
      sampleBtn.style.display = 'none';
    });
  }

  setupApiKeyNav(explorer);
  setupNavModals();
}

function setupNavModals() {
  [['about-btn', 'about-modal', 'about-close'],
   ['how-btn', 'how-modal', 'how-close']].forEach(function (ids) {
    var btn = document.getElementById(ids[0]);
    var modal = document.getElementById(ids[1]);
    var closeBtn = document.getElementById(ids[2]);
    if (!btn || !modal) return;

    btn.addEventListener('click', function () { modal.classList.add('visible'); });
    if (closeBtn) closeBtn.addEventListener('click', function () { modal.classList.remove('visible'); });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.classList.remove('visible');
    });
  });
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
