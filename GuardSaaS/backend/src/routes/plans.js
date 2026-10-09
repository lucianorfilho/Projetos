const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');
const {
  findOrCreateCustomer,
  createSubscription,
  cancelSubscription,
  listPaymentsForSubscription,
  getPixQrCode
} = require('../../config/asaas');
const { notifyPaymentPending } = require('../config/email');

// Lista de planos ativos — visível para admin e clientes (dados de preço, não sensíveis)
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await execute(
      `SELECT id, name, price, storage_limit_gb, max_files, backup_retention_days
       FROM dbguard_plans WHERE status = 'active' ORDER BY price ASC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Cliente solicita troca de plano — planos pagos criam uma assinatura recorrente no Asaas
router.post('/request', auth, async (req, res) => {
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Apenas clientes podem solicitar troca de plano' });
  }
  const { plan_id, message, cpf_cnpj } = req.body;
  if (!plan_id) return res.status(400).json({ error: 'ID do plano obrigatório' });

  try {
    const { rows: planRows } = await execute('SELECT id, name, price FROM dbguard_plans WHERE id = ?', [plan_id]);
    if (!planRows.length) return res.status(404).json({ error: 'Plano não encontrado' });
    const plan = planRows[0];

    const { rows: subRows } = await execute(
      `SELECT s.id, s.asaas_subscription_id, p.name AS plan_name
       FROM dbguard_subscriptions s JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE s.user_id = ? AND s.status = 'active' LIMIT 1`,
      [req.user.id]
    );
    const activeSub = subRows.length ? subRows[0] : null;
    const currentPlanName = activeSub ? activeSub.plan_name : 'Free';

    if (currentPlanName === plan.name) {
      return res.status(400).json({ error: 'Você já está neste plano' });
    }

    // Plano gratuito: sem cobrança, segue o fluxo antigo de aprovação manual
    if (Number(plan.price) <= 0) {
      await execute(
        `INSERT INTO dbguard_plan_requests (user_id, current_plan_name, requested_plan_id, requested_plan_name, message, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [req.user.id, currentPlanName, plan_id, plan.name, message || null]
      );
      await execute(
        `INSERT INTO dbguard_alerts (user_id, type, severity, message)
         VALUES (?, 'plan_request', 'info', ?)`,
        [req.user.id, `${req.user.name} solicitou troca do plano ${currentPlanName} para ${plan.name}${message ? ': ' + message : ''}`]
      );
      return res.status(201).json({ message: 'Solicitação enviada! Nossa equipe entrará em contato em breve.' });
    }

    // Plano pago: exige CPF/CNPJ pra cadastrar o cliente cobrado no Asaas
    const { rows: userRows } = await execute(
      'SELECT id, name, email, phone, cpf_cnpj, asaas_customer_id FROM dbguard_users WHERE id = ?',
      [req.user.id]
    );
    const user = userRows[0];
    const document = (cpf_cnpj || user.cpf_cnpj || '').replace(/\D/g, '');
    if (document.length !== 11 && document.length !== 14) {
      return res.status(400).json({ error: 'Informe um CPF ou CNPJ válido para gerar a cobrança', requires_document: true });
    }

    if (!user.cpf_cnpj || user.cpf_cnpj.replace(/\D/g, '') !== document) {
      await execute('UPDATE dbguard_users SET cpf_cnpj = ? WHERE id = ?', [document, user.id]);
    }

    let customerId = user.asaas_customer_id;
    if (!customerId) {
      customerId = await findOrCreateCustomer({
        userId: user.id, name: user.name, email: user.email, cpfCnpj: document, phone: user.phone
      });
      await execute('UPDATE dbguard_users SET asaas_customer_id = ? WHERE id = ?', [customerId, user.id]);
    }

    // Troca de plano pago: cancela a assinatura anterior antes de criar a nova
    if (activeSub && activeSub.asaas_subscription_id) {
      try {
        await cancelSubscription(activeSub.asaas_subscription_id);
      } catch (cancelErr) {
        console.error('Erro ao cancelar assinatura anterior no Asaas:', cancelErr.response?.data || cancelErr.message);
      }
      // Marcar subscrição anterior como expired para ela não aparecer mais
      await execute(
        `UPDATE dbguard_subscriptions SET status = 'expired' WHERE id = ?`,
        [activeSub.id]
      );
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 3);
    const dueDateStr = nextDueDate.toISOString().slice(0, 10);

    const subscription = await createSubscription({
      customerId,
      value: Number(plan.price),
      nextDueDate: dueDateStr,
      description: `DBVault - Plano ${plan.name}`,
      externalReference: `user_${user.id}`
    });

    let subscriptionRowId;
    if (activeSub) {
      await execute(
        `UPDATE dbguard_subscriptions SET plan_id = ?, asaas_subscription_id = ?, status = 'pending_payment' WHERE id = ?`,
        [plan_id, subscription.id, activeSub.id]
      );
      subscriptionRowId = activeSub.id;
    } else {
      const { rows: insertSub } = await execute(
        `INSERT INTO dbguard_subscriptions (user_id, plan_id, status, asaas_subscription_id) VALUES (?, ?, 'pending_payment', ?)`,
        [user.id, plan_id, subscription.id]
      );
      subscriptionRowId = insertSub.insertId;
    }

    const payments = await listPaymentsForSubscription(subscription.id);
    const firstPayment = payments[0];
    if (!firstPayment) throw new Error('Assinatura criada, mas nenhuma cobrança foi gerada pelo Asaas');

    const pix = await getPixQrCode(firstPayment.id).catch(() => null);
    const boletoUrl = firstPayment.invoiceUrl || firstPayment.bankSlipUrl;

    await execute(
      `INSERT INTO dbguard_invoices
         (user_id, subscription_id, plan_id, plan_name, asaas_subscription_id, asaas_payment_id, value, status, boleto_url, pix_payload, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'awaiting_payment', ?, ?, ?)`,
      [user.id, subscriptionRowId, plan_id, plan.name, subscription.id, firstPayment.id, plan.price, boletoUrl, pix?.payload || null, dueDateStr]
    );

    await execute(
      `INSERT INTO dbguard_alerts (user_id, type, severity, message)
       VALUES (?, 'payment_pending', 'warning', ?)`,
      [req.user.id, `Pagamento pendente para o plano ${plan.name}. Verifique seu email para o boleto e o código Pix.`]
    );

    notifyPaymentPending({
      email: user.email,
      name: user.name,
      planName: plan.name,
      value: plan.price,
      dueDate: dueDateStr,
      boletoUrl,
      pixPayload: pix?.payload || 'Código Pix indisponível no momento — use o link do boleto para pagar.'
    });

    res.status(201).json({
      message: 'Assinatura criada! Verifique seu email para o boleto e o código Pix da primeira fatura.',
      payment_status: 'awaiting_payment',
      boleto_url: boletoUrl,
      pix_payload: pix?.payload || null,
      due_date: dueDateStr
    });
  } catch (err) {
    console.error('Erro ao criar assinatura de plano:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao gerar cobrança. Tente novamente em instantes.' });
  }
});

module.exports = router;
