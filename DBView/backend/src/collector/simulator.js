// Simulador de bancos Oracle (modo demo) — multi-instância.
// createSimulator(profile) devolve um coletor com o mesmo contrato do coletor
// real, incluindo dados ASH (atividade por classe de espera, por SQL e por
// sessão) para o gráfico Top Activity.

const DAY = 24 * 3600 * 1000;

function rnd(min, max) { return min + Math.random() * (max - min); }
function rndInt(min, max) { return Math.round(rnd(min, max)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const WAIT_CLASSES = ['CPU', 'User I/O', 'System I/O', 'Commit', 'Application', 'Concurrency', 'Other'];

const DEFAULT_SQLS = [
  { id: 'g4x8m2kq1p0zn', type: 'SELECT', weight: 3.0, classMix: { 'User I/O': 0.55, CPU: 0.45 },
    text: "SELECT * FROM VENDAS.PEDIDOS P JOIN VENDAS.ITENS I ON I.PEDIDO_ID = P.ID WHERE P.DATA_PEDIDO > :1" },
  { id: 'b7ttq9r3fjc2a', type: 'UPDATE', weight: 2.0, classMix: { CPU: 0.3, Application: 0.25, Commit: 0.25, 'User I/O': 0.2 },
    text: 'UPDATE ESTOQUE.SALDOS SET QTDE = QTDE - :1 WHERE PRODUTO_ID = :2' },
  { id: 'a1zk44wn8xv5d', type: 'SELECT', weight: 2.5, classMix: { 'User I/O': 0.7, CPU: 0.3 },
    text: 'SELECT NF.*, ITEM.* FROM FISCAL.NOTAS NF, FISCAL.NOTA_ITENS ITEM WHERE ITEM.NOTA_ID = NF.ID AND NF.EMISSAO BETWEEN :1 AND :2' },
  { id: 'c9pw31hy6mt7e', type: 'INSERT', weight: 1.5, classMix: { 'User I/O': 0.4, 'System I/O': 0.3, CPU: 0.3 },
    text: 'INSERT /*+ APPEND */ INTO DW.FATO_VENDAS SELECT ... FROM STAGING.VENDAS_RAW' },
  { id: 'd2rr87vb4qs9f', type: 'SELECT', weight: 1.2, classMix: { CPU: 0.75, 'User I/O': 0.25 },
    text: 'SELECT COUNT(*) FROM AUDITORIA.LOG_ACESSOS WHERE DATA_HORA > SYSDATE - 1' },
  { id: 'f6mm20xc7ku3g', type: 'DELETE', weight: 0.8, classMix: { 'User I/O': 0.4, Commit: 0.3, CPU: 0.3 },
    text: 'DELETE FROM TEMP_PROCESSAMENTO WHERE DATA_CRIACAO < SYSDATE - 7' },
  { id: 'h8qq55zd2mv1j', type: 'SELECT', weight: 1.0, classMix: { CPU: 0.5, 'User I/O': 0.35, Other: 0.15 },
    text: 'SELECT C.NOME, SUM(P.VALOR_TOTAL) FROM CLIENTES C JOIN PEDIDOS P ON P.CLIENTE_ID = C.ID GROUP BY C.NOME ORDER BY 2 DESC' },
  { id: 'k3vv09ae5nw8m', type: 'MERGE', weight: 0.7, classMix: { CPU: 0.4, 'User I/O': 0.3, Application: 0.3 },
    text: 'MERGE INTO CADASTRO.PRODUTOS T USING INTEGRACAO.PRODUTOS_STG S ON (T.SKU = S.SKU) WHEN MATCHED THEN UPDATE ...' },
];

const PROGRAMS = ['JDBC Thin Client', 'sqlplus.exe', 'w3wp.exe', 'python.exe', 'Toad.exe'];
const MACHINES = ['app-srv-01', 'app-srv-02', 'etl-srv-01', 'web-srv-01', 'NB-JOAO'];
const EVENTS = ['db file sequential read', 'db file scattered read', 'log file sync', 'enq: TX - row lock contention', 'direct path read', 'CPU'];

// Mistura o classMix original com uma classe dominante (para incidentes)
function blend(mix, cls, frac) {
  const out = {};
  for (const [k, v] of Object.entries(mix)) out[k] = v * (1 - frac);
  out[cls] = (out[cls] || 0) + frac;
  return out;
}

// Distribui `count` itens proporcionalmente aos pesos (maior resto)
function distribute(count, weights) {
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (w / total) * count);
  const floors = raw.map(Math.floor);
  let rest = count - floors.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => ({ i, frac: v - floors[i] })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && rest > 0; k++, rest--) floors[order[k].i] += 1;
  return floors;
}

function createSimulator(profile) {
  const startTime = Date.now() - profile.uptimeDays * DAY;
  const sqlPool = profile.sqlPool || DEFAULT_SQLS;

  // Pool fixo de pseudo-sessões desta instância
  const sessionPool = [];
  for (let i = 0; i < 14; i++) {
    sessionPool.push({
      sid: rndInt(100, 4000),
      username: pick(profile.users.map((u) => u.username)),
      program: pick(PROGRAMS),
      machine: pick(MACHINES),
      weight: rnd(0.4, 3),
    });
  }

  const state = {
    active: profile.base.active,
    total: profile.base.total,
    cpu: profile.base.cpu,
    cursors: profile.base.cursors,
    leak: 0,
    slowPool: [],
  };

  function currentIncident() {
    const period = 4 * 60 * 1000;
    const cycle = Math.floor((Date.now() + (profile.phaseOffsetMin || 0) * 60000) / period) % profile.incidents.length;
    return profile.incidents[cycle];
  }

  function drift(current, target, speed = 0.15, noise = 0.06) {
    return current + (target - current) * speed + current * rnd(-noise, noise);
  }

  function makeSlowSession(elapsedBase, forcedSql) {
    const sql = forcedSql || pick(sqlPool);
    const sess = pick(sessionPool);
    return {
      sid: sess.sid, serial: rndInt(1000, 65000), username: sess.username,
      program: sess.program, machine: sess.machine, event: pick(EVENTS),
      sqlId: sql.id, sqlText: sql.text,
      elapsedSec: Math.round(elapsedBase * rnd(0.7, 1.8)), status: 'ACTIVE',
    };
  }

  // Gera a amostra ASH do tick: distribui as sessões ativas entre SQLs e
  // pseudo-sessões, derivando a composição por classe de espera.
  function buildAsh(active, incident) {
    const sqls = sqlPool.map((s) => {
      let w = s.weight, mix = s.classMix;
      if (incident === 'slow_sql' && s.type === 'SELECT' && s.weight >= 2.5) { w *= 6; mix = blend(mix, 'User I/O', 0.75); }
      if (incident === 'etl' && s.type === 'INSERT') { w *= 8; mix = blend(mix, 'User I/O', 0.55); }
      if (incident === 'cpu_spike') mix = blend(mix, 'CPU', 0.6);
      if (incident === 'blocking' && (s.type === 'UPDATE' || s.type === 'MERGE')) { w *= 4; mix = blend(mix, 'Application', 0.55); }
      if (incident === 'session_storm') { w *= rnd(1, 2); mix = blend(mix, 'Concurrency', 0.3); }
      return { ...s, w, mix };
    });

    const perSql = distribute(active, sqls.map((s) => s.w));
    const byClass = Object.fromEntries(WAIT_CLASSES.map((c) => [c, 0]));
    const sqlOut = [];
    sqls.forEach((s, i) => {
      if (perSql[i] === 0) return;
      const sqlByClass = {};
      const classes = Object.keys(s.mix);
      const counts = distribute(perSql[i], classes.map((c) => s.mix[c]));
      classes.forEach((c, j) => {
        if (counts[j] > 0) { sqlByClass[c] = counts[j]; byClass[c] = (byClass[c] || 0) + counts[j]; }
      });
      sqlOut.push({ sqlId: s.id, type: s.type, text: s.text, count: perSql[i], byClass: sqlByClass });
    });

    const perSess = distribute(active, sessionPool.map((s) => s.weight * (incident === 'session_storm' ? rnd(0.5, 2) : 1)));
    const sessOut = [];
    sessionPool.forEach((s, i) => {
      if (perSess[i] === 0) return;
      sessOut.push({ sid: s.sid, username: s.username, program: s.program, count: perSess[i] });
    });

    return { cpuCores: profile.cpuCores, byClass, sql: sqlOut, sessions: sessOut };
  }

  async function collectSample() {
    const incident = currentIncident();
    const hour = new Date().getHours();
    const business = hour >= 8 && hour <= 18 ? 1 : 0.45;

    let targetActive = profile.base.active * business;
    let targetCpu = profile.base.cpu * business;
    let targetTotal = profile.base.total * business + profile.base.total * 0.35;
    let targetCursors = profile.base.cursors * business + profile.base.cursors * 0.2;

    if (incident === 'session_storm') { targetActive = profile.base.active * 4.2; targetTotal *= 1.9; targetCursors *= 2.4; }
    if (incident === 'cpu_spike') { targetCpu = 94; targetActive = profile.base.active * 2.4; }
    if (incident === 'slow_sql') { targetActive = profile.base.active * 1.6; targetCpu = profile.base.cpu * 1.6; }
    if (incident === 'blocking') { targetActive = profile.base.active * 2; }
    if (incident === 'etl') { targetActive = profile.base.active * 2.2; targetCpu = profile.base.cpu * 1.5; }

    // Vazamento de sessões (perfil LOJASDB): cresce até perto do limite e "reinicia"
    if (profile.sessionLeakPerTick) {
      state.leak += rnd(0, profile.sessionLeakPerTick * 2);
      if (profile.base.total + state.leak > profile.limits.sessions * 0.97) state.leak = 0;
      targetTotal += state.leak;
    }

    state.active = drift(state.active, targetActive);
    state.total = drift(state.total, targetTotal, 0.1, 0.02);
    state.cpu = Math.min(99, Math.max(1, drift(state.cpu, targetCpu)));
    state.cursors = drift(state.cursors, targetCursors, 0.12, 0.03);

    const active = Math.max(1, Math.round(state.active));
    const total = Math.max(active + 10, Math.round(state.total));

    const slowCount = incident === 'slow_sql' || incident === 'etl' ? rndInt(3, 6)
      : incident === 'blocking' ? rndInt(1, 3)
      : Math.random() < 0.1 ? 1 : 0;
    while (state.slowPool.length < slowCount) {
      state.slowPool.push(makeSlowSession(incident === 'etl' ? 900 : incident === 'slow_sql' ? 600 : 180));
    }
    state.slowPool = state.slowPool.slice(0, slowCount).map((s) => ({ ...s, elapsedSec: s.elapsedSec + 5 }));

    const blocking = [];
    if (incident === 'blocking') {
      const n = rndInt(2, 5);
      for (let i = 0; i < n; i++) {
        const a = pick(sessionPool), b = pick(sessionPool);
        blocking.push({
          blockerSid: a.sid, blockerUser: a.username,
          blockedSid: b.sid, blockedUser: b.username,
          waitSec: rndInt(30, 600), event: 'enq: TX - row lock contention',
          object: pick(['VENDAS.PEDIDOS', 'ESTOQUE.SALDOS', 'FISCAL.NOTAS']),
        });
      }
    }

    const ash = buildAsh(active, incident);
    const avgWaitMs = incident === 'slow_sql' || incident === 'etl' ? rnd(28, 60) : incident === 'blocking' ? rnd(20, 40) : rnd(3, 9);

    const waitClasses = Object.entries(ash.byClass)
      .filter(([, v]) => v > 0)
      .map(([name, v]) => ({ name, pct: Math.round((v / active) * 100) }))
      .sort((a, b) => b.pct - a.pct);

    return {
      ts: Date.now(),
      incident: incident === 'none' ? null : incident,
      instance: {
        name: profile.name, host: profile.host, version: profile.version,
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000), status: 'OPEN',
        cpuCores: profile.cpuCores,
      },
      sessions: { total, active, limit: profile.limits.sessions, blocked: blocking.length },
      processes: { current: total + rndInt(20, 40), limit: profile.limits.processes },
      cursors: {
        open: Math.round(state.cursors),
        maxPerSession: rndInt(Math.round(profile.limits.cursors * 0.5), Math.round(profile.limits.cursors * (incident === 'session_storm' ? 0.96 : 0.8))),
        limit: profile.limits.cursors,
      },
      load: {
        cpuPct: +state.cpu.toFixed(1),
        aas: +(active * rnd(0.8, 1.05)).toFixed(1),
        execPerSec: Math.round(active * rnd(25, 45)),
        commitsPerSec: Math.round(active * rnd(2, 6)),
        readsPerSec: Math.round(rnd(200, 900) * (incident === 'etl' ? 8 : incident === 'slow_sql' ? 4 : 1)),
        writesPerSec: Math.round(rnd(60, 250) * (incident === 'etl' ? 4 : 1)),
        avgWaitMs: +avgWaitMs.toFixed(1),
      },
      waitClasses,
      slowSessions: state.slowPool,
      blocking,
      ash,
    };
  }

  async function collectExtras() {
    const now = Date.now();
    return {
      tablespaces: profile.tablespaces.map((t) => {
        const usedMB = Math.round(t.usedMB * rnd(0.998, 1.004));
        return { ...t, usedMB, pct: +((usedMB / t.sizeMB) * 100).toFixed(1) };
      }),
      users: profile.users.map((u) => ({
        ...u,
        expiryDate: u.daysToExpiry != null ? new Date(now + u.daysToExpiry * DAY).toISOString() : null,
      })),
      params: [
        { name: 'sessions', value: profile.limits.sessions },
        { name: 'processes', value: profile.limits.processes },
        { name: 'open_cursors', value: profile.limits.cursors },
        { name: 'cpu_count', value: profile.cpuCores },
        ...(profile.extraParams || [
          { name: 'sga_target', value: '16G' },
          { name: 'pga_aggregate_target', value: '4G' },
          { name: 'cursor_sharing', value: 'EXACT' },
        ]),
      ],
    };
  }

  return { collectSample, collectExtras };
}

module.exports = { createSimulator, WAIT_CLASSES };
