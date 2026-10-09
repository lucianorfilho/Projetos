from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class RoleEnum(str, enum.Enum):
    ADMIN = "admin"
    PONTO_VENDA = "ponto_venda"
    COZINHA = "cozinha"


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(RoleEnum), default=RoleEnum.PONTO_VENDA, nullable=False)
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    vendas = relationship("Venda", back_populates="usuario")


class Produto(Base):
    __tablename__ = "produtos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, index=True)
    descricao = Column(String(500))
    preco = Column(Float, nullable=False)
    estoque = Column(Integer, default=0)
    categoria = Column(String(50), default="Sem categoria")
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    itens_venda = relationship("ItemVenda", back_populates="produto")


class Venda(Base):
    __tablename__ = "vendas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    cliente_nome = Column(String(255), nullable=True)
    total = Column(Float, default=0.0)
    metodo_pagamento = Column(String(50), default="dinheiro")
    entregue = Column(Boolean, default=False)
    # Some da tela da cozinha sem apagar a venda: o faturamento, o relatorio e o
    # fechamento de caixa continuam contando este registro normalmente.
    oculto_cozinha = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    usuario = relationship("Usuario", back_populates="vendas")
    itens = relationship("ItemVenda", back_populates="venda", cascade="all, delete-orphan")


class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id = Column(Integer, primary_key=True, index=True)
    venda_id = Column(Integer, ForeignKey("vendas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    pronto = Column(Boolean, default=False)
    criado_em = Column(DateTime, default=datetime.utcnow)

    venda = relationship("Venda", back_populates="itens")
    produto = relationship("Produto", back_populates="itens_venda")


class Caixa(Base):
    __tablename__ = "caixas"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data = Column(DateTime, default=datetime.utcnow)
    aberto_em = Column(DateTime, default=datetime.utcnow)
    fechado_em = Column(DateTime, nullable=True)
    valor_inicial = Column(Float, default=0.0)
    valor_final = Column(Float, default=0.0)
    total_vendas = Column(Float, default=0.0)
    aberto = Column(Boolean, default=True)

    usuario = relationship("Usuario")


class EventoConfig(Base):
    __tablename__ = "evento_config"

    id = Column(Integer, primary_key=True, index=True)
    codigo_acesso_ativo = Column(String(50), nullable=False, default="EVENTO2024")
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PreVenda(Base):
    __tablename__ = "pre_vendas"

    id = Column(Integer, primary_key=True, index=True)
    cliente_nome = Column(String(255), nullable=False)
    total = Column(Float, default=0.0)
    pago = Column(Boolean, default=False)
    entregue = Column(Boolean, default=False)
    convertida = Column(Boolean, default=False)
    oculto_cozinha = Column(Boolean, default=False)
    # Cancelada no caixa (problema no pagamento, cliente desistiu). So vale
    # enquanto nao foi paga: depois de paga virou Venda, e desfazer seria estorno.
    cancelada = Column(Boolean, default=False)
    # Chave secreta devolvida so a quem criou o pedido, para o proprio cliente
    # poder cancelar do celular sem login. Sem ela, qualquer um com o codigo do
    # evento cancelaria o pedido dos outros.
    token_cliente = Column(String(64), nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    itens = relationship("ItemPreVenda", back_populates="pre_venda", cascade="all, delete-orphan")


class ItemPreVenda(Base):
    __tablename__ = "itens_pre_venda"

    id = Column(Integer, primary_key=True, index=True)
    pre_venda_id = Column(Integer, ForeignKey("pre_vendas.id"), nullable=False)
    produto_id = Column(Integer, ForeignKey("produtos.id"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    pre_venda = relationship("PreVenda", back_populates="itens")
    produto = relationship("Produto")
