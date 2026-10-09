from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum


class Status(IntEnum):
    UNKNOWN = 0
    OK = 1
    WARNING = 2
    CRITICAL = 3

    @property
    def color(self) -> str:
        return {
            Status.UNKNOWN: "#6b7280",
            Status.OK: "#22c55e",
            Status.WARNING: "#f59e0b",
            Status.CRITICAL: "#ef4444",
        }[self]

    @property
    def label(self) -> str:
        return {
            Status.UNKNOWN: "Sem dados",
            Status.OK: "OK",
            Status.WARNING: "Atenção",
            Status.CRITICAL: "Crítico",
        }[self]

    @staticmethod
    def worst(*statuses: "Status") -> "Status":
        return max(statuses) if statuses else Status.UNKNOWN


@dataclass
class Thresholds:
    tablespace_warn_pct: float = 80.0
    tablespace_crit_pct: float = 90.0
    session_warn_count: int = 150
    session_crit_count: int = 250
    cpu_warn_pct: float = 75.0
    cpu_crit_pct: float = 90.0
    backup_warn_hours: float = 26.0
    backup_crit_hours: float = 48.0


@dataclass
class Instance:
    id: int | None = None
    name: str = ""
    enabled: bool = True

    # Oracle
    oracle_host: str = ""
    oracle_port: int = 1521
    oracle_service: str = ""
    oracle_user: str = ""
    oracle_password_enc: str = ""

    # SSH / SO Linux (opcional — se vazio, pula monitoramento de SO)
    ssh_enabled: bool = False
    ssh_host: str = ""
    ssh_port: int = 22
    ssh_user: str = ""
    ssh_password_enc: str = ""
    ssh_key_path: str = ""

    # Backup
    backup_check_enabled: bool = False
    backup_path: str = ""          # caminho monitorado (no servidor remoto via SSH, ou local se sem SSH)
    backup_pattern: str = "*"      # filtro de arquivo, ex: *.rman, *.dmp

    thresholds: Thresholds = field(default_factory=Thresholds)


@dataclass
class TablespaceInfo:
    name: str
    used_mb: float
    total_mb: float

    @property
    def pct_used(self) -> float:
        return (self.used_mb / self.total_mb * 100) if self.total_mb else 0.0


@dataclass
class OracleMetrics:
    status: Status = Status.UNKNOWN
    error: str | None = None
    up: bool = False
    tablespaces: list[TablespaceInfo] = field(default_factory=list)
    session_count: int = 0
    blocked_sessions: int = 0
    long_running_queries: int = 0
    sga_mb: float = 0.0
    pga_mb: float = 0.0
    pga_limit_mb: float = 0.0
    pga_max_mb: float = 0.0
    sga_components: list[tuple[str, float]] = field(default_factory=list)
    latency_ms: float | None = None


@dataclass
class OsMetrics:
    status: Status = Status.UNKNOWN
    error: str | None = None
    reachable: bool = False
    cpu_pct: float = 0.0
    load1: float = 0.0
    mem_used_pct: float = 0.0
    disk_used_pct: float = 0.0
    disk_read_kbs: float = 0.0
    disk_write_kbs: float = 0.0
    disk_iops: float = 0.0
    net_rx_kbs: float = 0.0
    net_tx_kbs: float = 0.0


@dataclass
class BackupMetrics:
    status: Status = Status.UNKNOWN
    error: str | None = None
    last_file: str | None = None
    last_modified: str | None = None
    hours_since: float | None = None
    size_mb: float | None = None


@dataclass
class InstanceSnapshot:
    instance: Instance
    oracle: OracleMetrics = field(default_factory=OracleMetrics)
    os: OsMetrics = field(default_factory=OsMetrics)
    backup: BackupMetrics = field(default_factory=BackupMetrics)

    @property
    def overall_status(self) -> Status:
        statuses = [self.oracle.status]
        if self.instance.ssh_enabled:
            statuses.append(self.os.status)
        if self.instance.backup_check_enabled:
            statuses.append(self.backup.status)
        return Status.worst(*statuses)
