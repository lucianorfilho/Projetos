const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getClientPlan, getClientUsage, listObjects, removeObject, getObjectInfo, verifyObjectAccess, getDownloadToken, checkQuota, registerObject } = require('../services/storageQuota');
const { getDownloadUrl, uploadToOCI } = require('../../config/oci');
const { execute } = require('../config/database');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const uploadTemp = multer({
  dest: '/tmp/dbguard_uploads/'
  // Sem limite de tamanho - validação é feita por quota do plano
});

// Informações de quota e uso
router.get('/quota', auth, async (req, res) => {
  try {
    const [plan, usage] = await Promise.all([
      getClientPlan(req.user.id),
      getClientUsage(req.user.id)
    ]);

    const limitMB    = plan.storage_limit_gb * 1024;
    const usedPct    = limitMB > 0 ? (usage.totalMB / limitMB) * 100 : 0;

    res.json({
      plan,
      usage,
      limits: {
        storage_gb:  plan.storage_limit_gb,
        storage_mb:  limitMB,
        max_files:   plan.max_files,
        used_pct:    Math.min(usedPct, 100).toFixed(1)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Listar arquivos
router.get('/files', auth, async (req, res) => {
  try {
    const objects = await listObjects(req.user.id);
    res.json(objects);
  } catch (err) {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Gerar link de download seguro (com token e expiração)
router.get('/files/:id/download', auth, async (req, res) => {
  try {
    await verifyObjectAccess(req.user.id, req.params.id);
    const obj = await getObjectInfo(req.user.id, req.params.id);
    const { downloadToken, expiresAt } = await getDownloadToken(req.user.id, req.params.id);

    res.json({
      url: getDownloadUrl(obj.object_name),
      file_name: obj.file_name,
      access_token: downloadToken,
      expires_at: expiresAt,
      encrypted: !!obj.encryption_key_hash
    });
  } catch (err) {
    res.status(403).json({ error: err.message || 'Acesso negado' });
  }
});

// Deletar arquivo (seguro - verifica ownership)
router.delete('/files/:id', auth, async (req, res) => {
  try {
    await verifyObjectAccess(req.user.id, req.params.id);
    const removed = await removeObject(req.user.id, req.params.id);
    res.json({ message: `Arquivo ${removed.file_name} removido com sucesso` });
  } catch (err) {
    res.status(403).json({ error: err.message || 'Acesso negado' });
  }
});

// Configurar dias de retenção
router.post('/retention', auth, async (req, res) => {
  const { retention_days } = req.body;

  if (!retention_days || ![3, 7, 30].includes(Number(retention_days))) {
    return res.status(400).json({ error: 'Dias de retenção deve ser 3, 7 ou 30' });
  }

  try {
    const { rows } = await execute(
      'SELECT id FROM dbguard_retention_settings WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length) {
      await execute(
        'UPDATE dbguard_retention_settings SET retention_days = ? WHERE user_id = ?',
        [retention_days, req.user.id]
      );
    } else {
      await execute(
        'INSERT INTO dbguard_retention_settings (user_id, retention_days) VALUES (?, ?)',
        [req.user.id, retention_days]
      );
    }

    res.json({ message: `Retenção configurada para ${retention_days} dias`, retention_days });
  } catch (err) {
    console.error('Retention config error:', err);
    res.status(500).json({ error: 'Erro ao configurar retenção' });
  }
});

// Obter configuração de retenção
router.get('/retention', auth, async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT retention_days FROM dbguard_retention_settings WHERE user_id = ?',
      [req.user.id]
    );

    const retention_days = rows.length ? rows[0].retention_days : 30;
    res.json({ retention_days });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao obter configuração de retenção' });
  }
});

// Triggrar limpeza manual de arquivos expirados
router.post('/cleanup', auth, async (req, res) => {
  try {
    const { rows } = await execute(
      'SELECT retention_days FROM dbguard_retention_settings WHERE user_id = ?',
      [req.user.id]
    );

    if (!rows.length || !rows[0].retention_days) {
      return res.status(400).json({ error: 'Nenhuma configuração de retenção definida' });
    }

    const retentionDays = rows[0].retention_days;
    const { deleteObject } = require('../../config/oci');

    const { rows: expiredFiles } = await execute(
      `SELECT id, object_name, file_name
       FROM dbguard_storage_objects
       WHERE user_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [req.user.id, retentionDays]
    );

    let deletedCount = 0;
    for (const file of expiredFiles) {
      try {
        await deleteObject(file.object_name);
        await execute('DELETE FROM dbguard_storage_objects WHERE id = ?', [file.id]);
        deletedCount++;
      } catch (err) {
        console.error(`Erro ao deletar ${file.file_name}:`, err.message);
      }
    }

    res.json({
      message: `Limpeza concluída. ${deletedCount} arquivo(s) expirado(s) removido(s)`,
      deletedCount,
      retentionDays
    });
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).json({ error: 'Erro ao fazer limpeza' });
  }
});

// Upload de cliente web (autenticado)
router.post('/upload/chunked', auth, uploadTemp.single('chunk'), async (req, res) => {
  const { chunk_index, total_chunks, file_name, file_hash } = req.body;

  if (chunk_index === undefined || !total_chunks || !file_name) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Parâmetros obrigatórios faltando' });
  }

  try {
    const clientId = req.user.id;

    // Verificar quota
    const chunkSizeMB = req.file.size / (1024 * 1024);
    const quota = await checkQuota(clientId, chunkSizeMB);
    if (!quota.allowed) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: quota.reason, usage: quota.usage, plan: quota.plan });
    }

    const chunkPath = `/tmp/dbguard_chunks/${clientId}/${file_hash}`;
    if (!fs.existsSync(chunkPath)) fs.mkdirSync(chunkPath, { recursive: true });

    const finalChunkPath = path.join(chunkPath, `chunk_${chunk_index}`);
    fs.renameSync(req.file.path, finalChunkPath);

    // Se for último chunk, fazer o assembly + upload
    if (parseInt(chunk_index) === parseInt(total_chunks) - 1) {
      const files = fs.readdirSync(chunkPath).filter(f => f.startsWith('chunk_')).sort((a, b) => {
        const aIdx = parseInt(a.split('_')[1]);
        const bIdx = parseInt(b.split('_')[1]);
        return aIdx - bIdx;
      });

      if (files.length !== parseInt(total_chunks)) {
        return res.status(400).json({ error: 'Chunks incompletos' });
      }

      const finalFile = path.join(chunkPath, 'final_file.tmp');
      const writeStream = fs.createWriteStream(finalFile);

      for (const file of files) {
        const data = fs.readFileSync(path.join(chunkPath, file));
        writeStream.write(data);
      }
      writeStream.end();

      writeStream.on('finish', async () => {
        try {
          const fileSizeMB = fs.statSync(finalFile).size / (1024 * 1024);
          const finalQuota = await checkQuota(clientId, fileSizeMB);
          if (!finalQuota.allowed) {
            fs.rmSync(chunkPath, { recursive: true });
            return res.status(403).json({ error: finalQuota.reason, usage: finalQuota.usage, plan: finalQuota.plan });
          }

          const { rows: userRows } = await execute('SELECT oci_folder FROM dbguard_users WHERE id = ?', [clientId]);
          const clientFolder = (userRows[0]?.oci_folder) || `client_${clientId}`;
          const objectName = `${clientFolder}/${file_name}`;

          const result = await uploadToOCI(finalFile, objectName);
          const security = await registerObject(clientId, objectName, file_name, result.sizeMB, null);

          logger.info(`Chunked upload completed: ${file_name} (${fileSizeMB.toFixed(2)}MB)`, { user_id: clientId });

          fs.rmSync(chunkPath, { recursive: true });
          res.json({
            storage_path: result.path,
            size_mb: result.sizeMB,
            message: 'Upload chunked concluído',
            access_token: security.accessToken,
            encrypted: true
          });
        } catch (err) {
          logger.error(`Chunked upload assembly error: ${err.message}`, { user_id: clientId });
          fs.rmSync(chunkPath, { recursive: true });
          res.status(500).json({ error: 'Erro no assembly do arquivo: ' + err.message });
        }
      });
    } else {
      res.json({ status: 'chunk_received', chunk_index, total_chunks });
    }
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    logger.error(`Upload chunked error: ${err.message}`, { user_id: req.user.id });
    res.status(500).json({ error: 'Erro no upload em chunks: ' + err.message });
  }
});

module.exports = router;
