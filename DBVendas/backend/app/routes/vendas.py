from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, Venda, ItemVenda, Produto, RoleEnum
from app.schemas import VendaResponse, VendaCreate, ItemVendaUpdate
from app.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/vendas", tags=["vendas"])


@router.get("", response_model=list[VendaResponse])
def list_vendas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == RoleEnum.ADMIN:
        vendas = db.query(Venda).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).all()
    elif current_user.role == RoleEnum.COZINHA:
        vendas = db.query(Venda).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).all()
    else:
        vendas = db.query(Venda).filter(Venda.usuario_id == current_user.id).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).all()

    # Converter manualmente para aplicar o from_orm
    return [VendaResponse.from_orm(v) for v in vendas]


@router.get("/dia/vendas")
def vendas_do_dia(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    hoje = datetime.utcnow().date()
    vendas = db.query(Venda).filter(
        Venda.criado_em >= datetime.combine(hoje, datetime.min.time())
    ).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).all()

    total_vendas = len(vendas)
    total_faturado = sum(v.total for v in vendas)

    return {
        "data": hoje.isoformat(),
        "total_vendas": total_vendas,
        "total_faturado": total_faturado,
        "vendas": [VendaResponse.from_orm(v) for v in vendas],
    }


@router.get("/{venda_id}", response_model=VendaResponse)
def get_venda(
    venda_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    venda = db.query(Venda).filter(Venda.id == venda_id).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).first()
    if not venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada")

    if current_user.role != RoleEnum.ADMIN and venda.usuario_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    return VendaResponse.from_orm(venda)


@router.post("", response_model=VendaResponse)
def create_venda(
    venda: VendaCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PONTO_VENDA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    db_venda = Venda(
        usuario_id=current_user.id,
        cliente_nome=venda.cliente_nome,
        metodo_pagamento=venda.metodo_pagamento
    )
    total = 0.0

    for item in venda.itens:
        produto = db.query(Produto).filter(Produto.id == item.produto_id).first()
        if not produto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item.produto_id} não encontrado",
            )

        if produto.estoque < item.quantidade:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque}",
            )

        subtotal = produto.preco * item.quantidade
        total += subtotal

        db_item = ItemVenda(
            produto_id=item.produto_id,
            quantidade=item.quantidade,
            preco_unitario=produto.preco,
            subtotal=subtotal,
        )
        db_venda.itens.append(db_item)

        produto.estoque -= item.quantidade

    db_venda.total = total
    db.add(db_venda)
    db.commit()
    db.refresh(db_venda)

    # Fazer eager loading e converter
    db.refresh(db_venda, ['itens'])
    for item in db_venda.itens:
        db.refresh(item, ['produto'])

    return VendaResponse.from_orm(db_venda)


@router.patch("/itens/{item_id}")
def update_item_venda(
    item_id: int,
    item_update: ItemVendaUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.COZINHA:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    item = db.query(ItemVenda).filter(ItemVenda.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item não encontrado")

    item.pronto = item_update.pronto
    db.commit()
    db.refresh(item)
    return item
