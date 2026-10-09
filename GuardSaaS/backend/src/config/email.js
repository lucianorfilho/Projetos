const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({
      from: `"DBVault" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`✅ Email enviado para ${to}`);
  } catch (err) {
    console.error('❌ Erro ao enviar email:', err.message);
  }
}

async function notifyNewClient(client) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: '🔔 DBVault — Novo cadastro aguardando aprovação',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Novo cliente aguardando aprovação</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px;color:#64748b">Nome:</td><td style="padding:8px;font-weight:bold">${client.name}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Email:</td><td style="padding:8px">${client.email}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Empresa:</td><td style="padding:8px">${client.company || '—'}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Telefone:</td><td style="padding:8px">${client.phone || '—'}</td></tr>
          </table>
          <a href="${process.env.APP_URL}/admin" style="display:inline-block;margin-top:20px;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Aprovar no Painel Admin
          </a>
        </div>
      </div>
    `
  });
}

async function notifyClientApproved(client) {
  await sendEmail({
    to: client.email,
    subject: '✅ DBVault — Sua conta foi aprovada!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${client.name}!</h2>
          <p style="color:#475569">Sua conta foi aprovada e está pronta para uso.</p>
          <p style="color:#475569">Acesse a plataforma e configure seus primeiros backups:</p>
          <a href="${process.env.APP_URL}/login" style="display:inline-block;margin-top:20px;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Acessar DBVault
          </a>
          <p style="color:#94a3b8;margin-top:20px;font-size:14px">
            Você possui <strong>2GB de storage gratuito</strong> para começar.
          </p>
        </div>
      </div>
    `
  });
}

async function notifyPlanExpiring(data) {
  const { email, name, plan, expires_at } = data;
  const expiresDate = new Date(expires_at).toLocaleDateString('pt-BR');

  await sendEmail({
    to: email,
    subject: '⏰ DBVault — Seu plano vence em 3 dias',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#ea580c;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${name}!</h2>
          <p style="color:#dc2626">Seu plano <strong>${plan}</strong> vence em 3 dias (${expiresDate}).</p>
          <p style="color:#475569">Para não perder acesso aos seus backups, realize o pagamento antes dessa data.</p>
          <p style="color:#0f766e">Após o vencimento, você terá um período de graça de 3 dias para regularizar o pagamento.</p>
          <a href="${process.env.APP_URL}/billing" style="display:inline-block;margin-top:20px;background:#ea580c;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Renovar Plano
          </a>
        </div>
      </div>
    `
  });
}

async function notifyPlanExpired(data) {
  const { email, name } = data;

  await sendEmail({
    to: email,
    subject: '🚫 DBVault — Sua conta foi inativada',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#dc2626;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${name}!</h2>
          <p style="color:#dc2626">Sua conta foi <strong>inativada</strong> devido ao vencimento do plano.</p>
          <p style="color:#475569">Seus dados estão seguros e armazenados no OCI Object Storage.</p>
          <p style="color:#0f766e">Para reativar sua conta, entre em contato com o suporte ou renove seu plano.</p>
          <a href="${process.env.APP_URL}/contact-support" style="display:inline-block;margin-top:20px;background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Contatar Suporte
          </a>
        </div>
      </div>
    `
  });
}

async function notifyPaymentPending(data) {
  const { email, name, planName, value, dueDate, boletoUrl, pixPayload } = data;
  const dueDateFmt = new Date(dueDate).toLocaleDateString('pt-BR');
  const valueFmt = Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  await sendEmail({
    to: email,
    subject: '💳 DBVault — Pagamento pendente para concluir a troca de plano',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1e40af;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${name}!</h2>
          <p style="color:#475569">Sua solicitação de troca para o plano <strong>${planName}</strong> (${valueFmt}/mês) foi registrada. Para liberar o espaço, conclua o pagamento até <strong>${dueDateFmt}</strong>.</p>
          <a href="${boletoUrl}" style="display:inline-block;margin-top:16px;background:#1e40af;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Ver boleto e pagar
          </a>
          <p style="color:#475569;margin-top:24px">Prefere Pix? Copie o código abaixo e cole no app do seu banco:</p>
          <div style="background:#e2e8f0;padding:12px;border-radius:6px;word-break:break-all;font-family:monospace;font-size:12px;color:#1e293b">
            ${pixPayload}
          </div>
          <p style="color:#0f766e;margin-top:20px">Assim que o pagamento for confirmado, o espaço do novo plano é liberado automaticamente e você recebe um aviso no painel.</p>
        </div>
      </div>
    `
  });
}

async function notifyPaymentConfirmed(data) {
  const { email, name, planName } = data;

  await sendEmail({
    to: email,
    subject: '✅ DBVault — Pagamento confirmado! Espaço liberado',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#16a34a;padding:20px;border-radius:8px 8px 0 0">
          <h1 style="color:white;margin:0">DBVault</h1>
        </div>
        <div style="background:#f8fafc;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">
          <h2 style="color:#1e293b">Olá, ${name}!</h2>
          <p style="color:#16a34a">Recebemos a confirmação do seu pagamento e o plano <strong>${planName}</strong> já está ativo.</p>
          <p style="color:#475569">O novo espaço de armazenamento foi liberado na sua conta.</p>
          <a href="${process.env.APP_URL}/storage" style="display:inline-block;margin-top:20px;background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">
            Acessar DBVault
          </a>
        </div>
      </div>
    `
  });
}

module.exports = { sendEmail, notifyNewClient, notifyClientApproved, notifyPlanExpiring, notifyPlanExpired, notifyPaymentPending, notifyPaymentConfirmed };
