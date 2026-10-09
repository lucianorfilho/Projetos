"""Validação de licença no app.

A licença é um token assinado (Ed25519): só quem tem a chave PRIVADA
(fica só com o Luciano, fora do repositório/exe) consegue gerar um token
que bate com a chave PÚBLICA embutida aqui. O token amarra o HWID da
máquina, então copiar o token para outro PC não funciona.

Formato do token: "DBW1.<payload_b64url>.<assinatura_b64url>"
payload (JSON): {"hwid": "...", "exp": "YYYY-MM-DD" | null, "customer": "..."}
"""
from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .hwid import get_hardware_id

# Chave pública Ed25519 (32 bytes, base64). A privada correspondente NUNCA
# entra neste repositório nem no .exe — fica só com quem emite licenças.
# Gerada por tools/generate_keypair.py; substitua pelo valor real gerado.
PUBLIC_KEY_B64 = "u1OUWb5IHFxmxK96uWkUBTh4ARlpuenciupo03Z2brI"

TOKEN_PREFIX = "DBW1"
LICENSE_FILE = Path.home() / "AppData" / "Local" / "DBWatch" / "license.key"


@dataclass
class LicenseInfo:
    valid: bool
    message: str
    hwid: str
    customer: str | None = None
    expires: str | None = None


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def _load_public_key() -> Ed25519PublicKey | None:
    if PUBLIC_KEY_B64.startswith("REPLACE_"):
        return None
    raw = base64.urlsafe_b64decode(PUBLIC_KEY_B64 + "=" * (-len(PUBLIC_KEY_B64) % 4))
    return Ed25519PublicKey.from_public_bytes(raw)


def validate_token(token: str) -> LicenseInfo:
    hwid = get_hardware_id()
    pubkey = _load_public_key()
    if pubkey is None:
        return LicenseInfo(False, "Chave pública de licença não configurada no app.", hwid)

    token = token.strip()
    try:
        prefix, payload_b64, sig_b64 = token.split(".")
        if prefix != TOKEN_PREFIX:
            raise ValueError("prefixo inválido")
        payload_bytes = _b64url_decode(payload_b64)
        signature = _b64url_decode(sig_b64)
        pubkey.verify(signature, payload_bytes)
        payload = json.loads(payload_bytes)
    except InvalidSignature:
        return LicenseInfo(False, "Licença inválida: assinatura não confere.", hwid)
    except Exception:
        return LicenseInfo(False, "Licença inválida: formato ilegível.", hwid)

    if payload.get("hwid") != hwid:
        return LicenseInfo(False, "Licença não pertence a esta máquina.", hwid)

    exp = payload.get("exp")
    if exp:
        try:
            if date.fromisoformat(exp) < date.today():
                return LicenseInfo(False, f"Licença expirada em {exp}.", hwid, payload.get("customer"), exp)
        except ValueError:
            return LicenseInfo(False, "Licença inválida: data de expiração ilegível.", hwid)

    return LicenseInfo(True, "Licença válida.", hwid, payload.get("customer"), exp)


def save_token(token: str) -> None:
    LICENSE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LICENSE_FILE.write_text(token.strip(), encoding="utf-8")


def load_saved_token() -> str | None:
    if LICENSE_FILE.exists():
        return LICENSE_FILE.read_text(encoding="utf-8").strip()
    return None


def check_startup_license() -> LicenseInfo:
    token = load_saved_token()
    if not token:
        return LicenseInfo(False, "Nenhuma licença instalada.", get_hardware_id())
    return validate_token(token)
