// chart-renderer.js — Safe Plotly chart rendering from JSON specs
// Dependencies: Plotly.js (window.Plotly)
// No eval, no Function constructor. Allowlisted types + property validation.

export var SUPPORTED_TYPES = ['bar', 'scatter', 'line', 'pie', 'histogram', 'box', 'heatmap'];

var SCATTER_MODES = ['markers', 'lines', 'lines+markers'];

/**
 * Strip HTML tags from a string to prevent injection via Plotly text fields.
 */
function sanitizeString(val) {
  if (typeof val !== 'string') return val;
  return val.replace(/<[^>]*>/g, '');
}

/**
 * Ensure every element in an array is a primitive (string, number, boolean, null).
 */
function sanitizeArray(arr) {
  if (!Array.isArray(arr)) return null;
  for (var i = 0; i < arr.length; i++) {
    var v = arr[i];
    if (v === null || v === undefined) continue;
    var t = typeof v;
    if (t === 'string') {
      arr[i] = sanitizeString(v);
    } else if (t !== 'number' && t !== 'boolean') {
      return null; // reject arrays containing objects/functions/etc.
    }
  }
  return arr;
}

/**
 * Validate a chart spec object.
 * Each chart type has its own required fields.
 * @param {object} spec
 * @returns {boolean}
 */
export function isValidChartSpec(spec) {
  if (!spec || typeof spec !== 'object') return false;
  if (SUPPORTED_TYPES.indexOf(spec.type) === -1) return false;

  var type = spec.type;

  if (type === 'pie') {
    if (!Array.isArray(spec.labels) || !Array.isArray(spec.values)) return false;
    if (spec.labels.length !== spec.values.length) return false;
    if (spec.labels.length === 0) return false;
    return true;
  }

  if (type === 'histogram') {
    if (!Array.isArray(spec.x) || spec.x.length === 0) return false;
    return true;
  }

  if (type === 'box') {
    if (!Array.isArray(spec.y) || spec.y.length === 0) return false;
    return true;
  }

  if (type === 'heatmap') {
    if (!Array.isArray(spec.z) || spec.z.length === 0) return false;
    for (var i = 0; i < spec.z.length; i++) {
      if (!Array.isArray(spec.z[i])) return false;
    }
    return true;
  }

  // bar, scatter, line — need x and y
  if (!Array.isArray(spec.x) || !Array.isArray(spec.y)) return false;
  if (spec.x.length !== spec.y.length) return false;
  if (spec.x.length === 0) return false;
  return true;
}

/**
 * Build a sanitized Plotly trace from a validated spec.
 * We construct the trace ourselves — only known-safe properties are copied.
 */
function buildTrace(spec) {
  var type = spec.type;
  var trace = {};

  if (type === 'line') {
    // "line" is scatter with mode=lines in Plotly
    trace.type = 'scatter';
    trace.mode = 'lines';
    trace.x = sanitizeArray(spec.x.slice());
    trace.y = sanitizeArray(spec.y.slice());
    trace.line = { color: '#f1b300', width: 2 };
  } else if (type === 'scatter') {
    trace.type = 'scatter';
    trace.mode = (spec.mode && SCATTER_MODES.indexOf(spec.mode) !== -1) ? spec.mode : 'markers';
    trace.x = sanitizeArray(spec.x.slice());
    trace.y = sanitizeArray(spec.y.slice());
    trace.marker = { color: '#f1b300', size: 8 };
  } else if (type === 'bar') {
    trace.type = 'bar';
    trace.x = sanitizeArray(spec.x.slice());
    trace.y = sanitizeArray(spec.y.slice());
    trace.marker = { color: '#f1b300' };
    if (spec.orientation === 'h') trace.orientation = 'h';
  } else if (type === 'pie') {
    trace.type = 'pie';
    trace.labels = sanitizeArray(spec.labels.slice());
    trace.values = sanitizeArray(spec.values.slice());
    trace.marker = { colors: spec.colors && Array.isArray(spec.colors)
      ? sanitizeArray(spec.colors.slice()) : undefined };
    trace.hole = (typeof spec.hole === 'number' && spec.hole >= 0 && spec.hole < 1) ? spec.hole : 0;
  } else if (type === 'histogram') {
    trace.type = 'histogram';
    trace.x = sanitizeArray(spec.x.slice());
    trace.marker = { color: '#f1b300' };
    if (typeof spec.nbinsx === 'number' && spec.nbinsx > 0 && spec.nbinsx <= 200) {
      trace.nbinsx = Math.round(spec.nbinsx);
    }
  } else if (type === 'box') {
    trace.type = 'box';
    trace.y = sanitizeArray(spec.y.slice());
    if (Array.isArray(spec.x)) trace.x = sanitizeArray(spec.x.slice());
    trace.marker = { color: '#f1b300' };
    trace.boxpoints = spec.boxpoints === 'all' ? 'all' : false;
  } else if (type === 'heatmap') {
    trace.type = 'heatmap';
    trace.z = spec.z.map(function (row) { return sanitizeArray(row.slice()); });
    if (Array.isArray(spec.x)) trace.x = sanitizeArray(spec.x.slice());
    if (Array.isArray(spec.y)) trace.y = sanitizeArray(spec.y.slice());
    trace.colorscale = 'YlOrBr';
  }

  // Check that sanitized arrays are valid (sanitizeArray returns null on bad input)
  if (trace.x === null || trace.y === null || trace.labels === null || trace.values === null) {
    return null;
  }
  if (trace.z) {
    for (var i = 0; i < trace.z.length; i++) {
      if (trace.z[i] === null) return null;
    }
  }

  return trace;
}

/**
 * Render a chart into a container element.
 * @param {HTMLElement} containerEl
 * @param {object} spec
 * @returns {boolean} true if rendered successfully
 */
export function renderChart(containerEl, spec) {
  if (!isValidChartSpec(spec)) return false;
  if (typeof window.Plotly === 'undefined') return false;

  var trace = buildTrace(spec);
  if (!trace) return false;

  var layout = {
    title: { text: sanitizeString(spec.title || ''), font: { size: 13 } },
    margin: { t: 35, r: 10, b: 40, l: 55 },
    height: 350,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  };

  // Only add axis titles for types that use axes
  if (spec.type !== 'pie') {
    layout.xaxis = { title: sanitizeString(spec.xLabel || '') };
    layout.yaxis = { title: sanitizeString(spec.yLabel || '') };
  }

  window.Plotly.newPlot(containerEl, [trace], layout, {
    displayModeBar: false,
    responsive: true
  });

  return true;
}
