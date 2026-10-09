"""Monitoramento do SO Linux via SSH: CPU, load, memória, IOPS/throughput
de disco e rede. Usa /proc (presente em qualquer Linux), sem precisar de
agente instalado no servidor monitorado — só um usuário SSH com leitura.
"""
from __future__ import annotations

import re

import paramiko

from .models import Instance, OsMetrics, Status

_DISK_NAME_RE = re.compile(r"^(sd[a-z]+|vd[a-z]+|xvd[a-z]+|nvme\d+n\d+)$")

_REMOTE_SCRIPT = r"""
S1=$(grep '^cpu ' /proc/stat); D1=$(cat /proc/diskstats); N1=$(cat /proc/net/dev)
sleep 1
S2=$(grep '^cpu ' /proc/stat); D2=$(cat /proc/diskstats); N2=$(cat /proc/net/dev)
echo "==S1=="; echo "$S1"
echo "==S2=="; echo "$S2"
echo "==D1=="; echo "$D1"
echo "==D2=="; echo "$D2"
echo "==N1=="; echo "$N1"
echo "==N2=="; echo "$N2"
echo "==MEM=="; free -m | awk '/Mem:/ {print $2, $3}'
echo "==DISK=="; df -P / | tail -1 | awk '{print $5}'
echo "==LOAD=="; cat /proc/loadavg
"""


def _connect(inst: Instance, password: str) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    kwargs = dict(hostname=inst.ssh_host, port=inst.ssh_port, username=inst.ssh_user, timeout=8, banner_timeout=8)
    if inst.ssh_key_path:
        client.connect(key_filename=inst.ssh_key_path, **kwargs)
    else:
        client.connect(password=password, **kwargs)
    return client


def _section(text: str, marker: str) -> str:
    pattern = rf"=={marker}==\n(.*?)(?:\n==|\Z)"
    match = re.search(pattern, text, re.S)
    return match.group(1).strip("\n") if match else ""


def _cpu_busy_delta(line1: str, line2: str) -> tuple[float, float]:
    """Retorna (busy_delta, total_delta) a partir de duas linhas 'cpu  u n s i io irq sirq steal'."""
    n1 = [int(x) for x in line1.split()[1:]]
    n2 = [int(x) for x in line2.split()[1:]]
    total1, total2 = sum(n1), sum(n2)
    idle1 = n1[3] + (n1[4] if len(n1) > 4 else 0)
    idle2 = n2[3] + (n2[4] if len(n2) > 4 else 0)
    return (total2 - total1) - (idle2 - idle1), (total2 - total1)


def _disk_delta(d1: str, d2: str) -> tuple[float, float, float]:
    """Retorna (iops, read_kbs, write_kbs) somando discos físicos entre duas amostras ~1s."""
    def parse(block: str) -> dict[str, tuple[int, int, int, int]]:
        out = {}
        for line in block.splitlines():
            parts = line.split()
            if len(parts) < 11:
                continue
            name = parts[2]
            if not _DISK_NAME_RE.match(name):
                continue
            rd_ios, rd_sectors = int(parts[3]), int(parts[5])
            wr_ios, wr_sectors = int(parts[7]), int(parts[9])
            out[name] = (rd_ios, rd_sectors, wr_ios, wr_sectors)
        return out

    p1, p2 = parse(d1), parse(d2)
    rd_ios = wr_ios = rd_sectors = wr_sectors = 0
    for name, (r1, rs1, w1, ws1) in p1.items():
        if name not in p2:
            continue
        r2, rs2, w2, ws2 = p2[name]
        rd_ios += max(0, r2 - r1)
        wr_ios += max(0, w2 - w1)
        rd_sectors += max(0, rs2 - rs1)
        wr_sectors += max(0, ws2 - ws1)

    iops = rd_ios + wr_ios
    read_kbs = rd_sectors * 512 / 1024
    write_kbs = wr_sectors * 512 / 1024
    return float(iops), float(read_kbs), float(write_kbs)


def _net_delta(n1: str, n2: str) -> tuple[float, float]:
    def parse(block: str) -> dict[str, tuple[int, int]]:
        out = {}
        for line in block.splitlines():
            if ":" not in line:
                continue
            iface, rest = line.split(":", 1)
            iface = iface.strip()
            if iface == "lo":
                continue
            fields = rest.split()
            if len(fields) < 9:
                continue
            out[iface] = (int(fields[0]), int(fields[8]))  # rx_bytes, tx_bytes
        return out

    p1, p2 = parse(n1), parse(n2)
    rx = tx = 0
    for iface, (rx1, tx1) in p1.items():
        if iface not in p2:
            continue
        rx2, tx2 = p2[iface]
        rx += max(0, rx2 - rx1)
        tx += max(0, tx2 - tx1)
    return rx / 1024, tx / 1024  # kB/s (amostra de 1s)


def collect(inst: Instance, password: str) -> OsMetrics:
    m = OsMetrics()
    try:
        client = _connect(inst, password)
        try:
            _, stdout, stderr = client.exec_command(_REMOTE_SCRIPT, timeout=15)
            out = stdout.read().decode(errors="ignore")
            err = stderr.read().decode(errors="ignore")
        finally:
            client.close()

        m.reachable = True

        s1, s2 = _section(out, "S1"), _section(out, "S2")
        d1, d2 = _section(out, "D1"), _section(out, "D2")
        n1, n2 = _section(out, "N1"), _section(out, "N2")
        mem = _section(out, "MEM")
        disk = _section(out, "DISK")
        load = _section(out, "LOAD")

        if s1 and s2:
            busy, total = _cpu_busy_delta(s1, s2)
            m.cpu_pct = (busy / total * 100) if total else 0.0
        if d1 and d2:
            m.disk_iops, m.disk_read_kbs, m.disk_write_kbs = _disk_delta(d1, d2)
        if n1 and n2:
            m.net_rx_kbs, m.net_tx_kbs = _net_delta(n1, n2)
        if mem:
            total_mb, used_mb = (float(x) for x in mem.split())
            m.mem_used_pct = (used_mb / total_mb * 100) if total_mb else 0.0
        if disk:
            m.disk_used_pct = float(disk.replace("%", "").strip() or 0)
        if load:
            m.load1 = float(load.split()[0])

        if not out.strip() and err.strip():
            raise RuntimeError(err.strip())

        m.status = _evaluate(inst, m)
    except Exception as e:
        m.reachable = False
        m.status = Status.CRITICAL
        m.error = str(e)
    return m


def _evaluate(inst: Instance, m: OsMetrics) -> Status:
    t = inst.thresholds
    worst = Status.OK
    if m.cpu_pct >= t.cpu_crit_pct:
        worst = Status.worst(worst, Status.CRITICAL)
    elif m.cpu_pct >= t.cpu_warn_pct:
        worst = Status.worst(worst, Status.WARNING)

    if m.disk_used_pct >= 90:
        worst = Status.worst(worst, Status.CRITICAL)
    elif m.disk_used_pct >= 80:
        worst = Status.worst(worst, Status.WARNING)

    return worst
