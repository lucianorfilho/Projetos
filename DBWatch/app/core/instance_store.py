from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import Instance, Thresholds
from . import secrets

DB_PATH = Path.home() / "AppData" / "Local" / "DBWatch" / "dbwatch.sqlite3"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,

    oracle_host TEXT NOT NULL DEFAULT '',
    oracle_port INTEGER NOT NULL DEFAULT 1521,
    oracle_service TEXT NOT NULL DEFAULT '',
    oracle_user TEXT NOT NULL DEFAULT '',
    oracle_password_enc TEXT NOT NULL DEFAULT '',

    ssh_enabled INTEGER NOT NULL DEFAULT 0,
    ssh_host TEXT NOT NULL DEFAULT '',
    ssh_port INTEGER NOT NULL DEFAULT 22,
    ssh_user TEXT NOT NULL DEFAULT '',
    ssh_password_enc TEXT NOT NULL DEFAULT '',
    ssh_key_path TEXT NOT NULL DEFAULT '',

    backup_check_enabled INTEGER NOT NULL DEFAULT 0,
    backup_path TEXT NOT NULL DEFAULT '',
    backup_pattern TEXT NOT NULL DEFAULT '*',

    tablespace_warn_pct REAL NOT NULL DEFAULT 80,
    tablespace_crit_pct REAL NOT NULL DEFAULT 90,
    session_warn_count INTEGER NOT NULL DEFAULT 150,
    session_crit_count INTEGER NOT NULL DEFAULT 250,
    cpu_warn_pct REAL NOT NULL DEFAULT 75,
    cpu_crit_pct REAL NOT NULL DEFAULT 90,
    backup_warn_hours REAL NOT NULL DEFAULT 26,
    backup_crit_hours REAL NOT NULL DEFAULT 48
);
"""


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def _row_to_instance(row: sqlite3.Row) -> Instance:
    return Instance(
        id=row["id"],
        name=row["name"],
        enabled=bool(row["enabled"]),
        oracle_host=row["oracle_host"],
        oracle_port=row["oracle_port"],
        oracle_service=row["oracle_service"],
        oracle_user=row["oracle_user"],
        oracle_password_enc=row["oracle_password_enc"],
        ssh_enabled=bool(row["ssh_enabled"]),
        ssh_host=row["ssh_host"],
        ssh_port=row["ssh_port"],
        ssh_user=row["ssh_user"],
        ssh_password_enc=row["ssh_password_enc"],
        ssh_key_path=row["ssh_key_path"],
        backup_check_enabled=bool(row["backup_check_enabled"]),
        backup_path=row["backup_path"],
        backup_pattern=row["backup_pattern"],
        thresholds=Thresholds(
            tablespace_warn_pct=row["tablespace_warn_pct"],
            tablespace_crit_pct=row["tablespace_crit_pct"],
            session_warn_count=row["session_warn_count"],
            session_crit_count=row["session_crit_count"],
            cpu_warn_pct=row["cpu_warn_pct"],
            cpu_crit_pct=row["cpu_crit_pct"],
            backup_warn_hours=row["backup_warn_hours"],
            backup_crit_hours=row["backup_crit_hours"],
        ),
    )


def list_instances() -> list[Instance]:
    with _connect() as conn:
        rows = conn.execute("SELECT * FROM instances ORDER BY name").fetchall()
        return [_row_to_instance(r) for r in rows]


def get_instance(instance_id: int) -> Instance | None:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM instances WHERE id = ?", (instance_id,)).fetchone()
        return _row_to_instance(row) if row else None


def save_instance(inst: Instance, oracle_password: str | None = None, ssh_password: str | None = None) -> int:
    """Cria ou atualiza. Senhas em texto puro são opcionais: se None, mantém a já salva (update);
    se "" explicitamente, apaga. Em create (id is None) e None, fica vazia."""
    oracle_enc = inst.oracle_password_enc
    if oracle_password is not None:
        oracle_enc = secrets.encrypt(oracle_password)

    ssh_enc = inst.ssh_password_enc
    if ssh_password is not None:
        ssh_enc = secrets.encrypt(ssh_password)

    t = inst.thresholds
    with _connect() as conn:
        if inst.id is None:
            cur = conn.execute(
                """INSERT INTO instances (
                    name, enabled, oracle_host, oracle_port, oracle_service, oracle_user, oracle_password_enc,
                    ssh_enabled, ssh_host, ssh_port, ssh_user, ssh_password_enc, ssh_key_path,
                    backup_check_enabled, backup_path, backup_pattern,
                    tablespace_warn_pct, tablespace_crit_pct, session_warn_count, session_crit_count,
                    cpu_warn_pct, cpu_crit_pct, backup_warn_hours, backup_crit_hours
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    inst.name, int(inst.enabled), inst.oracle_host, inst.oracle_port, inst.oracle_service,
                    inst.oracle_user, oracle_enc,
                    int(inst.ssh_enabled), inst.ssh_host, inst.ssh_port, inst.ssh_user, ssh_enc, inst.ssh_key_path,
                    int(inst.backup_check_enabled), inst.backup_path, inst.backup_pattern,
                    t.tablespace_warn_pct, t.tablespace_crit_pct, t.session_warn_count, t.session_crit_count,
                    t.cpu_warn_pct, t.cpu_crit_pct, t.backup_warn_hours, t.backup_crit_hours,
                ),
            )
            return cur.lastrowid
        else:
            conn.execute(
                """UPDATE instances SET
                    name=?, enabled=?, oracle_host=?, oracle_port=?, oracle_service=?, oracle_user=?, oracle_password_enc=?,
                    ssh_enabled=?, ssh_host=?, ssh_port=?, ssh_user=?, ssh_password_enc=?, ssh_key_path=?,
                    backup_check_enabled=?, backup_path=?, backup_pattern=?,
                    tablespace_warn_pct=?, tablespace_crit_pct=?, session_warn_count=?, session_crit_count=?,
                    cpu_warn_pct=?, cpu_crit_pct=?, backup_warn_hours=?, backup_crit_hours=?
                WHERE id=?""",
                (
                    inst.name, int(inst.enabled), inst.oracle_host, inst.oracle_port, inst.oracle_service,
                    inst.oracle_user, oracle_enc,
                    int(inst.ssh_enabled), inst.ssh_host, inst.ssh_port, inst.ssh_user, ssh_enc, inst.ssh_key_path,
                    int(inst.backup_check_enabled), inst.backup_path, inst.backup_pattern,
                    t.tablespace_warn_pct, t.tablespace_crit_pct, t.session_warn_count, t.session_crit_count,
                    t.cpu_warn_pct, t.cpu_crit_pct, t.backup_warn_hours, t.backup_crit_hours,
                    inst.id,
                ),
            )
            return inst.id


def delete_instance(instance_id: int) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM instances WHERE id = ?", (instance_id,))


def decrypt_oracle_password(inst: Instance) -> str:
    return secrets.decrypt(inst.oracle_password_enc)


def decrypt_ssh_password(inst: Instance) -> str:
    return secrets.decrypt(inst.ssh_password_enc)
