from app.database import SessionLocal
from app.models import Venda, ItemVenda
from app.schemas import VendaResponse
from sqlalchemy.orm import joinedload
import json

db = SessionLocal()
venda = db.query(Venda).options(joinedload(Venda.itens).joinedload(ItemVenda.produto)).first()

if venda:
    print('Venda ID:', venda.id)
    print('Cliente:', venda.cliente_nome)
    print('Itens:')
    for item in venda.itens:
        print(f'  - Item ID: {item.id}, Produto ID: {item.produto_id}')
        print(f'    Produto objeto: {item.produto}')
        print(f'    Produto nome: {item.produto.nome if item.produto else "NONE"}')

    # Converter para schema
    schema = VendaResponse.from_orm(venda)
    print('\nSchema response:')
    print(f'  Itens count: {len(schema.itens)}')
    for item_resp in schema.itens:
        print(f'    Item ID: {item_resp.id}, Produto Nome: {item_resp.produto_nome}')

    # JSON
    print('\nJSON:')
    json_data = schema.model_dump_json()
    print(json_data)
else:
    print('Nenhuma venda encontrada')
