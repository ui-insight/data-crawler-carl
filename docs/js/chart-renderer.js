// chart-renderer.js — Safe Plotly chart rendering from JSON specs
// Dependencies: Plotly.js (window.Plotly)
// No eval, no Function constructor. Only bar and scatter charts.

export var SUPPORTED_TYPES = ['bar', 'scatter'];

/**
 * Validate a chart spec object.
 * @param {object} spec - { type, x, y, title?, xLabel?, yLabel? }
 * @returns {boolean}
 */
export function isValidChartSpec(spec) {
  if (!spec || typeof spec !== 'object') return false;
  if (SUPPORTED_TYPES.indexOf(spec.type) === -1) return false;
  if (!Array.isArray(spec.x) || !Array.isArray(spec.y)) return false;
  if (spec.x.length !== spec.y.length) return false;
  if (spec.x.length === 0) return false;
  return true;
}

/**
 * Render a chart into a container element.
 * @param {HTMLElement} containerEl - DOM element to render into
 * @param {object} spec - { type, x, y, title?, xLabel?, yLabel? }
 * @returns {boolean} true if rendered successfully
 */
export function renderChart(containerEl, spec) {
  if (!isValidChartSpec(spec)) return false;
  if (typeof window.Plotly === 'undefined') return false;

  var trace = {
    x: spec.x,
    y: spec.y,
    type: spec.type,
    marker: { color: '#f1b300' }
  };

  if (spec.type === 'scatter') {
    trace.mode = spec.mode || 'markers';
    trace.marker.size = 8;
  }

  window.Plotly.newPlot(containerEl, [trace], {
    title: { text: spec.title || '', font: { size: 13 } },
    xaxis: { title: spec.xLabel || '' },
    yaxis: { title: spec.yLabel || '' },
    margin: { t: 35, r: 10, b: 40, l: 55 },
    height: 350,
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)'
  }, {
    displayModeBar: false,
    responsive: true
  });

  return true;
}
