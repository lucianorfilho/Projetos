from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, Caixa, Venda, RoleEnum
from app.schemas import CaixaResponse, CaixaCreate, CaixaClose
from app.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/caixa", tags=["caixa"])


@router.get("/status", response_model=CaixaResponse)
def get_caixa_status(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    hoje = datetime.utcnow().date()
    caixa = db.query(Caixa).filter(
        Caixa.usuario_id == current_user.id,
        Caixa.aberto == True
    ).first()

    if not caixa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Caixa não aberto")

    return caixa


@router.post("/abrir", response_model=CaixaResponse)
def abrir_caixa(
    data: CaixaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    caixa_aberto = db.query(Caixa).filter(
        Caixa.usuario_id == current_user.id,
        Caixa.aberto == True
    ).first()

    if caixa_aberto:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Já existe um caixa aberto")

    novo_caixa = Caixa(
        usuario_id=current_user.id,
        valor_inicial=data.valor_inicial,
        aberto=True
    )
    db.add(novo_caixa)
    db.commit()
    db.refresh(novo_caixa)
    return novo_caixa


@router.patch("/fechar", response_model=CaixaResponse)
def fechar_caixa(
    data: CaixaClose,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    caixa = db.query(Caixa).filter(
        Caixa.usuario_id == current_user.id,
        Caixa.aberto == True
    ).first()

    if not caixa:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Nenhum caixa aberto")

    hoje = datetime.utcnow().date()
    vendas_hoje = db.query(Venda).filter(
        Venda.criado_em >= datetime.combine(hoje, datetime.min.time())
    ).all()

    total_vendas = sum(v.total for v in vendas_hoje)

    caixa.valor_final = data.valor_final
    caixa.total_vendas = total_vendas
    caixa.fechado_em = datetime.utcnow()
    caixa.aberto = False

    db.commit()
    db.refresh(caixa)
    return caixa


@router.get("", response_model=list[CaixaResponse])
def listar_caixas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    caixas = db.query(Caixa).filter(Caixa.usuario_id == current_user.id).order_by(Caixa.data.desc()).all()
    return caixas
