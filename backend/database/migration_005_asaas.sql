-- ============================================================
-- DBGuard - Migração 005: Cobrança recorrente via Asaas
-- Execute como root: mysql -u root -p dbguard < migration_005_asaas.sql
-- Esta migração é não-destrutiva: nenhum dado é apagado.
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: Dados de cobrança em dbguard_users
-- ------------------------------------------------------------

ALTER TABLE dbguard_users
  ADD COLUMN cpf_cnpj          VARCHAR(20) NULL AFTER phone,
  ADD COLUMN asaas_customer_id VARCHAR(50) NULL AFTER cpf_cnpj;


-- ------------------------------------------------------------
-- PARTE 2: Vincular a assinatura Asaas à assinatura local
-- ------------------------------------------------------------

ALTER TABLE dbguard_subscriptions
  ADD COLUMN asaas_subscription_id VARCHAR(50) NULL;


-- ------------------------------------------------------------
-- PARTE 3: Faturas — fonte de verdade das telas "Faturas em
-- Aberto" e "Faturas Pagas". Uma linha por ciclo de cobrança:
-- a primeira é criada quando o cliente assina, as seguintes
-- chegam sozinhas via webhook PAYMENT_CREATED a cada mês.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dbguard_invoices (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  user_id                INT NOT NULL REFERENCES dbguard_users(id),
  subscription_id        INT REFERENCES dbguard_subscriptions(id),
  plan_id                INT NOT NULL REFERENCES dbguard_plans(id),
  plan_name              VARCHAR(100) NOT NULL,
  asaas_subscription_id  VARCHAR(50),
  asaas_payment_id       VARCHAR(50) NOT NULL UNIQUE,
  value                  DECIMAL(10,2) NOT NULL,
  status                 ENUM('awaiting_payment','paid','overdue','cancelled') DEFAULT 'awaiting_payment',
  boleto_url             VARCHAR(500),
  pix_payload            TEXT,
  due_date               DATE NOT NULL,
  paid_at                TIMESTAMP NULL,
  created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ------------------------------------------------------------
-- PARTE 4: Idempotência de webhooks (Asaas e futuros provedores)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dbguard_webhook_events (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  provider     VARCHAR(30) NOT NULL,
  event_id     VARCHAR(150) NOT NULL,
  event_type   VARCHAR(50),
  payload      JSON,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_provider_event (provider, event_id)
);


-- ------------------------------------------------------------
-- Conferência final
-- ------------------------------------------------------------
DESCRIBE dbguard_users;
DESCRIBE dbguard_subscriptions;
DESCRIBE dbguard_invoices;
DESCRIBE dbguard_webhook_events;
