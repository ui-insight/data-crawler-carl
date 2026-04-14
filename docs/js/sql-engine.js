// sql-engine.js — SQLite WASM wrapper for in-browser CSV querying
// Dependencies: sql.js (window.initSqlJs), PapaParse (window.Papa)

let db = null;
let ready = false;

/**
 * Initialize sql.js WASM engine.
 * Call once before any other function.
 */
export async function initSQLEngine() {
  if (ready) return;
  const SQL = await window.initSqlJs({
    locateFile: function (file) {
      return 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/' + file;
    }
  });
  db = new SQL.Database();
  ready = true;
}

/**
 * Check if engine is ready.
 */
export function isReady() {
  return ready;
}

/**
 * Load a CSV string into SQLite as table "data".
 * Returns { columns: string[], rowCount: number, parsedData: object[] }
 */
export function loadCSV(csvString) {
  if (!ready) throw new Error('SQL engine not initialized');

  var parsed = window.Papa.parse(csvString.trim(), {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
  });

  var columns = parsed.meta.fields;
  var data = parsed.data;

  db.run('DROP TABLE IF EXISTS data');

  // Infer column types from first 10 non-null values
  var types = columns.map(function (col) {
    var samples = [];
    for (var i = 0; i < Math.min(data.length, 10); i++) {
      var v = data[i][col];
      if (v !== null && v !== undefined && v !== '') samples.push(v);
    }
    if (samples.length > 0 && samples.every(function (s) { return typeof s === 'number'; })) {
      return 'REAL';
    }
    return 'TEXT';
  });

  var colDefs = columns.map(function (col, i) {
    return '"' + col.replace(/"/g, '""') + '" ' + types[i];
  }).join(', ');
  db.run('CREATE TABLE data (' + colDefs + ')');

  var placeholders = columns.map(function () { return '?'; }).join(',');
  var stmt = db.prepare('INSERT INTO data VALUES (' + placeholders + ')');
  for (var r = 0; r < data.length; r++) {
    var values = columns.map(function (col) {
      var v = data[r][col];
      return (v === null || v === undefined || v === '') ? null : v;
    });
    stmt.bind(values);
    stmt.step();
    stmt.reset();
  }
  stmt.free();

  return { columns: columns, rowCount: data.length, parsedData: data };
}

/**
 * Execute a SQL query against the loaded data.
 * Returns { columns: string[], values: any[][] }
 * Throws on SQL error.
 */
export function executeSQL(sql) {
  if (!ready) throw new Error('SQL engine not initialized');
  var result = db.exec(sql);
  if (result.length === 0) {
    return { columns: [], values: [] };
  }
  return { columns: result[0].columns, values: result[0].values };
}

/**
 * Get the raw sql.js Database instance.
 */
export function getDB() {
  return db;
}
