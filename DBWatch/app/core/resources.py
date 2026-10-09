from __future__ import annotations

import sys
from pathlib import Path


def resource_path(*parts: str) -> Path:
    """Caminho de um arquivo de dados (ícones, etc.), funcionando tanto
    rodando do código-fonte quanto empacotado com PyInstaller."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent.parent.parent))
    return base.joinpath("app", *parts)


ICON_PATH = resource_path("assets", "icons", "dbwatch.ico")
SPLASH_PATH = resource_path("assets", "icons", "splash.png")
