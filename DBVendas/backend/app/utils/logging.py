"""
Configuração de logging estruturado
"""
import logging
import json
from datetime import datetime
from app.config import get_settings

settings = get_settings()


class JSONFormatter(logging.Formatter):
    """Formatar logs em JSON para melhor auditoria"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_data)


def setup_logging():
    """Configurar logging para toda aplicação"""
    logger = logging.getLogger()
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(getattr(logging, settings.LOG_LEVEL))

    # Usar JSON formatter para audit trail
    formatter = JSONFormatter()
    console_handler.setFormatter(formatter)

    logger.addHandler(console_handler)

    # Log de segurança específico
    security_logger = logging.getLogger("security")
    security_logger.setLevel(logging.INFO)

    return logger, security_logger


# Inicializar logging
logger, security_logger = setup_logging()
