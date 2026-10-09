const express = require('express');
const db = require('../db');
const { auth, adminOnly } = require('../middleware/auth');
const registry = require('../instances');

const router = express.Router();
router.use(auth, adminOnly);

router.get('/clients', async (req, res) => {
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email, u.company, u.phone, u.status, u.max_instances,
           u.created_at, u.approved_at, COUNT(i.id) AS instance_count
    FROM dbview_users u
    LEFT JOIN dbview_instances i ON i.user_id = u.id
    WHERE u.role = 'client'
    GROUP BY u.id
    ORDER BY (u.status = 'pending') DESC, u.created_at DESC`);
  res.json({ clients: rows });
});

router.post('/clients/:id/approve', async (req, res) => {
  await db.query('UPDATE dbview_users SET status = "approved", approved_at = NOW() WHERE id = ? AND role = "client"', [req.params.id]);
  res.json({ ok: true });
});

router.post('/clients/:id/block', async (req, res) => {
  await db.query('UPDATE dbview_users SET status = "blocked" WHERE id = ? AND role = "client"', [req.params.id]);
  res.json({ ok: true });
});

router.get('/summary', async (req, res) => {
  const [[counts]] = await db.query(`
    SELECT
      SUM(status = 'pending') AS pending,
      SUM(status = 'approved') AS approved,
      SUM(status = 'blocked') AS blocked
    FROM dbview_users WHERE role = 'client'`);
  const [[inst]] = await db.query('SELECT COUNT(*) AS total FROM dbview_instances');
  res.json({
    clients: counts,
    instances: { total: inst.total, running: registry.count() },
  });
});

module.exports = router;
