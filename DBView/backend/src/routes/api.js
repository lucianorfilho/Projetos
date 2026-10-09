const express = require('express');
const config = require('../config');
const db = require('../db');
const registry = require('../instances');
const health = require('../engine/health');
const { auth } = require('../middleware/auth');

const router = express.Router();

function computeHealth(inst) {
  const sample = inst.store.getLatest();
  if (!sample) return null;
  return health.compute(sample, inst.store.getExtras(), inst.store.getBaseline(), inst.alerts.getActive());
}

function alertCounts(activeAlerts) {
  return {
    critical: activeAlerts.filter((a) => a.severity === 'critical').length,
    warning: activeAlerts.filter((a) => a.severity === 'warning').length,
    info: activeAlerts.filter((a) => a.severity === 'info').length,
  };
}

// Health check público
router.get('/status', (req, res) => {
  res.json({ ok: true, instancesRunning: registry.count() });
});

router.use(auth);

// ---- Frota: os bancos do cliente logado ----
router.get('/instances', async (req, res) => {
  const [rows] = await db.query('SELECT max_instances FROM dbview_users WHERE id = ?', [req.user.id]);
  const maxInstances = rows[0]?.max_instances ?? 1;
  const list = registry.listForUser(req.user);
  const { freeIncluded, pricePerInstance } = registry.PRICING;
  const paid = Math.max(0, maxInstances - freeIncluded);

  res.json({
    plan: {
      id: paid > 0 ? 'paid' : 'free',
      name: paid > 0 ? 'Pago' : 'Free',
      maxInstances,
      used: list.length,
      pricePerInstance,
      monthlyCost: paid * pricePerInstance,
    },
    instances: list.map((inst) => {
      const sample = inst.store.getLatest();
      const activeAlerts = inst.alerts.getActive();
      return {
        id: inst.id,
        name: sample?.instance?.name ?? inst.meta.name,
        env: inst.meta.env,
        mode: inst.meta.mode,
        host: sample?.instance?.host,
        collectError: inst.lastError,
        health: sample ? computeHealth(inst) : null,
        sessions: sample?.sessions ?? null,
        load: sample ? { cpuPct: sample.load.cpuPct, aas: sample.load.aas } : null,
        incident: sample?.incident ?? null,
        alertCounts: alertCounts(activeAlerts),
        ts: sample?.ts ?? null,
      };
    }),
  });
});

// ---- Alertas globais (bancos do cliente) ----
router.get('/alerts', (req, res) => {
  const active = [];
  const history = [];
  for (const inst of registry.listForUser(req.user)) {
    const name = inst.store.getLatest()?.instance?.name ?? inst.meta.name;
    for (const a of inst.alerts.getActive()) active.push({ ...a, instanceId: inst.id, instanceName: name });
    for (const a of inst.alerts.getHistory(50)) history.push({ ...a, instanceId: inst.id, instanceName: name });
  }
  const w = { critical: 0, warning: 1, info: 2 };
  active.sort((a, b) => w[a.severity] - w[b.severity] || b.firedAt - a.firedAt);
  history.sort((a, b) => b.resolvedAt - a.resolvedAt);
  res.json({ active, history: history.slice(0, 100) });
});

// ---- Middleware: resolve a instância e valida o dono ----
router.use('/instances/:id', (req, res, next) => {
  const inst = registry.getInstance(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instância não encontrada' });
  if (req.user.role !== 'admin' && inst.userId !== req.user.id) {
    return res.status(403).json({ error: 'Essa instância não pertence à sua conta' });
  }
  req.inst = inst;
  next();
});

router.get('/instances/:id/overview', (req, res) => {
  const inst = req.inst;
  const sample = inst.store.getLatest();
  if (!sample) return res.status(503).json({ error: 'Coletor ainda não produziu dados', collectError: inst.lastError });

  const activeAlerts = inst.alerts.getActive();
  res.json({
    collectError: inst.lastError,
    instance: sample.instance,
    env: inst.meta.env,
    incident: sample.incident,
    health: computeHealth(inst),
    sessions: sample.sessions,
    processes: sample.processes,
    cursors: sample.cursors,
    load: sample.load,
    waitClasses: sample.waitClasses,
    blocking: sample.blocking,
    slowSessions: sample.slowSessions,
    alerts: activeAlerts.slice(0, 8),
    alertCounts: alertCounts(activeAlerts),
    ts: sample.ts,
  });
});

// ---- ASH / Top Activity ----
router.get('/instances/:id/ash', (req, res) => {
  const inst = req.inst;
  const minutes = Math.min(240, parseInt(req.query.minutes || '30', 10));
  const ticks = inst.store.getAshWindow(minutes);
  if (ticks.length === 0) return res.status(503).json({ error: 'Sem dados ASH ainda' });

  const bucketMs = minutes <= 30 ? config.collectInterval * 1000 : 60000;
  const buckets = new Map();
  const classSet = new Set(['CPU']);
  const sqlAgg = new Map();
  const sessAgg = new Map();
  let totalActivity = 0;

  for (const t of ticks) {
    const bts = Math.floor(t.ts / bucketMs) * bucketMs;
    let b = buckets.get(bts);
    if (!b) { b = { ts: bts, n: 0, byClass: {} }; buckets.set(bts, b); }
    b.n += 1;
    for (const [cls, v] of Object.entries(t.byClass)) {
      if (v > 0) { classSet.add(cls); b.byClass[cls] = (b.byClass[cls] || 0) + v; }
      totalActivity += v;
    }
    for (const s of t.sql) {
      const e = sqlAgg.get(s.sqlId) || { sqlId: s.sqlId, type: s.type, text: s.text, count: 0, byClass: {} };
      e.count += s.count;
      if (!e.type && s.type) e.type = s.type;
      for (const [cls, v] of Object.entries(s.byClass || {})) e.byClass[cls] = (e.byClass[cls] || 0) + v;
      sqlAgg.set(s.sqlId, e);
    }
    for (const s of t.sessions) {
      const e = sessAgg.get(s.sid) || { sid: s.sid, username: s.username, program: s.program, count: 0 };
      e.count += s.count;
      sessAgg.set(s.sid, e);
    }
  }

  const ORDER = ['CPU', 'Scheduler', 'User I/O', 'System I/O', 'Concurrency', 'Application', 'Commit', 'Configuration', 'Administrative', 'Network', 'Queueing', 'Cluster', 'Other'];
  const classes = ORDER.filter((c) => classSet.has(c));

  const series = [...buckets.values()].sort((a, b) => a.ts - b.ts).map((b) => {
    const point = { ts: b.ts };
    for (const cls of classes) point[cls] = +((b.byClass[cls] || 0) / b.n).toFixed(1);
    return point;
  });

  const pctOf = (count) => +((count / (totalActivity || 1)) * 100).toFixed(2);
  const toBreakdown = (byClass, count) => {
    const out = {};
    for (const [cls, v] of Object.entries(byClass)) out[cls] = +((v / count) * 100).toFixed(1);
    return out;
  };

  const topSql = [...sqlAgg.values()].sort((a, b) => b.count - a.count).slice(0, 10)
    .map((s) => ({ sqlId: s.sqlId, type: s.type, text: s.text, activityPct: pctOf(s.count), byClassPct: toBreakdown(s.byClass, s.count) }));
  const topSessions = [...sessAgg.values()].sort((a, b) => b.count - a.count).slice(0, 10)
    .map((s) => ({ sid: s.sid, username: s.username, program: s.program, activityPct: pctOf(s.count) }));

  res.json({
    cpuCores: ticks[ticks.length - 1].cpuCores ?? null,
    classes,
    series,
    topSql,
    topSessions,
    ts: ticks[ticks.length - 1].ts,
  });
});

router.get('/instances/:id/metrics/history', (req, res) => {
  const inst = req.inst;
  const minutes = parseInt(req.query.minutes || '60', 10);
  if (minutes <= 30) {
    res.json({ resolution: 'sample', points: inst.store.getRecentSamples(minutes * 12).map((s) => ({
      ts: s.ts, aas: s.load.aas, cpuPct: s.load.cpuPct,
      activeSessions: s.sessions.active, totalSessions: s.sessions.total,
      execPerSec: s.load.execPerSec, avgWaitMs: s.load.avgWaitMs,
    })) });
  } else {
    res.json({ resolution: 'minute', points: inst.store.getMinuteSeries(minutes) });
  }
});

router.get('/instances/:id/alerts', (req, res) => {
  res.json({ active: req.inst.alerts.getActive(), history: req.inst.alerts.getHistory(100) });
});

router.get('/instances/:id/sessions', (req, res) => {
  const sample = req.inst.store.getLatest();
  if (!sample) return res.status(503).json({ error: 'Sem dados' });
  res.json({ summary: sample.sessions, slowSessions: sample.slowSessions, blocking: sample.blocking, ts: sample.ts });
});

router.get('/instances/:id/security', (req, res) => {
  const extras = req.inst.store.getExtras();
  res.json({ users: extras?.users ?? [], warnDays: config.passwordExpiryWarnDays, ts: extras?.ts });
});

router.get('/instances/:id/storage', (req, res) => {
  const extras = req.inst.store.getExtras();
  res.json({ tablespaces: extras?.tablespaces ?? [], ts: extras?.ts });
});

router.get('/instances/:id/params', (req, res) => {
  const inst = req.inst;
  const sample = inst.store.getLatest();
  const extras = inst.store.getExtras();
  if (!sample || !extras) return res.status(503).json({ error: 'Sem dados' });

  const t = config.thresholds;
  const enriched = (extras.params ?? []).map((p) => {
    let usage = null, limit = null, recommendation = null;
    if (p.name === 'sessions') { usage = sample.sessions.total; limit = sample.sessions.limit; }
    else if (p.name === 'processes') { usage = sample.processes.current; limit = sample.processes.limit; }
    else if (p.name === 'open_cursors') { usage = sample.cursors.maxPerSession; limit = sample.cursors.limit; }
    if (usage != null && limit) {
      const pct = (usage / limit) * 100;
      const warn = p.name === 'open_cursors' ? t.cursorsWarnPct : t.sessionsWarnPct;
      if (pct >= warn) recommendation = `Uso em ${pct.toFixed(0)}% — considere aumentar para ${Math.ceil(limit * 1.5)}.`;
      return { ...p, usage, limit, pct: +pct.toFixed(1), recommendation };
    }
    return { ...p, usage, limit, pct: null, recommendation };
  });
  res.json({ params: enriched, ts: sample.ts });
});

module.exports = router;
