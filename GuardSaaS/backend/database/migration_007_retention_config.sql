-- Migração: Adicionar configuração de retenção personalizável
-- Executar como root: mysql -u root -p dbguard < migration_007_retention_config.sql

use dbguard;

-- Adicionar campo de retenção no storage (se não existir)
ALTER TABLE dbguard_storage_configs ADD COLUMN backup_retention_days INT DEFAULT 30;

-- Atualizar status de subscrições 'pending_payment' se não existir
ALTER TABLE dbguard_subscriptions MODIFY COLUMN status ENUM('active','expired','cancelled','pending_payment') DEFAULT 'active';

-- Criar tabela de configurações de retenção por cliente (opcional, para future)
CREATE TABLE IF NOT EXISTS dbguard_retention_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES dbguard_users(id),
  retention_days INT DEFAULT 30,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
