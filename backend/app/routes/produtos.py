from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Usuario, Produto, RoleEnum
from app.schemas import ProdutoResponse, ProdutoCreate, ProdutoUpdate
from app.dependencies import get_current_user

router = APIRouter(prefix="/produtos", tags=["produtos"])


@router.get("", response_model=list[ProdutoResponse])
def list_produtos(apenas_ativos: bool = False, db: Session = Depends(get_db)):
    """Lista os produtos.

    Sem parametro, devolve tudo - e o que a tela de admin precisa, para poder
    mostrar e reativar os desativados. As telas de venda (PDV e cardapio)
    passam apenas_ativos=true para nao oferecer produto desativado ao cliente.
    """
    query = db.query(Produto)
    if apenas_ativos:
        query = query.filter(Produto.ativo == True)
    return query.all()


@router.get("/{produto_id}", response_model=ProdutoResponse)
def get_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return produto


@router.post("", response_model=ProdutoResponse)
def create_produto(
    produto: ProdutoCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    db_produto = Produto(
        nome=produto.nome,
        descricao=produto.descricao,
        preco=produto.preco,
        estoque=produto.estoque,
        categoria=produto.categoria or 'Laranja',
    )
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto


@router.patch("/{produto_id}", response_model=ProdutoResponse)
def update_produto(
    produto_id: int,
    produto_update: ProdutoUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")

    if produto_update.nome is not None:
        produto.nome = produto_update.nome
    if produto_update.descricao is not None:
        produto.descricao = produto_update.descricao
    if produto_update.preco is not None:
        produto.preco = produto_update.preco
    if produto_update.estoque is not None:
        produto.estoque = produto_update.estoque
    if produto_update.ativo is not None:
        produto.ativo = produto_update.ativo
    if produto_update.categoria is not None:
        produto.categoria = produto_update.categoria

    db.commit()
    db.refresh(produto)
    return produto


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_produto(
    produto_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != RoleEnum.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")

    db.delete(produto)
    db.commit()
