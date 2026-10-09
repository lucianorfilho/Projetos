#!/bin/bash
# DBVault Agent — RedHat/CentOS/Rocky
# Uso: curl -fsSL http://SEU_SERVIDOR/api/agent/download/linux-redhat -o install.sh && bash install.sh --token SEU_TOKEN --server http://SEU_SERVIDOR

set -e

CONFIG_DIR="/etc/dbvault"
BIN_PATH="/usr/local/bin/dbvault-sendfile"

# Parse args
while [[ "$#" -gt 0 ]]; do
  case $1 in
    --token)  TOKEN="$2";  shift ;;
    --server) SERVER="$2"; shift ;;
  esac
  shift
done

if [ -z "$TOKEN" ] || [ -z "$SERVER" ]; then
  echo "❌ Uso: install.sh --token SEU_TOKEN --server http://SEU_SERVIDOR"
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "❌ curl não encontrado. Instale com: yum install -y curl"
  exit 1
fi

echo "================================================"
echo "   DBVault — Instalação do dbvault-sendfile"
echo "================================================"
echo "Servidor: $SERVER"
echo "Token: ${TOKEN:0:8}..."

echo "[1/3] Salvando configuração..."
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_DIR/config.json" << CONFIG
{
  "token": "$TOKEN",
  "server_url": "$SERVER"
}
CONFIG

echo "[2/3] Instalando comando dbvault-sendfile..."
cat > "$BIN_PATH" << 'SENDFILE'
#!/bin/bash
CONFIG_FILE="/etc/dbvault/config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ DBVault não está configurado. Reinstale o agente."
  exit 1
fi

TOKEN=$(grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
SERVER=$(grep -o '"server_url"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"server_url"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

FILE="$1"
if [ -z "$FILE" ]; then
  echo "Uso: dbvault-sendfile <caminho-do-arquivo>"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "❌ Arquivo não encontrado: $FILE"
  exit 1
fi

echo "Enviando $(basename "$FILE")..."

RESPONSE=$(curl -s -w '\n%{http_code}' -X POST "$SERVER/api/agent/upload" \
  -H "X-DBVault-Token: $TOKEN" \
  -F "token=$TOKEN" \
  -F "file=@$FILE")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Arquivo enviado com sucesso!"
  exit 0
else
  ERROR_MSG=$(echo "$BODY" | grep -o '"error"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"error"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
  echo "❌ ${ERROR_MSG:-Falha no envio (HTTP $HTTP_CODE)}"
  exit 1
fi
SENDFILE

chmod +x "$BIN_PATH"

echo "[3/3] Verificando..."
if command -v dbvault-sendfile >/dev/null 2>&1; then
  echo "✅ DBVault instalado com sucesso!"
else
  echo "⚠️ Instalado em $BIN_PATH, mas não encontrado no PATH."
fi

echo ""
echo "================================================"
echo "   Uso: dbvault-sendfile <caminho-do-arquivo>"
echo "================================================"
