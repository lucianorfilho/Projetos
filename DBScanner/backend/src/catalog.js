// Catálogo persistente do DBScanner (SQLite).
// Cada scan é um snapshot completo do schema do cliente; a base de
// conhecimento vive fora dos snapshots e sobrevive entre scans.
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'catalog.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS databases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'oracle',
  connect_string TEXT,
  target_schema TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_id INTEGER NOT NULL REFERENCES databases(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  error TEXT,
  summary_json TEXT
);

CREATE TABLE IF NOT EXISTS scan_tables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  name TEXT NOT NULL,
  num_rows INTEGER,
  last_analyzed TEXT,
  comments TEXT,
  has_pk INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scan_columns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  table_name TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER,
  data_type TEXT,
  data_length INTEGER,
  nullable INTEGER,
  num_nulls INTEGER,
  num_distinct INTEGER,
  comments TEXT,
  in_pk INTEGER NOT NULL DEFAULT 0,
  in_fk INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scan_relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  from_table TEXT NOT NULL,
  from_column TEXT NOT NULL,
  to_table TEXT NOT NULL,
  to_column TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'fk' -- fk (constraint real) | inferred (deduzida por nome)
);

CREATE TABLE IF NOT EXISTS scan_indexes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  table_name TEXT NOT NULL,
  name TEXT NOT NULL,
  uniqueness TEXT,
  columns TEXT
);

CREATE TABLE IF NOT EXISTS scan_insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scan_id INTEGER NOT NULL REFERENCES scans(id),
  severity TEXT NOT NULL,      -- alta | media | baixa | info
  category TEXT NOT NULL,      -- integridade | lgpd | performance | documentacao | limpeza | modelagem
  object_name TEXT,
  column_name TEXT,
  title TEXT NOT NULL,
  detail TEXT,
  recommendation TEXT
);

-- Base de conhecimento: anotações de negócio por objeto/coluna.
-- Chaveada pelo database (não pelo scan) para acumular entre snapshots.
CREATE TABLE IF NOT EXISTS knowledge (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  database_id INTEGER NOT NULL REFERENCES databases(id),
  object_name TEXT NOT NULL,
  column_name TEXT,            -- NULL = anotação da tabela inteira
  business_name TEXT,          -- nome de negócio ("Cadastro de Clientes")
  description TEXT,            -- o que significa, regras, cuidados
  tags TEXT,                   -- ex.: "financeiro,critico,lgpd"
  author TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (database_id, object_name, column_name)
);

CREATE INDEX IF NOT EXISTS idx_cols_scan ON scan_columns (scan_id, table_name);
CREATE INDEX IF NOT EXISTS idx_insights_scan ON scan_insights (scan_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_db ON knowledge (database_id, object_name);
`);

module.exports = db;
