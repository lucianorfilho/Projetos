# 🔒 DBVendas - Configuração de Segurança

## ⚠️ CRÍTICO - Fazer Imediatamente

### 1. Gerar SECRET_KEY

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Copie o output e guarde em segurança.

### 2. Gerar Senha PostgreSQL

```bash
python -c "import secrets; print(secrets.token_urlsafe(16))"
```

### 3. Criar arquivo .env

Na pasta `backend/`, copie o arquivo `.env.example` para `.env`:

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` com seus valores:

```env
SECRET_KEY=<cole-aqui-a-chave-gerada>
DATABASE_URL=postgresql://dbvendas:<nova-senha>@localhost:5432/dbvendas
DEBUG=false
CORS_ORIGINS=https://cardapio.dbvendas.dbtechsolutions.com.br,https://dbvendas.dbtechsolutions.com.br
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=INFO
```

### 4. Instalar Dependências Atualizadas

```bash
cd backend
pip install -r requirements.txt
```

### 5. Alterar Senha do PostgreSQL

Na VPS, conecte-se ao PostgreSQL:

```bash
sudo -u postgres psql
```

Altere a senha do usuário `dbvendas`:

```sql
ALTER USER dbvendas WITH PASSWORD 'nova-senha-forte';
\q
```

### 6. Atualizar Nginx

Copie o arquivo `nginx_hardened.conf` para a VPS:

```bash
sudo cp nginx_hardened.conf /etc/nginx/sites-available/dbvendas
sudo nginx -t
sudo systemctl reload nginx
```

### 7. Instalar e Configurar Redis

```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 8. Reiniciar Serviços

```bash
# Matar processo antigo
pm2 kill

# Instalar PM2 se não tiver
npm install -g pm2

# Iniciar aplicação
cd /opt/dbvendas/backend
pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name dbvendas-api

# Salvar processo
pm2 save
pm2 startup

# Verificar logs
pm2 logs dbvendas-api
```

---

## 🔐 Alterações de Segurança Implementadas

### Backend (app/main.py)
- ✅ Trusted Host Middleware - Apenas hosts confiáveis
- ✅ CORS restringido - Apenas domínios específicos
- ✅ Security Headers - X-Frame-Options, Content-Security-Policy, HSTS, etc
- ✅ CSRF Protection - Middleware de proteção
- ✅ Remoção de Server header - Não expor versão do Nginx

### Autenticação (app/routes/auth.py)
- ✅ Rate Limiting - 5 tentativas/minuto no login
- ✅ Logging de segurança - Registra tentativas de login falhadas
- ✅ Proteção contra timing attacks - Sleep de 100ms em falha

### Validação (app/schemas.py)
- ✅ Validação de força de senha:
  - Mínimo 8 caracteres
  - Pelo menos 1 letra maiúscula
  - Pelo menos 1 letra minúscula
  - Pelo menos 1 número
  - Pelo menos 1 caractere especial

### Configuração (app/config.py)
- ✅ SECRET_KEY via variável de ambiente (obrigatório)
- ✅ DATABASE_URL via variável de ambiente
- ✅ CORS Origins customizável
- ✅ Debug mode via variável
- ✅ Token expiration reduzido para 30 minutos

### Nginx (nginx_hardened.conf)
- ✅ SSL/TLS 1.2+ obrigatório
- ✅ Ciphers modernos apenas
- ✅ HSTS ativado
- ✅ OCSP stapling
- ✅ Rate limiting por endpoint
- ✅ Headers de segurança completos
- ✅ Bloqueio de arquivos sensíveis

### Logging (app/utils/logging.py)
- ✅ Logging em JSON para melhor auditoria
- ✅ Logger de segurança separado
- ✅ Registra IP, usuário, ação

### Criptografia (app/utils/encryption.py)
- ✅ Suporte para criptografia de dados sensíveis
- ✅ Chave armazenada de forma segura

---

## 📋 Checklist de Verificação

- [ ] SECRET_KEY gerada e adicionada ao .env
- [ ] DATABASE_URL atualizada com nova senha
- [ ] DEBUG=false em produção
- [ ] CORS_ORIGINS configurado apenas com domínios válidos
- [ ] Redis instalado e rodando
- [ ] Nginx atualizado com configuração hardened
- [ ] Backend reiniciado com novas variáveis
- [ ] Testes de login funcionando
- [ ] Rate limiting testado (5 tentativas no login)
- [ ] Logs de segurança sendo registrados
- [ ] HTTPS funcionando corretamente
- [ ] SSL certificate valido

---

## 🧪 Testes de Segurança

### Testar Rate Limiting

```bash
# Fazer 6 requisições rápidas de login (deve falhar na 6ª)
for i in {1..6}; do
  curl -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' &
done
```

### Testar Força de Senha

```bash
# Deve rejeitar senhas fracas
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123"}'
```

### Testar CORS

```bash
# Fazer requisição de domínio não autorizado
curl -X GET http://localhost:8000/ \
  -H "Origin: https://example.com"
```

### Testar Headers de Segurança

```bash
curl -I https://dbvendas.dbtechsolutions.com.br/
```

Deve incluir:
- `Strict-Transport-Security`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`

---

## 📞 Suporte e Monitoramento

### Monitorar Logs de Segurança

```bash
pm2 logs dbvendas-api | grep -i "security\|warning\|error"
```

### Verificar Nginx

```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/dbvendas_error.log
```

### Verificar Redis

```bash
redis-cli ping
```

---

## 🚨 Em Caso de Problema

Se o backend não iniciar:

1. Verificar variáveis do .env
2. Verificar logs do PM2
3. Verificar conexão com PostgreSQL
4. Verificar se Redis está rodando
5. Verificar permissões de arquivo

```bash
# Ver logs detalhados
pm2 logs dbvendas-api --lines 100

# Reiniciar
pm2 restart dbvendas-api

# Ver processo
pm2 show dbvendas-api
```

---

**Data de Criação:** 31 de Agosto de 2026  
**Versão:** 1.0 - Security Hardening  
**Status:** ✅ Completo
