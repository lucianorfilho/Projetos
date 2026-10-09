"""
CSRF Protection Middleware
Implementa proteção contra Cross-Site Request Forgery
"""
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, JSONResponse
import secrets
import logging

logger = logging.getLogger(__name__)

CSRF_TOKEN_LENGTH = 32
SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_COOKIE_NAME = "csrf-token"


class CSRFMiddleware(BaseHTTPMiddleware):
    """Middleware para proteção CSRF"""

    # Endpoints que não precisam validação CSRF (API endpoints com autenticação)
    EXEMPTED_PATHS = {
        "/auth/login",
        "/auth/register",
        "/auth/logout",
    }

    async def dispatch(self, request: Request, call_next) -> Response:
        # Gerar token CSRF se não existir
        if CSRF_COOKIE_NAME not in request.cookies:
            csrf_token = secrets.token_urlsafe(CSRF_TOKEN_LENGTH)
            request.state.csrf_token = csrf_token
        else:
            request.state.csrf_token = request.cookies[CSRF_COOKIE_NAME]

        # Requisições autenticadas por Bearer token não precisam de CSRF: o
        # navegador nunca anexa o header Authorization sozinho, então não há
        # vetor de forgery. Sem isso, um PATCH sem body (o axios omite o
        # Content-Type nesse caso) era barrado indevidamente.
        tem_bearer = request.headers.get("authorization", "").lower().startswith("bearer ")

        # Validar token CSRF apenas para requisições modificadoras que NÃO sejam API JSON
        if (request.method not in SAFE_METHODS
            and not tem_bearer
            and request.url.path not in self.EXEMPTED_PATHS
            and request.headers.get("content-type", "").lower() != "application/json"):

            # Pegar token do header ou form
            token_from_header = request.headers.get(CSRF_HEADER_NAME)

            if not token_from_header:
                logger.warning(f"CSRF token missing for {request.method} {request.url.path}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "CSRF token required"},
                )

            # Comparar tokens
            if token_from_header != request.state.csrf_token:
                logger.warning(f"CSRF token mismatch for {request.method} {request.url.path}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"detail": "CSRF token invalid"},
                )

        response = await call_next(request)

        # Adicionar token CSRF ao cookie
        response.set_cookie(
            CSRF_COOKIE_NAME,
            request.state.csrf_token,
            httponly=False,  # JavaScript precisa acessar para enviar no header
            secure=True,
            samesite="strict",
            max_age=3600,
        )

        # Adicionar token no header de resposta também
        response.headers[CSRF_HEADER_NAME] = request.state.csrf_token

        return response
