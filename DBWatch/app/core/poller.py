from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

from PySide6.QtCore import QObject, QTimer, Signal

from . import instance_store, oracle_monitor, ssh_monitor, backup_monitor
from .models import Instance, InstanceSnapshot


def _collect_instance(inst: Instance) -> InstanceSnapshot:
    snap = InstanceSnapshot(instance=inst)

    oracle_pw = instance_store.decrypt_oracle_password(inst)
    snap.oracle = oracle_monitor.collect(inst, oracle_pw)

    if inst.ssh_enabled:
        ssh_pw = instance_store.decrypt_ssh_password(inst)
        snap.os = ssh_monitor.collect(inst, ssh_pw)
    if inst.backup_check_enabled:
        ssh_pw = instance_store.decrypt_ssh_password(inst) if inst.ssh_enabled else ""
        snap.backup = backup_monitor.collect(inst, ssh_pw)

    return snap


class Poller(QObject):
    instance_updated = Signal(object)   # InstanceSnapshot
    cycle_started = Signal()
    cycle_finished = Signal()

    def __init__(self, interval_seconds: int = 30, max_workers: int = 10, parent=None):
        super().__init__(parent)
        self._interval_ms = interval_seconds * 1000
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="dbwatch-poll")
        self._timer = QTimer(self)
        self._timer.timeout.connect(self.poll_once)
        self._pending = 0

    def start(self):
        self.poll_once()
        self._timer.start(self._interval_ms)

    def stop(self):
        self._timer.stop()
        self._executor.shutdown(wait=False, cancel_futures=True)

    def set_interval(self, seconds: int):
        self._interval_ms = seconds * 1000
        if self._timer.isActive():
            self._timer.start(self._interval_ms)

    def poll_once(self):
        instances = [i for i in instance_store.list_instances() if i.enabled]
        if not instances:
            return
        self.cycle_started.emit()
        self._pending = len(instances)
        for inst in instances:
            future = self._executor.submit(_collect_instance, inst)
            future.add_done_callback(self._on_done)

    def _on_done(self, future):
        self._pending -= 1
        try:
            snapshot = future.result()
            self.instance_updated.emit(snapshot)
        except Exception:
            pass
        if self._pending <= 0:
            self.cycle_finished.emit()
