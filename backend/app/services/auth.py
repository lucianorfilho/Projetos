from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.config import get_settings
from app.models import Usuario
from app.schemas import UsuarioCreate

settings = get_settings()
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def create_user(db: Session, user: UsuarioCreate):
    db_user = Usuario(
        nome=user.nome,
        email=user.email,
        senha_hash=hash_password(user.senha),
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(Usuario).filter(Usuario.email == email).first()
    if not user or not verify_password(password, user.senha_hash):
        return False
    return user


def get_user_by_email(db: Session, email: str):
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_user_by_id(db: Session, user_id: int):
    return db.query(Usuario).filter(Usuario.id == user_id).first()
