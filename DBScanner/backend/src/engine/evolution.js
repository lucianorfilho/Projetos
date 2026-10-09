// Evolução entre scans: compara o snapshot mais recente com o anterior
// para mostrar o que mudou no schema e no estado dos insights.
// É assim que o DBScanner "aprende" com o histórico: problemas novos,
// recorrentes e resolvidos, crescimento das tabelas, objetos que surgiram.
const db = require('../catalog');

function evolution(databaseId) {
  const scans = db.prepare(
    `SELECT id, finished_at, summary_json FROM scans
      WHERE database_id = ? AND status='done' ORDER BY id DESC LIMIT 2`
  ).all(databaseId);

  if (scans.length === 0) return { scans: 0 };

  const history = db.prepare(
    `SELECT id, finished_at, summary_json FROM scans
      WHERE database_id = ? AND status='done' ORDER BY id`
  ).all(databaseId).map((s) => {
    const m = s.summary_json ? JSON.parse(s.summary_json).metrics : {};
    return {
      scanId: s.id,
      at: s.finished_at,
      tables: m.totalTables ?? null,
      insights: Object.values(m.bySeverity || {}).reduce((a, b) => a + b, 0),
      knowledgeIndex: m.knowledgeIndex ?? null,
    };
  });

  if (scans.length === 1) {
    return { scans: 1, baseline: { scanId: scans[0].id, at: scans[0].finished_at }, history };
  }

  const [curr, prev] = scans;

  const tablesOf = (scanId) => new Map(db.prepare(
    'SELECT name, num_rows FROM scan_tables WHERE scan_id = ?').all(scanId)
    .map((t) => [t.name, t.num_rows]));
  const currTables = tablesOf(curr.id);
  const prevTables = tablesOf(prev.id);

  const addedTables = [...currTables.keys()].filter((n) => !prevTables.has(n));
  const removedTables = [...prevTables.keys()].filter((n) => !currTables.has(n));

  const growth = [...currTables.entries()]
    .filter(([n]) => prevTables.has(n))
    .map(([n, rows]) => ({
      table: n,
      before: prevTables.get(n),
      after: rows,
      delta: (rows || 0) - (prevTables.get(n) || 0),
    }))
    .filter((g) => g.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 10);

  const colsOf = (scanId) => new Set(db.prepare(
    'SELECT table_name, name FROM scan_columns WHERE scan_id = ?').all(scanId)
    .map((c) => `${c.table_name}.${c.name}`));
  const currCols = colsOf(curr.id);
  const prevCols = colsOf(prev.id);
  const addedColumns = [...currCols].filter((c) => !prevCols.has(c) && currTables.has(c.split('.')[0]) && prevTables.has(c.split('.')[0]));
  const removedColumns = [...prevCols].filter((c) => !currCols.has(c) && currTables.has(c.split('.')[0]));

  const insightKey = (i) => `${i.severity}|${i.category}|${i.object_name || ''}|${i.column_name || ''}|${i.title}`;
  const insightsOf = (scanId) => db.prepare(
    'SELECT * FROM scan_insights WHERE scan_id = ?').all(scanId);
  const currInsights = insightsOf(curr.id);
  const prevKeys = new Set(insightsOf(prev.id).map(insightKey));
  const currKeys = new Set(currInsights.map(insightKey));

  const newInsights = currInsights.filter((i) => !prevKeys.has(insightKey(i)));
  const resolvedInsights = insightsOf(prev.id).filter((i) => !currKeys.has(insightKey(i)));
  const recurring = currInsights.length - newInsights.length;

  return {
    scans: history.length,
    compared: {
      current: { scanId: curr.id, at: curr.finished_at },
      previous: { scanId: prev.id, at: prev.finished_at },
    },
    schema: { addedTables, removedTables, addedColumns, removedColumns, growth },
    insights: {
      new: newInsights,
      resolved: resolvedInsights,
      recurringCount: recurring,
    },
    history,
  };
}

module.exports = { evolution };
