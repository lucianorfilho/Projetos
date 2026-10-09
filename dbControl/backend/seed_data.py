"""
Script para popular o banco de dados com dados de exemplo
Execute: python seed_data.py
"""

from app import app, db, Produto, Venda, AlertaEstoque
from datetime import datetime, timedelta
import random

def seed_database():
    with app.app_context():
        # Limpar dados existentes
        db.drop_all()
        db.create_all()

        # Produtos de exemplo
        produtos_data = [
            {
                'nome': 'Arroz Integral 5kg',
                'sku': 'ARR-INT-5',
                'preco_custo': 18.00,
                'preco_venda': 25.00,
                'estoque_atual': 45,
                'estoque_minimo': 20,
                'categoria': 'Alimentos'
            },
            {
                'nome': 'Feijão Carioca 1kg',
                'sku': 'FEI-CAR-1',
                'preco_custo': 5.00,
                'preco_venda': 8.50,
                'estoque_atual': 8,
                'estoque_minimo': 15,
                'categoria': 'Alimentos'
            },
            {
                'nome': 'Açúcar Cristal 1kg',
                'sku': 'ACU-CRI-1',
                'preco_custo': 4.50,
                'preco_venda': 6.50,
                'estoque_atual': 60,
                'estoque_minimo': 25,
                'categoria': 'Alimentos'
            },
            {
                'nome': 'Óleo de Soja 900ml',
                'sku': 'OLE-SOJ-900',
                'preco_custo': 5.00,
                'preco_venda': 7.99,
                'estoque_atual': 35,
                'estoque_minimo': 20,
                'categoria': 'Alimentos'
            },
            {
                'nome': 'Leite Integral 1L',
                'sku': 'LEI-INT-1L',
                'preco_custo': 3.50,
                'preco_venda': 5.50,
                'estoque_atual': 5,
                'estoque_minimo': 30,
                'categoria': 'Laticínios'
            },
            {
                'nome': 'Café Premium 500g',
                'sku': 'CAF-PREM-500',
                'preco_custo': 12.00,
                'preco_venda': 18.90,
                'estoque_atual': 25,
                'estoque_minimo': 10,
                'categoria': 'Bebidas'
            },
            {
                'nome': 'Pão Francês Congelado (30 unidades)',
                'sku': 'PAO-FRA-30',
                'preco_custo': 15.00,
                'preco_venda': 22.00,
                'estoque_atual': 12,
                'estoque_minimo': 8,
                'categoria': 'Padaria'
            },
            {
                'nome': 'Sabonete Líquido 500ml',
                'sku': 'SAB-LIQ-500',
                'preco_custo': 4.00,
                'preco_venda': 7.50,
                'estoque_atual': 50,
                'estoque_minimo': 20,
                'categoria': 'Higiene'
            },
            {
                'nome': 'Detergente Neutro 500ml',
                'sku': 'DET-NEU-500',
                'preco_custo': 2.00,
                'preco_venda': 3.99,
                'estoque_atual': 80,
                'estoque_minimo': 30,
                'categoria': 'Limpeza'
            },
            {
                'nome': 'Papel Higiênico (4 rolos)',
                'sku': 'PAP-HIG-4',
                'preco_custo': 6.00,
                'preco_venda': 10.50,
                'estoque_atual': 100,
                'estoque_minimo': 50,
                'categoria': 'Higiene'
            },
        ]

        # Criar produtos
        produtos = []
        for data in produtos_data:
            produto = Produto(**data)
            db.session.add(produto)
            produtos.append(produto)

        db.session.commit()

        # Criar vendas de exemplo (últimos 30 dias)
        for i in range(50):
            produto = random.choice(produtos)
            quantidade = random.randint(1, 5)
            preco_unitario = produto.preco_venda
            desconto = random.uniform(0, 2) if random.random() > 0.7 else 0
            total = (preco_unitario * quantidade) - desconto

            data_venda = datetime.utcnow() - timedelta(days=random.randint(0, 30))

            venda = Venda(
                produto_id=produto.id,
                quantidade=quantidade,
                preco_unitario=preco_unitario,
                total=total,
                desconto_aplicado=desconto,
                data_venda=data_venda
            )

            db.session.add(venda)

        db.session.commit()

        # Criar alertas para produtos com baixo estoque
        for produto in produtos:
            if produto.estoque_atual <= produto.estoque_minimo:
                alerta = AlertaEstoque(
                    produto_id=produto.id,
                    data_alerta=datetime.utcnow(),
                    resolvido=False
                )
                db.session.add(alerta)

        db.session.commit()

        print("[OK] Database populated successfully!")
        print(f"   - {len(produtos)} products created")
        print(f"   - 50 sales registered")
        print(f"   - Stock alerts generated for critical products")

if __name__ == '__main__':
    seed_database()
