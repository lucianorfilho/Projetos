# 📂 Estrutura do Projeto dbControl

Visão completa da organização do projeto.

```
dbControl/
│
├── 📄 README.md                      ← Documentação principal
├── 📄 CLAUDE.md                      ← Instruções para desenvolvedores
├── 📄 TROUBLESHOOTING.md             ← Guia de resolução de problemas
├── 📄 API_EXAMPLES.md                ← Exemplos de requisições HTTP
├── 📄 PROJECT_STRUCTURE.md           ← Este arquivo
├── 📄 .gitignore                     ← Arquivos ignorados pelo Git
├── 📄 setup.ps1                      ← Script de setup para Windows
│
├── 🗂️  .claude/
│   └── launch.json                   ← Configuração de launch para Claude Code
│       - Backend em 4600
│       - Frontend em 3600
│
├── 🗂️  backend/                      ← API Flask (Python)
│   ├── 📄 app.py                     ← Aplicação principal
│   │   ├── Models
│   │   │   ├── Produto (id, nome, sku, preço, estoque...)
│   │   │   ├── Venda (produto_id, quantidade, total...)
│   │   │   ├── Promoção (produto_id, desconto, data_inicio/fim)
│   │   │   └── AlertaEstoque (produto_id, data, resolvido)
│   │   │
│   │   └── Routes
│   │       ├── GET /api/produtos
│   │       ├── POST /api/produtos
│   │       ├── PUT /api/produtos/<id>
│   │       ├── GET /api/vendas
│   │       ├── POST /api/vendas
│   │       ├── GET /api/alertas
│   │       ├── PUT /api/alertas/<id>/resolver
│   │       ├── POST /api/promocoes
│   │       ├── GET /api/relatorios/dashboard
│   │       ├── GET /api/relatorios/produtos-mais-vendidos
│   │       └── GET /api/relatorios/estoque
│   │
│   ├── 📄 requirements.txt            ← Dependências Python
│   │   ├── Flask 3.0.0
│   │   ├── Flask-CORS 4.0.0
│   │   ├── Flask-SQLAlchemy 3.1.1
│   │   ├── python-dotenv 1.0.0
│   │   └── Werkzeug 3.0.1
│   │
│   ├── 📄 .env                        ← Variáveis de ambiente
│   │   ├── FLASK_ENV=development
│   │   ├── FLASK_DEBUG=True
│   │   ├── DATABASE_URL
│   │   └── SECRET_KEY
│   │
│   ├── 📄 seed_data.py                ← Script para popular banco com dados de teste
│   │   ├── 10 produtos de exemplo
│   │   ├── 50 vendas aleatórias
│   │   └── Alertas automáticos
│   │
│   └── 📦 dbcontrol.db                ← Banco de dados SQLite (criado na primeira execução)
│       ├── Table: produtos
│       ├── Table: vendas
│       ├── Table: promocoes
│       └── Table: alertas_estoque
│
├── 🗂️  frontend/                      ← Interface React (TypeScript)
│   │
│   ├── 📄 package.json                ← Dependências e scripts
│   │   ├── npm install
│   │   ├── npm run dev
│   │   └── npm run build
│   │
│   ├── 📄 index.html                  ← Arquivo HTML principal
│   │
│   ├── 📄 vite.config.ts              ← Configuração Vite
│   │   ├── Porta: 3600
│   │   └── Proxy para API: localhost:4600
│   │
│   ├── 📄 tsconfig.json               ← Configuração TypeScript
│   ├── 📄 tsconfig.node.json          ← Configuração TypeScript (Node)
│   │
│   ├── 📄 .env                        ← Variáveis de ambiente
│   │   └── VITE_API_URL=http://localhost:4600/api
│   │
│   ├── 🗂️  src/                       ← Código-fonte React
│   │   │
│   │   ├── 📄 main.tsx                ← Ponto de entrada
│   │   ├── 📄 App.tsx                 ← Componente principal
│   │   ├── 📄 App.css                 ← Estilos globais
│   │   │
│   │   └── 📂 pages/                  ← Páginas da aplicação
│   │       ├── Dashboard.tsx          ← Visão geral do negócio
│   │       │   └── Métricas: produtos, estoque baixo, vendas hoje, alertas
│   │       │
│   │       ├── Produtos.tsx           ← Gestão de produtos
│   │       │   ├── Listar produtos
│   │       │   ├── Criar novo produto
│   │       │   ├── Ver status de estoque
│   │       │   └── Categorias
│   │       │
│   │       ├── Vendas.tsx             ← Registro de vendas
│   │       │   ├── Registrar venda
│   │       │   ├── Aplicar desconto
│   │       │   ├── Histórico
│   │       │   └── Filtro por data
│   │       │
│   │       ├── Alertas.tsx            ← Monitoramento de estoque
│   │       │   ├── Listar alertas pendentes
│   │       │   ├── Marcar como resolvido
│   │       │   └── Auto-refresh (30s)
│   │       │
│   │       └── Relatorios.tsx         ← Análises e insights
│   │           ├── Produtos mais vendidos
│   │           ├── Gráfico de vendas
│   │           ├── Resumo de estoque
│   │           └── Valor total em inventário
│   │
│   └── 📦 node_modules/               ← Dependências JavaScript (criado após npm install)
│       ├── react
│       ├── react-dom
│       ├── react-router-dom
│       ├── axios
│       ├── recharts
│       └── ... (mais dependências)
│
└── 📚 Documentação
    ├── README.md                      (60 seções, instruções completas)
    ├── CLAUDE.md                      (Arquitetura, convenções)
    ├── API_EXAMPLES.md                (Exemplos de curl)
    ├── TROUBLESHOOTING.md             (30+ problemas comum)
    └── PROJECT_STRUCTURE.md           (Este arquivo)

```

---

## 📊 Estatísticas do Projeto

```
Arquivos de Código:
  - Python:       2 arquivos (app.py, seed_data.py)
  - TypeScript:   5 arquivos (App.tsx + 4 pages)
  - CSS:          1 arquivo  (App.css)
  - JSON:         4 arquivos (package.json, tsconfig.json, launch.json, venv)
  - Markdown:     5 arquivos (README.md, CLAUDE.md, etc)

Linhas de Código Aproximadas:
  - Backend:      ~450 linhas (app.py)
  - Frontend:     ~800 linhas (React components)
  - Total:        ~1.250 linhas

Dependências:
  - Backend:      5 dependências
  - Frontend:     6 dependências diretas
```

---

## 🔄 Fluxo de Dados

```
Usuário (Browser)
    ↓
Frontend (React/TypeScript) - Port 3600
    ├── Dashboard.tsx
    ├── Produtos.tsx
    ├── Vendas.tsx
    ├── Alertas.tsx
    └── Relatorios.tsx
    ↓
Axios HTTP Requests
    ↓
Backend API (Flask) - Port 4600
    ├── GET /api/produtos
    ├── POST /api/vendas
    ├── GET /api/alertas
    ├── GET /api/relatorios/*
    └── ...
    ↓
SQLAlchemy ORM
    ↓
SQLite Database
    ├── produtos
    ├── vendas
    ├── promocoes
    └── alertas_estoque
```

---

## 📝 Arquivos por Função

### 🔐 Banco de Dados
- `backend/dbcontrol.db` - Arquivo SQLite (gerado automaticamente)

### 🐍 Backend Python
- `backend/app.py` - Lógica principal, modelos, rotas
- `backend/seed_data.py` - Dados de teste
- `backend/requirements.txt` - Dependências
- `backend/.env` - Configurações

### 🎨 Frontend React
- `frontend/index.html` - HTML raiz
- `frontend/src/main.tsx` - Bootstrap React
- `frontend/src/App.tsx` - Componente raiz
- `frontend/src/App.css` - Estilos globais
- `frontend/src/pages/*.tsx` - Páginas

### ⚙️ Configuração
- `.claude/launch.json` - Config Claude Code
- `frontend/vite.config.ts` - Config Vite
- `frontend/tsconfig.json` - Config TypeScript
- `.gitignore` - Git ignore

### 📚 Documentação
- `README.md` - Guia principal
- `CLAUDE.md` - Dev guide
- `API_EXAMPLES.md` - Exemplos API
- `TROUBLESHOOTING.md` - Soluções
- `PROJECT_STRUCTURE.md` - Este arquivo

---

## 🚀 Fluxo de Inicialização

```
1. Usuário executa: python backend/app.py
   ↓
   - Carrega Flask
   - Inicializa SQLAlchemy
   - Cria tabelas se não existirem
   - Backend disponível em http://localhost:4600

2. Usuário executa: npm run dev (em frontend/)
   ↓
   - Inicia Vite dev server
   - Compila React + TypeScript
   - Frontend disponível em http://localhost:3600

3. Usuário acessa: http://localhost:3600
   ↓
   - Carrega App.tsx
   - Router renderiza Dashboard
   - Dashboard.tsx faz GET /api/relatorios/dashboard
   - Backend responde com dados
   - Frontend renderiza componentes

4. Usuário navega para /produtos
   ↓
   - Router renderiza Produtos.tsx
   - Produtos.tsx faz GET /api/produtos
   - Exibe lista de produtos

5. Usuário cria um novo produto
   ↓
   - Produtos.tsx envia POST /api/produtos
   - Backend cria produto no banco
   - Frontend recarrega lista
   - Novo produto aparece na tela
```

---

## 📦 Dependências Principais

### Backend
```python
Flask 3.0.0              # Framework web
Flask-CORS 4.0.0        # Suporte CORS
Flask-SQLAlchemy 3.1.1  # ORM
python-dotenv 1.0.0     # Variáveis de ambiente
```

### Frontend
```javascript
react 18.2.0            # UI library
react-router-dom 6.20.0 # Roteamento
axios 1.6.0             # HTTP client
recharts 2.10.0         # Gráficos
date-fns 2.30.0         # Manipulação de datas
```

---

## 🎯 Pontos-Chave do Projeto

| Aspecto | Detalhe |
|---------|---------|
| **Linguagens** | Python (backend), TypeScript (frontend) |
| **Framework Web** | Flask |
| **Framework UI** | React |
| **Database** | SQLite |
| **Estilo** | CSS customizado + gradientes |
| **Responsive** | Mobile-first, funciona em todos tamanhos |
| **Segurança** | CORS habilitado, validação de entrada |
| **Performance** | Querys otimizadas, SPA com Vite |

---

## 🔗 Conexões Internas

```
App.tsx (Router principal)
├── Dashboard.tsx (GET /relatorios/dashboard)
├── Produtos.tsx (GET/POST /produtos)
├── Vendas.tsx (GET/POST /vendas)
├── Alertas.tsx (GET/PUT /alertas)
└── Relatorios.tsx (GET /relatorios/*)
    └── Usa Recharts para visualizações

backend/app.py
├── SQLAlchemy Models (Produto, Venda, etc)
├── Flask Routes (GET, POST, PUT)
├── Database Layer (SQLite)
└── CORS Middleware
```

---

## ✅ Recursos Implementados

- [x] CRUD completo de produtos
- [x] Registro de vendas
- [x] Validação de estoque
- [x] Alertas automáticos
- [x] Gestão de promoções
- [x] Relatórios com gráficos
- [x] Dashboard em tempo real
- [x] Interface responsiva
- [x] API RESTful
- [x] Documentação completa

---

## 🚀 Próximos Passos (Opcional)

- [ ] Autenticação de usuários
- [ ] Backup automático
- [ ] Notificações por email
- [ ] Integração com payment gateway
- [ ] App mobile (React Native)
- [ ] Dark mode
- [ ] Múltiplos locais/filiais
- [ ] Histórico de auditoria

---

**Versão**: 1.0.0  
**Última atualização**: 2026-08-12  
**Status**: ✅ Completo e Pronto para Uso
