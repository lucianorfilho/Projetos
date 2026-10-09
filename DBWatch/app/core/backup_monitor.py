"""Verifica se o backup mais recente na pasta configurada está dentro do
prazo esperado. Suporta pasta remota (via SSH, mesmo servidor Linux do
Oracle ou outro) ou pasta local/rede acessível direto do Windows.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from pathlib import Path

import paramiko

from .models import BackupMetrics, Instance, Status

_REMOTE_FIND = (
    "find '{path}' -maxdepth 1 -type f -name '{pattern}' "
    "-printf '%T@ %s %f\\n' 2>/dev/null | sort -n | tail -1"
)


def _collect_remote(inst: Instance, password: str) -> BackupMetrics:
    m = BackupMetrics()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kwargs = dict(hostname=inst.ssh_host, port=inst.ssh_port, username=inst.ssh_user, timeout=8, banner_timeout=8)
    try:
        if inst.ssh_key_path:
            client.connect(key_filename=inst.ssh_key_path, **kwargs)
        else:
            client.connect(password=password, **kwargs)

        cmd = _REMOTE_FIND.format(path=inst.backup_path.rstrip("/"), pattern=inst.backup_pattern)
        _, stdout, stderr = client.exec_command(cmd, timeout=15)
        out = stdout.read().decode(errors="ignore").strip()
        err = stderr.read().decode(errors="ignore").strip()
        client.close()

        if not out:
            m.error = err or "Nenhum arquivo de backup encontrado na pasta."
            m.status = Status.CRITICAL
            return m

        epoch_str, size_str, fname = out.split(" ", 2)
        mtime = float(epoch_str)
        m.last_file = fname
        m.size_mb = float(size_str) / 1024 / 1024
        m.hours_since = (time.time() - mtime) / 3600
        m.last_modified = datetime.fromtimestamp(mtime, tz=timezone.utc).astimezone().strftime("%d/%m/%Y %H:%M")
    except Exception as e:
        m.error = str(e)
        m.status = Status.CRITICAL
    return m


def _collect_local(inst: Instance) -> BackupMetrics:
    m = BackupMetrics()
    try:
        folder = Path(inst.backup_path)
        if not folder.exists():
            m.error = f"Pasta não encontrada: {inst.backup_path}"
            m.status = Status.CRITICAL
            return m

        candidates = [f for f in folder.glob(inst.backup_pattern) if f.is_file()]
        if not candidates:
            m.error = "Nenhum arquivo de backup encontrado na pasta."
            m.status = Status.CRITICAL
            return m

        latest = max(candidates, key=lambda f: f.stat().st_mtime)
        stat = latest.stat()
        m.last_file = latest.name
        m.size_mb = stat.st_size / 1024 / 1024
        m.hours_since = (time.time() - stat.st_mtime) / 3600
        m.last_modified = datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M")
    except Exception as e:
        m.error = str(e)
        m.status = Status.CRITICAL
    return m


def collect(inst: Instance, ssh_password: str) -> BackupMetrics:
    if inst.ssh_enabled:
        m = _collect_remote(inst, ssh_password)
    else:
        m = _collect_local(inst)

    if m.status == Status.UNKNOWN and m.hours_since is not None:
        t = inst.thresholds
        if m.hours_since >= t.backup_crit_hours:
            m.status = Status.CRITICAL
        elif m.hours_since >= t.backup_warn_hours:
            m.status = Status.WARNING
        else:
            m.status = Status.OK
    return m
