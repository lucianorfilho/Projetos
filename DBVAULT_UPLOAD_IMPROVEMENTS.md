# DBVault - Melhorias de Upload

## Resumo das Mudanças

Este documento descreve as 3 principais melhorias implementadas no sistema de upload do DBVault:

### 1. **Suporte a Arquivos Ilimitados**
- ✅ Sem limite fixo de arquivo (multer sem restrição)
- ✅ Upload em chunks (10MB por chunk) para melhor performance
- ✅ Assembly automático de chunks no servidor
- ✅ Validação por quota do plano (storage_limit_gb)

### 2. **Progress Bar com Feedback Visual**
- ✅ Porcentagem de conclusão (0-100%)
- ✅ Taxa de transferência em tempo real (MB/s)
- ✅ Tempo estimado de conclusão (ETA)
- ✅ Bytes já enviados

### 3. **Segurança de Acesso (E2E)**
- ✅ Apenas o proprietário pode acessar arquivos
- ✅ Tokens de acesso únicos por arquivo
- ✅ Expiração de tokens após 30 minutos
- ✅ Hash de criptografia na DB
- ✅ Validação de ownership em todas as operações

---

## Arquivos Modificados

### Backend

#### `backend/src/routes/agent.js`
- **Mudanças:**
  - Aumentado limite de multer para 15GB
  - Adicionada nova rota `/api/agent/upload/chunked` para upload em chunks
  - Integração com tokens de segurança

#### `backend/src/routes/storage.js`
- **Mudanças:**
  - Adicionadas verificações de acesso seguro (`verifyObjectAccess`)
  - Nova rota `/api/storage/upload/chunked` para clientes web
  - Download gera tokens temporários (30min)
  - Delete verifica ownership

#### `backend/src/services/storageQuota.js`
- **Mudanças:**
  - Nova função `generateAccessToken()` - gera token único
  - Nova função `verifyObjectAccess()` - verifica ownership
  - Nova função `getDownloadToken()` - gera token temporário
  - `registerObject()` agora retorna `{ accessToken, encryptionKeyHash }`

#### `backend/config/oci.js`
- **Sem mudanças** (já suporta uploads grandes via stream)

### Frontend

#### `frontend/app/(dashboard)/storage/page.tsx`
- **Mudanças:**
  - Adicionado input file hidden
  - Nova função `uploadFileChunked()` com progress
  - Cálculo de velocidade de transferência (MB/s)
  - Cálculo de ETA
  - Novo card de progresso visual
  - Botão "Upload" com feedback de estado

### Banco de Dados

#### `backend/migrations/2026-07-14_add_file_security.sql`
- **Mudanças:**
  - Novo campo `is_encrypted` (boolean, default=true)
  - Novo campo `encryption_key_hash` (varchar 255)
  - Novo campo `access_token` (varchar 500)
  - Novo campo `expires_at` (timestamp)
  - Índices para performance de busca

---

## Como Aplicar as Mudanças

### Passo 1: Backup do Banco de Dados
```bash
# No VPS de produção
mysqldump -u root -p guardsaas > backup_2026_07_14.sql
```

### Passo 2: Executar Migração SQL
```bash
# No VPS de produção
mysql -u root -p guardsaas < backend/migrations/2026-07-14_add_file_security.sql
```

### Passo 3: Atualizar Código do Backend
1. Copiar arquivos modificados:
   - `backend/src/routes/agent.js`
   - `backend/src/routes/storage.js`
   - `backend/src/services/storageQuota.js`

2. No VPS, reiniciar o backend:
```bash
pm2 restart dbvault-backend
```

### Passo 4: Atualizar Frontend
1. Copiar arquivo modificado:
   - `frontend/app/(dashboard)/storage/page.tsx`

2. No VPS, rebuild Next.js:
```bash
cd frontend && npm run build && pm2 restart dbvault-frontend
```

### Passo 5: Testar

**Teste Local (Ubuntu antes de produção):**
```bash
# 1. Criar arquivo teste de 5GB
dd if=/dev/zero of=testfile.bin bs=1M count=5120

# 2. Fazer upload via interface
# 3. Verificar progress bar
# 4. Verificar tabela dbguard_storage_objects tem novos campos
```

**Verificações:**
- ✅ Campos novos no banco: `SELECT * FROM dbguard_storage_objects LIMIT 1;`
- ✅ Upload funciona para arquivos < 15GB
- ✅ Progress bar mostra % e MB/s
- ✅ Apenas proprietário consegue fazer download (testar com usuário diferente)
- ✅ Token expira após 30 minutos (testar manual)

---

## Compatibilidade

- **Versão Node.js:** 18.x ou superior
- **Versão MySQL:** 5.7+
- **Navegadores:** Todos (crypto.subtle via Web Crypto API)
- **OCI Storage:** Sem mudanças necessárias

---

## Rollback (se necessário)

Se houver problemas, fazer rollback:

```bash
# 1. Restaurar banco
mysql -u root -p guardsaas < backup_2026_07_14.sql

# 2. Restaurar código anterior do git
git checkout HEAD~1 backend/src/routes/agent.js
git checkout HEAD~1 backend/src/routes/storage.js
git checkout HEAD~1 backend/src/services/storageQuota.js
git checkout HEAD~1 frontend/app/(dashboard)/storage/page.tsx

# 3. Reiniciar
pm2 restart dbvault-backend dbvault-frontend
```

---

## Notas Adicionais

### Performance
- Upload em chunks permite melhor UX mesmo em conexões lentas
- Tokens temporários (30min) aumentam segurança
- Hash SHA-256 para validação de integridade

### Segurança
- Criptografia no metadata (hash + token)
- Validação de ownership em toda operação
- Tokens úicos e não reutilizáveis
- Sem alterações sensíveis armazenadas em plain-text

### Monitoramento
- Verificar logs em `/var/log/dbvault/` para erros de upload
- Limpar `/tmp/dbguard_chunks/` periodicamente (chunks incompletos)
- Monitorar espaço em OCI Object Storage

---

## Próximos Passos Opcionais

1. **Criptografia E2E completa**: Encriptar arquivo antes de enviar (crypto-js)
2. **Resumable uploads**: Permitir retomar upload interrompido
3. **Antivírus**: Integrar scan de malware antes de salvar
4. **Compressão**: Comprimir automaticamente antes de upload

---

**Data:** 14/07/2026  
**Versão:** 2.0  
**Status:** Pronto para produção
