// Orquestrador de scans: executa o coletor (demo ou oracle), roda o motor
// de insights e persiste tudo como um snapshot no catálogo SQLite.
const db = require('../catalog');
const config = require('../config');
const simulator = require('./simulator');
const oracle = require('./oracle');
const { analyze } = require('../engine/insights');

async function runScan(databaseId) {
  const database = db.prepare('SELECT * FROM databases WHERE id = ?').get(databaseId);
  if (!database) throw new Error(`Database ${databaseId} não encontrado`);

  const scanId = db.prepare(
    `INSERT INTO scans (database_id, started_at) VALUES (?, datetime('now'))`
  ).run(databaseId).lastInsertRowid;

  try {
    const collector = config.mode === 'oracle' ? oracle : simulator;
    const snapshot = await collector.scan(database);
    const { insights, inferredRelations, metrics } = analyze(snapshot);

    persist(scanId, snapshot, insights, inferredRelations);

    const knowledgeCount = db.prepare(
      'SELECT COUNT(*) c FROM knowledge WHERE database_id = ?'
    ).get(databaseId).c;

    // Índice de conhecimento: % de tabelas com comentário OU anotação na base
    const annotated = db.prepare(
      `SELECT COUNT(DISTINCT object_name) c FROM knowledge WHERE database_id = ? AND column_name IS NULL`
    ).get(databaseId).c;
    const knownTables = new Set(snapshot.tables.filter((t) => t.comments).map((t) => t.name));
    const knowledgeIndex = metrics.totalTables > 0
      ? Math.min(100, Math.round(((knownTables.size + annotated) / metrics.totalTables) * 100))
      : 0;

    const summary = {
      schema: snapshot.schema,
      vendor: snapshot.vendor,
      version: snapshot.version,
      otherObjects: snapshot.otherObjects,
      metrics: { ...metrics, knowledgeIndex, knowledgeEntries: knowledgeCount },
    };

    db.prepare(
      `UPDATE scans SET status = 'done', finished_at = datetime('now'), summary_json = ? WHERE id = ?`
    ).run(JSON.stringify(summary), scanId);

    return { scanId, summary };
  } catch (err) {
    db.prepare(
      `UPDATE scans SET status = 'error', finished_at = datetime('now'), error = ? WHERE id = ?`
    ).run(String(err.message || err), scanId);
    throw err;
  }
}

function persist(scanId, snapshot, insights, inferredRelations) {
  const insTable = db.prepare(`INSERT INTO scan_tables
    (scan_id, name, num_rows, last_analyzed, comments, has_pk) VALUES (?,?,?,?,?,?)`);
  const insCol = db.prepare(`INSERT INTO scan_columns
    (scan_id, table_name, name, position, data_type, data_length, nullable, num_nulls, num_distinct, comments, in_pk, in_fk)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insRel = db.prepare(`INSERT INTO scan_relations
    (scan_id, from_table, from_column, to_table, to_column, kind) VALUES (?,?,?,?,?,?)`);
  const insIdx = db.prepare(`INSERT INTO scan_indexes
    (scan_id, table_name, name, uniqueness, columns) VALUES (?,?,?,?,?)`);
  const insInsight = db.prepare(`INSERT INTO scan_insights
    (scan_id, severity, category, object_name, column_name, title, detail, recommendation)
    VALUES (?,?,?,?,?,?,?,?)`);

  db.transaction(() => {
    for (const t of snapshot.tables) {
      insTable.run(scanId, t.name, t.numRows, t.lastAnalyzed, t.comments, t.hasPk ? 1 : 0);
      for (const c of t.columns || []) {
        insCol.run(scanId, t.name, c.name, c.position, c.dataType, c.dataLength,
          c.nullable ? 1 : 0, c.numNulls, c.numDistinct, c.comments,
          c.inPk ? 1 : 0, c.inFk ? 1 : 0);
      }
      for (const i of t.indexes || []) {
        insIdx.run(scanId, t.name, i.name, i.uniqueness, (i.columns || []).join(','));
      }
    }
    for (const r of [...snapshot.relations, ...inferredRelations]) {
      insRel.run(scanId, r.fromTable, r.fromColumn, r.toTable, r.toColumn, r.kind);
    }
    for (const i of insights) {
      insInsight.run(scanId, i.severity, i.category, i.objectName, i.columnName,
        i.title, i.detail, i.recommendation);
    }
  })();
}

module.exports = { runScan };
