from __future__ import annotations

import time
from collections import defaultdict, deque

from .models import InstanceSnapshot

MAX_POINTS = 180  # com poll a cada 30s, cobre ~1h30 de histórico


class HistoryStore:
    def __init__(self):
        self._t: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))
        self._cpu: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))
        self._iops: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))
        self._net: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))
        self._sessions: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))
        self._tbs_max: dict[int, deque] = defaultdict(lambda: deque(maxlen=MAX_POINTS))

    def record(self, snap: InstanceSnapshot):
        iid = snap.instance.id
        now = time.time()
        self._t[iid].append(now)
        self._cpu[iid].append(snap.os.cpu_pct if snap.instance.ssh_enabled else None)
        self._iops[iid].append(snap.os.disk_iops if snap.instance.ssh_enabled else None)
        self._net[iid].append((snap.os.net_rx_kbs + snap.os.net_tx_kbs) if snap.instance.ssh_enabled else None)
        self._sessions[iid].append(snap.oracle.session_count)
        worst_ts = max((t.pct_used for t in snap.oracle.tablespaces), default=0.0)
        self._tbs_max[iid].append(worst_ts)

    def series(self, instance_id: int):
        return {
            "t": list(self._t[instance_id]),
            "cpu": list(self._cpu[instance_id]),
            "iops": list(self._iops[instance_id]),
            "net": list(self._net[instance_id]),
            "sessions": list(self._sessions[instance_id]),
            "tbs_max": list(self._tbs_max[instance_id]),
        }
