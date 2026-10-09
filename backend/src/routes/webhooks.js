const express = require('express');
const router = express.Router();
const { execute } = require('../config/database');
const { getPixQrCode } = require('../../config/asaas');
const { notifyPaymentPending, notifyPaymentConfirmed } = require('../config/email');

const PAID_EVENTS = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'];

router.post('/asaas', async (req, res) => {
  const token = req.headers['asaas-access-token'];
  if (!token || token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const body = req.body || {};
  const eventType = body.event;
  const payment = body.payment;
  const eventId = body.id || `${eventType}:${payment?.id}:${payment?.status}`;

  // Idempotência: se já processamos este evento, confirma sem reprocessar
  try {
    await execute(
      `INSERT INTO dbguard_webhook_events (provider, event_id, event_type, payload) VALUES ('asaas', ?, ?, ?)`,
      [eventId, eventType || null, JSON.stringify(body)]
    );
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(200).json({ message: 'Evento já processado' });
    }
    console.error('Erro ao registrar evento de webhook:', err.message);
    return res.status(500).json({ error: 'Erro interno' });
  }

  try {
    if (payment) {
      if (eventType === 'PAYMENT_CREATED') {
        await handlePaymentCreated(payment);
      } else if (PAID_EVENTS.includes(eventType)) {
        await handlePaymentConfirmed(payment);
      } else if (eventType === 'PAYMENT_OVERDUE') {
        await handlePaymentOverdue(payment);
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Erro ao processar webhook Asaas:', err.message);
    // Responde 200 mesmo em erro de processamento pra evitar retries infinitos do Asaas;
    // o evento já foi registrado em dbguard_webhook_events pra investigação manual.
    res.status(200).json({ received: true, warning: 'Erro ao processar, verifique os logs' });
  }
});

// Nova cobrança gerada pra uma assinatura — pode ser a 1ª (já registrada em plans.js,
// ignoramos aqui) ou um ciclo mensal novo que o Asaas gerou sozinho (registramos e avisamos)
async function handlePaymentCreated(payment) {
  if (!payment.subscription) return;

  const { rows: existing } = await execute(
    'SELECT id FROM dbguard_invoices WHERE asaas_payment_id = ?', [payment.id]
  );
  if (existing.length) return;

  const { rows: subRows } = await execute(
    `SELECT s.id, s.user_id, s.plan_id, p.name AS plan_name, u.name AS user_name, u.email
     FROM dbguard_subscriptions s
     JOIN dbguard_plans p ON p.id = s.plan_id
     JOIN dbguard_users u ON u.id = s.user_id
     WHERE s.asaas_subscription_id = ?`,
    [payment.subscription]
  );
  if (!subRows.length) return;
  const sub = subRows[0];

  const pix = await getPixQrCode(payment.id).catch(() => null);
  const boletoUrl = payment.invoiceUrl || payment.bankSlipUrl;

  await execute(
    `INSERT INTO dbguard_invoices
       (user_id, subscription_id, plan_id, plan_name, asaas_subscription_id, asaas_payment_id, value, status, boleto_url, pix_payload, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, ?)`,
    [sub.user_id, sub.id, sub.plan_id, sub.plan_name, payment.subscription, payment.id, payment.value, boletoUrl, pix?.payload || null, payment.dueDate]
  );

  await execute(
    `INSERT INTO dbguard_alerts (user_id, type, severity, message)
     VALUES (?, 'payment_pending', 'warning', ?)`,
    [sub.user_id, `Nova fatura do plano ${sub.plan_name} disponível. Verifique seu email para o boleto e o código Pix.`]
  );

  notifyPaymentPending({
    email: sub.email,
    name: sub.user_name,
    planName: sub.plan_name,
    value: payment.value,
    dueDate: payment.dueDate,
    boletoUrl,
    pixPayload: pix?.payload || 'Código Pix indisponível no momento — use o link do boleto para pagar.'
  });
}

async function handlePaymentConfirmed(payment) {
  const { rows } = await execute(
    `SELECT id, user_id, subscription_id, plan_id, plan_name, due_date
     FROM dbguard_invoices WHERE asaas_payment_id = ? AND status != 'paid'`,
    [payment.id]
  );
  if (!rows.length) return;
  const invoice = rows[0];

  await execute(`UPDATE dbguard_invoices SET status = 'paid', paid_at = NOW() WHERE id = ?`, [invoice.id]);

  const { rows: userRows } = await execute('SELECT id, name, email FROM dbguard_users WHERE id = ?', [invoice.user_id]);
  if (!userRows.length) return;
  const user = userRows[0];

  if (invoice.subscription_id) {
    await execute(
      `UPDATE dbguard_subscriptions
       SET plan_id = ?, status = 'active', expires_at = DATE_ADD(?, INTERVAL 30 DAY), grace_until = NULL, warned_at = NULL
       WHERE id = ?`,
      [invoice.plan_id, invoice.due_date, invoice.subscription_id]
    );
  }

  await execute(
    `INSERT INTO dbguard_alerts (user_id, type, severity, message)
     VALUES (?, 'payment_confirmed', 'info', ?)`,
    [user.id, `Pagamento confirmado! Espaço liberado para o plano ${invoice.plan_name}.`]
  );

  await execute(
    `INSERT INTO dbguard_audit_logs (user_id, event_type, description, metadata)
     VALUES (?, 'plan_change', ?, ?)`,
    [user.id, `Pagamento confirmado via Asaas - plano ${invoice.plan_name}`,
     JSON.stringify({ asaas_payment_id: payment.id, plan_id: invoice.plan_id, plan_name: invoice.plan_name })]
  );

  notifyPaymentConfirmed({ email: user.email, name: user.name, planName: invoice.plan_name });
}

async function handlePaymentOverdue(payment) {
  const { rows } = await execute(
    `SELECT id, user_id, plan_name FROM dbguard_invoices
     WHERE asaas_payment_id = ? AND status = 'awaiting_payment'`,
    [payment.id]
  );
  if (!rows.length) return;
  const invoice = rows[0];

  await execute(`UPDATE dbguard_invoices SET status = 'overdue' WHERE id = ?`, [invoice.id]);

  await execute(
    `INSERT INTO dbguard_alerts (user_id, type, severity, message)
     VALUES (?, 'payment_overdue', 'error', ?)`,
    [invoice.user_id, `A fatura do plano ${invoice.plan_name} venceu sem pagamento. Regularize para evitar a suspensão da conta.`]
  );
}

module.exports = router;
