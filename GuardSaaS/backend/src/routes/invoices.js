const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

const STATUS_GROUPS = {
  open: ['awaiting_payment', 'overdue'],
  paid: ['paid']
};

router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const statuses = STATUS_GROUPS[req.query.status] || null;

  const conditions = [];
  const binds = [];

  if (!isAdmin) {
    conditions.push('i.user_id = ?');
    binds.push(req.user.id);
  }
  if (statuses) {
    conditions.push(`i.status IN (${statuses.map(() => '?').join(',')})`);
    binds.push(...statuses);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const { rows } = await execute(
      `SELECT i.id, i.plan_name, i.value, i.status, i.boleto_url, i.pix_payload,
              i.due_date, i.paid_at, i.created_at, u.name AS client_name
       FROM dbguard_invoices i
       JOIN dbguard_users u ON u.id = i.user_id
       ${where}
       ORDER BY i.due_date DESC
       LIMIT 200`,
      binds
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
