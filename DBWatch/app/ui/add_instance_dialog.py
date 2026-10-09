from __future__ import annotations

from PySide6.QtWidgets import (
    QCheckBox, QDialog, QDialogButtonBox, QDoubleSpinBox, QFileDialog, QFormLayout,
    QHBoxLayout, QLineEdit, QMessageBox, QPushButton, QSpinBox, QTabWidget, QVBoxLayout, QWidget,
)

from ..core import instance_store
from ..core.models import Instance, Thresholds


class AddInstanceDialog(QDialog):
    def __init__(self, instance: Instance | None = None, parent=None):
        super().__init__(parent)
        self._instance = instance or Instance()
        self.setWindowTitle("Editar instância" if instance else "Nova instância")
        self.setMinimumWidth(480)

        self.name_edit = QLineEdit(self._instance.name)
        self.enabled_check = QCheckBox("Monitoramento ativo")
        self.enabled_check.setChecked(self._instance.enabled)

        tabs = QTabWidget()
        tabs.addTab(self._build_oracle_tab(), "Oracle")
        tabs.addTab(self._build_ssh_tab(), "SO (SSH)")
        tabs.addTab(self._build_backup_tab(), "Backup")
        tabs.addTab(self._build_thresholds_tab(), "Limites de alerta")

        header = QFormLayout()
        header.addRow("Nome da instância:", self.name_edit)
        header.addRow("", self.enabled_check)

        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_save)
        buttons.rejected.connect(self.reject)

        layout = QVBoxLayout(self)
        layout.addLayout(header)
        layout.addWidget(tabs)
        layout.addWidget(buttons)

    def _build_oracle_tab(self) -> QWidget:
        w = QWidget()
        form = QFormLayout(w)
        inst = self._instance
        self.oracle_host = QLineEdit(inst.oracle_host)
        self.oracle_port = QSpinBox()
        self.oracle_port.setRange(1, 65535)
        self.oracle_port.setValue(inst.oracle_port or 1521)
        self.oracle_service = QLineEdit(inst.oracle_service)
        self.oracle_user = QLineEdit(inst.oracle_user)
        self.oracle_password = QLineEdit()
        self.oracle_password.setEchoMode(QLineEdit.Password)
        self.oracle_password.setPlaceholderText("deixe em branco para manter a senha salva")

        form.addRow("Host:", self.oracle_host)
        form.addRow("Porta:", self.oracle_port)
        form.addRow("Service Name:", self.oracle_service)
        form.addRow("Usuário:", self.oracle_user)
        form.addRow("Senha:", self.oracle_password)
        return w

    def _build_ssh_tab(self) -> QWidget:
        w = QWidget()
        inst = self._instance
        self.ssh_enabled = QCheckBox("Monitorar SO Linux via SSH")
        self.ssh_enabled.setChecked(inst.ssh_enabled)
        self.ssh_host = QLineEdit(inst.ssh_host)
        self.ssh_port = QSpinBox()
        self.ssh_port.setRange(1, 65535)
        self.ssh_port.setValue(inst.ssh_port or 22)
        self.ssh_user = QLineEdit(inst.ssh_user)
        self.ssh_password = QLineEdit()
        self.ssh_password.setEchoMode(QLineEdit.Password)
        self.ssh_password.setPlaceholderText("deixe em branco para manter a senha salva")
        self.ssh_key_path = QLineEdit(inst.ssh_key_path)
        browse_btn = QPushButton("Procurar...")
        browse_btn.clicked.connect(self._browse_key)

        key_row = QHBoxLayout()
        key_row.addWidget(self.ssh_key_path)
        key_row.addWidget(browse_btn)
        key_row_widget = QWidget()
        key_row_widget.setLayout(key_row)

        form = QFormLayout()
        form.addRow(self.ssh_enabled)
        form.addRow("Host:", self.ssh_host)
        form.addRow("Porta:", self.ssh_port)
        form.addRow("Usuário:", self.ssh_user)
        form.addRow("Senha (ou deixe em branco se usar chave):", self.ssh_password)
        form.addRow("Chave privada (opcional):", key_row_widget)

        layout = QVBoxLayout(w)
        layout.addLayout(form)
        return w

    def _build_backup_tab(self) -> QWidget:
        w = QWidget()
        inst = self._instance
        self.backup_enabled = QCheckBox("Verificar pasta de backup")
        self.backup_enabled.setChecked(inst.backup_check_enabled)
        self.backup_path = QLineEdit(inst.backup_path)
        self.backup_path.setPlaceholderText("/backup/oracle  (remoto, via SSH acima) ou  Z:\\backups  (local/rede)")
        self.backup_pattern = QLineEdit(inst.backup_pattern or "*")
        self.backup_pattern.setPlaceholderText("ex: *.rman  *.dmp  *")

        form = QFormLayout()
        form.addRow(self.backup_enabled)
        form.addRow("Pasta monitorada:", self.backup_path)
        form.addRow("Filtro de arquivo:", self.backup_pattern)

        layout = QVBoxLayout(w)
        layout.addLayout(form)
        return w

    def _build_thresholds_tab(self) -> QWidget:
        w = QWidget()
        t = self._instance.thresholds or Thresholds()

        def spin(value, maximum=100000):
            s = QDoubleSpinBox()
            s.setRange(0, maximum)
            s.setValue(value)
            return s

        self.tbs_warn = spin(t.tablespace_warn_pct)
        self.tbs_crit = spin(t.tablespace_crit_pct)
        self.sess_warn = spin(t.session_warn_count, 100000)
        self.sess_crit = spin(t.session_crit_count, 100000)
        self.cpu_warn = spin(t.cpu_warn_pct)
        self.cpu_crit = spin(t.cpu_crit_pct)
        self.backup_warn_h = spin(t.backup_warn_hours, 1000)
        self.backup_crit_h = spin(t.backup_crit_hours, 1000)

        form = QFormLayout(w)
        form.addRow("Tablespace % aviso:", self.tbs_warn)
        form.addRow("Tablespace % crítico:", self.tbs_crit)
        form.addRow("Sessões aviso:", self.sess_warn)
        form.addRow("Sessões crítico:", self.sess_crit)
        form.addRow("CPU % aviso:", self.cpu_warn)
        form.addRow("CPU % crítico:", self.cpu_crit)
        form.addRow("Backup atraso (h) aviso:", self.backup_warn_h)
        form.addRow("Backup atraso (h) crítico:", self.backup_crit_h)
        return w

    def _browse_key(self):
        path, _ = QFileDialog.getOpenFileName(self, "Selecionar chave privada SSH")
        if path:
            self.ssh_key_path.setText(path)

    def _on_save(self):
        if not self.name_edit.text().strip():
            QMessageBox.warning(self, "Campo obrigatório", "Informe um nome para a instância.")
            return
        if not self.oracle_host.text().strip():
            QMessageBox.warning(self, "Campo obrigatório", "Informe o host Oracle.")
            return

        inst = self._instance
        inst.name = self.name_edit.text().strip()
        inst.enabled = self.enabled_check.isChecked()

        inst.oracle_host = self.oracle_host.text().strip()
        inst.oracle_port = self.oracle_port.value()
        inst.oracle_service = self.oracle_service.text().strip()
        inst.oracle_user = self.oracle_user.text().strip()

        inst.ssh_enabled = self.ssh_enabled.isChecked()
        inst.ssh_host = self.ssh_host.text().strip()
        inst.ssh_port = self.ssh_port.value()
        inst.ssh_user = self.ssh_user.text().strip()
        inst.ssh_key_path = self.ssh_key_path.text().strip()

        inst.backup_check_enabled = self.backup_enabled.isChecked()
        inst.backup_path = self.backup_path.text().strip()
        inst.backup_pattern = self.backup_pattern.text().strip() or "*"

        inst.thresholds = Thresholds(
            tablespace_warn_pct=self.tbs_warn.value(),
            tablespace_crit_pct=self.tbs_crit.value(),
            session_warn_count=int(self.sess_warn.value()),
            session_crit_count=int(self.sess_crit.value()),
            cpu_warn_pct=self.cpu_warn.value(),
            cpu_crit_pct=self.cpu_crit.value(),
            backup_warn_hours=self.backup_warn_h.value(),
            backup_crit_hours=self.backup_crit_h.value(),
        )

        oracle_pw = self.oracle_password.text() or None
        ssh_pw = self.ssh_password.text() or None
        inst.id = instance_store.save_instance(inst, oracle_password=oracle_pw, ssh_password=ssh_pw)
        self._instance = inst
        self.accept()

    @property
    def result_instance(self) -> Instance:
        return self._instance
