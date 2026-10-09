// Rotas do cliente: gerenciar suas instâncias monitoradas e o plano
// (1ª instância grátis; adicionais R$30/mês cada).

const express = require('express');
const db = require('../db');
const { auth } = require('../middleware/auth');
const registry = require('../instances');

const router = express.Router();
router.use(auth);

function planInfo(maxInstances, used) {
  const { freeIncluded, pricePerInstance } = registry.PRICING;
  const paid = Math.max(0, maxInstances - freeIncluded);
  return {
    maxInstances,
    used,
    freeIncluded,
    pricePerInstance,
    monthlyCost: paid * pricePerInstance,
    planName: paid > 0 ? 'Pago' : 'Free',
  };
}

async function getUserRow(userId) {
  const [rows] = await db.query('SELECT * FROM dbview_users WHERE id = ?', [userId]);
  return rows[0];
}

router.get('/plan', async (req, res) => {
  const user = await getUserRow(req.user.id);
  const [[{ used }]] = await db.query('SELECT COUNT(*) AS used FROM dbview_instances WHERE user_id = ?', [req.user.id]);
  res.json(planInfo(user.max_instances, used));
});

// Contratar/ajustar quantidade de instâncias do plano
router.post('/plan', async (req, res) => {
  const wanted = parseInt(req.body?.maxInstances, 10);
  if (!wanted || wanted < 1 || wanted > 50) return res.status(400).json({ error: 'Quantidade inválida (1 a 50)' });

  const [[{ used }]] = await db.query('SELECT COUNT(*) AS used FROM dbview_instances WHERE user_id = ?', [req.user.id]);
  if (wanted < used) {
    return res.status(400).json({ error: `Você tem ${used} instância(s) cadastrada(s). Remova instâncias antes de reduzir o plano.` });
  }
  await db.query('UPDATE dbview_users SET max_instances = ? WHERE id = ?', [wanted, req.user.id]);
  res.json(planInfo(wanted, used));
});

router.post('/instances', async (req, res) => {
  const { name, envLabel, mode, oracleUser, oraclePassword, oracleConnect } = req.body || {};
  if (!name || !/^[\w][\w. -]{1,60}$/.test(name)) return res.status(400).json({ error: 'Informe um nome válido para a instância' });
  if (mode === 'oracle' && (!oracleUser || !oraclePassword || !oracleConnect)) {
    return res.status(400).json({ error: 'Para monitorar um Oracle real, informe usuário, senha e string de conexão' });
  }

  const user = await getUserRow(req.user.id);
  const [[{ used }]] = await db.query('SELECT COUNT(*) AS used FROM dbview_instances WHERE user_id = ?', [req.user.id]);
  if (used >= user.max_instances) {
    return res.status(402).json({
      error: `Limite do plano atingido (${user.max_instances} instância(s)). Contrate mais instâncias por R$ ${registry.PRICING.pricePerInstance}/mês cada.`,
      planLimit: true,
    });
  }

  const [result] = await db.query(
    'INSERT INTO dbview_instances (user_id, name, env_label, mode, oracle_user, oracle_password, oracle_connect) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, name, envLabel || null, mode === 'oracle' ? 'oracle' : 'demo',
     oracleUser || null, oraclePassword || null, oracleConnect || null]
  );

  const [rows] = await db.query('SELECT * FROM dbview_instances WHERE id = ?', [result.insertId]);
  registry.spawn(rows[0]);
  res.status(201).json({ ok: true, id: result.insertId });
});

router.delete('/instances/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM dbview_instances WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Instância não encontrada' });
  await db.query('DELETE FROM dbview_instances WHERE id = ?', [req.params.id]);
  registry.remove(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
