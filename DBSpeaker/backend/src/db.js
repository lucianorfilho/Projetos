const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'dbspeaker.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS learners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  level_score REAL NOT NULL DEFAULT 1.5,   -- escala contínua 1.0 (A1) a 6.99 (C2)
  cefr TEXT NOT NULL DEFAULT 'A1',
  messages_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  topic TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS corrections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  session_id INTEGER,
  original TEXT NOT NULL,
  corrected TEXT NOT NULL,
  category TEXT,
  explanation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vocab_progress (
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  word TEXT NOT NULL,
  level TEXT NOT NULL,
  times_seen INTEGER NOT NULL DEFAULT 0,   -- vezes que o tutor apresentou
  times_used INTEGER NOT NULL DEFAULT 0,   -- vezes que o aluno usou
  last_seen TEXT,
  PRIMARY KEY (learner_id, word)
);

CREATE TABLE IF NOT EXISTS pronunciation_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  target TEXT NOT NULL,
  transcript TEXT NOT NULL,
  score REAL NOT NULL,
  weak_sounds TEXT,                        -- JSON: ids dos sons com problema
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS level_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  score REAL NOT NULL,
  cefr TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  learner_id INTEGER NOT NULL REFERENCES learners(id),
  amount_cents INTEGER NOT NULL,          -- positivo = crédito, negativo = consumo
  kind TEXT NOT NULL CHECK (kind IN ('bonus','recarga','consumo')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Coluna de saldo (migração segura para bancos já criados)
const cols = db.prepare("PRAGMA table_info(learners)").all().map((c) => c.name);
if (!cols.includes('balance_cents')) {
  db.exec('ALTER TABLE learners ADD COLUMN balance_cents INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;
