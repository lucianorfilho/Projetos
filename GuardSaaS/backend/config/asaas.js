const axios = require('axios');

const BASE_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

function client() {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
      access_token: process.env.ASAAS_API_KEY
    }
  });
}

// Reaproveita o customer existente pelo e-mail, ou cria um novo no Asaas
async function findOrCreateCustomer({ userId, name, email, cpfCnpj, phone }) {
  const http = client();

  const { data: found } = await http.get('/customers', { params: { email } });
  if (found.data && found.data.length) return found.data[0].id;

  const { data: created } = await http.post('/customers', {
    name,
    email,
    cpfCnpj,
    phone: phone || undefined,
    externalReference: String(userId)
  });
  return created.id;
}

// Cria assinatura recorrente — o Asaas gera uma cobrança nova a cada ciclo sozinho
async function createSubscription({ customerId, value, nextDueDate, description, externalReference }) {
  const http = client();
  const { data } = await http.post('/subscriptions', {
    customer: customerId,
    billingType: 'BOLETO',
    cycle: 'MONTHLY',
    value,
    nextDueDate,
    description,
    externalReference
  });
  return data;
}

// Cobrança avulsa (não-recorrente) — usada pra unificar faturas atrasadas num único boleto
async function createPayment({ customerId, value, dueDate, description, externalReference }) {
  const http = client();
  const { data } = await http.post('/payments', {
    customer: customerId,
    billingType: 'BOLETO',
    value,
    dueDate,
    description,
    externalReference
  });
  return data;
}

async function cancelSubscription(subscriptionId) {
  const http = client();
  await http.delete(`/subscriptions/${subscriptionId}`);
}

// Busca as cobranças geradas por uma assinatura (usado pra pegar a 1ª fatura logo após criar)
async function listPaymentsForSubscription(subscriptionId) {
  const http = client();
  const { data } = await http.get('/payments', { params: { subscription: subscriptionId } });
  return data.data || [];
}

// Boleto do Asaas já vem com o QR Code Pix associado
async function getPixQrCode(paymentId) {
  const http = client();
  const { data } = await http.get(`/payments/${paymentId}/pixQrCode`);
  return data;
}

async function getPayment(paymentId) {
  const http = client();
  const { data } = await http.get(`/payments/${paymentId}`);
  return data;
}

// Checagem leve de conectividade/credencial - usada pelo monitor de integração
async function checkHealth() {
  const http = client();
  const start = Date.now();
  try {
    await http.get('/finance/balance');
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      status: err.response?.status,
      error: err.response?.data?.errors?.[0]?.description || err.message,
    };
  }
}

module.exports = {
  findOrCreateCustomer,
  createSubscription,
  createPayment,
  cancelSubscription,
  listPaymentsForSubscription,
  getPixQrCode,
  getPayment,
  checkHealth
};
