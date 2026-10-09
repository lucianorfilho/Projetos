# DBVendas

Sistema de vendas escalável para pequenos comércios, festas, restaurantes, etc.

## Arquitetura

- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Frontend**: React + Vite
- **Banco de Dados**: PostgreSQL

## Perfis de Usuário

- **Admin**: Gerenciamento completo (usuários, produtos, visualizar vendas)
- **Ponto de Venda**: Realizar vendas
- **Cozinha**: Visualizar e marcar itens como prontos

## Setup Backend

### Pré-requisitos
- Python 3.9+
- PostgreSQL 12+

### Instalação

1. Crie um banco de dados PostgreSQL:
```sql
CREATE DATABASE dbvendas;
```

2. Configure as variáveis de ambiente:
```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais PostgreSQL
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

4. Execute o servidor:
```bash
uvicorn app.main:app --reload --port 8000
```

O backend estará disponível em `http://localhost:8000`

## Setup Frontend

### Pré-requisitos
- Node.js 16+ e npm/yarn

### Instalação

1. Configure as variáveis de ambiente:
```bash
cd frontend
cp .env.example .env
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

## API Endpoints

### Autenticação
- `POST /auth/register` - Registrar novo usuário
- `POST /auth/login` - Fazer login

### Usuários (Admin only)
- `GET /usuarios` - Listar todos os usuários
- `GET /usuarios/{usuario_id}` - Obter detalhes de um usuário
- `POST /usuarios` - Criar novo usuário
- `PATCH /usuarios/{usuario_id}` - Atualizar usuário

### Produtos (Admin only)
- `GET /produtos` - Listar produtos
- `GET /produtos/{produto_id}` - Obter detalhes de um produto
- `POST /produtos` - Criar novo produto
- `PATCH /produtos/{produto_id}` - Atualizar produto
- `DELETE /produtos/{produto_id}` - Deletar produto

### Vendas
- `GET /vendas` - Listar vendas (Admin: todas, outros: suas vendas)
- `GET /vendas/dia/vendas` - Vendas do dia (Admin only)
- `GET /vendas/{venda_id}` - Obter detalhes de uma venda
- `POST /vendas` - Criar nova venda
- `PATCH /vendas/itens/{item_id}` - Marcar item como pronto (Cozinha only)

## Estrutura do Projeto

```
DBVendas/
├── backend/
│   ├── app/
│   │   ├── models.py          # Modelos do banco de dados
│   │   ├── schemas.py         # Schemas Pydantic
│   │   ├── database.py        # Configuração do banco
│   │   ├── config.py          # Configurações da app
│   │   ├── dependencies.py    # Dependências (autenticação)
│   │   ├── main.py            # Entrada principal
│   │   ├── services/
│   │   │   └── auth.py        # Lógica de autenticação
│   │   └── routes/
│   │       ├── auth.py        # Rotas de autenticação
│   │       ├── usuarios.py    # Rotas de usuários
│   │       ├── produtos.py    # Rotas de produtos
│   │       └── vendas.py      # Rotas de vendas
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas
│   │   └── services/          # Serviços (API calls)
│   ├── package.json
│   └── .env.example
└── README.md
```

## Próximos Passos

1. Implementar interface frontend para login e dashboard
2. Integrar autenticação no frontend
3. Criar interface de vendas para ponto de venda
4. Criar kitchen display system (KDS) para cozinha
5. Adicionar relatórios e analytics
6. Implementar sistema de pagamento
7. Testes automatizados
