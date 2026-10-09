"""Gera dist/DBWatchLicenseManager.exe (app do emissor; NÃO distribuir)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent

args = [
    sys.executable, "-m", "PyInstaller",
    "--name=DBWatchLicenseManager",
    "--onefile", "--clean", "--noconfirm", "--windowed",
    "--exclude-module=pyqtgraph", "--exclude-module=numpy",
    "--exclude-module=oracledb", "--exclude-module=paramiko",
]
icon = ROOT / "app" / "assets" / "icons" / "dbwatch.ico"
if icon.exists():
    args.append(f"--icon={icon}")
args.append(str(ROOT / "tools" / "license_manager.py"))

subprocess.run(args, check=True, cwd=ROOT)
print("\nGerado em dist/DBWatchLicenseManager.exe (coloque private_key.pem ao lado dele)")
