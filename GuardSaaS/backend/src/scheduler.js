const cron = require('node-cron');
const { DateTime } = require('luxon');
const { execute } = require('./config/database');
const { notifyPlanExpiring, notifyPlanExpired } = require('./config/email');
const { cleanupExpiredBackups } = require('./services/storageQuota');
require('dotenv').config();

console.log('⏰ Scheduler iniciado');

cron.schedule('* * * * *', async () => {
  try {
    const { rows: schedules } = await execute(
      `SELECT sc.*, s.agent_token, s.name AS server_name,
              s.timezone, s.ip_address, u.email AS user_email
       FROM dbguard_schedules sc
       JOIN dbguard_servers s ON s.id = sc.server_id
       JOIN dbguard_users u ON u.id = sc.user_id
       WHERE sc.is_active = 1 AND u.status = 'active'`
    );

    for (const schedule of schedules) {
      const tz = schedule.timezone || 'America/Sao_Paulo';
      const clientNow = DateTime.now().setZone(tz);

      const currentHour    = clientNow.hour;
      const currentMinute  = clientNow.minute;
      const currentWeekday = clientNow.weekday % 7; // luxon: 1=Mon, 7=Sun → 0=Sun
      const currentMonthday = clientNow.day;

      if (schedule.hour !== currentHour || schedule.minute !== currentMinute) continue;

      let shouldRun = false;
      if (schedule.frequency === 'daily') {
        shouldRun = true;
      } else if (schedule.frequency === 'weekly') {
        shouldRun = schedule.weekday === currentWeekday;
      } else if (schedule.frequency === 'monthly') {
        shouldRun = schedule.monthday === currentMonthday;
      }

      if (!shouldRun) continue;

      console.log(`🚀 Disparando backup: ${schedule.name} (${tz} ${clientNow.toFormat('HH:mm')})`);
      await triggerBackup(schedule);
    }
  } catch (err) {
    console.error('Erro no scheduler:', err.message);
  }
});

async function triggerBackup(schedule) {
  try {
    await execute(
      `INSERT INTO dbguard_backup_jobs
         (server_id, user_id, job_name, backup_type, status, started_at)
       VALUES (?, ?, ?, 'files', 'pending', NOW())`,
      [schedule.server_id, schedule.user_id, schedule.name]
    );

    await execute(
      'UPDATE dbguard_schedules SET last_run_at = NOW() WHERE id = ?',
      [schedule.id]
    );

    console.log(`✅ Job criado para: ${schedule.name}`);
  } catch (err) {
    console.error(`❌ Erro ao criar job: ${err.message}`);
  }
}

// Verificar vencimento de planos — roda todos os dias à meia-noite
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('🔔 Verificando vencimento de planos...');
    const now = DateTime.now().toJSDate();
    const threeDaysFromNow = DateTime.now().plus({ days: 3 }).toJSDate();
    const threeDaysAgo = DateTime.now().minus({ days: 3 }).toJSDate();

    // 1. Avisar clientes que plano vence em 3 dias
    const { rows: expiringSoon } = await execute(
      `SELECT s.id, s.user_id, s.expires_at, u.name, u.email, p.name AS plan_name
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       JOIN dbguard_plans p ON p.id = s.plan_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND DATE(s.expires_at) = DATE(?)
       AND s.warned_at IS NULL`,
      [threeDaysFromNow]
    );

    for (const sub of expiringSoon) {
      try {
        // Enviar email de aviso
        if (notifyPlanExpiring) {
          notifyPlanExpiring({ email: sub.email, name: sub.name, plan: sub.plan_name, expires_at: sub.expires_at });
        }
        // Marcar como avisado
        await execute('UPDATE dbguard_subscriptions SET warned_at = NOW() WHERE id = ?', [sub.id]);
        console.log(`📧 Aviso de vencimento enviado para ${sub.email}`);
      } catch (err) {
        console.error(`Erro ao notificar ${sub.email}:`, err.message);
      }
    }

    // 2. Inativar contas que venceram há 3+ dias (período de graça expirou)
    const { rows: expiredAccounts } = await execute(
      `SELECT s.id, s.user_id, u.name, u.email
       FROM dbguard_subscriptions s
       JOIN dbguard_users u ON u.id = s.user_id
       WHERE s.status = 'active'
       AND s.expires_at IS NOT NULL
       AND s.expires_at <= ?
       AND (s.grace_until IS NULL OR s.grace_until <= ?)`,
      [threeDaysAgo, now]
    );

    for (const sub of expiredAccounts) {
      try {
        // Inativar conta
        await execute("UPDATE dbguard_users SET status = 'inactive' WHERE id = ?", [sub.user_id]);
        // Marcar assinatura como expirada
        await execute("UPDATE dbguard_subscriptions SET status = 'expired' WHERE id = ?", [sub.id]);

        // Enviar email notificando
        if (notifyPlanExpired) {
          notifyPlanExpired({ email: sub.email, name: sub.name });
        }

        console.log(`🚫 Conta inativada por vencimento: ${sub.email}`);
      } catch (err) {
        console.error(`Erro ao inativar ${sub.email}:`, err.message);
      }
    }

    console.log('✅ Verificação de vencimento concluída');
  } catch (err) {
    console.error('Erro no scheduler de vencimento:', err.message);
  }
});

// Sincronizar pagamentos com Asaas — roda a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    const { getPayment, checkHealth } = require('../config/asaas');
    const { notifyPaymentConfirmed } = require('./config/email');

    // Checagem de saúde da integração Asaas - alerta (sem spam) se a API não responder
    const health = await checkHealth();
    if (!health.ok) {
      console.error(`🚨 Integração Asaas fora do ar: ${health.error}`);
      const { rows: recentAlert } = await execute(
        `SELECT id FROM dbguard_alerts
         WHERE type = 'asaas_integration_down' AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
         LIMIT 1`
      );
      if (!recentAlert.length) {
        await execute(
          `INSERT INTO dbguard_alerts (type, severity, message)
           VALUES ('asaas_integration_down', 'critical', ?)`,
          [`🚨 Integração com o Asaas está fora do ar: ${health.error}. Pagamentos não serão sincronizados até normalizar.`]
        ).catch((e) => console.error('Erro ao registrar alerta de Asaas:', e.message));
      }
      return; // sem Asaas respondendo, não adianta tentar sincronizar faturas
    }

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

    // Verificar se há pagamentos pendentes há mais de 30 minutos
    if (pendingInvoices.length > 0) {
      const { rows: oldPending } = await execute(
        `SELECT COUNT(*) as count FROM dbguard_invoices
         WHERE status = 'awaiting_payment'
         AND created_at < DATE_SUB(NOW(), INTERVAL 30 MINUTE)`
      );

      if (oldPending[0].count > 0) {
        console.error(`🚨 ALERTA: ${oldPending[0].count} pagamento(s) pendente(s) há mais de 30 minutos!`);

        // Criar alerta para admin
        await execute(
          `INSERT INTO dbguard_alerts (type, severity, message)
           SELECT 'payment_sync_failure', 'critical',
           CONCAT('⚠️ ', ?, ' pagamento(s) não sincronizado(s) há 30+ minutos. Verifique Asaas e webhooks.')`,
          [oldPending[0].count]
        ).catch(err => console.error('Erro ao registrar alerta:', err.message));
      }
    }
  } catch (err) {
    console.error('Erro no scheduler de sincronização de pagamentos:', err.message);
  }
});

// Limpar backups expirados — roda a cada hora
cron.schedule('0 * * * *', async () => {
  try {
    console.log('🗑️  Iniciando limpeza de backups expirados...');
    const result = await cleanupExpiredBackups();

    if (result.success) {
      console.log(`✅ Limpeza concluída. ${result.deletedCount} arquivo(s) removido(s)`);
    } else {
      console.error(`❌ Erro durante limpeza: ${result.error}`);
    }
  } catch (err) {
    console.error('Erro no scheduler de limpeza:', err.message);
  }
});

module.exports = { triggerBackup };
