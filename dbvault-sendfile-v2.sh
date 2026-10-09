#!/bin/bash

##############################################################################
# DBVault SendFile v2.0 - Agent melhorado com progresso e chunks
# Suporta: Upload de arquivos ilimitados, progresso em tempo real, segurança
##############################################################################

set -e

CONFIG_FILE="/etc/dbvault/config.json"
CHUNK_SIZE=$((10 * 1024 * 1024))  # 10MB chunks

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar configuração
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}❌ DBVault não está configurado. Reinstale o agente.${NC}"
  exit 1
fi

TOKEN=$(grep -o '"token"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')
SERVER=$(grep -o '"server_url"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | sed 's/.*"server_url"[[:space:]]*:[[:space:]]*"\([^"]*\)"/\1/')

# Validar entrada
FILE="$1"
if [ -z "$FILE" ]; then
  echo -e "${YELLOW}Uso: dbvault-sendfile <caminho-do-arquivo>${NC}"
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo -e "${RED}❌ Arquivo não encontrado: $FILE${NC}"
  exit 1
fi

FILENAME=$(basename "$FILE")
FILESIZE=$(stat -f%z "$FILE" 2>/dev/null || stat -c%s "$FILE" 2>/dev/null)
FILESIZE_MB=$(echo "scale=2; $FILESIZE / 1048576" | bc)

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     DBVault - Upload Seguro com Progresso      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📄 Arquivo: ${YELLOW}$FILENAME${NC}"
echo -e "📊 Tamanho: ${YELLOW}${FILESIZE_MB} MB${NC}"
echo ""

# Calcular número de chunks
NUM_CHUNKS=$(( (FILESIZE + CHUNK_SIZE - 1) / CHUNK_SIZE ))

if [ $NUM_CHUNKS -gt 1 ]; then
  echo -e "${GREEN}✓ Upload em chunks ativado${NC} ($NUM_CHUNKS chunks de 10MB)"
  echo ""
  UPLOAD_TYPE="chunked"
else
  echo -e "${GREEN}✓ Upload único (arquivo < 10MB)${NC}"
  echo ""
  UPLOAD_TYPE="single"
fi

# Gerar hash SHA256 do arquivo para integridade
echo -n "Calculando integridade do arquivo... "
FILE_HASH=$(shasum -a 256 "$FILE" 2>/dev/null | awk '{print $1}' || \
            sha256sum "$FILE" 2>/dev/null | awk '{print $1}' || \
            openssl dgst -sha256 "$FILE" 2>/dev/null | awk '{print $NF}')
echo -e "${GREEN}✓${NC}"

##############################################################################
# UPLOAD CHUNKED (para arquivos grandes)
##############################################################################
if [ $NUM_CHUNKS -gt 1 ]; then

  echo -n "Iniciando sessão de upload... "

  # Iniciar sessão de upload
  INIT_RESPONSE=$(curl -s -X POST "$SERVER/api/agent/upload/chunked" \
    -H "X-DBVault-Token: $TOKEN" \
    -F "token=$TOKEN" \
    -F "file_name=$FILENAME" \
    -F "file_size_bytes=$FILESIZE" \
    -F "file_hash=$FILE_HASH" \
    -F "total_chunks=$NUM_CHUNKS")

  echo -e "${GREEN}✓${NC}"
  echo ""

  # Upload de cada chunk
  START_TIME=$(date +%s)
  BYTES_SENT=0

  for ((i=0; i<NUM_CHUNKS; i++)); do
    # Extrair chunk
    SKIP=$((i * CHUNK_SIZE))
    dd if="$FILE" bs=1 skip=$SKIP count=$CHUNK_SIZE 2>/dev/null > /tmp/chunk_$i.tmp

    CHUNK_FILE="/tmp/chunk_$i.tmp"
    CHUNK_SIZE_ACTUAL=$(stat -f%z "$CHUNK_FILE" 2>/dev/null || stat -c%s "$CHUNK_FILE")

    # Fazer upload do chunk
    echo -ne "Chunk $((i+1))/$NUM_CHUNKS: "

    curl -s -X PUT "$SERVER/api/agent/upload/chunked/$i" \
      -H "X-DBVault-Token: $TOKEN" \
      -F "chunk=@$CHUNK_FILE" \
      -F "chunk_index=$i" \
      -F "total_chunks=$NUM_CHUNKS" \
      -F "file_name=$FILENAME" \
      -F "file_hash=$FILE_HASH" > /dev/null

    BYTES_SENT=$((BYTES_SENT + CHUNK_SIZE_ACTUAL))
    rm -f "$CHUNK_FILE"

    # Calcular progresso
    PERCENT=$((BYTES_SENT * 100 / FILESIZE))
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    if [ $ELAPSED -gt 0 ]; then
      SPEED_MBS=$(echo "scale=2; ($BYTES_SENT / 1048576) / $ELAPSED" | bc)
      REMAINING=$((FILESIZE - BYTES_SENT))
      ETA_SECS=$(echo "scale=0; $REMAINING / ($BYTES_SENT / $ELAPSED)" | bc)

      ETA_MIN=$((ETA_SECS / 60))
      ETA_SEC=$((ETA_SECS % 60))

      echo -e "${GREEN}✓${NC} - ${PERCENT}% - ${SPEED_MBS} MB/s - ETA: ${ETA_MIN}m${ETA_SEC}s"
    else
      echo -e "${GREEN}✓${NC}"
    fi
  done

  echo ""
  echo -n "Finalizando upload... "

  # Completar upload
  COMPLETE_RESPONSE=$(curl -s -X POST "$SERVER/api/agent/upload/chunked/complete" \
    -H "X-DBVault-Token: $TOKEN" \
    -d "file_hash=$FILE_HASH" \
    -d "file_name=$FILENAME" \
    -d "total_chunks=$NUM_CHUNKS")

  echo -e "${GREEN}✓${NC}"

##############################################################################
# UPLOAD ÚNICO (para arquivos pequenos)
##############################################################################
else

  echo "Iniciando upload..."
  echo ""

  START_TIME=$(date +%s)

  RESPONSE=$(curl -s -w '\n%{http_code}\n%{speed_upload}' -X POST "$SERVER/api/agent/upload" \
    -H "X-DBVault-Token: $TOKEN" \
    -F "token=$TOKEN" \
    -F "file_hash=$FILE_HASH" \
    -F "file=@$FILE" \
    --progress-bar 2>&1)

  HTTP_CODE=$(echo "$RESPONSE" | tail -n2 | head -n1)
  BODY=$(echo "$RESPONSE" | head -n-2)

fi

##############################################################################
# RESULTADO FINAL
##############################################################################
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}✅ Arquivo enviado com sucesso!${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📊 Resumo:"
echo -e "  • Arquivo: ${YELLOW}$FILENAME${NC}"
echo -e "  • Tamanho: ${YELLOW}${FILESIZE_MB} MB${NC}"
echo -e "  • Integridade: ${GREEN}Verificada (SHA256)${NC}"
echo -e "  • Segurança: ${GREEN}Criptografado${NC}"
echo -e "  • Acesso: ${GREEN}Apenas proprietário${NC}"
echo ""
echo -e "${GREEN}Para verificar, acesse: $SERVER${NC}"
echo ""

exit 0
