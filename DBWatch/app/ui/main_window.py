from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QComboBox, QGridLayout, QHBoxLayout, QLabel, QMainWindow, QMessageBox,
    QPushButton, QScrollArea, QStackedWidget, QVBoxLayout, QWidget,
)

from ..core import instance_store
from ..core.history import HistoryStore
from ..core.models import InstanceSnapshot, Status
from ..core.poller import Poller
from .add_instance_dialog import AddInstanceDialog
from .instance_card import InstanceCard
from .instance_detail import InstanceDetail
from .license_dialog import LicenseDialog


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DBWatch — Monitor de Instâncias de Banco de Dados")
        self.resize(1200, 800)

        self._cards: dict[int, InstanceCard] = {}
        self._snapshots: dict[int, InstanceSnapshot] = {}
        self._history = HistoryStore()

        self._banner = QLabel("Sem instâncias cadastradas.")
        self._banner.setAlignment(Qt.AlignCenter)
        self._banner.setFixedHeight(40)
        self._banner.setStyleSheet("font-weight: 600; font-size: 13px; color: white; background-color: #374151;")

        self._grid_host = QWidget()
        self._grid = QGridLayout(self._grid_host)
        self._grid.setAlignment(Qt.AlignTop | Qt.AlignLeft)
        self._grid.setSpacing(16)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(self._grid_host)

        dashboard_page = QWidget()
        dash_layout = QVBoxLayout(dashboard_page)
        dash_layout.setContentsMargins(0, 0, 0, 0)
        dash_layout.addWidget(self._banner)
        dash_layout.addWidget(scroll)

        self._detail = InstanceDetail()
        self._detail.back_requested.connect(self._show_dashboard)
        self._detail.edit_requested.connect(self._edit_instance)

        self._stack = QStackedWidget()
        self._stack.addWidget(dashboard_page)
        self._stack.addWidget(self._detail)

        self.setCentralWidget(self._stack)
        self._build_toolbar()
        self._apply_theme()

        self._poller = Poller(interval_seconds=30)
        self._poller.instance_updated.connect(self._on_instance_updated)
        self._reload_cards()
        self._poller.start()

    def _build_toolbar(self):
        toolbar = self.addToolBar("Principal")
        toolbar.setMovable(False)

        add_btn = QPushButton("+ Nova instância")
        add_btn.clicked.connect(self._add_instance)
        toolbar.addWidget(add_btn)

        toolbar.addSeparator()
        toolbar.addWidget(QLabel("  Intervalo de coleta: "))
        self._interval_combo = QComboBox()
        self._interval_combo.addItem("15 segundos", 15)
        self._interval_combo.addItem("30 segundos", 30)
        self._interval_combo.addItem("1 minuto", 60)
        self._interval_combo.addItem("5 minutos", 300)
        self._interval_combo.setCurrentIndex(1)
        self._interval_combo.currentIndexChanged.connect(self._on_interval_changed)
        toolbar.addWidget(self._interval_combo)

        refresh_btn = QPushButton("Atualizar agora")
        refresh_btn.clicked.connect(lambda: self._poller.poll_once())
        toolbar.addWidget(refresh_btn)

        toolbar.addSeparator()
        license_btn = QPushButton("Licença")
        license_btn.clicked.connect(self._open_license)
        toolbar.addWidget(license_btn)

    def _apply_theme(self):
        self.setStyleSheet(
            """
            QMainWindow, QWidget { background-color: #11151c; color: #e2e8f0; }
            QToolBar { background-color: #1a202c; border: none; spacing: 8px; padding: 6px; }
            QPushButton { background-color: #2563eb; color: white; border: none; padding: 6px 14px; border-radius: 6px; }
            QPushButton:hover { background-color: #3b82f6; }
            QComboBox, QLineEdit, QTextEdit, QSpinBox, QDoubleSpinBox { background-color: #1e2530; border: 1px solid #334155; border-radius: 4px; padding: 4px; color: #e2e8f0; }
            #Panel { background-color: #1e2530; border-radius: 10px; padding: 10px; }
            QScrollArea { border: none; }
            """
        )

    # ---------- dashboard ----------

    def _reload_cards(self):
        for i in reversed(range(self._grid.count())):
            item = self._grid.takeAt(i)
            if item.widget():
                item.widget().deleteLater()
        self._cards.clear()

        instances = instance_store.list_instances()
        if not instances:
            self._banner.setText("Nenhuma instância cadastrada — clique em '+ Nova instância'.")
            return

        cols = 4
        for idx, inst in enumerate(instances):
            snap = self._snapshots.get(inst.id) or InstanceSnapshot(instance=inst)
            card = InstanceCard(snap)
            card.clicked.connect(self._show_detail)
            self._grid.addWidget(card, idx // cols, idx % cols)
            self._cards[inst.id] = card

        self._update_banner()

    def _update_banner(self):
        if not self._snapshots:
            self._banner.setText("Aguardando primeira coleta...")
            self._banner.setStyleSheet("font-weight: 600; font-size: 13px; color: white; background-color: #374151;")
            return

        worst = Status.worst(*[s.overall_status for s in self._snapshots.values()])
        problems = [s.instance.name for s in self._snapshots.values() if s.overall_status >= Status.WARNING]
        colors = {Status.OK: "#15803d", Status.WARNING: "#b45309", Status.CRITICAL: "#b91c1c", Status.UNKNOWN: "#374151"}
        self._banner.setStyleSheet(f"font-weight: 600; font-size: 13px; color: white; background-color: {colors[worst]};")
        if worst == Status.OK:
            self._banner.setText(f"✅ Todas as {len(self._snapshots)} instâncias OK")
        else:
            self._banner.setText(f"⚠ Atenção em: {', '.join(problems)}")

    def _on_instance_updated(self, snap: InstanceSnapshot):
        self._snapshots[snap.instance.id] = snap
        self._history.record(snap)

        card = self._cards.get(snap.instance.id)
        if card:
            card.update_snapshot(snap)
        else:
            self._reload_cards()
            return

        self._update_banner()
        if self._stack.currentWidget() is self._detail:
            self._detail.update_snapshot(snap, self._history)

    # ---------- navigation ----------

    def _show_detail(self, instance_id: int):
        snap = self._snapshots.get(instance_id)
        if not snap:
            inst = instance_store.get_instance(instance_id)
            snap = InstanceSnapshot(instance=inst)
        self._detail.show_instance(snap, self._history)
        self._stack.setCurrentWidget(self._detail)

    def _show_dashboard(self):
        self._stack.setCurrentIndex(0)

    # ---------- actions ----------

    def _add_instance(self):
        dlg = AddInstanceDialog(parent=self)
        if dlg.exec() == AddInstanceDialog.Accepted:
            self._reload_cards()
            self._poller.poll_once()

    def _edit_instance(self, instance_id: int):
        inst = instance_store.get_instance(instance_id)
        if not inst:
            return
        dlg = AddInstanceDialog(instance=inst, parent=self)
        if dlg.exec() == AddInstanceDialog.Accepted:
            self._reload_cards()
            self._poller.poll_once()
            self._show_dashboard()

    def _on_interval_changed(self):
        seconds = self._interval_combo.currentData()
        self._poller.set_interval(seconds)

    def _open_license(self):
        dlg = LicenseDialog(parent=self)
        dlg.exec()

    def closeEvent(self, event):
        self._poller.stop()
        super().closeEvent(event)
