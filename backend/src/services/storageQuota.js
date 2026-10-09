const { execute } = require('../config/database');
const { uploadToOCI, deleteObject } = require('../../config/oci');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

async function getClientPlan(userId) {
  const { rows } = await execute(
    `SELECT p.name, p.storage_limit_gb, p.max_files, p.backup_retention_days
     FROM dbguard_subscriptions s
     JOIN dbguard_plans p ON p.id = s.plan_id
     WHERE s.user_id = ? AND s.status IN ('active')
     ORDER BY s.created_at DESC LIMIT 1`,
    [userId]
  );
  if (!rows.length) {
    return { name: 'Free', storage_limit_gb: 50, max_files: 10, backup_retention_days: 7 };
  }
  return rows[0];
}

async function getStorageRetention(storageId) {
  if (!storageId) return null;
  const { rows } = await execute(
    'SELECT backup_retention_days FROM dbguard_storage_configs WHERE id = ?',
    [storageId]
  );
  return rows.length ? rows[0].backup_retention_days : null;
}

async function getClientUsage(userId) {
  const { rows } = await execute(
    `SELECT COUNT(*) AS file_count, COALESCE(SUM(file_size_mb), 0) AS total_mb
     FROM dbguard_storage_objects WHERE user_id = ?`,
    [userId]
  );
  return {
    fileCount: parseInt(rows[0].file_count) || 0,
    totalMB:   parseFloat(rows[0].total_mb) || 0,
    totalGB:   (parseFloat(rows[0].total_mb) || 0) / 1024
  };
}

async function checkQuota(userId, fileSizeMB) {
  const plan  = await getClientPlan(userId);
  const usage = await getClientUsage(userId);
  const limitMB  = plan.storage_limit_gb * 1024;

  if (usage.totalMB + fileSizeMB > limitMB) {
    return {
      allowed: false,
      reason: `Limite de ${plan.storage_limit_gb}GB atingido. Libere espaço ou faça upgrade.`,
      plan, usage
    };
  }
  return { allowed: true, plan, usage };
}

async function generateAccessToken(userId, fileName) {
  return crypto.randomBytes(32).toString('hex') + '_' + Date.now();
}

async function registerObject(userId, objectName, fileName, fileSizeMB, jobId) {
  const accessToken = await generateAccessToken(userId, fileName);
  const encryptionKeyHash = crypto.createHash('sha256').update(`${userId}${fileName}${Date.now()}`).digest('hex');

  await execute(
    `INSERT INTO dbguard_storage_objects (user_id, object_name, file_name, file_size_mb, job_id, access_token, encryption_key_hash, is_encrypted)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [userId, objectName, fileName, fileSizeMB, jobId || null, accessToken, encryptionKeyHash]
  );

  return { accessToken, encryptionKeyHash };
}

async function removeObject(userId, objectId) {
  const { rows } = await execute(
    'SELECT object_name, file_name FROM dbguard_storage_objects WHERE id = ? AND user_id = ?',
    [objectId, userId]
  );
  if (!rows.length) throw new Error('Arquivo não encontrado');
  await deleteObject(rows[0].object_name);
  await execute('DELETE FROM dbguard_storage_objects WHERE id = ?', [objectId]);
  return rows[0];
}

async function getObjectInfo(userId, objectId) {
  const { rows } = await execute(
    'SELECT object_name, file_name, access_token, encryption_key_hash FROM dbguard_storage_objects WHERE id = ? AND user_id = ?',
    [objectId, userId]
  );
  if (!rows.length) throw new Error('Arquivo não encontrado');
  return rows[0];
}

async function verifyObjectAccess(userId, objectId) {
  const { rows } = await execute(
    'SELECT id, user_id FROM dbguard_storage_objects WHERE id = ? AND user_id = ?',
    [objectId, userId]
  );
  if (!rows.length) throw new Error('Acesso negado: arquivo não pertence ao usuário');
  return rows[0];
}

async function getDownloadToken(userId, objectId) {
  const obj = await verifyObjectAccess(userId, objectId);
  const downloadToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  await execute(
    'UPDATE dbguard_storage_objects SET access_token = ?, expires_at = ? WHERE id = ?',
    [downloadToken, expiresAt, objectId]
  );

  return { downloadToken, expiresAt };
}

async function listObjects(userId) {
  const { rows } = await execute(
    `SELECT o.id, o.file_name, o.file_size_mb, o.object_name, o.created_at,
            j.status AS job_status, j.job_name
     FROM dbguard_storage_objects o
     LEFT JOIN dbguard_backup_jobs j ON j.id = o.job_id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows;
}

function buildFolderName(company, name) {
  const base = (company && company.trim()) || (name && name.trim()) || 'cliente';
  const prefix = base.slice(0, 8).replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `${prefix}_${date}`;
}

async function createClientFolder(userId, company, name) {
  const folder = buildFolderName(company, name);
  const markerFile = path.join(os.tmpdir(), `.dbguard_marker_${userId}`);
  fs.writeFileSync(markerFile, `DBVault ${folder}`);
  try {
    await uploadToOCI(markerFile, `${folder}/.folder`);
  } finally {
    if (fs.existsSync(markerFile)) fs.unlinkSync(markerFile);
  }
  return folder;
}

async function cleanupExpiredBackups() {
  try {
    const { rows: users } = await execute(
      `SELECT DISTINCT u.id, rs.retention_days
       FROM dbguard_retention_settings rs
       JOIN dbguard_users u ON u.id = rs.user_id
       WHERE rs.retention_days IS NOT NULL AND rs.retention_days > 0`
    );

    let totalDeleted = 0;
    for (const user of users) {
      const { rows: expiredFiles } = await execute(
        `SELECT id, object_name, file_name
         FROM dbguard_storage_objects
         WHERE user_id = ? AND created_at < DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [user.id, user.retention_days]
      );

      for (const file of expiredFiles) {
        try {
          await deleteObject(file.object_name);
          await execute('DELETE FROM dbguard_storage_objects WHERE id = ?', [file.id]);
          totalDeleted++;
          console.log(`[Cleanup] Deleted expired backup: ${file.file_name} (user: ${user.id})`);
        } catch (err) {
          console.error(`[Cleanup] Error deleting ${file.file_name}:`, err.message);
        }
      }
    }

    return { success: true, deletedCount: totalDeleted };
  } catch (err) {
    console.error('[Cleanup] Error during cleanup:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  getClientPlan,
  getClientUsage,
  checkQuota,
  registerObject,
  removeObject,
  getObjectInfo,
  listObjects,
  createClientFolder,
  buildFolderName,
  getStorageRetention,
  cleanupExpiredBackups,
  generateAccessToken,
  verifyObjectAccess,
  getDownloadToken
};
