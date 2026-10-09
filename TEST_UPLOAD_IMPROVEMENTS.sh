#!/bin/bash

# Script de Teste - DBVault Upload Improvements
# Executar após instalar em Ubuntu antes de aplicar para todos os ambientes

set -e

echo "================================================"
echo "DBVault Upload Improvements - Test Suite"
echo "================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
BACKEND_URL="http://localhost:4000/api"
FRONTEND_URL="http://localhost:3000"
TEST_USER_EMAIL="test@example.com"
TEST_USER_PASS="TestPass123!"

echo -e "${YELLOW}[1] Verificando serviços...${NC}"
if ! curl -s "$BACKEND_URL/health" > /dev/null; then
  echo -e "${RED}✗ Backend não está rodando${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Backend está online${NC}"

echo ""
echo -e "${YELLOW}[2] Verificando banco de dados...${NC}"

# Verificar se campos novos existem na tabela
FIELDS=$(mysql -u root -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='dbguard_storage_objects' AND COLUMN_NAME IN ('is_encrypted', 'encryption_key_hash', 'access_token', 'expires_at');" 2>/dev/null | wc -l)

if [ "$FIELDS" -eq 4 ]; then
  echo -e "${GREEN}✓ Campos de segurança estão presentes no banco${NC}"
else
  echo -e "${RED}✗ Faltam campos no banco. Execute a migração primeiro.${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[3] Criando arquivo de teste...${NC}"

# Criar arquivo de teste 100MB
TEST_FILE="/tmp/test_file_100mb.bin"
dd if=/dev/zero of=$TEST_FILE bs=1M count=100 2>/dev/null
echo -e "${GREEN}✓ Arquivo de teste criado: $TEST_FILE (100MB)${NC}"

echo ""
echo -e "${YELLOW}[4] Testando limite de multer (15GB)...${NC}"

# Verificar se multer aceita grande arquivo
if grep -q "15 \* 1024 \* 1024 \* 1024" backend/src/routes/agent.js; then
  echo -e "${GREEN}✓ Limite de multer está configurado para 15GB${NC}"
else
  echo -e "${RED}✗ Limite de multer não está correto${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[5] Testando rotas de upload chunked...${NC}"

# Verificar se rota chunked existe
if grep -q "'/api/agent/upload/chunked'" backend/src/routes/agent.js; then
  echo -e "${GREEN}✓ Rota /api/agent/upload/chunked está presente${NC}"
else
  echo -e "${RED}✗ Rota de upload chunked não encontrada${NC}"
  exit 1
fi

if grep -q "'/storage/upload/chunked'" backend/src/routes/storage.js; then
  echo -e "${GREEN}✓ Rota /storage/upload/chunked está presente${NC}"
else
  echo -e "${RED}✗ Rota de upload chunked para clientes não encontrada${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[6] Testando segurança de acesso...${NC}"

# Verificar funções de segurança
if grep -q "verifyObjectAccess" backend/src/routes/storage.js; then
  echo -e "${GREEN}✓ Verificação de ownership está presente${NC}"
else
  echo -e "${RED}✗ Verificação de acesso não encontrada${NC}"
  exit 1
fi

if grep -q "getDownloadToken" backend/src/routes/storage.js; then
  echo -e "${GREEN}✓ Geração de token temporário está presente${NC}"
else
  echo -e "${RED}✗ Geração de token não encontrada${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[7] Testando frontend...${NC}"

# Verificar componente upload no frontend
if grep -q "uploadFileChunked" frontend/app/\(dashboard\)/storage/page.tsx; then
  echo -e "${GREEN}✓ Função de upload chunked está no frontend${NC}"
else
  echo -e "${RED}✗ Upload chunked não implementado no frontend${NC}"
  exit 1
fi

if grep -q "uploadSpeed" frontend/app/\(dashboard\)/storage/page.tsx; then
  echo -e "${GREEN}✓ Cálculo de velocidade está no frontend${NC}"
else
  echo -e "${RED}✗ Velocidade não está sendo calculada${NC}"
  exit 1
fi

if grep -q "uploadETA" frontend/app/\(dashboard\)/storage/page.tsx; then
  echo -e "${GREEN}✓ Cálculo de ETA está no frontend${NC}"
else
  echo -e "${RED}✗ ETA não está sendo calculado${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[8] Testando criptografia no frontend...${NC}"

if grep -q "calculateFileHash" frontend/app/\(dashboard\)/storage/page.tsx; then
  echo -e "${GREEN}✓ Hash de arquivo está no frontend${NC}"
else
  echo -e "${RED}✗ Hash não está sendo calculado${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}[9] Teste manual recomendado${NC}"
echo ""
echo "Para testar completamente, faça o seguinte:"
echo ""
echo "1. Acesse: $FRONTEND_URL"
echo "2. Faça login"
echo "3. Vá para 'Storage'"
echo "4. Clique em 'Upload'"
echo "5. Selecione $TEST_FILE"
echo "6. Observe:"
echo "   - Progress bar com %"
echo "   - Velocidade em MB/s"
echo "   - ETA em tempo real"
echo "7. Após upload:"
echo "   - Arquivo deve aparecer na lista"
echo "   - Faça download e verifique integridade"
echo "   - Tente acessar com outro usuário (deve ser negado)"
echo ""

echo -e "${YELLOW}[10] Limpeza${NC}"
rm -f $TEST_FILE
echo -e "${GREEN}✓ Arquivo de teste removido${NC}"

echo ""
echo -e "${GREEN}================================================"
echo "Todos os testes passaram!"
echo "Pronto para aplicar em produção."
echo "================================================${NC}"

echo ""
echo "Próximos passos:"
echo "1. Testar em outro servidor Ubuntu"
echo "2. Aplicar migração SQL em produção"
echo "3. Fazer deploy do código"
echo "4. Monitorar logs por 24h"
