# Deploy Rápido - 5 Minutos

## 🚀 Passo 1: Copiar Arquivos

```bash
ssh root@23.106.45.221
cd /home/guardsaas/backend
```

### Arquivo 1: Atualizar scheduler.js
```bash
# Fazer backup
cp src/scheduler.js src/scheduler.js.backup

# Abrir editor
nano src/scheduler.js
```

**Adicione no final do arquivo (antes da última linha `module.exports`):**

```javascript
// Sincronizar pagamentos com Asaas — roda a cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
  try {
    const { getPayment } = require('../config/asaas');
    const { notifyPaymentConfirmed } = require('./config/email');

    console.log('💳 Sincronizando pagamentos com Asaas...');

    const { rows: pendingInvoices } = await execute(
      `SELECT i.id, i.user_id, i.subscription_id, i.plan_name, i.asaas_payment_id
       FROM dbguard_invoices i
       WHERE i.status = 'awaiting_payment'
       AND i.created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)
       LIMIT 100`
    );

    let processedCount = 0;
    for (const invoice of pendingInvoices) {
      try {
        const payment = await getPayment(invoice.asaas_payment_id);

        if (['RECEIVED', 'CONFIRMED'].includes(payment.status) && invoice.subscription_id) {
          console.log(`✅ Liberando espaço: ${invoice.asaas_payment_id} (${invoice.plan_name})`);

          await execute(
            `UPDATE dbguard_invoices SET status = 'paid', paid_at = NOW() WHERE id = ?`,
            [invoice.id]
          );

          await execute(
            `UPDATE dbguard_subscriptions
             SET status = 'active', expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY), grace_until = NULL, warned_at = NULL
             WHERE id = ?`,
            [invoice.subscription_id]
          );

          const { rows: users } = await execute(
            'SELECT name, email FROM dbguard_users WHERE id = ?',
            [invoice.user_id]
          );

          if (users.length && notifyPaymentConfirmed) {
            await notifyPaymentConfirmed({
              email: users[0].email,
              name: users[0].name,
              planName: invoice.plan_name
            });
          }

          await execute(
            `INSERT INTO dbguard_alerts (user_id, type, severity, message)
             VALUES (?, 'payment_confirmed', 'info', ?)`,
            [invoice.user_id, `Pagamento processado! Espaço liberado para ${invoice.plan_name}.`]
          );

          processedCount++;
        }
      } catch (err) {
        console.error(`⚠️  Erro ao sincronizar ${invoice.asaas_payment_id}: ${err.message}`);
      }
    }

    if (processedCount > 0) {
      console.log(`✅ ${processedCount} pagamento(s) processado(s) com sucesso`);
    }
  } catch (err) {
    console.error('Erro no scheduler de sincronização de pagamentos:', err.message);
  }
});
```

**Salvar:** `Ctrl + X` → `Y` → `Enter`

---

### Arquivo 2: Criar admin.js (NOVO)

```bash
nano src/routes/admin.js
```

**Cole o conteúdo completo abaixo:**

```javascript
const express = require('express');
const router = express.Router();
const { execute } = require('../config/database');
const auth = require('../middleware/auth');

const adminAuth = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas admins podem acessar' });
  }
  next();
};

// [ADMIN] Listar pagamentos pendentes
router.get('/pending-payments', auth, adminAuth, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT
        i.id as invoice_id,
        u.id as user_id,
        u.name,
        u.email,
        i.plan_name,
        i.value,
        i.due_date,
        i.status,
        i.created_at,
        s.status as subscription_status,
        i.asaas_payment_id
       FROM dbguard_invoices i
       JOIN dbguard_users u ON u.id = i.user_id
       LEFT JOIN dbguard_subscriptions s ON s.id = i.subscription_id
       WHERE i.status = 'awaiting_payment'
       ORDER BY i.created_at DESC
       LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar pagamentos:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// [ADMIN] Forçar liberação de espaço por invoice ID
router.post('/release-payment/:invoiceId', auth, adminAuth, async (req, res) => {
  const { invoiceId } = req.params;

  try {
    const { rows: invoices } = await execute(
      `SELECT id, user_id, subscription_id, plan_name, asaas_payment_id, status
       FROM dbguard_invoices WHERE id = ?`,
      [invoiceId]
    );

    if (!invoices.length) {
      return res.status(404).json({ error: 'Fatura não encontrada' });
    }

    const invoice = invoices[0];

    if (invoice.status === 'paid') {
      return res.status(400).json({ error: 'Fatura já foi processada como paga' });
    }

    if (!invoice.subscription_id) {
      return res.status(400).json({ error: 'Fatura não tem subscription associada' });
    }

    await execute(
      `UPDATE dbguard_invoices SET status = 'paid', paid_at = NOW() WHERE id = ?`,
      [invoiceId]
    );

    await execute(
      `UPDATE dbguard_subscriptions
       SET status = 'active', expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY), grace_until = NULL, warned_at = NULL
       WHERE id = ?`,
      [invoice.subscription_id]
    );

    await execute(
      `INSERT INTO dbguard_alerts (user_id, type, severity, message)
       VALUES (?, 'payment_confirmed', 'info', ?)`,
      [invoice.user_id, `Pagamento liberado manualmente por admin. Espaço disponível para ${invoice.plan_name}.`]
    );

    await execute(
      `INSERT INTO dbguard_audit_logs (user_id, event_type, description, metadata)
       VALUES (?, 'manual_payment_release', ?, ?)`,
      [req.user.id, `Liberação manual de pagamento por admin`,
       JSON.stringify({
         invoice_id: invoiceId,
         asaas_payment_id: invoice.asaas_payment_id,
         plan_name: invoice.plan_name,
         target_user_id: invoice.user_id
       })]
    );

    res.json({
      message: 'Espaço liberado com sucesso',
      invoice_id: invoiceId,
      plan_name: invoice.plan_name,
      user_id: invoice.user_id
    });
  } catch (err) {
    console.error('Erro ao liberar pagamento:', err.message);
    res.status(500).json({ error: 'Erro ao liberar espaço' });
  }
});

// [ADMIN] Sincronizar pagamento específico com Asaas
router.post('/sync-payment/:asaasPaymentId', auth, adminAuth, async (req, res) => {
  const { asaasPaymentId } = req.params;

  try {
    const { getPayment } = require('../../config/asaas');

    const payment = await getPayment(asaasPaymentId);

    const { rows: invoices } = await execute(
      `SELECT i.id, i.status, s.status as subscription_status
       FROM dbguard_invoices i
       LEFT JOIN dbguard_subscriptions s ON s.id = i.subscription_id
       WHERE i.asaas_payment_id = ?`,
      [asaasPaymentId]
    );

    if (!invoices.length) {
      return res.status(404).json({ error: 'Fatura não encontrada no BD local' });
    }

    const invoice = invoices[0];

    res.json({
      payment: {
        id: payment.id,
        status: payment.status,
        value: payment.value,
        dueDate: payment.dueDate
      },
      local_status: {
        invoice_status: invoice.status,
        subscription_status: invoice.subscription_status
      },
      sync_needed: payment.status === 'RECEIVED' && invoice.status === 'awaiting_payment'
    });
  } catch (err) {
    console.error('Erro ao sincronizar:', err.message);
    res.status(500).json({ error: err.message || 'Erro ao buscar pagamento' });
  }
});

// [ADMIN] Monitoramento de webhooks
router.get('/webhook-status', auth, adminAuth, async (req, res) => {
  try {
    const { rows: recentWebhooks } = await execute(
      `SELECT event_type, COUNT(*) as count, MAX(processed_at) as last_received
       FROM dbguard_webhook_events
       WHERE provider = 'asaas'
       AND processed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY event_type
       ORDER BY last_received DESC`
    );

    const { rows: failedInvoices } = await execute(
      `SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as last_7_days,
        COUNT(CASE WHEN created_at > DATE_SUB(NOW(), INTERVAL 1 DAY) THEN 1 END) as last_24_hours
       FROM dbguard_invoices
       WHERE status = 'awaiting_payment'
       AND created_at > DATE_SUB(NOW(), INTERVAL 90 DAY)`
    );

    res.json({
      webhook_events_24h: recentWebhooks,
      pending_invoices: failedInvoices[0] || { total: 0 }
    });
  } catch (err) {
    console.error('Erro ao buscar status:', err.message);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

module.exports = router;
```

**Salvar:** `Ctrl + X` → `Y` → `Enter`

---

### Arquivo 3: Atualizar index.js

```bash
nano src/index.js
```

**Procure pela linha (Ctrl + W):**
```
app.use('/api/webhooks',  require('./routes/webhooks'));
```

**Logo após essa linha, adicione:**
```javascript
app.use('/api/admin',     require('./routes/admin'));
```

**Salvar:** `Ctrl + X` → `Y` → `Enter`

---

## 🔄 Passo 2: Reiniciar Aplicação

```bash
pm2 restart all
```

**Ou:**
```bash
systemctl restart guardsaas
```

---

## ✅ Passo 3: Validar

```bash
# Ver logs
pm2 logs guardsaas | head -50
```

**Deve mostrar:**
```
⏰ Scheduler iniciado
💳 Sincronizando pagamentos com Asaas...
```

---

## 🎯 Passo 4: Testar Endpoints

### Listar pagamentos pendentes:
```bash
curl http://localhost:4000/api/admin/pending-payments \
  -H "Authorization: Bearer {seu_token_admin}" | jq
```

### Liberar espaço (se necessário):
```bash
curl -X POST http://localhost:4000/api/admin/release-payment/123 \
  -H "Authorization: Bearer {seu_token_admin}"
```

---

## 🆘 Se der erro

### Erro: "Cannot find module"
```bash
cd /home/guardsaas/backend
npm install
```

### Erro: "Port already in use"
```bash
pm2 kill
pm2 start ecosystem.config.js
```

### Erro: "Database connection"
```bash
mysql -u root -p
# Verifique se BD está rodando
```

---

## 💾 Fazer Commit (Opcional)

```bash
cd /home/guardsaas
git add -A
git commit -m "Implementar scheduler de sincronização de pagamentos e endpoints admin"
git push origin main
```

---

## 🎉 Pronto!

Sistema agora tem:
- ✅ Liberação automática a cada 15 minutos
- ✅ Endpoints admin para liberar manualmente
- ✅ Monitoramento de webhooks

**Próximo:** Recuperar caso "cupper store"

```bash
# Encontrar invoice
mysql -u root -p dbguard -e "SELECT id FROM dbguard_invoices WHERE status = 'awaiting_payment' LIMIT 1;"

# Liberar (substitua 123 pelo ID)
curl -X POST http://localhost:4000/api/admin/release-payment/123 \
  -H "Authorization: Bearer {seu_token_admin}"
```

---

**Total de tempo:** ~5 minutos ⏱️
