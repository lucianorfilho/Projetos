from __future__ import annotations

from PySide6.QtWidgets import (
    QDialog, QHBoxLayout, QLabel, QLineEdit, QMessageBox, QPushButton, QTextEdit, QVBoxLayout,
)

from ..license import license as lic
from ..license.hwid import get_hardware_id


class LicenseDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Ativar licença — DBWatch")
        self.setMinimumWidth(480)

        hwid = get_hardware_id()
        info = lic.check_startup_license()

        self._status_label = QLabel()
        self._refresh_status(info)

        hwid_box = QLineEdit(hwid)
        hwid_box.setReadOnly(True)
        copy_btn = QPushButton("Copiar")
        copy_btn.clicked.connect(lambda: self._copy(hwid))
        hwid_row = QHBoxLayout()
        hwid_row.addWidget(hwid_box)
        hwid_row.addWidget(copy_btn)

        self.token_edit = QTextEdit()
        self.token_edit.setPlaceholderText("Cole aqui o token de licença recebido (começa com DBW1.)")
        self.token_edit.setFixedHeight(90)
        saved = lic.load_saved_token()
        if saved:
            self.token_edit.setPlainText(saved)

        activate_btn = QPushButton("Ativar")
        activate_btn.clicked.connect(self._activate)
        close_btn = QPushButton("Fechar")
        close_btn.clicked.connect(self.accept)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        btn_row.addWidget(close_btn)
        btn_row.addWidget(activate_btn)

        layout = QVBoxLayout(self)
        layout.addWidget(QLabel("Identificador desta máquina (envie para gerar a licença):"))
        layout.addLayout(hwid_row)
        layout.addSpacing(10)
        layout.addWidget(QLabel("Token de licença:"))
        layout.addWidget(self.token_edit)
        layout.addWidget(self._status_label)
        layout.addLayout(btn_row)

    def _refresh_status(self, info: lic.LicenseInfo):
        color = "#22c55e" if info.valid else "#ef4444"
        self._status_label.setText(f"<span style='color:{color}'>{info.message}</span>")

    def _copy(self, text: str):
        from PySide6.QtWidgets import QApplication
        QApplication.clipboard().setText(text)

    def _activate(self):
        token = self.token_edit.toPlainText().strip()
        if not token:
            QMessageBox.warning(self, "Token vazio", "Cole o token de licença recebido.")
            return
        info = lic.validate_token(token)
        self._refresh_status(info)
        if info.valid:
            lic.save_token(token)
            QMessageBox.information(self, "Licença ativada", "Licença ativada com sucesso para esta máquina.")
        else:
            QMessageBox.critical(self, "Licença inválida", info.message)
