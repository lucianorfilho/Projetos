"""Emite um token de licença para um HWID específico. Uso:

    python generate_license.py --hwid 7F3A-9C21-4B6E-0D18 --customer "Luciano" --days 365
    python generate_license.py --hwid 7F3A-9C21-4B6E-0D18 --customer "Luciano"          # sem expiração

O HWID de uma máquina é mostrado na tela de "Ativar licença" do DBWatch
nela mesma (o usuário te manda esse código, você gera o token e devolve).
"""
import argparse
import base64
import json
from datetime import date, timedelta
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

KEY_FILE = Path(__file__).parent / "private_key.pem"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--hwid", required=True, help="HWID mostrado no app, ex: 7F3A-9C21-4B6E-0D18")
    parser.add_argument("--customer", default="Luciano", help="Nome/identificação do titular da licença")
    parser.add_argument("--days", type=int, default=None, help="Validade em dias a partir de hoje (omitir = sem expiração)")
    args = parser.parse_args()

    if not KEY_FILE.exists():
        raise SystemExit(f"Chave privada não encontrada em {KEY_FILE}. Rode generate_keypair.py primeiro.")

    private_key = serialization.load_pem_private_key(KEY_FILE.read_bytes(), password=None)
    if not isinstance(private_key, Ed25519PrivateKey):
        raise SystemExit("Chave privada não é Ed25519.")

    exp = (date.today() + timedelta(days=args.days)).isoformat() if args.days else None
    payload = {"hwid": args.hwid.strip().upper(), "customer": args.customer, "exp": exp}
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    signature = private_key.sign(payload_bytes)
    token = f"DBW1.{b64url(payload_bytes)}.{b64url(signature)}"

    print("Token de licença:")
    print(token)
    if exp:
        print(f"Válida até: {exp}")
    else:
        print("Sem expiração.")


if __name__ == "__main__":
    main()
