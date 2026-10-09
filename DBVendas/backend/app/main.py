from fastapi import FastAPI, Depends, Request, HTTPException, status
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.responses import Response
from sqlalchemy.orm import Session
from app.database import Base, engine, get_db
from app.models import Produto
from app.schemas import ProdutoResponse
from app.routes import auth, usuarios, produtos, vendas, caixa, evento, pre_vendas
from app.middleware.csrf import CSRFMiddleware
from app.config import get_settings
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="DBVendas API",
    version="0.1.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    openapi_url="/api/openapi.json" if settings.DEBUG else None,
)

# Security middleware - Trusted hosts only
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["dbvendas.dbtechsolutions.com.br", "cardapio.dbvendas.dbtechsolutions.com.br", "localhost"],
)

# CSRF Protection middleware
app.add_middleware(CSRFMiddleware)

# CORS middleware - Restricted origins
cors_origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Enable XSS protection
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Content Security Policy
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self'; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )

    # HSTS (HTTP Strict Transport Security)
    if not settings.DEBUG:
        response.headers["Strict-Transport-Security"] = (
            f"max-age={settings.SECURE_HSTS_SECONDS}; "
            f"includeSubDomains; "
            "preload"
        )

    # Referrer Policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Remove Server header for security
    if "Server" in response.headers:
        del response.headers["Server"]

    return response

# Register rate limiter with app
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

app.state.limiter = auth.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Routes
app.include_router(auth.router)
app.include_router(usuarios.router)
app.include_router(produtos.router)
app.include_router(vendas.router)
app.include_router(caixa.router)
app.include_router(evento.router)
app.include_router(pre_vendas.router)


@app.get("/")
def read_root():
    return {"message": "DBVendas API - Secure Version"}


@app.get("/api/cardapio", response_model=list[ProdutoResponse])
def get_cardapio(codigo_acesso: str = "", db: Session = Depends(get_db)):
    """
    Endpoint público para cardápio.
    Requer código de evento válido para acesso.
    """
    from app.models import EventoConfig

    # Validar código de evento
    if not codigo_acesso:
        logger.warning("Acesso ao cardápio sem código de evento")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de acesso obrigatório"
        )

    config = db.query(EventoConfig).first()
    if not config or config.codigo_acesso_ativo.lower() != codigo_acesso.lower():
        logger.warning(f"Tentativa de acesso com código inválido: {codigo_acesso}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Código de acesso inválido"
        )

    produtos = db.query(Produto).all()
    logger.info(f"Cardápio acessado com código válido")
    return produtos
