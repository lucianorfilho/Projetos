# 📊 dbControl - Sistema de Gestão para Pequenos Comércios

Um sistema moderno e completo de gestão para pequenos mercados e comércios, desenvolvido com o objetivo de otimizar a gestão diária, proporcionando maior controle e eficiência operacional.

## 🎯 Funcionalidades Principais

- **📦 Controle de Estoque Inteligente**: Gerencie o inventário em tempo real com alertas automáticos
- **🛍️ Cadastro de Produtos**: Sistema detalhado com SKU, preços e categorias
- **💳 Registro de Vendas**: Acompanhamento completo de todas as transações
- **⚠️ Alertas Automáticos**: Notificações quando produtos atingem estoque mínimo
- **💰 Gestão de Preços e Promoções**: Controle flexível de preços e descontos
- **📊 Relatórios Estratégicos**: Análise de produtos mais vendidos e valor de estoque
- **📈 Dashboard em Tempo Real**: Visão geral do negócio em um só lugar

## 🏗️ Arquitetura do Projeto

```
dbControl/
├── backend/                 # API Flask (Python)
│   ├── app.py              # Aplicação principal
│   ├── requirements.txt     # Dependências Python
│   ├── .env                # Variáveis de ambiente
│   └── dbcontrol.db        # Banco de dados SQLite
│
├── frontend/               # Interface React (TypeScript)
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Produtos.tsx
│   │   │   ├── Vendas.tsx
│   │   │   ├── Alertas.tsx
│   │   │   └── Relatorios.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── index.html
│
└── README.md              # Este arquivo
```

## 🚀 Instalação e Execução

### Pré-requisitos

- Python 3.8 ou superior
- Node.js 16 ou superior
- npm ou yarn
- Git

### 1. Configuração do Backend

```bash
# Entrar no diretório do backend
cd dbControl/backend

# Criar ambiente virtual (opcional mas recomendado)
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Executar o servidor
python app.py
```

O backend estará disponível em `http://localhost:4600`

### 2. Configuração do Frontend

```bash
# Entrar no diretório do frontend
cd dbControl/frontend

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev
```

O frontend estará disponível em `http://localhost:3600`

## 📚 API Endpoints

### Produtos
- `GET /api/produtos` - Listar todos os produtos
- `GET /api/produtos/<id>` - Obter detalhes de um produto
- `POST /api/produtos` - Criar novo produto
- `PUT /api/produtos/<id>` - Atualizar produto

### Vendas
- `GET /api/vendas` - Listar vendas com filtros de data
- `POST /api/vendas` - Registrar nova venda

### Alertas
- `GET /api/alertas` - Listar alertas de baixo estoque
- `PUT /api/alertas/<id>/resolver` - Marcar alerta como resolvido

### Promoções
- `POST /api/promocoes` - Criar nova promoção

### Relatórios
- `GET /api/relatorios/dashboard` - Dashboard com métricas principais
- `GET /api/relatorios/produtos-mais-vendidos` - Top 10 produtos mais vendidos
- `GET /api/relatorios/estoque` - Relatório completo de estoque

## 💾 Banco de Dados

O projeto utiliza SQLite como banco de dados padrão, com as seguintes tabelas:

### Tabela: produtos
- `id` (INTEGER, PRIMARY KEY)
- `nome` (STRING)
- `descricao` (TEXT)
- `sku` (STRING, UNIQUE)
- `preco_custo` (FLOAT)
- `preco_venda` (FLOAT)
- `estoque_atual` (INTEGER)
- `estoque_minimo` (INTEGER)
- `categoria` (STRING)
- `ativo` (BOOLEAN)
- `data_cadastro` (DATETIME)

### Tabela: vendas
- `id` (INTEGER, PRIMARY KEY)
- `produto_id` (INTEGER, FK)
- `quantidade` (INTEGER)
- `preco_unitario` (FLOAT)
- `total` (FLOAT)
- `data_venda` (DATETIME)
- `desconto_aplicado` (FLOAT)

### Tabela: promocoes
- `id` (INTEGER, PRIMARY KEY)
- `produto_id` (INTEGER, FK)
- `desconto_percentual` (FLOAT)
- `data_inicio` (DATETIME)
- `data_fim` (DATETIME)
- `ativa` (BOOLEAN)

### Tabela: alertas_estoque
- `id` (INTEGER, PRIMARY KEY)
- `produto_id` (INTEGER, FK)
- `data_alerta` (DATETIME)
- `resolvido` (BOOLEAN)

## 🎨 Interface do Usuário

### Dashboard
Visão geral do negócio com:
- Total de produtos cadastrados
- Quantidade de produtos com baixo estoque
- Vendas do dia
- Alertas pendentes

### Produtos
Gerenciamento completo de produtos:
- Listar todos os produtos
- Criar novos produtos
- Visualizar status de estoque
- Categorização por tipo

### Vendas
Registro e acompanhamento de transações:
- Registrar novas vendas
- Aplicar descontos
- Histórico de vendas filtrado por data
- Cálculo automático de totais

### Alertas
Monitoramento de estoque:
- Alertas automáticos de baixo estoque
- Visualização em tempo real
- Marcar alertas como resolvidos
- Auto-atualização a cada 30 segundos

### Relatórios
Análises e insights:
- Gráfico de produtos mais vendidos
- Filtro por período (7, 30, 90 dias)
- Resumo de estoque
- Valor total em inventário
- Status de cada produto

## 🔧 Configurações

### Backend (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
DATABASE_URL=sqlite:///dbcontrol.db
SECRET_KEY=seu_secret_key_aqui
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:4600/api
```

## 📱 Responsividade

A aplicação é totalmente responsiva e funciona em:
- Desktops (1280x800+)
- Tablets (768x1024)
- Smartphones (375x812+)

## 🚀 Deploy em Produção

### Backend (Flask)
Para produção, use um servidor WSGI como Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:4600 app:app
```

### Frontend (React)
```bash
npm run build
# Os arquivos estarão em dist/
```

Sirva os arquivos estáticos com nginx ou similar.

## 🔐 Segurança

Recomendações de segurança para produção:
- Altere a `SECRET_KEY` em .env
- Implemente autenticação de usuários
- Use HTTPS
- Configure CORS apropriadamente
- Valide todas as entradas
- Implemente backup automático do banco de dados

## 🐛 Troubleshooting

### Erro: "Connection refused" ao acessar API
- Verifique se o backend está rodando em `http://localhost:4600`
- Confira se a porta 4600 não está em uso

### Erro: "CORS error"
- Certifique-se de que Flask-CORS está instalado
- Verifique as configurações de CORS no backend

### Erro: "Database is locked"
- Feche outras instâncias do aplicativo
- Remova `dbcontrol.db` e reinicie se necessário

## 📝 Exemplos de Uso

### Criar um Produto
```bash
curl -X POST http://localhost:4600/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Arroz 5kg",
    "sku": "ARR-005",
    "preco_custo": 20.00,
    "preco_venda": 25.00,
    "estoque_atual": 50,
    "categoria": "Alimentos"
  }'
```

### Registrar uma Venda
```bash
curl -X POST http://localhost:4600/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "quantidade": 2,
    "preco_unitario": 25.00,
    "desconto_aplicado": 0
  }'
```

### Obter Dashboard
```bash
curl http://localhost:4600/api/relatorios/dashboard
```

## 📞 Suporte

Para reportar problemas ou sugerir melhorias, entre em contato ou abra uma issue no repositório.

## 📄 Licença

Este projeto é fornecido como está para uso em pequenos comércios e mercados.

## 👨‍💻 Autor

Desenvolvido com ❤️ para pequenos comerciantes.

---

**Versão**: 1.0.0  
**Última atualização**: 2026-08-12  
**Status**: ✅ Produção
