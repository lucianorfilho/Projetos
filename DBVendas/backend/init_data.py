from app.database import SessionLocal
from app.models import Usuario, Produto, RoleEnum, EventoConfig
from app.services.auth import hash_password

db = SessionLocal()

users = [
    {"nome": "Admin", "email": "admin@dbvendas.com", "senha": "123456", "role": RoleEnum.ADMIN},
    {"nome": "PDV", "email": "venda@dbvendas.com", "senha": "123456", "role": RoleEnum.PONTO_VENDA},
    {"nome": "Cozinha", "email": "cozinha@dbvendas.com", "senha": "123456", "role": RoleEnum.COZINHA},
]

for u in users:
    user = Usuario(nome=u["nome"], email=u["email"], senha_hash=hash_password(u["senha"]), role=u["role"])
    db.add(user)
    print(f"Created: {u['email']}")

products = [
    {"nome": "Sanduiche Artesanal", "descricao": "Pão integral com frango e salada", "preco": 20.00, "estoque": 50},
    {"nome": "Bolo de Chocolate", "descricao": "Bolo caseiro", "preco": 5.00, "estoque": 30},
    {"nome": "Refrigerante", "descricao": "Gelado", "preco": 3.00, "estoque": 100},
    {"nome": "Suco Natural", "descricao": "Suco de laranja", "preco": 4.00, "estoque": 40},
]

for p in products:
    prod = Produto(nome=p["nome"], descricao=p["descricao"], preco=p["preco"], estoque=p["estoque"])
    db.add(prod)
    print(f"Created: {p['nome']}")

config = EventoConfig(codigo_acesso_ativo="EVENTO2024")
db.add(config)
print("Created: EventoConfig")

db.commit()
print("Done!")
