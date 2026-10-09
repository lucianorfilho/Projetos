-- ============================================================
-- DBGuard - Migração 003: Backfill de oci_folder para clientes já aprovados
-- Execute como root: mysql -u root -p dbguard < migration_003_oci_folder.sql
-- Não move nem apaga nenhum arquivo já existente no OCI — apenas define
-- o nome de pasta correto para uploads futuros desses clientes.
-- ============================================================

UPDATE dbguard_users
SET oci_folder = CONCAT(
  REGEXP_REPLACE(
    SUBSTRING(COALESCE(NULLIF(TRIM(company), ''), name), 1, 8),
    '[^a-zA-Z0-9]', '_'
  ),
  '_', DATE_FORMAT(created_at, '%Y-%m-%d')
)
WHERE role = 'client'
  AND (oci_folder IS NULL OR oci_folder = '')
  AND status IN ('active', 'pending');

-- Conferência final
SELECT id, name, company, status, oci_folder FROM dbguard_users WHERE role = 'client';
