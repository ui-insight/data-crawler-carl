// csv-explorer.js — Reusable CSV data analysis component
// Dependencies: sql-engine.js, chart-renderer.js, gemini-api.js, key-manager.js
// CDN globals: marked, Papa, initSqlJs, Plotly

import { initSQLEngine, isReady as isSQLReady, loadCSV, executeSQL } from './sql-engine.js';
import { renderChart, isValidChartSpec } from './chart-renderer.js';

/**
 * Create a CSV Explorer instance.
 * @param {HTMLElement} containerEl - DOM element to render into
 * @param {object} options
 * @param {string} [options.defaultCSV] - CSV string to load on init
 * @param {function} options.systemPromptBuilder - (columns, rowCount, csvSample) => string
 * @param {Array} options.presetPrompts - [{label, text}]
 * @param {function} [options.onDataChange] - (columns, rowCount) => new presets array or void
 * @param {function} options.geminiCaller - (systemPrompt, history, message) => Promise<string>
 * @param {function} options.hasKey - () => boolean
 * @param {function} options.getKey - () => string
 * @param {function} options.setKey - (key) => void
 * @param {function} options.initAPI - (key) => void
 * @param {boolean} [options.showUpload=true]
 * @param {string} [options.infoHTML] - HTML content for the info modal
 * @returns {object} { loadData, reset, destroy }
 */
export function createCSVExplorer(containerEl, options) {
  var conversationHistory = [];
  var currentColumns = [];
  var currentRowCount = 0;
  var currentCSVSample = '';
  var currentParsedData = [];
  var activePresets = options.presetPrompts || [];
  var sqlReady = false;

  // Initialize
  async function init() {
    try {
      await initSQLEngine();
      sqlReady = true;
    } catch (e) {
      console.warn('SQL engine failed to load:', e);
    }

    if (options.defaultCSV) {
      loadData(options.defaultCSV);
    }

    render();
  }

  function loadData(csvString) {
    if (!sqlReady) return;
    var result = loadCSV(csvString);
    currentColumns = result.columns;
    currentRowCount = result.rowCount;
    currentParsedData = result.parsedData;

    // Build CSV sample (header + first 5 rows)
    var lines = csvString.trim().split('\n');
    currentCSVSample = lines.slice(0, 6).join('\n');

    // Reset conversation
    conversationHistory = [];

    // Update presets if callback provided
    if (options.onDataChange) {
      var newPresets = options.onDataChange(currentColumns, currentRowCount);
      if (newPresets) activePresets = newPresets;
    }
  }

  function render() {
    if (!options.hasKey()) {
      renderNoKey();
      return;
    }
    renderFull();
  }

  function renderNoKey() {
    containerEl.innerHTML =
      '<div class="eda-no-key">' +
        '<p>A Gemini API key is required to use the AI chat.</p>' +
        '<p>Click <strong>API Key</strong> in the top bar to set one, or use a link with <code>?key=</code>.</p>' +
        '<div class="eda-key-inline">' +
          '<input type="password" id="eda-key-input" placeholder="Or paste key here..." />' +
          '<button id="eda-key-btn" class="eda-btn">Connect</button>' +
        '</div>' +
      '</div>';

    containerEl.querySelector('#eda-key-btn').addEventListener('click', function () {
      var val = containerEl.querySelector('#eda-key-input').value.trim();
      if (val) {
        options.setKey(val);
        options.initAPI(val);
        render();
      }
    });
  }

  function renderFull() {
    var tableHtml = buildTableHtml(currentParsedData, currentColumns);

    var presetsHtml = activePresets.map(function (p, i) {
      return '<button class="eda-preset" data-idx="' + i + '">' + escapeHtml(p.label) + '</button>';
    }).join('');

    var uploadHtml = '';
    if (options.showUpload !== false) {
      uploadHtml =
        '<div class="eda-upload-zone" id="eda-upload-zone">' +
          '<span>Drop CSV or </span>' +
          '<label class="eda-upload-link">browse<input type="file" accept=".csv,.tsv,.txt" id="eda-file-input" /></label>' +
        '</div>';
    }

    containerEl.innerHTML =
      '<div class="eda-layout" id="eda-layout">' +
        // Left pane — data table only
        '<div class="eda-left-pane" id="eda-left-pane">' +
          '<div class="eda-tabs">' +
            '<span class="eda-tab active" style="cursor:default;">Data</span>' +
            '<span class="eda-meta">' + currentRowCount + ' rows &times; ' + currentColumns.length + ' cols</span>' +
          '</div>' +
          uploadHtml +
          '<div class="eda-table-scroll">' + tableHtml + '</div>' +
        '</div>' +
        // Draggable resizer
        '<div class="eda-resizer" id="eda-resizer"></div>' +
        // Right pane
        '<div class="eda-chat-pane">' +
          '<div class="eda-presets" id="eda-presets">' +
            presetsHtml +
          '</div>' +
          '<div class="eda-messages" id="eda-messages"></div>' +
          '<div class="eda-input-row">' +
            '<input type="text" id="eda-input" placeholder="Ask a question about the data..." />' +
            '<button id="eda-send" class="eda-btn">Send</button>' +
            '<button id="eda-clear" class="eda-btn eda-btn-clear" title="Clear conversation">Clear</button>' +
            '<button id="eda-mongo" class="eda-btn eda-btn-mongo" title="Mongo no!">Mongo no!</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindEvents();
  }

  function buildTableHtml(data, columns) {
    if (!columns || columns.length === 0) return '<p style="padding:0.5rem;color:#888;">No data loaded</p>';

    var html = '<table class="eda-table"><thead><tr>';
    columns.forEach(function (col) {
      html += '<th>' + escapeHtml(col) + '</th>';
    });
    html += '</tr></thead><tbody>';

    // Show up to 200 rows in the table
    var limit = Math.min(data.length, 200);
    for (var r = 0; r < limit; r++) {
      html += '<tr>';
      columns.forEach(function (col) {
        var val = data[r][col];
        if (val === null || val === undefined || val === '') {
          html += '<td><span class="eda-missing">--</span></td>';
        } else {
          html += '<td>' + escapeHtml(String(val)) + '</td>';
        }
      });
      html += '</tr>';
    }
    html += '</tbody></table>';

    if (data.length > 200) {
      html += '<p style="text-align:center;font-size:0.5rem;color:#888;padding:0.15rem;">Showing 200 of ' + data.length + ' rows</p>';
    }
    return html;
  }

  function buildResultTableHtml(columns, values) {
    var html = '<table><thead><tr>';
    columns.forEach(function (c) { html += '<th>' + escapeHtml(c) + '</th>'; });
    html += '</tr></thead><tbody>';
    values.forEach(function (row) {
      html += '<tr>';
      row.forEach(function (v) {
        html += '<td>' + escapeHtml(v === null ? 'NULL' : String(v)) + '</td>';
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  }

  // ── Response processing ──

  function processResponse(responseText, messagesEl) {
    var div = document.createElement('div');
    div.className = 'eda-msg eda-msg-model';

    // Render markdown
    var html = (typeof marked !== 'undefined' && marked.parse)
      ? marked.parse(responseText)
      : responseText.replace(/\n/g, '<br>');

    div.innerHTML = html;

    // Extract and execute SQL blocks — show results inline after each SQL block
    var sqlBlocks = extractSQLBlocks(responseText);
    var codeEls = div.querySelectorAll('code.language-sql');
    sqlBlocks.forEach(function (block, i) {
      var resultDiv = document.createElement('div');
      resultDiv.className = 'eda-sql-result-inline';

      if (block.error) {
        resultDiv.innerHTML = '<div class="eda-sql-error">' + escapeHtml(block.error) + '</div>';
      } else if (block.columns.length > 0 && block.values.length > 0) {
        resultDiv.innerHTML = buildResultTableHtml(block.columns, block.values);
      }

      // Insert result after the SQL code block's <pre>
      if (i < codeEls.length) {
        var pre = codeEls[i].closest('pre');
        if (pre) {
          pre.after(resultDiv);
        } else {
          div.appendChild(resultDiv);
        }
      } else {
        div.appendChild(resultDiv);
      }
    });

    // Extract and render chart specs
    var chartBlocks = extractChartBlocks(responseText);
    var chartCodeEls = div.querySelectorAll('code.language-chart');
    chartBlocks.forEach(function (spec, i) {
      var chartId = 'eda-chart-' + Date.now() + '-' + i;
      var chartDiv = document.createElement('div');
      chartDiv.id = chartId;
      chartDiv.className = 'eda-chart-container';

      // Insert after the code block, or append at end
      if (i < chartCodeEls.length) {
        var pre = chartCodeEls[i].closest('pre');
        if (pre) {
          pre.style.display = 'none';
          pre.after(chartDiv);
        } else {
          div.appendChild(chartDiv);
        }
      } else {
        div.appendChild(chartDiv);
      }

      if (spec.error) {
        chartDiv.innerHTML = '<div class="eda-chart-error">' + escapeHtml(spec.error) + '</div>';
      } else {
        // Defer Plotly render to after DOM insertion
        setTimeout(function () {
          var success = renderChart(chartDiv, spec);
          if (!success) {
            chartDiv.innerHTML = '<div class="eda-chart-error">Could not render chart</div>';
          }
        }, 0);
      }
    });

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function extractSQLBlocks(text) {
    var regex = /```sql\n([\s\S]*?)```/g;
    var results = [];
    var match;
    while ((match = regex.exec(text)) !== null) {
      var sql = match[1].trim();
      if (!sqlReady) {
        results.push({ sql: sql, error: 'SQL engine not available', columns: [], values: [] });
        continue;
      }
      try {
        var result = executeSQL(sql);
        results.push({ sql: sql, columns: result.columns, values: result.values });
      } catch (e) {
        results.push({ sql: sql, error: e.message, columns: [], values: [] });
      }
    }
    return results;
  }

  function resolveChartSpec(spec) {
    // If spec has a sql + columns mapping, execute the SQL and populate data arrays
    if (spec.sql && spec.columns && sqlReady) {
      try {
        var result = executeSQL(spec.sql);
        var cols = spec.columns;
        var type = spec.type;

        // Extract column data from SQL results
        function getCol(name) {
          var idx = result.columns.indexOf(name);
          if (idx === -1) return null;
          return result.values.map(function (row) { return row[idx]; });
        }

        if (type === 'pie') {
          spec.labels = getCol(cols.labels) || [];
          spec.values = getCol(cols.values) || [];
        } else if (type === 'histogram') {
          spec.x = getCol(cols.x) || [];
        } else if (type === 'box') {
          spec.y = getCol(cols.y) || [];
          if (cols.x) spec.x = getCol(cols.x) || [];
        } else if (type === 'heatmap') {
          // For heatmap, pivot: unique x values as columns, unique y values as rows, z as the matrix
          var xArr = getCol(cols.x) || [];
          var yArr = getCol(cols.y) || [];
          var zArr = getCol(cols.z) || [];
          var uniqueX = []; var uniqueY = [];
          xArr.forEach(function (v) { if (uniqueX.indexOf(v) === -1) uniqueX.push(v); });
          yArr.forEach(function (v) { if (uniqueY.indexOf(v) === -1) uniqueY.push(v); });
          var matrix = uniqueY.map(function () { return uniqueX.map(function () { return 0; }); });
          for (var i = 0; i < xArr.length; i++) {
            var xi = uniqueX.indexOf(xArr[i]);
            var yi = uniqueY.indexOf(yArr[i]);
            if (xi !== -1 && yi !== -1) matrix[yi][xi] = zArr[i];
          }
          spec.x = uniqueX;
          spec.y = uniqueY;
          spec.z = matrix;
        } else {
          // bar, scatter, line
          spec.x = getCol(cols.x) || [];
          spec.y = getCol(cols.y) || [];
        }

        // Remove sql/columns so isValidChartSpec checks the data arrays
        delete spec.sql;
        delete spec.columns;
      } catch (e) {
        return { error: 'Chart SQL error: ' + e.message };
      }
    }
    return spec;
  }

  function extractChartBlocks(text) {
    var regex = /```chart\n([\s\S]*?)```/g;
    var results = [];
    var match;
    while ((match = regex.exec(text)) !== null) {
      try {
        var spec = JSON.parse(match[1].trim());
        spec = resolveChartSpec(spec);
        if (spec.error) {
          results.push(spec);
        } else if (isValidChartSpec(spec)) {
          results.push(spec);
        } else {
          results.push({ error: 'Invalid chart spec' });
        }
      } catch (e) {
        results.push({ error: 'Could not parse chart JSON: ' + e.message });
      }
    }
    return results;
  }

  // ── Chat ──

  function appendMessage(role, text) {
    var messagesEl = containerEl.querySelector('#eda-messages');
    if (!messagesEl) return null;

    if (role === 'model') {
      return processResponse(text, messagesEl);
    }

    var div = document.createElement('div');
    div.className = 'eda-msg eda-msg-' + role;

    if (role === 'loading') {
      div.innerHTML = '<div class="eda-loading"><span></span><span></span><span></span></div>';
    } else if (role === 'error') {
      div.textContent = text;
    } else {
      div.textContent = text;
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  function formatResultsForAI(sqlBlocks) {
    var parts = [];
    sqlBlocks.forEach(function (block, i) {
      parts.push('Query ' + (i + 1) + ': ' + block.sql);
      if (block.error) {
        parts.push('Error: ' + block.error);
      } else if (block.columns.length > 0 && block.values.length > 0) {
        // Format as a simple text table
        parts.push(block.columns.join('\t'));
        block.values.forEach(function (row) {
          parts.push(row.map(function (v) { return v === null ? 'NULL' : String(v); }).join('\t'));
        });
      } else {
        parts.push('(no results)');
      }
      parts.push('');
    });
    return parts.join('\n');
  }

  async function sendMessage(text) {
    if (currentColumns.length === 0) {
      appendMessage('error', 'Please upload a CSV file first.');
      return;
    }
    appendMessage('user', text);

    var inputEl = containerEl.querySelector('#eda-input');
    var sendBtn = containerEl.querySelector('#eda-send');
    if (inputEl) inputEl.value = '';
    if (sendBtn) sendBtn.disabled = true;

    var loadingEl = appendMessage('loading', '');

    var systemPrompt = options.systemPromptBuilder(currentColumns, currentRowCount, currentCSVSample);

    try {
      // ROUND 1: Ask Gemini for SQL queries
      var round1 = await options.geminiCaller(systemPrompt, conversationHistory, text);
      conversationHistory.push({ role: 'user', text: text });
      conversationHistory.push({ role: 'model', text: round1 });

      // Execute any SQL blocks from round 1
      var sqlBlocks = extractSQLBlocks(round1);

      if (sqlBlocks.length > 0) {
        // Show the SQL queries to the user (without analysis)
        if (loadingEl) loadingEl.remove();
        appendMessage('model', round1);
        loadingEl = appendMessage('loading', '');

        // ROUND 2: Send actual results back, ask for analysis + charts
        var resultsText = formatResultsForAI(sqlBlocks);
        var round2Prompt = 'Here are the actual query results from the database:\n\n' + resultsText + '\nNow analyze these results. Provide insights and create charts if appropriate. Use ONLY the numbers above — do not invent data.';

        var round2 = await options.geminiCaller(systemPrompt, conversationHistory, round2Prompt);
        conversationHistory.push({ role: 'user', text: round2Prompt });
        conversationHistory.push({ role: 'model', text: round2 });

        if (loadingEl) loadingEl.remove();
        appendMessage('model', round2);
      } else {
        // No SQL needed — just show the response directly
        if (loadingEl) loadingEl.remove();
        appendMessage('model', round1);
      }
    } catch (e) {
      if (loadingEl) loadingEl.remove();
      appendMessage('error', 'Error: ' + e.message);
    }

    if (sendBtn) sendBtn.disabled = false;
  }

  // ── Event binding ──

  function bindEvents() {
    // Preset prompts
    containerEl.querySelectorAll('.eda-preset').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var idx = parseInt(btn.dataset.idx);
        sendMessage(activePresets[idx].text);
      });
    });

    // Free text input
    var input = containerEl.querySelector('#eda-input');
    var sendBtn = containerEl.querySelector('#eda-send');
    if (sendBtn) {
      sendBtn.addEventListener('click', function () {
        var text = input.value.trim();
        if (text) sendMessage(text);
      });
    }
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var text = input.value.trim();
          if (text) sendMessage(text);
        }
      });
    }

    // Mongo no! easter egg
    var mongoBtn = containerEl.querySelector('#eda-mongo');
    if (mongoBtn) {
      mongoBtn.addEventListener('click', function () {
        var chatPane = containerEl.querySelector('.eda-chat-pane');
        if (!chatPane) return;
        var img = document.createElement('img');
        img.src = 'img/mongo.png';
        img.className = 'mongo-run';
        img.alt = 'Mongo no!';
        chatPane.appendChild(img);
        img.addEventListener('animationend', function () { img.remove(); });
      });
    }

    // Clear conversation
    var clearBtn = containerEl.querySelector('#eda-clear');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        conversationHistory = [];
        var messagesEl = containerEl.querySelector('#eda-messages');
        if (messagesEl) messagesEl.innerHTML = '';
      });
    }

    // File upload
    var uploadZone = containerEl.querySelector('#eda-upload-zone');
    var fileInput = containerEl.querySelector('#eda-file-input');

    if (uploadZone && fileInput) {
      uploadZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        uploadZone.classList.add('hover');
      });
      uploadZone.addEventListener('dragleave', function () {
        uploadZone.classList.remove('hover');
      });
      uploadZone.addEventListener('drop', function (e) {
        e.preventDefault();
        uploadZone.classList.remove('hover');
        if (e.dataTransfer.files.length > 0) {
          readFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', function () {
        if (fileInput.files.length > 0) {
          readFile(fileInput.files[0]);
        }
      });
    }

    // Resizable panes
    var resizer = containerEl.querySelector('#eda-resizer');
    var layout = containerEl.querySelector('#eda-layout');
    var leftPane = containerEl.querySelector('#eda-left-pane');

    if (resizer && layout && leftPane) {
      var dragging = false;

      resizer.addEventListener('mousedown', function (e) {
        e.preventDefault();
        dragging = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
      });

      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var rect = layout.getBoundingClientRect();
        var pct = ((e.clientX - rect.left) / rect.width) * 100;
        pct = Math.max(15, Math.min(75, pct));
        layout.style.gridTemplateColumns = pct + '% 6px 1fr';
      });

      document.addEventListener('mouseup', function () {
        if (dragging) {
          dragging = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }
      });
    }
  }

  function readFile(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var csvString = e.target.result;
      loadData(csvString);
      renderFull();
    };
    reader.readAsText(file);
  }

  // ── Utilities ──

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Public API ──

  init();

  return {
    loadData: function (csv) { loadData(csv); renderFull(); },
    reset: function () { conversationHistory = []; renderFull(); },
    destroy: function () { containerEl.innerHTML = ''; }
  };
}
