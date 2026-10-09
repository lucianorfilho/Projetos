from __future__ import annotations

import pyqtgraph as pg
from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QFrame, QGridLayout, QHBoxLayout, QLabel, QProgressBar, QPushButton,
    QScrollArea, QVBoxLayout, QWidget,
)

from ..core.history import HistoryStore
from ..core.models import InstanceSnapshot
from .charts.gauge import Gauge

pg.setConfigOptions(antialias=True, background="#1e2530", foreground="#cbd5e1")


def _line_plot(title: str) -> pg.PlotWidget:
    pw = pg.PlotWidget()
    pw.setTitle(title, color="#e2e8f0", size="10pt")
    pw.showGrid(x=True, y=True, alpha=0.2)
    pw.setMinimumHeight(160)
    pw.getAxis("bottom").setStyle(showValues=False)
    return pw


class InstanceDetail(QWidget):
    back_requested = Signal()
    edit_requested = Signal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._instance_id: int | None = None

        back_btn = QPushButton("← Voltar")
        back_btn.clicked.connect(self.back_requested.emit)
        self._edit_btn = QPushButton("Editar instância")
        self._edit_btn.clicked.connect(lambda: self.edit_requested.emit(self._instance_id))

        self._title = QLabel()
        self._title.setStyleSheet("font-size: 18px; font-weight: 700;")
        self._subtitle = QLabel()
        self._subtitle.setStyleSheet("color: #9ca3af;")

        top = QHBoxLayout()
        top.addWidget(back_btn)
        top.addSpacing(10)
        title_box = QVBoxLayout()
        title_box.addWidget(self._title)
        title_box.addWidget(self._subtitle)
        top.addLayout(title_box, 1)
        top.addWidget(self._edit_btn)

        # Gauges
        self._gauge_cpu = Gauge("CPU")
        self._gauge_disk = Gauge("Disco /")
        self._gauge_tbs = Gauge("Tablespace máx")
        gauges_row = QHBoxLayout()
        for g in (self._gauge_cpu, self._gauge_disk, self._gauge_tbs):
            gauges_row.addWidget(g)

        # Oracle info panel
        self._oracle_box = QFrame()
        self._oracle_box.setObjectName("Panel")
        oracle_layout = QVBoxLayout(self._oracle_box)
        self._lbl_oracle_status = QLabel()
        self._lbl_sessions = QLabel()
        self._lbl_blocked = QLabel()
        self._lbl_long_q = QLabel()
        self._lbl_latency = QLabel()
        self._lbl_sga = QLabel()
        self._lbl_pga = QLabel()
        oracle_layout.addWidget(QLabel("<b>Oracle</b>"))
        for w in (self._lbl_oracle_status, self._lbl_sessions, self._lbl_blocked, self._lbl_long_q, self._lbl_latency):
            oracle_layout.addWidget(w)

        oracle_layout.addWidget(self._lbl_sga)
        self._sga_components_layout = QVBoxLayout()
        self._sga_components_layout.setSpacing(1)
        oracle_layout.addLayout(self._sga_components_layout)

        oracle_layout.addWidget(self._lbl_pga)
        self._pga_bar_layout = QVBoxLayout()
        self._pga_bar_layout.setSpacing(1)
        oracle_layout.addLayout(self._pga_bar_layout)

        self._tbs_list_layout = QVBoxLayout()
        self._tbs_list_layout.setSpacing(1)
        oracle_layout.addWidget(QLabel("Tablespaces:"))
        oracle_layout.addLayout(self._tbs_list_layout)
        oracle_layout.addStretch()

        # OS panel
        self._os_box = QFrame()
        self._os_box.setObjectName("Panel")
        os_layout = QVBoxLayout(self._os_box)
        self._lbl_os_status = QLabel()
        self._lbl_load = QLabel()
        self._lbl_mem = QLabel()
        self._lbl_net = QLabel()
        os_layout.addWidget(QLabel("<b>Sistema Operacional (Linux)</b>"))
        for w in (self._lbl_os_status, self._lbl_load, self._lbl_mem, self._lbl_net):
            os_layout.addWidget(w)
        os_layout.addStretch()

        # Backup panel
        self._backup_box = QFrame()
        self._backup_box.setObjectName("Panel")
        backup_layout = QVBoxLayout(self._backup_box)
        self._lbl_backup = QLabel()
        self._lbl_backup.setWordWrap(True)
        backup_layout.addWidget(QLabel("<b>Backup</b>"))
        backup_layout.addWidget(self._lbl_backup)
        backup_layout.addStretch()

        info_row = QHBoxLayout()
        info_row.addWidget(self._oracle_box, 2)
        info_row.addWidget(self._os_box, 1)
        info_row.addWidget(self._backup_box, 1)

        # Charts (history)
        self._chart_cpu = _line_plot("CPU % (histórico)")
        self._chart_iops = _line_plot("IOPS de disco (histórico)")
        self._chart_net = _line_plot("Rede KB/s (histórico)")
        self._chart_sessions = _line_plot("Sessões Oracle (histórico)")

        self._curve_cpu = self._chart_cpu.plot(pen=pg.mkPen("#38bdf8", width=2))
        self._curve_iops = self._chart_iops.plot(pen=pg.mkPen("#a78bfa", width=2))
        self._curve_net = self._chart_net.plot(pen=pg.mkPen("#34d399", width=2))
        self._curve_sessions = self._chart_sessions.plot(pen=pg.mkPen("#fbbf24", width=2))

        charts_grid = QGridLayout()
        charts_grid.addWidget(self._chart_cpu, 0, 0)
        charts_grid.addWidget(self._chart_iops, 0, 1)
        charts_grid.addWidget(self._chart_net, 1, 0)
        charts_grid.addWidget(self._chart_sessions, 1, 1)

        content = QWidget()
        content_layout = QVBoxLayout(content)
        content_layout.addLayout(top)
        content_layout.addLayout(gauges_row)
        content_layout.addLayout(info_row)
        content_layout.addLayout(charts_grid)
        content_layout.addStretch()

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(content)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(scroll)

    def show_instance(self, snapshot: InstanceSnapshot, history: HistoryStore):
        self._instance_id = snapshot.instance.id
        self.update_snapshot(snapshot, history)

    def update_snapshot(self, snapshot: InstanceSnapshot, history: HistoryStore):
        if snapshot.instance.id != self._instance_id:
            return
        inst = snapshot.instance
        overall = snapshot.overall_status

        self._title.setText(f"{inst.name}")
        self._subtitle.setText(f"{inst.oracle_host}:{inst.oracle_port}/{inst.oracle_service} · status: {overall.label}")

        self._gauge_cpu.set_value(snapshot.os.cpu_pct if inst.ssh_enabled else 0)
        self._gauge_cpu.set_thresholds(inst.thresholds.cpu_warn_pct, inst.thresholds.cpu_crit_pct)
        self._gauge_disk.set_value(snapshot.os.disk_used_pct if inst.ssh_enabled else 0)
        worst_ts = max((t.pct_used for t in snapshot.oracle.tablespaces), default=0.0)
        self._gauge_tbs.set_value(worst_ts)
        self._gauge_tbs.set_thresholds(inst.thresholds.tablespace_warn_pct, inst.thresholds.tablespace_crit_pct)

        # Oracle
        if snapshot.oracle.up:
            self._lbl_oracle_status.setText("Status: 🟢 conectado")
        else:
            self._lbl_oracle_status.setText(f"Status: 🔴 {snapshot.oracle.error or 'indisponível'}")
        self._lbl_sessions.setText(f"Sessões ativas: {snapshot.oracle.session_count}")
        self._lbl_blocked.setText(f"Sessões bloqueadas: {snapshot.oracle.blocked_sessions}")
        self._lbl_long_q.setText(f"Queries longas (>5min): {snapshot.oracle.long_running_queries}")
        if snapshot.oracle.latency_ms is not None:
            self._lbl_latency.setText(f"Tempo de resposta do banco: {snapshot.oracle.latency_ms:.0f} ms")
        else:
            self._lbl_latency.setText("Tempo de resposta do banco: —")
        self._lbl_sga.setText(f"SGA total: {snapshot.oracle.sga_mb:.0f} MB")

        while self._sga_components_layout.count():
            item = self._sga_components_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        for name, mb in snapshot.oracle.sga_components[:6]:
            self._sga_components_layout.addWidget(self._compact_row(f"  {name}", mb, snapshot.oracle.sga_mb))

        o = snapshot.oracle
        self._lbl_pga.setText(
            f"PGA atual: {o.pga_mb:.0f} MB · pico: {o.pga_max_mb:.0f} MB"
            + (f" · limite configurado: {o.pga_limit_mb:.0f} MB" if o.pga_limit_mb else "")
        )
        while self._pga_bar_layout.count():
            item = self._pga_bar_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        if o.pga_limit_mb:
            cur_color = "#ef4444" if o.pga_mb >= o.pga_limit_mb * 0.9 else "#f59e0b" if o.pga_mb >= o.pga_limit_mb * 0.75 else "#38bdf8"
            peak_color = "#ef4444" if o.pga_max_mb >= o.pga_limit_mb * 0.9 else "#f59e0b" if o.pga_max_mb >= o.pga_limit_mb * 0.75 else "#a78bfa"
            self._pga_bar_layout.addWidget(self._compact_row("  atual vs. limite", o.pga_mb, o.pga_limit_mb, color=cur_color))
            self._pga_bar_layout.addWidget(self._compact_row("  pico vs. limite", o.pga_max_mb, o.pga_limit_mb, color=peak_color))

        while self._tbs_list_layout.count():
            item = self._tbs_list_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        for ts in sorted(snapshot.oracle.tablespaces, key=lambda t: -t.pct_used)[:8]:
            color = "#22c55e"
            if ts.pct_used >= inst.thresholds.tablespace_crit_pct:
                color = "#ef4444"
            elif ts.pct_used >= inst.thresholds.tablespace_warn_pct:
                color = "#f59e0b"
            self._tbs_list_layout.addWidget(
                self._compact_row(ts.name, ts.pct_used, 100, color=color, as_pct=True)
            )

        # OS
        if inst.ssh_enabled:
            self._os_box.show()
            if snapshot.os.reachable:
                self._lbl_os_status.setText("Status: 🟢 conectado")
            else:
                self._lbl_os_status.setText(f"Status: 🔴 {snapshot.os.error or 'sem conexão'}")
            self._lbl_load.setText(f"Load average (1min): {snapshot.os.load1:.2f}")
            self._lbl_mem.setText(f"Memória usada: {snapshot.os.mem_used_pct:.0f}%")
            self._lbl_net.setText(
                f"Rede: ↓{snapshot.os.net_rx_kbs:.0f} KB/s ↑{snapshot.os.net_tx_kbs:.0f} KB/s · "
                f"Disco: leitura {snapshot.os.disk_read_kbs:.0f} KB/s, escrita {snapshot.os.disk_write_kbs:.0f} KB/s"
            )
        else:
            self._os_box.hide()

        # Backup
        if inst.backup_check_enabled:
            self._backup_box.show()
            b = snapshot.backup
            if b.hours_since is not None:
                self._lbl_backup.setText(
                    f"Último arquivo: {b.last_file}\nModificado em: {b.last_modified}\n"
                    f"Há {b.hours_since:.1f} horas · {b.size_mb:.1f} MB\nPasta: {inst.backup_path}"
                )
            else:
                self._lbl_backup.setText(f"⚠ {b.error or 'sem dados'}\nPasta: {inst.backup_path}")
        else:
            self._backup_box.hide()

        # Charts
        series = history.series(inst.id)
        t = series["t"]
        if t:
            t0 = t[0]
            xs = [x - t0 for x in t]
            self._set_curve(self._curve_cpu, xs, series["cpu"])
            self._set_curve(self._curve_iops, xs, series["iops"])
            self._set_curve(self._curve_net, xs, series["net"])
            self._set_curve(self._curve_sessions, xs, series["sessions"])

    @staticmethod
    def _compact_row(label: str, value_mb: float, total_mb: float, color: str = "#38bdf8", as_pct: bool = False) -> QWidget:
        pct = value_mb if as_pct else (value_mb / total_mb * 100 if total_mb else 0)
        text = f"{label} ({pct:.0f}%)" if as_pct else f"{label} — {value_mb:.0f} MB ({pct:.0f}%)"

        row = QHBoxLayout()
        row.setContentsMargins(0, 0, 0, 0)
        row.setSpacing(6)
        lbl = QLabel(text)
        lbl.setStyleSheet("font-size: 11px;")
        lbl.setMinimumWidth(170)
        bar = QProgressBar()
        bar.setRange(0, 100)
        bar.setValue(min(100, int(pct)))
        bar.setTextVisible(False)
        bar.setFixedHeight(8)
        bar.setStyleSheet(f"QProgressBar::chunk {{ background-color: {color}; }} QProgressBar {{ border: none; background-color: #2b3444; border-radius: 4px; }}")
        row.addWidget(lbl)
        row.addWidget(bar)
        wrapper = QWidget()
        wrapper.setLayout(row)
        return wrapper

    @staticmethod
    def _set_curve(curve, xs, ys):
        pairs = [(x, y) for x, y in zip(xs, ys) if y is not None]
        if not pairs:
            curve.setData([], [])
            return
        xs2, ys2 = zip(*pairs)
        curve.setData(list(xs2), list(ys2))
