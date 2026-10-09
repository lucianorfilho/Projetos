// Coletor real: consulta as views de performance do Oracle (v$/dba_).
// Usa o driver node-oracledb em modo thin (sem Oracle Client instalado).
// O usuário de monitoramento precisa de SELECT em: v$instance, v$session,
// v$process, v$parameter, v$sysmetric, v$system_wait_class, v$sesstat,
// v$statname, v$sql, dba_users, dba_tablespace_usage_metrics, dba_tablespaces.

const oracledb = require('oracledb');
const config = require('../config');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// Fábrica: um coletor por instância Oracle cadastrada (conexão própria).
function createOracleCollector(connCfg) {
  let pool = null;
  async function getPool() {
    if (!pool) {
      pool = await oracledb.createPool({
        user: connCfg.user,
        password: connCfg.password,
        connectString: connCfg.connectString,
        poolMin: 1,
        poolMax: 2,
      });
    }
    return pool;
  }
  return {
    collectSample: () => collectSampleWith(getPool),
    collectExtras: () => collectExtrasWith(getPool),
  };
}

async function q(conn, sql, binds = {}) {
  const r = await conn.execute(sql, binds);
  return r.rows;
}

async function collectSampleWith(getPool) {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    const [inst] = await q(conn, `
      SELECT instance_name, host_name, version_full AS version, status,
             (SYSDATE - startup_time) * 86400 AS uptime_seconds
      FROM v$instance`);

    const params = await q(conn, `
      SELECT name, value FROM v$parameter
      WHERE name IN ('sessions','processes','open_cursors','cpu_count')`);
    const pmap = Object.fromEntries(params.map((r) => [r.NAME, parseInt(r.VALUE, 10)]));

    const [sess] = await q(conn, `
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN status='ACTIVE' AND type='USER' THEN 1 ELSE 0 END) AS active,
             SUM(CASE WHEN blocking_session IS NOT NULL THEN 1 ELSE 0 END) AS blocked
      FROM v$session`);

    const [proc] = await q(conn, `SELECT COUNT(*) AS current_count FROM v$process`);

    const [cur] = await q(conn, `
      SELECT SUM(s.value) AS open_total, MAX(s.value) AS max_per_session
      FROM v$sesstat s JOIN v$statname n ON n.statistic# = s.statistic#
      WHERE n.name = 'opened cursors current'`);

    const metrics = await q(conn, `
      SELECT metric_name, value FROM v$sysmetric
      WHERE group_id = 2 AND metric_name IN (
        'Host CPU Utilization (%)','Average Active Sessions','Executions Per Sec',
        'User Commits Per Sec','Physical Reads Per Sec','Physical Writes Per Sec',
        'Average Synchronous Single-Block Read Latency')`);
    const m = Object.fromEntries(metrics.map((r) => [r.METRIC_NAME, r.VALUE]));

    const waits = await q(conn, `
      SELECT wait_class AS name, ROUND(time_waited / NULLIF(SUM(time_waited) OVER (), 0) * 100) AS pct
      FROM v$system_wait_class WHERE wait_class <> 'Idle' ORDER BY time_waited DESC`);

    const slow = await q(conn, `
      SELECT s.sid, s.serial# AS serial, s.username, s.program, s.machine, s.event,
             s.sql_id, s.last_call_et AS elapsed_sec, s.status,
             SUBSTR(sq.sql_text, 1, 200) AS sql_text
      FROM v$session s LEFT JOIN v$sql sq ON sq.sql_id = s.sql_id AND sq.child_number = 0
      WHERE s.type = 'USER' AND s.status = 'ACTIVE' AND s.username IS NOT NULL
        AND s.last_call_et > :slowSec
      ORDER BY s.last_call_et DESC FETCH FIRST 20 ROWS ONLY`,
      { slowSec: config.thresholds.slowSessionSec });

    // "Poor man's ASH": fotografa as sessões ativas com sua classe de espera
    // (WAITING → wait_class; senão → CPU) para o gráfico Top Activity,
    // sem exigir licença do Diagnostics Pack (v$active_session_history).
    const ashRows = await q(conn, `
      SELECT s.sid, s.username, s.program, s.sql_id,
             CASE WHEN s.state = 'WAITING' THEN NVL(s.wait_class, 'Other') ELSE 'CPU' END AS activity_class,
             SUBSTR(sq.sql_text, 1, 200) AS sql_text
      FROM v$session s LEFT JOIN v$sql sq ON sq.sql_id = s.sql_id AND sq.child_number = 0
      WHERE s.status = 'ACTIVE' AND s.type = 'USER' AND s.username IS NOT NULL`);

    const ashByClass = {};
    const ashBySql = new Map();
    const ashBySession = new Map();
    for (const r of ashRows) {
      const cls = r.ACTIVITY_CLASS === 'Idle' ? 'Other' : r.ACTIVITY_CLASS;
      ashByClass[cls] = (ashByClass[cls] || 0) + 1;
      if (r.SQL_ID) {
        const e = ashBySql.get(r.SQL_ID) || { sqlId: r.SQL_ID, type: null, text: r.SQL_TEXT, count: 0, byClass: {} };
        e.count += 1;
        e.byClass[cls] = (e.byClass[cls] || 0) + 1;
        ashBySql.set(r.SQL_ID, e);
      }
      const se = ashBySession.get(r.SID) || { sid: r.SID, username: r.USERNAME, program: r.PROGRAM, count: 0 };
      se.count += 1;
      ashBySession.set(r.SID, se);
    }

    const blocking = await q(conn, `
      SELECT w.sid AS blocked_sid, w.username AS blocked_user,
             w.blocking_session AS blocker_sid, b.username AS blocker_user,
             w.seconds_in_wait AS wait_sec, w.event,
             o.owner || '.' || o.object_name AS object_name
      FROM v$session w
      LEFT JOIN v$session b ON b.sid = w.blocking_session
      LEFT JOIN dba_objects o ON o.object_id = w.row_wait_obj#
      WHERE w.blocking_session IS NOT NULL`);

    return {
      ts: Date.now(),
      incident: null,
      instance: {
        name: inst.INSTANCE_NAME,
        host: inst.HOST_NAME,
        version: inst.VERSION,
        uptimeSeconds: Math.floor(inst.UPTIME_SECONDS),
        status: inst.STATUS,
        cpuCores: pmap.cpu_count,
      },
      sessions: {
        total: sess.TOTAL,
        active: sess.ACTIVE || 0,
        limit: pmap.sessions,
        blocked: sess.BLOCKED || 0,
      },
      processes: { current: proc.CURRENT_COUNT, limit: pmap.processes },
      cursors: {
        open: cur.OPEN_TOTAL || 0,
        maxPerSession: cur.MAX_PER_SESSION || 0,
        limit: pmap.open_cursors,
      },
      load: {
        cpuPct: +(m['Host CPU Utilization (%)'] || 0).toFixed(1),
        aas: +(m['Average Active Sessions'] || 0).toFixed(1),
        execPerSec: Math.round(m['Executions Per Sec'] || 0),
        commitsPerSec: Math.round(m['User Commits Per Sec'] || 0),
        readsPerSec: Math.round(m['Physical Reads Per Sec'] || 0),
        writesPerSec: Math.round(m['Physical Writes Per Sec'] || 0),
        avgWaitMs: +((m['Average Synchronous Single-Block Read Latency'] || 0)).toFixed(1),
      },
      waitClasses: waits.map((w) => ({ name: w.NAME, pct: w.PCT || 0 })),
      slowSessions: slow.map((s) => ({
        sid: s.SID, serial: s.SERIAL, username: s.USERNAME, program: s.PROGRAM,
        machine: s.MACHINE, event: s.EVENT, sqlId: s.SQL_ID,
        sqlText: s.SQL_TEXT, elapsedSec: s.ELAPSED_SEC, status: s.STATUS,
      })),
      blocking: blocking.map((b) => ({
        blockedSid: b.BLOCKED_SID, blockedUser: b.BLOCKED_USER,
        blockerSid: b.BLOCKER_SID, blockerUser: b.BLOCKER_USER,
        waitSec: b.WAIT_SEC, event: b.EVENT, object: b.OBJECT_NAME,
      })),
      ash: {
        cpuCores: pmap.cpu_count,
        byClass: ashByClass,
        sql: [...ashBySql.values()],
        sessions: [...ashBySession.values()],
      },
    };
  } finally {
    await conn.close();
  }
}

async function collectExtrasWith(getPool) {
  const p = await getPool();
  const conn = await p.getConnection();
  try {
    const ts = await q(conn, `
      SELECT m.tablespace_name AS name,
             ROUND(m.tablespace_size * t.block_size / 1048576) AS size_mb,
             ROUND(m.used_space * t.block_size / 1048576) AS used_mb,
             ROUND(m.used_percent, 1) AS pct
      FROM dba_tablespace_usage_metrics m
      JOIN dba_tablespaces t ON t.tablespace_name = m.tablespace_name
      ORDER BY m.used_percent DESC`);

    const users = await q(conn, `
      SELECT username, account_status, profile, expiry_date,
             ROUND(expiry_date - SYSDATE) AS days_to_expiry
      FROM dba_users
      WHERE oracle_maintained = 'N'
        AND (expiry_date < SYSDATE + 90 OR account_status <> 'OPEN')
      ORDER BY expiry_date NULLS LAST`);

    const params = await q(conn, `
      SELECT name, display_value AS value FROM v$parameter
      WHERE name IN ('sessions','processes','open_cursors','sga_target',
                     'pga_aggregate_target','db_cache_size','cursor_sharing')`);

    return {
      tablespaces: ts.map((t) => ({
        name: t.NAME, sizeMB: t.SIZE_MB, usedMB: t.USED_MB, pct: t.PCT, autoextend: true,
      })),
      users: users.map((u) => ({
        username: u.USERNAME, accountStatus: u.ACCOUNT_STATUS, profile: u.PROFILE,
        expiryDate: u.EXPIRY_DATE, daysToExpiry: u.DAYS_TO_EXPIRY,
      })),
      params: params.map((r) => ({ name: r.NAME, value: r.VALUE })),
    };
  } finally {
    await conn.close();
  }
}

module.exports = { createOracleCollector };
