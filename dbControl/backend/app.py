from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///dbcontrol.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class Produto(db.Model):
    __tablename__ = 'produtos'

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    descricao = db.Column(db.Text)
    sku = db.Column(db.String(100), unique=True, nullable=False)
    preco_custo = db.Column(db.Float, nullable=False)
    preco_venda = db.Column(db.Float, nullable=False)
    estoque_atual = db.Column(db.Integer, default=0)
    estoque_minimo = db.Column(db.Integer, default=10)
    categoria = db.Column(db.String(100))
    ativo = db.Column(db.Boolean, default=True)
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)

    vendas = db.relationship('Venda', backref='produto', lazy=True)
    promocoes = db.relationship('Promocao', backref='produto', lazy=True)

class Venda(db.Model):
    __tablename__ = 'vendas'

    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    quantidade = db.Column(db.Integer, nullable=False)
    preco_unitario = db.Column(db.Float, nullable=False)
    total = db.Column(db.Float, nullable=False)
    data_venda = db.Column(db.DateTime, default=datetime.utcnow)
    desconto_aplicado = db.Column(db.Float, default=0)

class Promocao(db.Model):
    __tablename__ = 'promocoes'

    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    desconto_percentual = db.Column(db.Float, nullable=False)
    data_inicio = db.Column(db.DateTime, nullable=False)
    data_fim = db.Column(db.DateTime, nullable=False)
    ativa = db.Column(db.Boolean, default=True)

class AlertaEstoque(db.Model):
    __tablename__ = 'alertas_estoque'

    id = db.Column(db.Integer, primary_key=True)
    produto_id = db.Column(db.Integer, db.ForeignKey('produtos.id'), nullable=False)
    data_alerta = db.Column(db.DateTime, default=datetime.utcnow)
    resolvido = db.Column(db.Boolean, default=False)

# Routes - Produtos
@app.route('/api/produtos', methods=['GET'])
def listar_produtos():
    produtos = Produto.query.all()
    return jsonify([{
        'id': p.id,
        'nome': p.nome,
        'descricao': p.descricao,
        'sku': p.sku,
        'preco_custo': p.preco_custo,
        'preco_venda': p.preco_venda,
        'estoque_atual': p.estoque_atual,
        'estoque_minimo': p.estoque_minimo,
        'categoria': p.categoria,
        'ativo': p.ativo,
        'data_cadastro': p.data_cadastro.isoformat()
    } for p in produtos])

@app.route('/api/produtos/<int:id>', methods=['GET'])
def obter_produto(id):
    produto = Produto.query.get_or_404(id)
    return jsonify({
        'id': produto.id,
        'nome': produto.nome,
        'descricao': produto.descricao,
        'sku': produto.sku,
        'preco_custo': produto.preco_custo,
        'preco_venda': produto.preco_venda,
        'estoque_atual': produto.estoque_atual,
        'estoque_minimo': produto.estoque_minimo,
        'categoria': produto.categoria,
        'ativo': produto.ativo
    })

@app.route('/api/produtos', methods=['POST'])
def criar_produto():
    data = request.json

    if not data.get('nome') or not data.get('sku') or not data.get('preco_venda'):
        return jsonify({'erro': 'Campos obrigatórios faltando'}), 400

    produto = Produto(
        nome=data['nome'],
        descricao=data.get('descricao', ''),
        sku=data['sku'],
        preco_custo=data.get('preco_custo', 0),
        preco_venda=data['preco_venda'],
        estoque_atual=data.get('estoque_atual', 0),
        estoque_minimo=data.get('estoque_minimo', 10),
        categoria=data.get('categoria', 'Sem categoria')
    )

    db.session.add(produto)
    db.session.commit()

    return jsonify({'id': produto.id, 'mensagem': 'Produto criado com sucesso'}), 201

@app.route('/api/produtos/<int:id>', methods=['PUT'])
def atualizar_produto(id):
    produto = Produto.query.get_or_404(id)
    data = request.json

    produto.nome = data.get('nome', produto.nome)
    produto.descricao = data.get('descricao', produto.descricao)
    produto.preco_custo = data.get('preco_custo', produto.preco_custo)
    produto.preco_venda = data.get('preco_venda', produto.preco_venda)
    produto.estoque_minimo = data.get('estoque_minimo', produto.estoque_minimo)
    produto.categoria = data.get('categoria', produto.categoria)

    db.session.commit()
    return jsonify({'mensagem': 'Produto atualizado com sucesso'})

# Routes - Vendas
@app.route('/api/vendas', methods=['POST'])
def registrar_venda():
    data = request.json
    produto_id = data.get('produto_id')
    quantidade = data.get('quantidade')
    preco_unitario = data.get('preco_unitario')
    desconto_aplicado = data.get('desconto_aplicado', 0)

    if not all([produto_id, quantidade, preco_unitario]):
        return jsonify({'erro': 'Dados incompletos'}), 400

    produto = Produto.query.get_or_404(produto_id)

    if produto.estoque_atual < quantidade:
        return jsonify({'erro': 'Estoque insuficiente'}), 400

    total = (preco_unitario * quantidade) - desconto_aplicado

    venda = Venda(
        produto_id=produto_id,
        quantidade=quantidade,
        preco_unitario=preco_unitario,
        total=total,
        desconto_aplicado=desconto_aplicado
    )

    produto.estoque_atual -= quantidade

    if produto.estoque_atual <= produto.estoque_minimo:
        alerta = AlertaEstoque(produto_id=produto_id)
        db.session.add(alerta)

    db.session.add(venda)
    db.session.commit()

    return jsonify({'id': venda.id, 'mensagem': 'Venda registrada com sucesso'}), 201

@app.route('/api/vendas', methods=['GET'])
def listar_vendas():
    data_inicio = request.args.get('data_inicio')
    data_fim = request.args.get('data_fim')

    query = Venda.query

    if data_inicio:
        query = query.filter(Venda.data_venda >= datetime.fromisoformat(data_inicio))
    if data_fim:
        query = query.filter(Venda.data_venda <= datetime.fromisoformat(data_fim))

    vendas = query.all()

    return jsonify([{
        'id': v.id,
        'produto_nome': v.produto.nome,
        'quantidade': v.quantidade,
        'preco_unitario': v.preco_unitario,
        'total': v.total,
        'desconto_aplicado': v.desconto_aplicado,
        'data_venda': v.data_venda.isoformat()
    } for v in vendas])

# Routes - Alertas de Estoque
@app.route('/api/alertas', methods=['GET'])
def listar_alertas():
    alertas = AlertaEstoque.query.filter_by(resolvido=False).all()

    return jsonify([{
        'id': a.id,
        'produto_nome': a.produto.nome,
        'estoque_atual': a.produto.estoque_atual,
        'estoque_minimo': a.produto.estoque_minimo,
        'data_alerta': a.data_alerta.isoformat()
    } for a in alertas])

@app.route('/api/alertas/<int:id>/resolver', methods=['PUT'])
def resolver_alerta(id):
    alerta = AlertaEstoque.query.get_or_404(id)
    alerta.resolvido = True
    db.session.commit()
    return jsonify({'mensagem': 'Alerta resolvido'})

# Routes - Promocões
@app.route('/api/promocoes', methods=['POST'])
def criar_promocao():
    data = request.json

    promocao = Promocao(
        produto_id=data['produto_id'],
        desconto_percentual=data['desconto_percentual'],
        data_inicio=datetime.fromisoformat(data['data_inicio']),
        data_fim=datetime.fromisoformat(data['data_fim'])
    )

    db.session.add(promocao)
    db.session.commit()

    return jsonify({'id': promocao.id, 'mensagem': 'Promoção criada'}), 201

# Routes - Relatórios
@app.route('/api/relatorios/produtos-mais-vendidos', methods=['GET'])
def produtos_mais_vendidos():
    dias = request.args.get('dias', 30, type=int)
    data_limite = datetime.utcnow() - timedelta(days=dias)

    vendas = db.session.query(
        Venda.produto_id,
        Produto.nome,
        db.func.sum(Venda.quantidade).label('total_quantidade'),
        db.func.sum(Venda.total).label('total_vendido')
    ).join(Produto).filter(Venda.data_venda >= data_limite).group_by(
        Venda.produto_id, Produto.nome
    ).order_by(db.desc('total_quantidade')).limit(10).all()

    return jsonify([{
        'produto_id': v[0],
        'nome': v[1],
        'quantidade_vendida': v[2],
        'total_vendido': float(v[3]) if v[3] else 0
    } for v in vendas])

@app.route('/api/relatorios/dashboard', methods=['GET'])
def dashboard():
    total_produtos = Produto.query.count()
    produtos_baixo_estoque = Produto.query.filter(
        Produto.estoque_atual <= Produto.estoque_minimo
    ).count()

    vendas_hoje = db.session.query(db.func.sum(Venda.total)).filter(
        Venda.data_venda >= datetime.utcnow().date()
    ).scalar() or 0

    alertas_pendentes = AlertaEstoque.query.filter_by(resolvido=False).count()

    return jsonify({
        'total_produtos': total_produtos,
        'produtos_baixo_estoque': produtos_baixo_estoque,
        'vendas_hoje': float(vendas_hoje),
        'alertas_pendentes': alertas_pendentes
    })

@app.route('/api/relatorios/estoque', methods=['GET'])
def relatorio_estoque():
    produtos = Produto.query.all()

    return jsonify([{
        'id': p.id,
        'nome': p.nome,
        'sku': p.sku,
        'estoque_atual': p.estoque_atual,
        'estoque_minimo': p.estoque_minimo,
        'preco_venda': p.preco_venda,
        'valor_estoque': p.estoque_atual * p.preco_venda,
        'status': 'Crítico' if p.estoque_atual <= p.estoque_minimo else 'Normal'
    } for p in produtos])

# Health check
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=4600)
