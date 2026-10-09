from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QVBoxLayout

from ..core.models import InstanceSnapshot, Status


class InstanceCard(QFrame):
    clicked = Signal(int)  # instance id

    def __init__(self, snapshot: InstanceSnapshot, parent=None):
        super().__init__(parent)
        self.instance_id = snapshot.instance.id
        self.setObjectName("InstanceCard")
        self.setCursor(Qt.PointingHandCursor)
        self.setFixedSize(220, 150)

        self._dot = QLabel()
        self._dot.setFixedSize(14, 14)

        self._name = QLabel()
        self._name.setStyleSheet("font-weight: 600; font-size: 14px;")

        self._status_label = QLabel()
        self._status_label.setStyleSheet("font-size: 12px; color: #9ca3af;")

        self._line_oracle = QLabel()
        self._line_os = QLabel()
        self._line_backup = QLabel()
        for lbl in (self._line_oracle, self._line_os, self._line_backup):
            lbl.setStyleSheet("font-size: 11px; color: #cbd5e1;")

        header = QHBoxLayout()
        header.addWidget(self._dot)
        header.addWidget(self._name, 1)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.addLayout(header)
        layout.addWidget(self._status_label)
        layout.addSpacing(6)
        layout.addWidget(self._line_oracle)
        layout.addWidget(self._line_os)
        layout.addWidget(self._line_backup)
        layout.addStretch()

        self.update_snapshot(snapshot)

    def mousePressEvent(self, event):
        self.clicked.emit(self.instance_id)
        super().mousePressEvent(event)

    def update_snapshot(self, snapshot: InstanceSnapshot):
        inst = snapshot.instance
        overall = snapshot.overall_status

        self._name.setText(inst.name)
        self._status_label.setText(overall.label)
        self._dot.setStyleSheet(f"background-color: {overall.color}; border-radius: 7px;")
        self.setStyleSheet(
            f"#InstanceCard {{ background-color: #1e2530; border: 1px solid {overall.color}; border-radius: 10px; }}"
        )

        if snapshot.oracle.up:
            worst_ts = max((t.pct_used for t in snapshot.oracle.tablespaces), default=0.0)
            self._line_oracle.setText(f"🗄 Oracle OK · tbs máx {worst_ts:.0f}% · sessões {snapshot.oracle.session_count}")
        elif snapshot.oracle.status == Status.UNKNOWN:
            self._line_oracle.setText("🗄 Oracle: aguardando coleta...")
        else:
            self._line_oracle.setText(f"🗄 Oracle: {snapshot.oracle.error or 'indisponível'}"[:40])

        if inst.ssh_enabled:
            if snapshot.os.reachable:
                self._line_os.setText(f"🖥 CPU {snapshot.os.cpu_pct:.0f}% · disco {snapshot.os.disk_used_pct:.0f}% · IOPS {snapshot.os.disk_iops:.0f}")
            else:
                self._line_os.setText(f"🖥 SO: {snapshot.os.error or 'sem conexão'}"[:40])
        else:
            self._line_os.setText("")

        if inst.backup_check_enabled:
            if snapshot.backup.hours_since is not None:
                self._line_backup.setText(f"💾 backup há {snapshot.backup.hours_since:.1f}h")
            else:
                self._line_backup.setText(f"💾 {snapshot.backup.error or 'sem dados'}"[:40])
        else:
            self._line_backup.setText("")
