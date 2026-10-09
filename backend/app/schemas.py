from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List
from app.models import RoleEnum
import re


class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    role: RoleEnum


class UsuarioCreate(UsuarioBase):
    senha: str

    @field_validator("senha")
    @classmethod
    def validate_password_strength(cls, v):
        """Validar força de senha - mínimo 8 caracteres com complexidade"""
        if len(v) < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")

        # Verificar se tem letra maiúscula
        if not re.search(r"[A-Z]", v):
            raise ValueError("Senha deve conter pelo menos uma letra maiúscula")

        # Verificar se tem letra minúscula
        if not re.search(r"[a-z]", v):
            raise ValueError("Senha deve conter pelo menos uma letra minúscula")

        # Verificar se tem número
        if not re.search(r"[0-9]", v):
            raise ValueError("Senha deve conter pelo menos um número")

        # Verificar se tem caractere especial
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};:'\",.<>?/\\|`~]", v):
            raise ValueError("Senha deve conter pelo menos um caractere especial")

        return v


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    role: Optional[RoleEnum] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class ProdutoBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: float
    estoque: int = 0
    categoria: Optional[str] = None


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[float] = None
    estoque: Optional[int] = None
    ativo: Optional[bool] = None
    categoria: Optional[str] = None


class ProdutoResponse(ProdutoBase):
    id: int
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime

    class Config:
        from_attributes = True


class ItemVendaBase(BaseModel):
    produto_id: int
    quantidade: int


class ItemVendaCreate(ItemVendaBase):
    pass


class ItemVendaUpdate(BaseModel):
    pronto: bool


class ItemVendaResponse(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: float
    subtotal: float
    pronto: bool
    criado_em: datetime
    produto_nome: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            'id': obj.id,
            'produto_id': obj.produto_id,
            'quantidade': obj.quantidade,
            'preco_unitario': obj.preco_unitario,
            'subtotal': obj.subtotal,
            'pronto': obj.pronto,
            'criado_em': obj.criado_em,
            'produto_nome': obj.produto.nome if obj.produto else None
        }
        return cls(**data)


class VendaBase(BaseModel):
    cliente_nome: Optional[str] = None
    metodo_pagamento: str = "dinheiro"


class VendaCreate(VendaBase):
    itens: List[ItemVendaBase]


class VendaResponse(VendaBase):
    id: int
    usuario_id: int
    total: float
    criado_em: datetime
    itens: List[ItemVendaResponse]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            'id': obj.id,
            'usuario_id': obj.usuario_id,
            'cliente_nome': obj.cliente_nome,
            'metodo_pagamento': obj.metodo_pagamento,
            'total': obj.total,
            'criado_em': obj.criado_em,
            'itens': [ItemVendaResponse.from_orm(item) for item in obj.itens]
        }
        return cls(**data)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class CaixaBase(BaseModel):
    valor_inicial: float = 0.0


class CaixaCreate(CaixaBase):
    pass


class CaixaClose(BaseModel):
    valor_final: float


class CaixaResponse(CaixaBase):
    id: int
    usuario_id: int
    data: datetime
    aberto_em: datetime
    fechado_em: Optional[datetime] = None
    valor_final: float
    total_vendas: float
    aberto: bool

    class Config:
        from_attributes = True


class EventoConfigResponse(BaseModel):
    id: int
    codigo_acesso_ativo: str
    atualizado_em: datetime

    class Config:
        from_attributes = True


class EventoConfigUpdate(BaseModel):
    codigo_acesso_ativo: str


class ItemPreVendaResponse(BaseModel):
    id: int
    produto_id: int
    quantidade: int
    preco_unitario: float
    subtotal: float
    produto_nome: Optional[str] = None

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            'id': obj.id,
            'produto_id': obj.produto_id,
            'quantidade': obj.quantidade,
            'preco_unitario': obj.preco_unitario,
            'subtotal': obj.subtotal,
            'produto_nome': obj.produto.nome if obj.produto else None
        }
        return cls(**data)


class PreVendaBase(BaseModel):
    cliente_nome: str


class PreVendaCreate(PreVendaBase):
    itens: List[ItemVendaBase]


class PreVendaResponse(PreVendaBase):
    id: int
    total: float
    pago: bool
    entregue: bool
    # Vendas diretas do PDV entram por dict e nao tem esse campo: default False.
    cancelada: bool = False
    # So vem preenchido na criacao do pedido, para o celular do cliente guardar.
    # O from_orm nao inclui, entao consultas e listagens nunca expoem o token.
    token_cliente: Optional[str] = None
    criado_em: datetime
    itens: List[ItemPreVendaResponse]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        data = {
            'id': obj.id,
            'cliente_nome': obj.cliente_nome,
            'total': obj.total,
            'pago': obj.pago,
            'entregue': obj.entregue,
            'cancelada': getattr(obj, 'cancelada', False),
            'criado_em': obj.criado_em,
            'itens': [ItemPreVendaResponse.from_orm(item) for item in obj.itens]
        }
        return cls(**data)


class PreVendaConfirm(BaseModel):
    metodo_pagamento: str = "dinheiro"
