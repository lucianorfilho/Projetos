"""
Criptografia de dados sensíveis
"""
from cryptography.fernet import Fernet
from app.config import get_settings
import os
import logging

logger = logging.getLogger(__name__)

settings = get_settings()

# Gerar ou carregar chave de criptografia
ENCRYPTION_KEY_FILE = os.path.join(os.path.dirname(__file__), ".encryption.key")


def get_encryption_key():
    """Obter chave de criptografia"""
    if os.path.exists(ENCRYPTION_KEY_FILE):
        with open(ENCRYPTION_KEY_FILE, "rb") as f:
            return f.read()
    else:
        # Gerar nova chave
        key = Fernet.generate_key()
        try:
            with open(ENCRYPTION_KEY_FILE, "wb") as f:
                f.write(key)
            os.chmod(ENCRYPTION_KEY_FILE, 0o600)  # Apenas proprietário pode ler
            logger.info("Encryption key generated")
        except Exception as e:
            logger.warning(f"Could not save encryption key to file: {e}")
        return key


# Inicializar cipher
try:
    cipher = Fernet(get_encryption_key())
except Exception as e:
    logger.error(f"Failed to initialize encryption: {e}")
    cipher = None


def encrypt_data(data: str) -> str:
    """Criptografar dados sensíveis"""
    if not cipher:
        logger.warning("Encryption not available, returning data unencrypted")
        return data

    try:
        encrypted = cipher.encrypt(data.encode())
        return encrypted.decode()
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        return data


def decrypt_data(encrypted_data: str) -> str:
    """Descriptografar dados"""
    if not cipher:
        logger.warning("Encryption not available, returning data as is")
        return encrypted_data

    try:
        decrypted = cipher.decrypt(encrypted_data.encode())
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption error: {e}")
        return encrypted_data
