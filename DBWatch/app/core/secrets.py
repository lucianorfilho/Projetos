"""Criptografia local de senhas (Oracle/SSH) salvas no banco sqlite do app.

A chave fica em um arquivo separado na pasta de dados do usuário, fora do
banco de dados — assim o arquivo sqlite sozinho não é suficiente para
decifrar as senhas.
"""
from __future__ import annotations

from pathlib import Path

from cryptography.fernet import Fernet

_KEY_FILE = Path.home() / "AppData" / "Local" / "DBWatch" / "secret.key"


def _get_or_create_key() -> bytes:
    _KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if _KEY_FILE.exists():
        return _KEY_FILE.read_bytes()
    key = Fernet.generate_key()
    _KEY_FILE.write_bytes(key)
    return key


_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_get_or_create_key())
    return _fernet


def encrypt(plain: str) -> str:
    if not plain:
        return ""
    return _get_fernet().encrypt(plain.encode("utf-8")).decode("ascii")


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except Exception:
        return ""
