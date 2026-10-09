const express = require('express');
const db = require('../catalog');
const config = require('../config');
const { runScan } = require('../scanner');
const { suggestions } = require('../engine/knowledge');
const { evolution } = require('../engine/evolution');

const router = express.Router();

// ---------- databases (conexões de clientes) ----------
router.get('/databases', (req, res) => {
  const rows = db.prepare(`
    SELECT d.*,
           (SELECT MAX(s.finished_at) FROM scans s WHERE s.database_id = d.id AND s.status='done') last_scan_at,
           (SELECT COUNT(*) FROM scans s WHERE s.database_id = d.id) scan_count
      FROM databases d ORDER BY d.id`).all();
  res.json(rows);
});

router.post('/databases', (req, res) => {
  const { name, vendor = 'oracle', connect_string = null, target_schema = null } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });
  const id = db.prepare(
    'INSERT INTO databases (name, vendor, connect_string, target_schema) VALUES (?,?,?,?)'
  ).run(name, vendor, connect_string, target_schema).lastInsertRowid;
  res.status(201).json(db.prepare('SELECT * FROM databases WHERE id = ?').get(id));
});

// ---------- scans ----------
router.post('/databases/:id/scan', async (req, res) => {
  try {
    const result = await runScan(Number(req.params.id));
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
});

router.get('/scans', (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.database_id, d.name database_name, s.started_at, s.finished_at, s.status, s.error
      FROM scans s JOIN databases d ON d.id = s.database_id
     ORDER BY s.id DESC LIMIT 50`).all();
  res.json(rows);
});

function getScan(id) {
  const scan = db.prepare(`
    SELECT s.*, d.name database_name
      FROM scans s JOIN databases d ON d.id = s.database_id WHERE s.id = ?`).get(id);
  if (scan && scan.summary_json) scan.summary = JSON.parse(scan.summary_json);
  delete scan?.summary_json;
  return scan;
}

router.get('/scans/latest', (req, res) => {
  const row = db.prepare(`SELECT id FROM scans WHERE status='done' ORDER BY id DESC LIMIT 1`).get();
  if (!row) return res.status(404).json({ error: 'Nenhum scan concluído ainda' });
  res.json(getScan(row.id));
});

router.get('/scans/:id', (req, res) => {
  const scan = getScan(Number(req.params.id));
  if (!scan) return res.status(404).json({ error: 'Scan não encontrado' });
  res.json(scan);
});

router.get('/scans/:id/tables', (req, res) => {
  const scanId = Number(req.params.id);
  const tables = db.prepare(`
    SELECT t.*,
           (SELECT COUNT(*) FROM scan_columns c WHERE c.scan_id = t.scan_id AND c.table_name = t.name) column_count,
           (SELECT COUNT(*) FROM scan_insights i WHERE i.scan_id = t.scan_id AND i.object_name = t.name) insight_count
      FROM scan_tables t WHERE t.scan_id = ? ORDER BY t.num_rows DESC`).all(scanId);
  res.json(tables);
});

router.get('/scans/:id/tables/:name', (req, res) => {
  const scanId = Number(req.params.id);
  const name = req.params.name.toUpperCase();
  const table = db.prepare('SELECT * FROM scan_tables WHERE scan_id = ? AND name = ?').get(scanId, name);
  if (!table) return res.status(404).json({ error: 'Tabela não encontrada neste scan' });

  const scan = db.prepare('SELECT database_id FROM scans WHERE id = ?').get(scanId);
  res.json({
    ...table,
    columns: db.prepare(
      'SELECT * FROM scan_columns WHERE scan_id = ? AND table_name = ? ORDER BY position').all(scanId, name),
    indexes: db.prepare(
      'SELECT * FROM scan_indexes WHERE scan_id = ? AND table_name = ?').all(scanId, name),
    relations: db.prepare(
      'SELECT * FROM scan_relations WHERE scan_id = ? AND (from_table = ? OR to_table = ?)').all(scanId, name, name),
    insights: db.prepare(
      'SELECT * FROM scan_insights WHERE scan_id = ? AND object_name = ?').all(scanId, name),
    knowledge: db.prepare(
      'SELECT * FROM knowledge WHERE database_id = ? AND object_name = ?').all(scan.database_id, name),
  });
});

router.get('/scans/:id/insights', (req, res) => {
  const { severity, category } = req.query;
  let sql = 'SELECT * FROM scan_insights WHERE scan_id = ?';
  const params = [Number(req.params.id)];
  if (severity) { sql += ' AND severity = ?'; params.push(severity); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ` ORDER BY CASE severity WHEN 'alta' THEN 0 WHEN 'media' THEN 1 WHEN 'baixa' THEN 2 ELSE 3 END, id`;
  res.json(db.prepare(sql).all(...params));
});

router.get('/scans/:id/relations', (req, res) => {
  res.json(db.prepare('SELECT * FROM scan_relations WHERE scan_id = ?').all(Number(req.params.id)));
});

// ---------- base de conhecimento ----------
router.get('/databases/:id/knowledge', (req, res) => {
  res.json(db.prepare(
    'SELECT * FROM knowledge WHERE database_id = ? ORDER BY object_name, column_name').all(Number(req.params.id)));
});

router.put('/databases/:id/knowledge', (req, res) => {
  const databaseId = Number(req.params.id);
  const { object_name, column_name = null, business_name = null, description = null, tags = null, author = null } = req.body || {};
  if (!object_name) return res.status(400).json({ error: 'object_name é obrigatório' });

  db.prepare(`
    INSERT INTO knowledge (database_id, object_name, column_name, business_name, description, tags, author, updated_at)
    VALUES (?,?,?,?,?,?,?, datetime('now'))
    ON CONFLICT (database_id, object_name, column_name) DO UPDATE SET
      business_name = excluded.business_name,
      description = excluded.description,
      tags = excluded.tags,
      author = excluded.author,
      updated_at = datetime('now')
  `).run(databaseId, object_name.toUpperCase(), column_name ? column_name.toUpperCase() : null,
         business_name, description, tags, author);

  res.json(db.prepare(
    'SELECT * FROM knowledge WHERE database_id = ? AND object_name = ? AND column_name IS ?')
    .get(databaseId, object_name.toUpperCase(), column_name ? column_name.toUpperCase() : null));
});

// Sugestões do motor de conhecimento (aprendidas das anotações + scans)
router.get('/databases/:id/suggestions', (req, res) => {
  res.json(suggestions(Number(req.params.id)));
});

// Evolução entre os dois últimos scans + histórico de métricas
router.get('/databases/:id/evolution', (req, res) => {
  res.json(evolution(Number(req.params.id)));
});

router.delete('/knowledge/:id', (req, res) => {
  db.prepare('DELETE FROM knowledge WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

// ---------- meta ----------
router.get('/health', (req, res) => {
  res.json({ status: 'ok', product: 'DBScanner', mode: config.mode });
});

module.exports = router;
