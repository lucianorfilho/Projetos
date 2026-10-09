"""Gera o executável DBWatch.exe com PyInstaller.

Uso:
    python build.py            # gera dist/DBWatch.exe (sem console)
    python build.py --debug    # mantém o console, útil para ver erros
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

args = [
    sys.executable, "-m", "PyInstaller",
    "--name=DBWatch",
    "--clean",
    "--noconfirm",
    "--noupx",
    "--collect-all=PySide6",
    "--collect-all=pyqtgraph",
    "--collect-all=oracledb",
    "--collect-all=cryptography",
    "--hidden-import=paramiko",
    f"--add-data={ROOT / 'app' / 'assets'};app/assets",
    f"--splash={ROOT / 'app' / 'assets' / 'icons' / 'splash.png'}",
    str(ROOT / "run.py"),
]

if "--debug" not in sys.argv:
    args.insert(-1, "--windowed")

icon = ROOT / "app" / "assets" / "icons" / "dbwatch.ico"
if icon.exists():
    args.insert(-1, f"--icon={icon}")

print("Rodando:", " ".join(args))
subprocess.run(args, check=True, cwd=ROOT)
print("\nExecutável gerado em dist/DBWatch/DBWatch.exe")
