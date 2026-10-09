"""Gera um identificador estável da máquina (HWID) usado para travar a licença."""
from __future__ import annotations

import hashlib
import platform
import subprocess
import uuid


def _run(cmd: list[str]) -> str:
    try:
        out = subprocess.check_output(
            cmd, stdin=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5,
            creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0,
        )
        return out.decode(errors="ignore").strip()
    except Exception:
        return ""


def _disk_serial() -> str:
    out = _run(["powershell", "-NoProfile", "-Command",
                "(Get-CimInstance Win32_DiskDrive | Select-Object -First 1 -ExpandProperty SerialNumber)"])
    return out.strip()


def _cpu_id() -> str:
    out = _run(["powershell", "-NoProfile", "-Command",
                "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty ProcessorId)"])
    return out.strip()


def _motherboard_serial() -> str:
    out = _run(["powershell", "-NoProfile", "-Command",
                "(Get-CimInstance Win32_BaseBoard | Select-Object -First 1 -ExpandProperty SerialNumber)"])
    return out.strip()


def raw_fingerprint_components() -> dict:
    return {
        "disk": _disk_serial(),
        "cpu": _cpu_id(),
        "board": _motherboard_serial(),
        "mac": f"{uuid.getnode():012X}",
        "machine": platform.node(),
    }


def get_hardware_id() -> str:
    """Retorna um HWID determinístico e legível, ex: 7F3A-9C21-4B6E-0D18."""
    parts = raw_fingerprint_components()
    # mac/machine entram como fallback caso WMI falhe (ambiente restrito/VM clonada),
    # mas disk/cpu/board dominam o hash para reduzir colisao entre maquinas.
    blob = "|".join([parts["disk"], parts["cpu"], parts["board"], parts["mac"]])
    digest = hashlib.sha256(blob.encode("utf-8")).hexdigest().upper()
    short = digest[:16]
    return "-".join(short[i:i + 4] for i in range(0, 16, 4))
