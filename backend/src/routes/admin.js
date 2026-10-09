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

// [ADMIN] Listar alertas críticos do sistema
router.get('/system-alerts', auth, adminAuth, async (req, res) => {
  try {
    const { rows: alerts } = await execute(
      `SELECT
        id,
        type,
        severity,
        message,
        created_at,
        is_read
       FROM dbguard_alerts
       WHERE type IN ('payment_sync_failure', 'webhook_error', 'payment_overdue')
       ORDER BY severity DESC, created_at DESC
       LIMIT 50`
    );

    const { rows: stats } = await execute(
      `SELECT
        COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_count,
        COUNT(CASE WHEN severity = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warning_count,
        COUNT(CASE WHEN is_read = 0 THEN 1 END) as unread_count
       FROM dbguard_alerts
       WHERE type IN ('payment_sync_failure', 'webhook_error', 'payment_overdue')`
    );

    res.json({
      alerts,
      stats: stats[0] || { critical_count: 0, error_count: 0, warning_count: 0, unread_count: 0 }
    });
  } catch (err) {
    console.error('Erro ao buscar alertas:', err.message);
    res.status(500).json({ error: 'Erro ao buscar alertas' });
  }
});

// [ADMIN] Dashboard de saúde do sistema
router.get('/system-health', auth, adminAuth, async (req, res) => {
  try {
    const { rows: health } = await execute(
      `SELECT
        (SELECT COUNT(*) FROM dbguard_invoices WHERE status = 'awaiting_payment' AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)) as overdue_payments,
        (SELECT COUNT(*) FROM dbguard_invoices WHERE status = 'awaiting_payment') as total_pending,
        (SELECT COUNT(*) FROM dbguard_invoices WHERE status = 'paid' AND paid_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)) as processed_24h,
        (SELECT COUNT(*) FROM dbguard_webhook_events WHERE provider = 'asaas' AND processed_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)) as webhooks_1h,
        (SELECT MAX(processed_at) FROM dbguard_webhook_events WHERE provider = 'asaas') as last_webhook
       FROM DUAL`
    );

    const data = health[0];
    const status = data.overdue_payments === 0 ? 'healthy' : 'warning';

    res.json({
      status,
      overdue_payments: data.overdue_payments,
      total_pending: data.total_pending,
      processed_24h: data.processed_24h,
      webhooks_1h: data.webhooks_1h,
      last_webhook: data.last_webhook,
      recommendation: data.overdue_payments > 0
        ? 'Há pagamentos não sincronizados. Verifique Asaas e webhooks.'
        : 'Sistema operacional normalmente'
    });
  } catch (err) {
    console.error('Erro ao buscar saúde do sistema:', err.message);
    res.status(500).json({ error: 'Erro ao buscar status do sistema' });
  }
});

// [ADMIN] Marcar alerta como lido
router.put('/alerts/:alertId/mark-read', auth, adminAuth, async (req, res) => {
  const { alertId } = req.params;

  try {
    await execute(
      `UPDATE dbguard_alerts SET is_read = 1 WHERE id = ?`,
      [alertId]
    );

    res.json({ message: 'Alerta marcado como lido' });
  } catch (err) {
    console.error('Erro ao marcar alerta:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar alerta' });
  }
});

module.exports = router;
