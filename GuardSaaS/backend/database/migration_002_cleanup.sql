-- ============================================================
-- DBGuard - Migração 002: Limpeza de dados afetados por bugs
-- Execute como root: mysql -u root -p dbguard < migration_002_cleanup.sql
-- Esta migração é não-destrutiva para clientes: assinaturas
-- duplicadas são marcadas como 'cancelled', nunca apagadas.
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: Corrigir usuários com status inválido/vazio
-- (registros criados na janela entre o deploy do novo backend
--  e a migração 001, quando o enum ainda não tinha 'pending')
-- ------------------------------------------------------------

UPDATE dbguard_users
SET status = 'pending'
WHERE status NOT IN ('pending', 'active', 'inactive') OR status = '';


-- ------------------------------------------------------------
-- PARTE 2: Remover assinaturas ativas duplicadas por cliente
-- (bug no endpoint /approve que inseria uma nova linha a cada
--  clique em "Reativar", causando duplicação na listagem admin)
-- Mantém apenas a assinatura ativa mais recente por usuário.
-- ------------------------------------------------------------

UPDATE dbguard_subscriptions s
JOIN (
  SELECT user_id, MAX(id) AS keep_id
  FROM dbguard_subscriptions
  WHERE status = 'active'
  GROUP BY user_id
) latest ON latest.user_id = s.user_id
SET s.status = 'cancelled'
WHERE s.status = 'active' AND s.id <> latest.keep_id;


-- ------------------------------------------------------------
-- Conferência final
-- ------------------------------------------------------------
SELECT status, COUNT(*) AS total FROM dbguard_users GROUP BY status;

SELECT user_id, COUNT(*) AS assinaturas_ativas
FROM dbguard_subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
