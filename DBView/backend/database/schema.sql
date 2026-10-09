-- DBView — schema multi-tenant
-- Banco: dbview

CREATE TABLE IF NOT EXISTS dbview_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password VARCHAR(120) NOT NULL,
  company VARCHAR(160) NULL,
  phone VARCHAR(40) NULL,
  role ENUM('admin','client') NOT NULL DEFAULT 'client',
  status ENUM('pending','approved','blocked') NOT NULL DEFAULT 'pending',
  -- Plano: 1ª instância grátis (Free); adicionais contratadas a R$30/mês cada
  max_instances INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS dbview_instances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(80) NOT NULL,
  env_label VARCHAR(120) NULL,
  mode ENUM('demo','oracle') NOT NULL DEFAULT 'demo',
  oracle_user VARCHAR(120) NULL,
  oracle_password VARCHAR(255) NULL,
  oracle_connect VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inst_user FOREIGN KEY (user_id) REFERENCES dbview_users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- O usuário admin é criado pelo script de deploy (senha gerada na hora).
