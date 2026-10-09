-- Migração: Atualizar planos conforme nova estrutura de preços
-- Executar como root: mysql -u root -p dbguard < migration_006_update_plans.sql

-- Remover planos antigos
DELETE FROM dbguard_plans WHERE name IN ('Starter', 'Professional', 'Business', 'Premium');

-- Atualizar plano Free
UPDATE dbguard_plans
SET description = 'Plano gratuito - Ideal para teste',
    storage_limit_gb = 50,
    max_files = 10
WHERE name = 'Free';

-- Inserir novos planos
INSERT INTO dbguard_plans (name, description, price, storage_limit_gb, max_files, backup_retention_days) VALUES
('50GB',           'Plano de 50GB de armazenamento',                  11.90,  50,   50,   30),
('100GB',          'Plano de 100GB de armazenamento',                 23.90,  100,  100,  30),
('250GB',          'Plano de 250GB de armazenamento',                 59.90,  250,  250,  30),
('500GB',          'Plano de 500GB de armazenamento',                119.90,  500,  500,  30),
('1TB',            'Plano de 1TB de armazenamento',                  243.90, 1000, 1000, 30);

-- Adicionar coluna de retenção personalizada no storage (se não existir)
ALTER TABLE dbguard_storage_configs ADD COLUMN backup_retention_days INT DEFAULT NULL;
