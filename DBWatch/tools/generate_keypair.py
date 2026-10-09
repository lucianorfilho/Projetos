"""Gera o par de chaves Ed25519 da licença. Rode UMA VEZ.

Salva a chave PRIVADA em tools/private_key.pem (NUNCA commitar, NUNCA
embutir no .exe) e imprime a chave PÚBLICA em base64 para colar em
app/license/license.py (PUBLIC_KEY_B64).
"""
import base64
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

OUT = Path(__file__).parent / "private_key.pem"

if OUT.exists():
    raise SystemExit(f"Já existe {OUT}. Apague manualmente se quiser gerar um novo par (invalida licenças antigas).")

private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
OUT.write_bytes(pem)

raw_pub = public_key.public_bytes(
    encoding=serialization.Encoding.Raw,
    format=serialization.PublicFormat.Raw,
)
pub_b64 = base64.urlsafe_b64encode(raw_pub).decode().rstrip("=")

print(f"Chave privada salva em: {OUT}")
print("Guarde esse arquivo em local seguro (fora do git/VPS publico).")
print()
print("Cole isto em app/license/license.py, na linha PUBLIC_KEY_B64:")
print(pub_b64)
