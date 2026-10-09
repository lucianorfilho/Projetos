from app.database import SessionLocal
from app.models import Produto, ItemVenda

db = SessionLocal()
produtos = db.query(Produto).all()
print('📦 Produtos no banco:')
for p in produtos:
    print(f'  ID: {p.id}, Nome: {p.nome}, Preço: {p.preco}')

print('\n📋 Itens de venda:')
itens = db.query(ItemVenda).all()
for item in itens:
    produto_nome = item.produto.nome if item.produto else 'NENHUM'
    print(f'  ItemID: {item.id}, ProdutoID: {item.produto_id}, Produto: {produto_nome}')
