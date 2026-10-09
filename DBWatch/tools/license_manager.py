"""DBWatch License Manager — app só do emissor. NUNCA distribuir com o DBWatch.

Fluxo: o cliente abre o DBWatch, copia o HWID da tela de ativação e te envia;
você cola aqui, gera o token e devolve. A chave privada NÃO fica embutida no
.exe: ela é lida de um arquivo private_key.pem (ao lado do exe, ou escolhido
pelo botão "Chave privada...").
"""
from __future__ import annotations

import base64
import json
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from PySide6.QtWidgets import (
    QApplication, QCheckBox, QFileDialog, QFormLayout, QHBoxLayout, QLabel, QLineEdit,
    QMainWindow, QMessageBox, QPushButton, QSpinBox, QTableWidget, QTableWidgetItem,
    QTextEdit, QVBoxLayout, QWidget,
)

DATA_DIR = Path.home() / "AppData" / "Local" / "DBWatchLicenseManager"
SETTINGS = DATA_DIR / "settings.json"
HISTORY = DATA_DIR / "issued.json"
HWID_RE = re.compile(r"^[0-9A-F]{4}(-[0-9A-F]{4}){3}$")


def _app_dir() -> Path:
    return Path(sys.executable).parent if getattr(sys, "frozen", False) else Path(__file__).parent


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class Manager(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DBWatch License Manager (uso exclusivo do emissor)")
        self.resize(820, 640)

        self.key_path = self._initial_key_path()

        self.key_label = QLabel()
        key_btn = QPushButton("Chave privada...")
        key_btn.clicked.connect(self._pick_key)
        key_row = QHBoxLayout()
        key_row.addWidget(self.key_label, 1)
        key_row.addWidget(key_btn)

        self.hwid_edit = QLineEdit()
        self.hwid_edit.setPlaceholderText("Cole o HWID do cliente, ex: 577C-A124-7060-3822")
        self.customer_edit = QLineEdit()
        self.customer_edit.setPlaceholderText("Nome do cliente / máquina")
        self.no_expiry = QCheckBox("Sem expiração")
        self.days = QSpinBox()
        self.days.setRange(1, 3650)
        self.days.setValue(365)
        self.no_expiry.toggled.connect(lambda on: self.days.setDisabled(on))

        days_row = QHBoxLayout()
        days_row.addWidget(self.days)
        days_row.addWidget(QLabel("dias"))
        days_row.addWidget(self.no_expiry)
        days_row.addStretch()

        form = QFormLayout()
        form.addRow("HWID do cliente:", self.hwid_edit)
        form.addRow("Cliente:", self.customer_edit)
        form.addRow("Validade:", days_row)

        gen_btn = QPushButton("Gerar código de licença")
        gen_btn.clicked.connect(self._generate)

        self.token_out = QTextEdit()
        self.token_out.setReadOnly(True)
        self.token_out.setFixedHeight(110)
        copy_btn = QPushButton("Copiar código")
        copy_btn.clicked.connect(self._copy)

        self.table = QTableWidget(0, 4)
        self.table.setHorizontalHeaderLabels(["Emitida em", "Cliente", "HWID", "Expira"])
        self.table.horizontalHeader().setStretchLastSection(True)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)

        layout = QVBoxLayout()
        layout.addLayout(key_row)
        layout.addLayout(form)
        layout.addWidget(gen_btn)
        layout.addWidget(QLabel("Código para enviar ao cliente:"))
        layout.addWidget(self.token_out)
        layout.addWidget(copy_btn)
        layout.addWidget(QLabel("Histórico de licenças emitidas:"))
        layout.addWidget(self.table, 1)

        root = QWidget()
        root.setLayout(layout)
        self.setCentralWidget(root)

        self._refresh_key_label()
        self._load_history()

    def _initial_key_path(self) -> Path | None:
        saved = _load_json(SETTINGS, {}).get("key_path")
        for p in (Path(saved) if saved else None, _app_dir() / "private_key.pem"):
            if p and p.exists():
                return p
        return None

    def _refresh_key_label(self):
        if self.key_path:
            self.key_label.setText(f"Chave privada: {self.key_path}")
        else:
            self.key_label.setText("<span style='color:#ef4444'>Chave privada não encontrada — clique em 'Chave privada...'</span>")

    def _pick_key(self):
        path, _ = QFileDialog.getOpenFileName(self, "Selecionar private_key.pem", str(_app_dir()), "PEM (*.pem)")
        if path:
            self.key_path = Path(path)
            _save_json(SETTINGS, {"key_path": path})
            self._refresh_key_label()

    def _load_history(self):
        self.table.setRowCount(0)
        for rec in reversed(_load_json(HISTORY, [])):
            row = self.table.rowCount()
            self.table.insertRow(row)
            for col, key in enumerate(("issued", "customer", "hwid", "exp")):
                self.table.setItem(row, col, QTableWidgetItem(rec.get(key) or "sem expiração"))

    def _generate(self):
        hwid = self.hwid_edit.text().strip().upper()
        if not HWID_RE.match(hwid):
            QMessageBox.warning(self, "HWID inválido", "O HWID deve ter o formato XXXX-XXXX-XXXX-XXXX (hexadecimal).")
            return
        if not self.key_path:
            QMessageBox.warning(self, "Sem chave", "Selecione o arquivo private_key.pem.")
            return
        try:
            key = serialization.load_pem_private_key(self.key_path.read_bytes(), password=None)
            if not isinstance(key, Ed25519PrivateKey):
                raise ValueError("a chave não é Ed25519")
        except Exception as e:
            QMessageBox.critical(self, "Chave inválida", str(e))
            return

        customer = self.customer_edit.text().strip() or "Cliente"
        exp = None if self.no_expiry.isChecked() else (date.today() + timedelta(days=self.days.value())).isoformat()
        payload = json.dumps({"hwid": hwid, "customer": customer, "exp": exp}, separators=(",", ":")).encode("utf-8")
        token = f"DBW1.{_b64url(payload)}.{_b64url(key.sign(payload))}"

        self.token_out.setPlainText(token)
        history = _load_json(HISTORY, [])
        history.append({"issued": datetime.now().strftime("%d/%m/%Y %H:%M"), "customer": customer, "hwid": hwid, "exp": exp})
        _save_json(HISTORY, history)
        self._load_history()

    def _copy(self):
        text = self.token_out.toPlainText()
        if text:
            QApplication.clipboard().setText(text)


def main():
    app = QApplication(sys.argv)
    win = Manager()
    win.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
