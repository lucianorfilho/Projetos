from __future__ import annotations

import time

import oracledb

from .models import Instance, OracleMetrics, Status, TablespaceInfo

_SQL_TABLESPACES = """
SELECT df.tablespace_name,
       NVL(df.bytes, 0) / 1024 / 1024 AS total_mb,
       NVL(df.bytes - NVL(fs.bytes, 0), 0) / 1024 / 1024 AS used_mb
FROM (SELECT tablespace_name, SUM(bytes) bytes FROM dba_data_files GROUP BY tablespace_name) df
LEFT JOIN (SELECT tablespace_name, SUM(bytes) bytes FROM dba_free_space GROUP BY tablespace_name) fs
       ON df.tablespace_name = fs.tablespace_name
ORDER BY df.tablespace_name
"""

_SQL_SESSIONS = "SELECT COUNT(*) FROM v$session WHERE type = 'USER'"
_SQL_BLOCKED = "SELECT COUNT(*) FROM v$session WHERE blocking_session IS NOT NULL"
_SQL_LONG_QUERIES = """
SELECT COUNT(*) FROM v$session s
WHERE s.status = 'ACTIVE' AND s.type = 'USER'
  AND s.last_call_et > 300
"""
_SQL_SGA = "SELECT SUM(value) / 1024 / 1024 FROM v$sga"
_SQL_SGA_COMPONENTS = "SELECT name, value / 1024 / 1024 FROM v$sga ORDER BY value DESC"
_SQL_PGA = "SELECT value / 1024 / 1024 FROM v$pgastat WHERE name = 'total PGA allocated'"
_SQL_PGA_MAX = "SELECT value / 1024 / 1024 FROM v$pgastat WHERE name = 'maximum PGA allocated'"
_SQL_PGA_LIMIT = "SELECT value / 1024 / 1024 FROM v$parameter WHERE name = 'pga_aggregate_target'"
_SQL_PING = "SELECT 1 FROM dual"


def _dsn(inst: Instance) -> str:
    return oracledb.makedsn(inst.oracle_host, inst.oracle_port, service_name=inst.oracle_service)


def collect(inst: Instance, password: str) -> OracleMetrics:
    m = OracleMetrics()
    try:
        with oracledb.connect(user=inst.oracle_user, password=password, dsn=_dsn(inst)) as conn:
            m.up = True
            cur = conn.cursor()

            t0 = time.perf_counter()
            cur.execute(_SQL_PING)
            cur.fetchone()
            m.latency_ms = (time.perf_counter() - t0) * 1000

            cur.execute(_SQL_TABLESPACES)
            for name, total_mb, used_mb in cur:
                m.tablespaces.append(TablespaceInfo(name=name, used_mb=used_mb or 0, total_mb=total_mb or 0))

            cur.execute(_SQL_SESSIONS)
            m.session_count = cur.fetchone()[0]

            cur.execute(_SQL_BLOCKED)
            m.blocked_sessions = cur.fetchone()[0]

            cur.execute(_SQL_LONG_QUERIES)
            m.long_running_queries = cur.fetchone()[0]

            try:
                cur.execute(_SQL_SGA)
                m.sga_mb = cur.fetchone()[0] or 0
                cur.execute(_SQL_SGA_COMPONENTS)
                m.sga_components = [(name, mb or 0) for name, mb in cur]
            except oracledb.DatabaseError:
                pass

            try:
                cur.execute(_SQL_PGA)
                row = cur.fetchone()
                m.pga_mb = row[0] if row else 0
                cur.execute(_SQL_PGA_MAX)
                row = cur.fetchone()
                m.pga_max_mb = row[0] if row else 0
                cur.execute(_SQL_PGA_LIMIT)
                row = cur.fetchone()
                m.pga_limit_mb = row[0] if row else 0
            except oracledb.DatabaseError:
                pass

        m.status = _evaluate_status(inst, m)
    except oracledb.DatabaseError as e:
        m.up = False
        m.status = Status.CRITICAL
        m.error = str(e.args[0].message if e.args else e).strip()
    except Exception as e:
        m.up = False
        m.status = Status.CRITICAL
        m.error = str(e)

    return m


def _evaluate_status(inst: Instance, m: OracleMetrics) -> Status:
    t = inst.thresholds
    worst = Status.OK

    for ts in m.tablespaces:
        if ts.pct_used >= t.tablespace_crit_pct:
            worst = Status.worst(worst, Status.CRITICAL)
        elif ts.pct_used >= t.tablespace_warn_pct:
            worst = Status.worst(worst, Status.WARNING)

    if m.session_count >= t.session_crit_count:
        worst = Status.worst(worst, Status.CRITICAL)
    elif m.session_count >= t.session_warn_count:
        worst = Status.worst(worst, Status.WARNING)

    if m.blocked_sessions > 0:
        worst = Status.worst(worst, Status.WARNING)
    if m.blocked_sessions > 5:
        worst = Status.worst(worst, Status.CRITICAL)

    return worst
