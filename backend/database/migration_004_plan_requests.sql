-- ============================================================
-- DBGuard - Migração 004: Solicitações de troca de plano
-- Execute como root: mysql -u root -p dbguard < migration_004_plan_requests.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS dbguard_plan_requests (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  user_id             INT NOT NULL REFERENCES dbguard_users(id),
  current_plan_name   VARCHAR(100),
  requested_plan_id   INT NOT NULL REFERENCES dbguard_plans(id),
  requested_plan_name VARCHAR(100) NOT NULL,
  message             VARCHAR(500),
  status              ENUM('pending','approved','rejected') DEFAULT 'pending',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

SELECT 'dbguard_plan_requests criada' AS resultado;
