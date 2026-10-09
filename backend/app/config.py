from pydantic_settings import BaseSettings
from pydantic import field_validator
import os


class Settings(BaseSettings):
    # Database - MUST be set via environment variable in production
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://dbvendas:changeme@localhost:5432/dbvendas"
    )

    # API
    API_TITLE: str = "DBVendas API"
    API_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    # Security - MUST be set via environment variable
    SECRET_KEY: str = os.getenv("SECRET_KEY", "fallback-insecure-key-change-in-production")

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # CORS - Restrict to specific origins (comma-separated string)
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    )

    # Security headers
    SECURE_HSTS_SECONDS: int = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS: bool = True
    SECURE_SSL_REDIRECT: bool = not DEBUG

    # Password validation
    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_PASSWORD_COMPLEXITY: bool = True

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_LOGIN: str = os.getenv("RATE_LIMIT_LOGIN", "5/minute")
    RATE_LIMIT_REGISTER: str = os.getenv("RATE_LIMIT_REGISTER", "3/hour")

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # Redis (for token blacklist and caching)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    class Config:
        env_file = ".env"
        case_sensitive = False


def get_settings():
    return Settings()
