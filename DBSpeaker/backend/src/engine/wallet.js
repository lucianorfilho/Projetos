// Carteira pague-e-use: saldo em centavos de R$, débito por uso e recargas.
// O consumo funciona como um "cronômetro" que o aluno vê descendo em tempo real.

const db = require('../db');
const config = require('../config');

const getBalanceStmt = db.prepare('SELECT balance_cents FROM learners WHERE id = ?');
const setBalanceStmt = db.prepare('UPDATE learners SET balance_cents = balance_cents + ? WHERE id = ?');
const insertTxStmt = db.prepare(
  'INSERT INTO wallet_transactions (learner_id, amount_cents, kind, description) VALUES (?, ?, ?, ?)'
);

function balance(learnerId) {
  const row = getBalanceStmt.get(learnerId);
  return row ? row.balance_cents : 0;
}

// Aplica movimento (positivo=crédito, negativo=débito) de forma atômica
const move = db.transaction((learnerId, amountCents, kind, description) => {
  setBalanceStmt.run(amountCents, learnerId);
  insertTxStmt.run(learnerId, amountCents, kind, description);
  return balance(learnerId);
});

function grantWelcomeBonus(learnerId) {
  if (!config.billing.enabled || config.billing.welcomeBonus <= 0) return balance(learnerId);
  return move(learnerId, config.billing.welcomeBonus, 'bonus', 'Bônus de boas-vindas 🎁');
}

function topup(learnerId, amountCents) {
  return move(learnerId, amountCents, 'recarga', `Recarga de R$ ${(amountCents / 100).toFixed(2)}`);
}

/**
 * Tenta cobrar um uso. Retorna { ok, balance, charged }.
 * Se o saldo for insuficiente, não cobra e retorna ok=false.
 */
function charge(learnerId, priceCents, description) {
  if (!config.billing.enabled || priceCents <= 0) {
    return { ok: true, balance: balance(learnerId), charged: 0 };
  }
  const current = balance(learnerId);
  if (current < priceCents) {
    return { ok: false, balance: current, charged: 0 };
  }
  const newBalance = move(learnerId, -priceCents, 'consumo', description);
  return { ok: true, balance: newBalance, charged: priceCents };
}

function statement(learnerId, limit = 40) {
  return db
    .prepare('SELECT amount_cents, kind, description, created_at FROM wallet_transactions WHERE learner_id = ? ORDER BY id DESC LIMIT ?')
    .all(learnerId, limit);
}

module.exports = { balance, grantWelcomeBonus, topup, charge, statement };
