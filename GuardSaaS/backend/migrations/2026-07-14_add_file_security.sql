-- Adicionar campos de segurança ao armazenamento
ALTER TABLE dbguard_storage_objects
ADD COLUMN is_encrypted BOOLEAN DEFAULT 1,
ADD COLUMN encryption_key_hash VARCHAR(255) COMMENT 'Hash da chave de criptografia para validação',
ADD COLUMN access_token VARCHAR(500) COMMENT 'Token único para download seguro',
ADD COLUMN expires_at TIMESTAMP NULL COMMENT 'Expiração do arquivo';

-- Criar índice para buscar por access_token
CREATE INDEX idx_storage_access_token ON dbguard_storage_objects(access_token);

-- Criar índice para buscar por user_id (segurança)
CREATE INDEX idx_storage_user_id ON dbguard_storage_objects(user_id);
