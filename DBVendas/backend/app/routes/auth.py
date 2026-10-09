from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from datetime import timedelta
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.database import get_db
from app.services.auth import authenticate_user, create_access_token, create_user
from app.schemas import UsuarioCreate, Token, UsuarioResponse
from app.config import get_settings
from app.models import Usuario, RoleEnum
from app.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

def get_client_ip(request: Request) -> str:
    # Atrás do Nginx, request.client.host é sempre 127.0.0.1 — sem isso o rate
    # limit vira um balde único compartilhado por todos os usuários.
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=get_client_ip)


@router.post("/register", response_model=UsuarioResponse)
@limiter.limit("3/hour")
def register(
    request: Request,
    user: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    if current_user.role != RoleEnum.ADMIN:
        logger.warning(f"Unauthorized registration attempt by {current_user.email} from {request.client.host}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    db_user = create_user(db, user)
    logger.info(f"New user registered: {db_user.email}")
    return db_user


@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
def login(
    request: Request,
    email: str,
    password: str,
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, email, password)
    if not user:
        logger.warning(f"Failed login attempt for {email} from {request.client.host}")
        # Usar sleep para prevenir timing attacks
        import time
        time.sleep(0.1)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    if not user.ativo:
        logger.warning(f"Login attempt for inactive user {email} from {request.client.host}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo",
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    logger.info(f"Successful login for {email} from {request.client.host}")
    return {"access_token": access_token, "token_type": "bearer"}
