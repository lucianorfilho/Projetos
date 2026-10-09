// Registro de instâncias monitoradas — dirigido pelo banco (multi-tenant).
// Cada linha de dbview_instances vira um runtime {coletor, histórico, alertas}.
// Instâncias em modo demo recebem um perfil simulado; modo oracle conecta
// no banco real do cliente via node-oracledb (thin).

const { createSimulator } = require('./collector/simulator');
const { createStore } = require('./store/history');
const { createAlertsEngine } = require('./engine/alerts');

// Modelo comercial: 1ª instância grátis (Free), adicionais R$30/mês cada
const PRICING = { freeIncluded: 1, pricePerInstance: 30 };

// Perfis de demonstração — atribuídos em rodízio às instâncias demo
const DEMO_TEMPLATES = [
  {
    host: 'oradb-prd-01', version: 'Oracle Database 19c Enterprise Edition 19.21.0.0.0',
    uptimeDays: 37, cpuCores: 8,
    limits: { sessions: 472, processes: 500, cursors: 300 },
    base: { active: 7, total: 210, cpu: 32, cursors: 3400 },
    incidents: ['none', 'none', 'session_storm', 'none', 'slow_sql', 'none', 'blocking', 'cpu_spike'],
    phaseOffsetMin: 0,
    tablespaces: [
      { name: 'SYSTEM', sizeMB: 2048, usedMB: 1130, autoextend: true },
      { name: 'SYSAUX', sizeMB: 4096, usedMB: 3010, autoextend: true },
      { name: 'USERS', sizeMB: 10240, usedMB: 6890, autoextend: true },
      { name: 'DADOS', sizeMB: 512000, usedMB: 448300, autoextend: true },
      { name: 'INDICES', sizeMB: 256000, usedMB: 244900, autoextend: false },
      { name: 'UNDOTBS1', sizeMB: 32768, usedMB: 8400, autoextend: true },
      { name: 'TEMP', sizeMB: 65536, usedMB: 12200, autoextend: true },
    ],
    users: [
      { username: 'APP_VENDAS', accountStatus: 'OPEN', profile: 'APP_PROFILE', daysToExpiry: 4 },
      { username: 'BI_ETL', accountStatus: 'OPEN', profile: 'APP_PROFILE', daysToExpiry: 11 },
      { username: 'JOAO.SILVA', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 27 },
      { username: 'INTEGRACAO', accountStatus: 'EXPIRED(GRACE)', profile: 'DEFAULT', daysToExpiry: 2 },
      { username: 'MARIA.SOUZA', accountStatus: 'LOCKED', profile: 'DEFAULT', daysToExpiry: null },
      { username: 'APP_FISCAL', accountStatus: 'OPEN', profile: 'APP_PROFILE', daysToExpiry: 88 },
    ],
  },
  {
    host: 'oradw-prd-01', version: 'Oracle Database 19c Enterprise Edition 19.21.0.0.0',
    uptimeDays: 112, cpuCores: 16,
    limits: { sessions: 800, processes: 850, cursors: 500 },
    base: { active: 10, total: 120, cpu: 40, cursors: 2100 },
    incidents: ['none', 'etl', 'none', 'etl', 'slow_sql', 'none', 'etl', 'none'],
    phaseOffsetMin: 2,
    tablespaces: [
      { name: 'SYSTEM', sizeMB: 2048, usedMB: 1180, autoextend: true },
      { name: 'SYSAUX', sizeMB: 8192, usedMB: 6300, autoextend: true },
      { name: 'DW_DADOS', sizeMB: 2097152, usedMB: 2026000, autoextend: true },
      { name: 'DW_STAGE', sizeMB: 524288, usedMB: 462000, autoextend: true },
      { name: 'DW_INDICES', sizeMB: 786432, usedMB: 601000, autoextend: true },
      { name: 'TEMP', sizeMB: 262144, usedMB: 98000, autoextend: true },
    ],
    users: [
      { username: 'ETL_LOADER', accountStatus: 'OPEN', profile: 'APP_PROFILE', daysToExpiry: 45 },
      { username: 'BI_POWER', accountStatus: 'OPEN', profile: 'APP_PROFILE', daysToExpiry: 9 },
      { username: 'ANALISTA.DADOS', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 62 },
    ],
    extraParams: [
      { name: 'sga_target', value: '64G' },
      { name: 'pga_aggregate_target', value: '32G' },
      { name: 'parallel_max_servers', value: 128 },
    ],
  },
  {
    host: 'oradb-lojas-01', version: 'Oracle Database 19c Standard Edition 2 19.18.0.0.0',
    uptimeDays: 8, cpuCores: 4,
    limits: { sessions: 300, processes: 320, cursors: 300 },
    base: { active: 6, total: 185, cpu: 28, cursors: 2600 },
    incidents: ['none', 'blocking', 'none', 'none', 'session_storm', 'none', 'none', 'blocking'],
    phaseOffsetMin: 5,
    sessionLeakPerTick: 0.6,
    tablespaces: [
      { name: 'SYSTEM', sizeMB: 2048, usedMB: 1050, autoextend: true },
      { name: 'SYSAUX', sizeMB: 4096, usedMB: 2800, autoextend: true },
      { name: 'PDV_DADOS', sizeMB: 102400, usedMB: 99100, autoextend: false },
      { name: 'PDV_INDICES', sizeMB: 51200, usedMB: 44700, autoextend: true },
      { name: 'TEMP', sizeMB: 16384, usedMB: 5200, autoextend: true },
    ],
    users: [
      { username: 'APP_PDV', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 3 },
      { username: 'APP_RETAGUARDA', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 19 },
      { username: 'SUPORTE.TI', accountStatus: 'LOCKED', profile: 'DEFAULT', daysToExpiry: null },
    ],
    extraParams: [
      { name: 'sga_target', value: '8G' },
      { name: 'pga_aggregate_target', value: '2G' },
      { name: 'cursor_sharing', value: 'FORCE' },
    ],
  },
  {
    host: 'oradb-hml-01', version: 'Oracle Database 19c Enterprise Edition 19.21.0.0.0',
    uptimeDays: 61, cpuCores: 4,
    limits: { sessions: 300, processes: 320, cursors: 300 },
    base: { active: 2, total: 40, cpu: 8, cursors: 600 },
    incidents: ['none', 'none', 'none', 'none', 'none', 'none', 'none', 'none'],
    phaseOffsetMin: 0,
    tablespaces: [
      { name: 'SYSTEM', sizeMB: 2048, usedMB: 1020, autoextend: true },
      { name: 'SYSAUX', sizeMB: 4096, usedMB: 2400, autoextend: true },
      { name: 'DADOS_HML', sizeMB: 204800, usedMB: 88000, autoextend: true },
      { name: 'TEMP', sizeMB: 16384, usedMB: 1100, autoextend: true },
    ],
    users: [
      { username: 'APP_VENDAS_HML', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 61 },
      { username: 'DEV.EQUIPE', accountStatus: 'OPEN', profile: 'DEFAULT', daysToExpiry: 44 },
    ],
  },
];

const runtime = new Map(); // id (string) -> { id, userId, meta, source, store, alerts, lastError }

function buildDemoProfile(row) {
  const t = DEMO_TEMPLATES[row.id % DEMO_TEMPLATES.length];
  return {
    ...t,
    id: String(row.id),
    name: row.name.toUpperCase(),
    env: row.env_label || 'Produção',
  };
}

function spawn(row) {
  const id = String(row.id);
  if (runtime.has(id)) return runtime.get(id);

  let source;
  if (row.mode === 'oracle') {
    const { createOracleCollector } = require('./collector/oracle');
    source = createOracleCollector({
      user: row.oracle_user,
      password: row.oracle_password,
      connectString: row.oracle_connect,
    });
  } else {
    source = createSimulator(buildDemoProfile(row));
  }

  const inst = {
    id,
    userId: row.user_id,
    meta: { name: row.name.toUpperCase(), env: row.env_label || 'Produção', mode: row.mode },
    source,
    store: createStore(),
    alerts: createAlertsEngine(),
    lastError: null,
  };
  runtime.set(id, inst);
  return inst;
}

async function loadFromDb() {
  const db = require('./db');
  const [rows] = await db.query('SELECT * FROM dbview_instances');
  for (const row of rows) spawn(row);
  console.log(`[instances] ${rows.length} instância(s) carregada(s) do banco`);
}

function remove(id) {
  runtime.delete(String(id));
}

module.exports = {
  PRICING,
  spawn,
  remove,
  loadFromDb,
  getInstance: (id) => runtime.get(String(id)),
  all: () => [...runtime.values()],
  listForUser: (user) => [...runtime.values()].filter((i) => user.role === 'admin' || i.userId === user.id),
  count: () => runtime.size,
};
