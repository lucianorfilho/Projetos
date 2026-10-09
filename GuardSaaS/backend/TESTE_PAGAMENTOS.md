# Teste de Validação - Scheduler e Endpoints Admin

## 🧪 Teste 1: Verificar se Scheduler está Ativo

### Passo 1: Reiniciar a aplicação
```bash
ssh root@23.106.45.221
cd /home/guardsaas
pm2 restart all
```

### Passo 2: Verificar log
```bash
pm2 logs guardsaas | grep -i scheduler
```

**Esperado:** Ver mensagens como:
```
⏰ Scheduler iniciado
💳 Sincronizando pagamentos com Asaas...
```

---

## 🧪 Teste 2: Testar Endpoint Admin - Listar Pendentes

### Comando:
```bash
curl -s http://localhost:4000/api/admin/pending-payments \
  -H "Authorization: Bearer {seu_token_admin}" | jq
```

**Esperado (se houver pendentes):**
```json
[
  {
    "invoice_id": 123,
    "user_id": 45,
    "name": "Usuário Teste",
    "email": "teste@email.com",
    "plan_name": "50GB",
    "value": "11.90",
    "status": "awaiting_payment"
  }
]
```

**Se erro `403`:**
- ❌ Token inválido
- ❌ Usuário não é admin
- → Use token de um user com `role = 'admin'`

---

## 🧪 Teste 3: Liberar Espaço Manualmente

### Passo 1: Crie uma fatura de teste no BD
```bash
ssh root@23.106.45.221
mysql -u root -p dbguard <<'EOF'

-- Criar usuário teste (se não existir)
INSERT IGNORE INTO dbguard_users (name, email, password_hash, role, status)
VALUES ('Admin Teste', 'admin_teste@test.com', 'hash', 'admin', 'active');

-- Criar subscription teste
INSERT INTO dbguard_subscriptions (user_id, plan_id, status)
VALUES (1, 2, 'pending_payment');

-- Criar fatura teste
INSERT INTO dbguard_invoices 
(user_id, subscription_id, plan_id, plan_name, asaas_payment_id, value, status, due_date)
VALUES (1, 1, 2, '50GB', 'TEST_' . UUID(), 11.90, 'awaiting_payment', DATE_ADD(NOW(), INTERVAL 3 DAY));

-- Ver IDs
SELECT LAST_INSERT_ID() as invoice_id;

EOF
```

### Passo 2: Anotar `invoice_id` (ex: 123)

### Passo 3: Chamar endpoint
```bash
curl -X POST http://localhost:4000/api/admin/release-payment/123 \
  -H "Authorization: Bearer {seu_token_admin}" | jq
```

**Esperado:**
```json
{
  "message": "Espaço liberado com sucesso",
  "invoice_id": 123,
  "plan_name": "50GB",
  "user_id": 1
}
```

### Passo 4: Verificar no BD
```bash
ssh root@23.106.45.221
mysql -u root -p dbguard -e "
SELECT id, status, paid_at FROM dbguard_invoices WHERE id = 123;
SELECT id, status, expires_at FROM dbguard_subscriptions WHERE id = 1;
"
```

**Esperado:**
- Invoice status: `paid` ✅
- Subscription status: `active` ✅
- expires_at: hoje + 30 dias ✅

---

## 🧪 Teste 4: Sincronização Automática (Scheduler)

### Passo 1: Crie outra fatura de teste
```bash
ssh root@23.106.45.221
mysql -u root -p dbguard <<'EOF'

INSERT INTO dbguard_invoices 
(user_id, subscription_id, plan_id, plan_name, asaas_payment_id, value, status, due_date)
VALUES (1, 2, 3, '100GB', 'SYNC_TEST_' . UUID(), 23.90, 'awaiting_payment', DATE_ADD(NOW(), INTERVAL 3 DAY));

SELECT LAST_INSERT_ID() as invoice_id;

EOF
```

### Passo 2: Simular pagamento no Asaas
```javascript
// No console do navegador em https://app.asaas.com
// Ou via API Asaas (requisiçao manual)

// Para SANDBOX:
const paymentId = "SYNC_TEST_..."; // copie de cima
// Marque como PAID no Asaas manualmente (dashboard)
```

### Passo 3: Aguardar scheduler (máximo 15 minutos)

### Passo 4: Monitorar log
```bash
tail -f /var/log/guardsaas/app.log | grep -E "Sincronizando|Liberando|✅"
```

Você deve ver:
```
💳 Sincronizando pagamentos com Asaas...
✅ Liberando espaço: SYNC_TEST_... (100GB)
✅ 1 pagamento(s) processado(s) com sucesso
```

### Passo 5: Verificar BD
```bash
mysql -u root -p dbguard -e "
SELECT id, status, paid_at FROM dbguard_invoices WHERE plan_name = '100GB' AND status = 'awaiting_payment';
"
```

**Esperado:** Status deve ter mudado para `paid` ✅

---

## 🧪 Teste 5: Webhook Status (Monitoramento)

### Comando:
```bash
curl -s http://localhost:4000/api/admin/webhook-status \
  -H "Authorization: Bearer {seu_token_admin}" | jq
```

**Resposta esperada:**
```json
{
  "webhook_events_24h": [
    {
      "event_type": "PAYMENT_CONFIRMED",
      "count": 5,
      "last_received": "2026-07-08T14:30:00Z"
    }
  ],
  "pending_invoices": {
    "total": 0,
    "last_7_days": 0,
    "last_24_hours": 0
  }
}
```

Se `pending_invoices.total > 0`:
→ Há faturas não processadas
→ Scheduler deve processar em breve

---

## 🧪 Teste 6: Sincronizar Pagamento Específico

### Comando:
```bash
curl -X POST http://localhost:4000/api/admin/sync-payment/pay_abc123 \
  -H "Authorization: Bearer {seu_token_admin}" | jq
```

**Resposta esperada:**
```json
{
  "payment": {
    "id": "pay_abc123",
    "status": "RECEIVED",
    "value": 11.90,
    "dueDate": "2026-07-08"
  },
  "local_status": {
    "invoice_status": "awaiting_payment",
    "subscription_status": "pending_payment"
  },
  "sync_needed": true
}
```

Isso mostra:
- ✅ Pagamento foi recebido no Asaas
- ❌ Mas não foi processado localmente (sync_needed=true)
- → Você pode então chamar `/release-payment` ou aguardar scheduler

---

## 🔍 Troubleshooting

### Erro: "Apenas admins podem acessar"
**Causa:** Token é de usuário comum, não admin
**Solução:** Use token de um user com `role='admin'`

```bash
# Verificar user é admin
mysql -u root -p dbguard -e "SELECT id, name, role FROM dbguard_users WHERE role = 'admin';"
```

---

### Erro: "Fatura não encontrada"
**Causa:** `invoice_id` incorreto
**Solução:** Verificar ID correto
```bash
mysql -u root -p dbguard -e "SELECT id FROM dbguard_invoices WHERE status = 'awaiting_payment' LIMIT 1;"
```

---

### Scheduler não está sincronizando
**Verificações:**

1. **Aplicação rodando?**
   ```bash
   pm2 status guardsaas
   ```
   Se status = `stopped`, iniciar: `pm2 start guardsaas`

2. **Logs mostram ativação?**
   ```bash
   pm2 logs guardsaas | head -50 | grep scheduler
   ```
   Deve ver: `⏰ Scheduler iniciado`

3. **Scheduler foi adicionado ao arquivo?**
   ```bash
   grep -n "Sincronizando pagamentos" /home/guardsaas/backend/src/scheduler.js
   ```
   Deve haver resposta

4. **Linha foi adicionada a `index.js`?**
   ```bash
   grep "require.*admin" /home/guardsaas/backend/src/index.js
   ```
   Deve mostrar: `require('./routes/admin')`

---

## ✅ Checklist de Validação

- [ ] Scheduler iniciado (log mostra `⏰ Scheduler iniciado`)
- [ ] Endpoint `/api/admin/pending-payments` retorna lista ou array vazio
- [ ] Endpoint `/api/admin/release-payment/{id}` libera fatura de teste
- [ ] Fatura de teste muda de `awaiting_payment` → `paid` no BD
- [ ] Subscription muda de `pending_payment` → `active` no BD
- [ ] Scheduler sincroniza automaticamente em até 15 minutos
- [ ] Webhook status mostra eventos recentes
- [ ] Sync payment específico funciona

---

## 🚀 Próximas Etapas

1. **Passar testes acima** ✅
2. **Recuperar caso do "cupper store"** → Executar `/api/admin/release-payment/{invoice_id}`
3. **Monitorar por 7 dias** → Acompanhar logs e garantir que tudo está automático
4. **Criar alertas Slack** (opcional) → Ser notificado de falhas de webhook

---

## 📞 Teste em Produção (Real)

Uma vez que tudo está validado:

1. Simular um cliente pagando via PIX/Boleto
2. Monitorar logs por até 15 minutos
3. Verificar que espaço foi liberado automaticamente
4. Cliente recebeu email de confirmação

**Esperado:** Tudo automático, sem intervenção admin ✅

---

**Status:** Pronto para testes em produção
