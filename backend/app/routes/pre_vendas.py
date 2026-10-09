from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.database import get_db
from app.models import Usuario, PreVenda, ItemPreVenda, Produto, Venda, ItemVenda, EventoConfig, RoleEnum
from app.schemas import PreVendaResponse, PreVendaCreate, PreVendaConfirm, ItemVendaBase
from app.dependencies import get_current_user
from datetime import datetime
import secrets

router = APIRouter(prefix="/pre-vendas", tags=["pre-vendas"])


class ValidacaoCodigoError(Exception):
    pass


def validar_codigo_acesso(codigo: str, db: Session) -> bool:
    config = db.query(EventoConfig).first()
    if not config:
        return False
    return config.codigo_acesso_ativo.lower() == codigo.lower()


@router.get("", response_model=list[PreVendaResponse])
def list_pre_vendas_pendentes(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PONTO_VENDA, RoleEnum.COZINHA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    if current_user.role == RoleEnum.COZINHA:
        # Cozinha vê pré-vendas pagas que NÃO foram convertidas para venda
        pre_vendas = db.query(PreVenda).filter(
            PreVenda.pago == True,
            PreVenda.convertida == False,
            PreVenda.oculto_cozinha == False,
            PreVenda.cancelada == False
        ).options(
            joinedload(PreVenda.itens).joinedload(ItemPreVenda.produto)
        ).all()

        # Também retorna todas as vendas diretas (criadas pelo PDV)
        vendas_diretas = db.query(Venda).filter(
            Venda.oculto_cozinha == False
        ).options(
            joinedload(Venda.itens).joinedload(ItemVenda.produto)
        ).all()

        # Converte Vendas para formato PreVenda para unificar a resposta
        result = [PreVendaResponse.from_orm(pv) for pv in pre_vendas]
        for venda in vendas_diretas:
            # Cria um objeto PreVenda-like a partir de Venda
            # Usa ID 10000+ para diferenciar de pré-vendas (sem usar negativo)
            pre_venda_dict = {
                'id': 10000 + venda.id,
                'cliente_nome': venda.cliente_nome or 'Venda PDV',
                'total': venda.total,
                'pago': True,
                'entregue': venda.entregue,
                'criado_em': venda.criado_em,
                'itens': [
                    {
                        'id': item.id,
                        'produto_id': item.produto_id,
                        'quantidade': item.quantidade,
                        'preco_unitario': item.preco_unitario,
                        'subtotal': item.subtotal,
                        'produto_nome': item.produto.nome if item.produto else None
                    } for item in venda.itens
                ]
            }
            result.append(PreVendaResponse(**pre_venda_dict))

        return result
    else:
        # PDV/Admin veem pré-vendas não pagas
        pre_vendas = db.query(PreVenda).filter(
            PreVenda.pago == False,
            PreVenda.cancelada == False
        ).options(
            joinedload(PreVenda.itens).joinedload(ItemPreVenda.produto)
        ).all()

    return [PreVendaResponse.from_orm(pv) for pv in pre_vendas]


@router.get("/{pre_venda_id}", response_model=PreVendaResponse)
def get_pre_venda(pre_venda_id: int, db: Session = Depends(get_db)):
    pre_venda = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).options(
        joinedload(PreVenda.itens).joinedload(ItemPreVenda.produto)
    ).first()

    if not pre_venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pré-venda não encontrada")

    # Se foi convertida, busca a Venda correspondente para pegar status de entrega
    if pre_venda.convertida:
        venda = db.query(Venda).filter(
            Venda.cliente_nome == pre_venda.cliente_nome,
            Venda.total == pre_venda.total,
            Venda.criado_em >= pre_venda.criado_em
        ).options(
            joinedload(Venda.itens).joinedload(ItemVenda.produto)
        ).first()

        if venda:
            # Retorna dados da pré-venda mas com status de entrega da Venda
            pre_venda.entregue = venda.entregue

    return PreVendaResponse.from_orm(pre_venda)


@router.post("", response_model=PreVendaResponse)
def create_pre_venda(
    pre_venda: PreVendaCreate,
    codigo_acesso: str,
    db: Session = Depends(get_db),
):
    print(f"[PRE-VENDA] CREATE: cliente={pre_venda.cliente_nome}, codigo={codigo_acesso}")

    if not validar_codigo_acesso(codigo_acesso, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código de acesso inválido"
        )

    db_pre_venda = PreVenda(
        cliente_nome=pre_venda.cliente_nome,
        token_cliente=secrets.token_urlsafe(24),
    )
    total = 0.0

    for item in pre_venda.itens:
        produto = db.query(Produto).filter(Produto.id == item.produto_id).first()
        if not produto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item.produto_id} não encontrado",
            )

        subtotal = produto.preco * item.quantidade
        total += subtotal

        db_item = ItemPreVenda(
            produto_id=item.produto_id,
            quantidade=item.quantidade,
            preco_unitario=produto.preco,
            subtotal=subtotal,
        )
        db_pre_venda.itens.append(db_item)

    db_pre_venda.total = total
    db.add(db_pre_venda)
    db.commit()
    print(f"[PRE-VENDA] SAVED: id={db_pre_venda.id}")
    db.refresh(db_pre_venda)

    db.refresh(db_pre_venda, ['itens'])
    for item in db_pre_venda.itens:
        db.refresh(item, ['produto'])

    resposta = PreVendaResponse.from_orm(db_pre_venda)
    # Unico momento em que o token sai do servidor: o celular do cliente guarda
    # para poder cancelar depois. Nenhuma listagem ou consulta devolve isso.
    resposta.token_cliente = db_pre_venda.token_cliente
    return resposta


@router.patch("/{pre_venda_id}/confirmar", response_model=dict)
def confirmar_pre_venda(
    pre_venda_id: int,
    confirm: PreVendaConfirm,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PONTO_VENDA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    pre_venda = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).options(
        joinedload(PreVenda.itens).joinedload(ItemPreVenda.produto)
    ).first()

    if not pre_venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pré-venda não encontrada")

    # O cliente pode ter cancelado pelo celular depois que este card apareceu na
    # tela do PDV. Sem esta trava, o operador confirmaria um pedido cancelado:
    # viraria venda, baixaria estoque e entraria no faturamento indevidamente.
    if pre_venda.cancelada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pedido cancelado pelo cliente; nao pode ser confirmado",
        )

    if pre_venda.pago:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pré-venda já confirmada")

    db_venda = Venda(
        usuario_id=current_user.id,
        cliente_nome=pre_venda.cliente_nome,
        metodo_pagamento=confirm.metodo_pagamento,
        total=pre_venda.total
    )

    for pre_item in pre_venda.itens:
        produto = pre_item.produto
        if produto.estoque < pre_item.quantidade:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estoque insuficiente para {produto.nome}. Disponível: {produto.estoque}",
            )

        db_item = ItemVenda(
            produto_id=pre_item.produto_id,
            quantidade=pre_item.quantidade,
            preco_unitario=pre_item.preco_unitario,
            subtotal=pre_item.subtotal,
        )
        db_venda.itens.append(db_item)
        produto.estoque -= pre_item.quantidade

    pre_venda.pago = True
    pre_venda.convertida = True
    db.add(db_venda)
    db.add(pre_venda)
    db.commit()
    db.refresh(db_venda)

    return {
        "message": "Pré-venda confirmada com sucesso",
        "venda_id": db_venda.id,
        "total": db_venda.total
    }


@router.patch("/{pre_venda_id}/entregue", response_model=dict)
def marcar_entregue(
    pre_venda_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.COZINHA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissão")

    # Se ID é 10000+, é uma venda direta (PDV)
    if pre_venda_id >= 10000:
        venda_id = pre_venda_id - 10000
        venda = db.query(Venda).filter(Venda.id == venda_id).first()
        if not venda:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada")
        venda.entregue = True
        db.commit()
        return {"message": "Venda PDV marcada como entregue", "venda_id": venda_id}

    # Se ID é menor que 10000, é uma pré-venda
    pre_venda = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).first()

    if not pre_venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pré-venda não encontrada")

    pre_venda.entregue = True
    db.commit()

    return {"message": "Pré-venda marcada como entregue", "pre_venda_id": pre_venda_id}


@router.patch("/{pre_venda_id}/ocultar", response_model=dict)
def ocultar_da_cozinha(
    pre_venda_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Tira o pedido da tela da cozinha SEM apagar nada.

    Nao e um delete: a venda continua inteira no banco, entao faturamento,
    relatorio e fechamento de caixa seguem contando este registro. So marca
    que ele ja saiu da tela do KDS.
    """
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.COZINHA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissao")

    # ID 10000+ e venda direta do PDV; abaixo disso e pre-venda do cardapio.
    if pre_venda_id >= 10000:
        registro = db.query(Venda).filter(Venda.id == pre_venda_id - 10000).first()
        rotulo = "Venda"
    else:
        registro = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).first()
        rotulo = "Pre-venda"

    if not registro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{rotulo} nao encontrada")

    if not registro.entregue:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="So e possivel remover da tela pedidos ja entregues",
        )

    registro.oculto_cozinha = True
    db.commit()

    return {"message": f"{rotulo} removida da tela da cozinha", "id": pre_venda_id}


@router.patch("/{pre_venda_id}/cancelar", response_model=dict)
def cancelar_pre_venda(
    pre_venda_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancela uma pre-venda que ainda nao foi paga.

    Criar pre-venda nao baixa estoque (isso so acontece em /confirmar, junto com
    a criacao da Venda), entao cancelar nao devolve nada nem mexe em faturamento.
    Pre-venda ja paga NAO pode ser cancelada aqui: ela virou Venda com estoque
    baixado, e desfazer isso seria um estorno.
    """
    if current_user.role not in [RoleEnum.ADMIN, RoleEnum.PONTO_VENDA]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Sem permissao")

    pre_venda = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).first()
    if not pre_venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pre-venda nao encontrada")

    if pre_venda.pago:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pre-venda ja foi paga e virou venda; nao pode ser cancelada",
        )

    if pre_venda.cancelada:
        return {"message": "Pre-venda ja estava cancelada", "pre_venda_id": pre_venda_id}

    pre_venda.cancelada = True
    db.commit()

    return {"message": "Pre-venda cancelada", "pre_venda_id": pre_venda_id}


@router.patch("/{pre_venda_id}/cancelar-cliente", response_model=dict)
def cancelar_pelo_cliente(
    pre_venda_id: int,
    token: str,
    db: Session = Depends(get_db),
):
    """Cancelamento feito pelo proprio cliente, do celular, sem login.

    Exige o token devolvido na criacao do pedido, que so o aparelho de quem fez
    a compra tem. Pedidos antigos (anteriores a esse recurso) tem token nulo e
    por isso nunca podem ser cancelados por aqui - so pelo PDV.
    """
    pre_venda = db.query(PreVenda).filter(PreVenda.id == pre_venda_id).first()
    if not pre_venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pedido nao encontrado")

    # secrets.compare_digest evita vazar informacao pelo tempo de comparacao.
    if not pre_venda.token_cliente or not secrets.compare_digest(pre_venda.token_cliente, token):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Pedido nao pertence a este aparelho")

    if pre_venda.pago:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O caixa ja confirmou o pagamento; procure o atendente",
        )

    if pre_venda.cancelada:
        return {"message": "Pedido ja estava cancelado", "pre_venda_id": pre_venda_id}

    pre_venda.cancelada = True
    db.commit()

    return {"message": "Pedido cancelado pelo cliente", "pre_venda_id": pre_venda_id}
