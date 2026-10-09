from __future__ import annotations

import sys

# Quando empacotado com PyInstaller (--splash), o bootloader já exibe a tela de
# abertura antes mesmo do Python começar a importar PySide6/oracledb/etc — por
# isso essa importação precisa ser a primeira coisa, antes de qualquer import pesado.
try:
    import pyi_splash  # type: ignore
except ImportError:
    pyi_splash = None

from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication, QMessageBox, QSplashScreen

from .core.resources import ICON_PATH, SPLASH_PATH
from .license import license as lic
from .ui.license_dialog import LicenseDialog
from .ui.main_window import MainWindow


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("DBWatch")

    icon = QIcon(str(ICON_PATH))
    app.setWindowIcon(icon)

    # Rodando do código-fonte (sem bootloader) não tem pyi_splash: mostra um
    # QSplashScreen equivalente usando a mesma imagem de abertura já em alta
    # resolução, em vez de redimensionar o .ico (que fica borrado/pixelado).
    splash = None
    if pyi_splash is None:
        pixmap = QIcon(str(SPLASH_PATH)).pixmap(480, 280)
        if not pixmap.isNull():
            splash = QSplashScreen(pixmap)
            splash.show()
            app.processEvents()

    info = lic.check_startup_license()
    if not info.valid:
        if pyi_splash is not None:
            pyi_splash.close()
        if splash:
            splash.close()
        QMessageBox.information(
            None, "Ativação necessária",
            "Esta cópia do DBWatch ainda não está ativada nesta máquina.\n"
            "Informe o identificador da máquina para receber seu token de licença.",
        )
        dlg = LicenseDialog()
        dlg.exec()
        info = lic.check_startup_license()
        if not info.valid:
            QMessageBox.critical(None, "Licença necessária", "DBWatch não pode ser executado sem uma licença válida.")
            sys.exit(1)

    window = MainWindow()
    window.setWindowIcon(icon)
    window.show()
    if pyi_splash is not None:
        pyi_splash.close()
    if splash:
        splash.finish(window)
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
