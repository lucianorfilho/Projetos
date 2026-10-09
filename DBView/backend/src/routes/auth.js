const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign, auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, company, phone } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  if (password.length < 8) return res.status(400).json({ error: 'A senha precisa ter pelo menos 8 caracteres' });

  const [existing] = await db.query('SELECT id FROM dbview_users WHERE email = ?', [email]);
  if (existing.length > 0) return res.status(409).json({ error: 'Já existe uma conta com esse e-mail' });

  const hash = await bcrypt.hash(password, 10);
  await db.query(
    'INSERT INTO dbview_users (name, email, password, company, phone, role, status, max_instances) VALUES (?, ?, ?, ?, ?, "client", "pending", 1)',
    [name, email, hash, company || null, phone || null]
  );
  res.status(201).json({ ok: true, message: 'Cadastro realizado! Aguarde a aprovação do administrador.' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha' });

  const [rows] = await db.query('SELECT * FROM dbview_users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'E-mail ou senha inválidos' });
  }
  if (user.status === 'pending') {
    return res.status(403).json({ error: 'Sua conta ainda está aguardando aprovação do administrador.' });
  }
  if (user.status === 'blocked') {
    return res.status(403).json({ error: 'Sua conta está bloqueada. Entre em contato com o suporte.' });
  }

  res.json({
    token: sign(user),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, maxInstances: user.max_instances },
  });
});

router.get('/me', auth, async (req, res) => {
  const [rows] = await db.query('SELECT id, name, email, role, status, max_instances FROM dbview_users WHERE id = ?', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  res.json(rows[0]);
});

module.exports = router;
