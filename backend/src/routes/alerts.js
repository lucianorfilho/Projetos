const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { execute } = require('../config/database');

// Contar alertas não lidos (definir ANTES de /:id rotas)
router.get('/count/unread', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let filter = 'a.user_id = ? AND a.is_read = 0';
  let binds = [req.user.id];

  if (isAdmin) {
    filter = "a.type NOT IN ('invoice') AND a.is_read = 0";
    binds = [];
  }

  try {
    const { rows } = await execute(
      `SELECT COUNT(*) as count FROM dbguard_alerts a WHERE ${filter}`,
      binds
    );
    res.json({ unread: rows[0]?.count || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Marcar múltiplos alertas como lidos
router.put('/read-bulk', auth, async (req, res) => {
  const { ids } = req.body;
  const isAdmin = req.user.role === 'admin';

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  try {
    let filter = 'id IN (' + ids.map(() => '?').join(',') + ') AND user_id = ?';
    let binds = [...ids, req.user.id];

    if (isAdmin) {
      filter = "id IN (" + ids.map(() => '?').join(',') + ") AND type NOT IN ('invoice')";
      binds = ids;
    }

    const { rows: checkRows } = await execute(
      `SELECT COUNT(*) as count FROM dbguard_alerts WHERE ${filter}`,
      binds
    );

    const count = checkRows[0]?.count || 0;
    if (count === 0) {
      return res.status(404).json({ error: 'Nenhum alerta encontrado' });
    }

    await execute(`UPDATE dbguard_alerts SET is_read = 1 WHERE ${filter}`, binds);
    res.json({ success: true, updated: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar múltiplos alertas
router.post('/delete-bulk', auth, async (req, res) => {
  const { ids } = req.body;
  const isAdmin = req.user.role === 'admin';

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs inválidos' });
  }

  try {
    let filter = 'id IN (' + ids.map(() => '?').join(',') + ') AND user_id = ?';
    let binds = [...ids, req.user.id];

    if (isAdmin) {
      filter = "id IN (" + ids.map(() => '?').join(',') + ") AND type NOT IN ('invoice')";
      binds = ids;
    }

    const { rows: checkRows } = await execute(
      `SELECT COUNT(*) as count FROM dbguard_alerts WHERE ${filter}`,
      binds
    );

    const deletedCount = checkRows[0]?.count || 0;
    if (deletedCount === 0) {
      return res.status(404).json({ error: 'Nenhum alerta encontrado' });
    }

    await execute(`DELETE FROM dbguard_alerts WHERE ${filter}`, binds);
    res.json({ success: true, deleted: deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Listar alertas
router.get('/', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  let filter = 'a.user_id = ?';
  let binds = [req.user.id];

  if (isAdmin) {
    filter = "a.type NOT IN ('invoice')";
    binds = [];
  }

  try {
    const { rows } = await execute(
      `SELECT a.id as ID, a.type as TYPE, a.severity as SEVERITY, a.message as MESSAGE,
              a.is_read as IS_READ, a.created_at as CREATED_AT,
              s.name AS SERVER_NAME
       FROM dbguard_alerts a
       LEFT JOIN dbguard_servers s ON s.id = a.server_id
       WHERE ${filter}
       ORDER BY a.created_at DESC
       LIMIT 100`,
      binds
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Marcar alerta como lido
router.put('/:id/read', auth, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'admin';

  try {
    let checkFilter = 'id = ? AND user_id = ?';
    let checkBinds = [id, req.user.id];

    if (isAdmin) {
      checkFilter = "id = ? AND type NOT IN ('invoice')";
      checkBinds = [id];
    }

    const { rows: checkRows } = await execute(
      `SELECT id FROM dbguard_alerts WHERE ${checkFilter}`,
      checkBinds
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    await execute('UPDATE dbguard_alerts SET is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Deletar alerta individual
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const isAdmin = req.user.role === 'admin';

  try {
    let checkFilter = 'id = ? AND user_id = ?';
    let checkBinds = [id, req.user.id];

    if (isAdmin) {
      checkFilter = "id = ? AND type NOT IN ('invoice')";
      checkBinds = [id];
    }

    const { rows: checkRows } = await execute(
      `SELECT id FROM dbguard_alerts WHERE ${checkFilter}`,
      checkBinds
    );

    if (checkRows.length === 0) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    await execute('DELETE FROM dbguard_alerts WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
