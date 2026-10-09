from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Usuario, RoleEnum
from app.schemas import UsuarioResponse, UsuarioCreate, UsuarioUpdate
from app.services.auth import get_user_by_email, get_user_by_id, create_user, hash_password, verify_password
from app.dependencies import get_current_user


class MudarSenhaRequest(BaseModel):
    senha_atual: str
    nova_senha: str

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("/me", response_model=UsuarioResponse)
def get_current_user_info(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.patch("/me/senha")
def mudar_senha_proprio_usuario(
    request: MudarSenhaRequest,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(request.senha_atual, current_user.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")

    if len(request.nova_senha) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nova senha deve ter no mínimo 6 caracteres")

    current_user.senha_hash = hash_password(request.nova_senha)
    db.commit()
    db.refresh(current_user)
    return {"mensagem": "Senha alterada com sucesso"}


@router.get("", response_model=list[UsuarioResponse])
def list_usuarios(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    usuarios = db.query(Usuario).all()
    return usuarios


@router.get("/{usuario_id}", response_model=UsuarioResponse)
def get_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN and current_user.id != usuario_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    usuario = get_user_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    return usuario


@router.post("", response_model=UsuarioResponse)
def create_usuario(
    usuario: UsuarioCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    db_user = get_user_by_email(db, usuario.email)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email já cadastrado")

    return create_user(db, usuario)


@router.patch("/{usuario_id}", response_model=UsuarioResponse)
def update_usuario(
    usuario_id: int,
    usuario_update: UsuarioUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    usuario = get_user_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    if usuario_update.nome:
        usuario.nome = usuario_update.nome
    if usuario_update.role:
        usuario.role = usuario_update.role
    if usuario_update.ativo is not None:
        usuario.ativo = usuario_update.ativo
    if usuario_update.senha:
        usuario.senha_hash = hash_password(usuario_update.senha)

    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}")
def delete_usuario(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    if usuario_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Não pode deletar sua própria conta")

    usuario = get_user_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário não encontrado")

    db.delete(usuario)
    db.commit()
    return {"mensagem": "Usuário deletado com sucesso"}
