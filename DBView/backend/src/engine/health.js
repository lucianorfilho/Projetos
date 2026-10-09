// Índice de saúde do banco (0–100) e classificação de velocidade:
// RÁPIDO / NORMAL / LENTO / SOBRECARGA — combinando uso de recursos,
// latência, bloqueios e desvio em relação ao baseline histórico.

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function compute(sample, extras, baseline, activeAlerts) {
  if (!sample) return null;

  let score = 100;
  const reasons = [];

  const sessPct = sample.sessions.limit ? (sample.sessions.total / sample.sessions.limit) * 100 : 0;
  const procPct = sample.processes.limit ? (sample.processes.current / sample.processes.limit) * 100 : 0;
  const curPct = sample.cursors.limit ? (sample.cursors.maxPerSession / sample.cursors.limit) * 100 : 0;

  // Recursos perto do limite
  if (sessPct > 90) { score -= 20; reasons.push('sessões no limite'); }
  else if (sessPct > 75) { score -= 8; reasons.push('sessões elevadas'); }
  if (procPct > 90) { score -= 15; reasons.push('processos no limite'); }
  else if (procPct > 75) { score -= 6; }
  if (curPct > 85) { score -= 10; reasons.push('cursores no limite'); }

  // CPU
  if (sample.load.cpuPct > 92) { score -= 25; reasons.push('CPU saturada'); }
  else if (sample.load.cpuPct > 80) { score -= 12; reasons.push('CPU alta'); }
  else if (sample.load.cpuPct > 65) { score -= 5; }

  // Latência e desvio do padrão
  let latencyFactor = 1;
  if (baseline.avgWaitMs && baseline.avgWaitMs > 0.5) {
    latencyFactor = sample.load.avgWaitMs / baseline.avgWaitMs;
    if (latencyFactor > 3) { score -= 20; reasons.push('latência muito acima do normal'); }
    else if (latencyFactor > 2) { score -= 10; reasons.push('latência acima do normal'); }
  }
  let loadFactor = 1;
  if (baseline.activeSessions && baseline.activeSessions > 3) {
    loadFactor = sample.sessions.active / baseline.activeSessions;
    if (loadFactor > 3) { score -= 15; reasons.push('carga muito acima do padrão'); }
    else if (loadFactor > 2) { score -= 8; reasons.push('carga acima do padrão'); }
  }

  // Bloqueios e sessões lentas
  if (sample.blocking.length >= 3) { score -= 18; reasons.push('múltiplos bloqueios'); }
  else if (sample.blocking.length > 0) { score -= 8; reasons.push('sessões bloqueadas'); }
  if (sample.slowSessions.length >= 3) { score -= 12; reasons.push('várias sessões lentas'); }
  else if (sample.slowSessions.length > 0) { score -= 5; }

  // Storage crítico derruba a nota
  if (extras && extras.tablespaces) {
    const worst = Math.max(0, ...extras.tablespaces.map((t) => t.pct));
    if (worst >= 95) { score -= 15; reasons.push('tablespace quase cheia'); }
    else if (worst >= 85) { score -= 5; }
  }

  score = clamp(Math.round(score), 0, 100);

  // Classificação de velocidade percebida
  let speed;
  const overloaded = sample.load.cpuPct > 90 || sessPct > 90 || loadFactor > 3;
  const slow = latencyFactor > 2 || sample.blocking.length >= 3 || sample.slowSessions.length >= 3 || sample.load.cpuPct > 80;
  if (overloaded) speed = 'SOBRECARGA';
  else if (slow || score < 55) speed = 'LENTO';
  else if (score >= 85) speed = 'RÁPIDO';
  else speed = 'NORMAL';

  const criticals = activeAlerts.filter((a) => a.severity === 'critical').length;

  return {
    score,
    speed, // RÁPIDO | NORMAL | LENTO | SOBRECARGA
    status: score >= 85 ? 'healthy' : score >= 55 ? 'attention' : 'critical',
    reasons,
    criticalAlerts: criticals,
    usage: {
      sessionsPct: +sessPct.toFixed(1),
      processesPct: +procPct.toFixed(1),
      cursorsPct: +curPct.toFixed(1),
    },
    deviation: {
      latencyFactor: +latencyFactor.toFixed(2),
      loadFactor: +loadFactor.toFixed(2),
    },
  };
}

module.exports = { compute };
