// Motor de alertas por instância: avalia cada amostra contra limiares e
// contra o baseline histórico, mantendo alertas ativos/resolvidos com
// sugestões de ação. createAlertsEngine() devolve um motor independente.

const config = require('../config');

let alertSeq = 1;

function createAlertsEngine() {
  const active = new Map();
  const history = [];
  const MAX_HISTORY = 500;

  function fire(key, severity, category, title, message, suggestion) {
    const existing = active.get(key);
    if (existing) {
      existing.lastSeen = Date.now();
      existing.message = message;
      if (severity === 'critical') existing.severity = 'critical';
      return;
    }
    active.set(key, {
      id: alertSeq++, key, severity, category, title, message, suggestion,
      firedAt: Date.now(), lastSeen: Date.now(),
    });
  }

  function resolveStale(seenKeys) {
    const GRACE_MS = 30000;
    for (const [key, alert] of active) {
      if (!seenKeys.has(key) && Date.now() - alert.lastSeen > GRACE_MS) {
        active.delete(key);
        history.unshift({ ...alert, resolvedAt: Date.now() });
        if (history.length > MAX_HISTORY) history.pop();
      }
    }
  }

  function pct(used, limit) { return limit ? (used / limit) * 100 : 0; }

  function evaluate(sample, extras, baseline) {
    const t = config.thresholds;
    const seen = new Set();
    const mark = (key) => { seen.add(key); return key; };

    // --- Sessões vs parâmetro SESSIONS ---
    const sessPct = pct(sample.sessions.total, sample.sessions.limit);
    if (sessPct >= t.sessionsCritPct) {
      fire(mark('sessions-limit'), 'critical', 'sessions',
        'Sessões próximas do limite',
        `${sample.sessions.total} sessões de um limite de ${sample.sessions.limit} (${sessPct.toFixed(0)}%). Novas conexões podem falhar com ORA-00018.`,
        `Aumente o parâmetro SESSIONS (e PROCESSES proporcionalmente): ALTER SYSTEM SET sessions=${Math.ceil(sample.sessions.limit * 1.5)} SCOPE=SPFILE; — requer restart. Verifique também se a aplicação está vazando conexões.`);
    } else if (sessPct >= t.sessionsWarnPct) {
      fire(mark('sessions-limit'), 'warning', 'sessions',
        'Uso de sessões elevado',
        `${sample.sessions.total} sessões de ${sample.sessions.limit} (${sessPct.toFixed(0)}%).`,
        `Monitore o crescimento. Se a tendência continuar, planeje aumentar SESSIONS para ${Math.ceil(sample.sessions.limit * 1.5)}.`);
    }

    // --- Processos vs PROCESSES ---
    const procPct = pct(sample.processes.current, sample.processes.limit);
    if (procPct >= t.processesCritPct) {
      fire(mark('processes-limit'), 'critical', 'sessions',
        'Processos próximos do limite',
        `${sample.processes.current} processos de ${sample.processes.limit} (${procPct.toFixed(0)}%). Risco de ORA-00020 (maximum number of processes exceeded).`,
        `Aumente PROCESSES: ALTER SYSTEM SET processes=${Math.ceil(sample.processes.limit * 1.5)} SCOPE=SPFILE; — requer restart da instância.`);
    } else if (procPct >= t.processesWarnPct) {
      fire(mark('processes-limit'), 'warning', 'sessions',
        'Uso de processos elevado',
        `${sample.processes.current} processos de ${sample.processes.limit} (${procPct.toFixed(0)}%).`,
        `Planeje aumentar PROCESSES para ${Math.ceil(sample.processes.limit * 1.5)} na próxima janela de manutenção.`);
    }

    // --- Cursores por sessão vs OPEN_CURSORS ---
    const curPct = pct(sample.cursors.maxPerSession, sample.cursors.limit);
    if (curPct >= t.cursorsCritPct) {
      fire(mark('cursors-limit'), 'critical', 'config',
        'Cursores abertos próximos do limite',
        `Uma sessão está com ${sample.cursors.maxPerSession} cursores abertos de um limite de ${sample.cursors.limit} (${curPct.toFixed(0)}%). Risco de ORA-01000.`,
        `Aumente OPEN_CURSORS: ALTER SYSTEM SET open_cursors=${Math.ceil(sample.cursors.limit * 1.5)} SCOPE=BOTH; (dinâmico, sem restart). Investigue também vazamento de cursores na aplicação.`);
    } else if (curPct >= t.cursorsWarnPct) {
      fire(mark('cursors-limit'), 'warning', 'config',
        'Uso de cursores elevado',
        `Sessão com ${sample.cursors.maxPerSession} cursores de ${sample.cursors.limit} (${curPct.toFixed(0)}%).`,
        `Considere aumentar OPEN_CURSORS para ${Math.ceil(sample.cursors.limit * 1.5)} e revisar o fechamento de cursores na aplicação.`);
    }

    // --- CPU ---
    if (sample.load.cpuPct >= t.cpuCritPct) {
      fire(mark('cpu-high'), 'critical', 'performance',
        'CPU do servidor saturada',
        `CPU em ${sample.load.cpuPct.toFixed(0)}%. O banco pode ficar lento para todas as sessões.`,
        `Identifique as SQLs que mais consomem CPU (Top SQL na aba Atividade) e avalie plano de execução, índices ou limitação de paralelismo.`);
    } else if (sample.load.cpuPct >= t.cpuWarnPct) {
      fire(mark('cpu-high'), 'warning', 'performance',
        'CPU elevada',
        `CPU em ${sample.load.cpuPct.toFixed(0)}%.`,
        `Acompanhe as sessões ativas e as SQLs mais pesadas antes que o servidor sature.`);
    }

    // --- Anomalia de carga vs baseline ---
    if (baseline.activeSessions != null && baseline.activeSessions > 3) {
      const factor = sample.sessions.active / baseline.activeSessions;
      if (factor >= t.anomalyFactor && sample.sessions.active > 20) {
        fire(mark('anomaly-sessions'), 'warning', 'performance',
          'Sessões ativas fora do padrão',
          `${sample.sessions.active} sessões ativas — ${factor.toFixed(1)}x acima da média histórica (${baseline.activeSessions.toFixed(0)}). Algo diferente do comportamento normal está acontecendo.`,
          `Verifique se houve deploy, rotina extra ou pico de acessos. Veja no gráfico de atividade quem está gerando a carga.`);
      }
    }
    if (baseline.avgWaitMs != null && baseline.avgWaitMs > 0.5) {
      const factor = sample.load.avgWaitMs / baseline.avgWaitMs;
      if (factor >= t.anomalyFactor && sample.load.avgWaitMs > 15) {
        fire(mark('anomaly-latency'), 'warning', 'performance',
          'Banco mais lento que o normal',
          `Latência média de I/O em ${sample.load.avgWaitMs.toFixed(1)} ms — ${factor.toFixed(1)}x acima do padrão histórico (${baseline.avgWaitMs.toFixed(1)} ms). As sessões estão demorando mais do que de costume.`,
          `Verifique o storage/discos, sessões com I/O pesado e se há rotina de backup ou ETL em horário indevido.`);
      }
    }

    // --- Sessões lentas ---
    if (sample.slowSessions.length > 0) {
      const worst = sample.slowSessions[0];
      fire(mark('slow-sessions'), sample.slowSessions.length >= 3 ? 'critical' : 'warning', 'performance',
        `${sample.slowSessions.length} sessão(ões) executando há muito tempo`,
        `A mais antiga (${worst.username}, SID ${worst.sid}) está ativa há ${Math.round(worst.elapsedSec / 60)} min no evento "${worst.event}".`,
        `Analise a SQL_ID ${worst.sqlId} (plano de execução, estatísticas, índices). Se for uma consulta travada, avalie encerrar a sessão.`);
    }

    // --- Bloqueios ---
    if (sample.blocking.length > 0) {
      const b = sample.blocking[0];
      fire(mark('blocking'), sample.blocking.length >= 3 ? 'critical' : 'warning', 'performance',
        `${sample.blocking.length} sessão(ões) bloqueada(s)`,
        `${b.blockerUser} (SID ${b.blockerSid}) bloqueia ${b.blockedUser} (SID ${b.blockedSid}) há ${Math.round(b.waitSec / 60)} min em ${b.object || 'objeto desconhecido'}.`,
        `Identifique a transação que não commitou. Se necessário: ALTER SYSTEM KILL SESSION '${b.blockerSid},<serial>';`);
    }

    // --- Segurança: senhas expirando e contas com problema ---
    if (extras && extras.users) {
      for (const u of extras.users) {
        if (u.daysToExpiry != null && u.daysToExpiry <= config.passwordExpiryWarnDays && u.daysToExpiry >= 0) {
          const sev = u.daysToExpiry <= 5 ? 'critical' : 'warning';
          fire(mark(`pwd-expiry-${u.username}`), sev, 'security',
            `Senha de ${u.username} expira em ${u.daysToExpiry} dia(s)`,
            `A conta ${u.username} (profile ${u.profile}) terá a senha expirada em ${u.daysToExpiry} dia(s). Se for conta de aplicação, o sistema pode parar de conectar.`,
            `Altere a senha antes do vencimento ou ajuste o PASSWORD_LIFE_TIME do profile ${u.profile} se for política aceita.`);
        }
        if (u.accountStatus && u.accountStatus.includes('EXPIRED(GRACE)')) {
          fire(mark(`pwd-grace-${u.username}`), 'critical', 'security',
            `${u.username} em período de graça`,
            `A senha de ${u.username} já expirou e está no período de graça — as conexões vão falhar em breve.`,
            `Troque a senha imediatamente: ALTER USER ${u.username} IDENTIFIED BY <nova_senha>;`);
        }
        if (u.accountStatus === 'LOCKED') {
          fire(mark(`locked-${u.username}`), 'info', 'security',
            `Conta ${u.username} bloqueada`,
            `A conta ${u.username} está com status LOCKED.`,
            `Se o bloqueio não for intencional: ALTER USER ${u.username} ACCOUNT UNLOCK;`);
        }
      }
    }

    // --- Tablespaces ---
    if (extras && extras.tablespaces) {
      for (const ts of extras.tablespaces) {
        if (ts.pct >= t.tablespaceCritPct) {
          fire(mark(`tbs-${ts.name}`), 'critical', 'storage',
            `Tablespace ${ts.name} quase cheia`,
            `${ts.name} está com ${ts.pct}% de uso (${(ts.usedMB / 1024).toFixed(1)} GB de ${(ts.sizeMB / 1024).toFixed(1)} GB).${ts.autoextend ? '' : ' Sem autoextend!'}`,
            `Adicione um datafile ou aumente o existente: ALTER TABLESPACE ${ts.name} ADD DATAFILE SIZE 4G AUTOEXTEND ON;`);
        } else if (ts.pct >= t.tablespaceWarnPct) {
          fire(mark(`tbs-${ts.name}`), 'warning', 'storage',
            `Tablespace ${ts.name} com uso alto`,
            `${ts.name} está com ${ts.pct}% de uso.`,
            `Planeje a expansão da tablespace ${ts.name} antes que atinja o limite.`);
        }
      }
    }

    resolveStale(seen);
  }

  return {
    evaluate,
    getActive: () => [...active.values()].sort((a, b) => {
      const w = { critical: 0, warning: 1, info: 2 };
      return w[a.severity] - w[b.severity] || b.firedAt - a.firedAt;
    }),
    getHistory: (n = 100) => history.slice(0, n),
  };
}

module.exports = { createAlertsEngine };
