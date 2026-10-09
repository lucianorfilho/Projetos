# dbControl - Instruções de Desenvolvimento

## 📋 Visão Geral
dbControl é um sistema completo de gestão para pequenos mercados e comércios. O projeto é composto por:
- **Backend**: Flask (Python) com SQLAlchemy
- **Frontend**: React com TypeScript
- **Database**: SQLite

## 🏗️ Arquitetura

### Backend (Python/Flask)
- **Porta**: 4600
- **Localização**: `backend/app.py`
- **Database**: SQLite (`dbcontrol.db`)
- **Modelos**: Produto, Venda, Promoção, AlertaEstoque

### Frontend (React/TypeScript)
- **Porta**: 3600
- **Localização**: `frontend/src/`
- **Build Tool**: Vite
- **Componentes**: Dashboard, Produtos, Vendas, Alertas, Relatórios

## 🚀 Quick Start

### Iniciar Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
python app.py
```

### Iniciar Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📊 Funcionalidades Principais

### 1. Dashboard
- Métricas em tempo real
- Total de produtos
- Produtos com baixo estoque
- Vendas do dia
- Alertas pendentes

### 2. Produtos
- Cadastro com SKU, preços, estoque
- Categorização
- Listagem com status de estoque
- Validação de dados

### 3. Vendas
- Registro com desconto
- Validação de estoque
- Trigger automático de alertas
- Histórico completo

### 4. Alertas
- Auto-geração quando estoque ≤ mínimo
- Lista de alertas pendentes
- Marcar como resolvido
- Auto-refresh a cada 30s

### 5. Relatórios
- Produtos mais vendidos (7/30/90 dias)
- Gráfico de vendas
- Resumo de estoque
- Valor total em inventário

## 📝 Convenções de Código

### Backend
- Usar type hints em todas as funções
- Validar entrada do usuário em endpoints
- Usar try/except para erros de banco de dados
- Retornar JSON com status codes HTTP apropriados

### Frontend
- Componentes em TypeScript (.tsx)
- Usar arrow functions
- State management com React hooks
- Axios para chamadas API
- CSS Modules ou inline styles

## 🔄 Fluxo de Desenvolvimento

1. **Criar feature no frontend**
   - Criar componente em `src/pages/` ou `src/components/`
   - Usar hooks (useState, useEffect, etc)
   - Chamar API via axios

2. **Adicionar endpoint no backend**
   - Definir modelo em `app.py`
   - Criar rota Flask
   - Validar dados
   - Retornar JSON

3. **Testar integração**
   - Executar ambos os servidores
   - Testar no navegador
   - Verificar console (browser e backend)

## 🗄️ Estrutura do Banco de Dados

### Principais Tabelas
- `produtos`: Catálogo de produtos
- `vendas`: Registro de transações
- `promocoes`: Descontos e promoções
- `alertas_estoque`: Alertas automáticos

### Relacionamentos
- `vendas.produto_id` → `produtos.id`
- `promocoes.produto_id` → `produtos.id`
- `alertas_estoque.produto_id` → `produtos.id`

## 🔒 Segurança (TODO)

### A implementar em produção:
- [ ] Autenticação de usuários
- [ ] Autorização por roles
- [ ] Hash de senhas
- [ ] HTTPS
- [ ] Rate limiting
- [ ] Backup automático de BD
- [ ] Validação de entrada robusta

## 📦 Dependências

### Backend
- Flask 3.0.0
- Flask-CORS 4.0.0
- Flask-SQLAlchemy 3.1.1
- python-dotenv 1.0.0

### Frontend
- React 18.2.0
- React Router 6.20.0
- Axios 1.6.0
- Recharts 2.10.0

## 🐛 Debug

### Backend
- Ativar modo debug: `FLASK_DEBUG=True` em `.env`
- Logs no console
- Usar `print()` ou logging

### Frontend
- DevTools do navegador (F12)
- Console para erros JavaScript
- Network tab para requisições API

## 📱 Responsividade

Design mobile-first com breakpoints:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 🎨 Tema

- **Cor primária**: #667eea (roxa)
- **Cor secundária**: #764ba2 (roxa escura)
- **Sucesso**: #4caf50
- **Aviso**: #ff9800
- **Erro**: #f44336

## 📝 Padrões de Commit

```
[feature] Descrição curta
[fix] Descrição do bug corrigido
[docs] Atualização de documentação
[refactor] Reorganização de código
[test] Adição de testes
```

## 🤝 Padrões de API

### Request
```json
{
  "nome": "Produto",
  "sku": "SKU-001",
  "preco_venda": 25.00
}
```

### Response (Sucesso)
```json
{
  "id": 1,
  "mensagem": "Produto criado com sucesso"
}
```

### Response (Erro)
```json
{
  "erro": "Descrição do erro"
}
```

HTTP Status Codes:
- 200: OK
- 201: Created
- 400: Bad Request
- 404: Not Found
- 500: Server Error

## 📚 Recursos Úteis

- [Flask Documentation](https://flask.palletsprojects.com/)
- [React Documentation](https://react.dev/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/)
- [Recharts Charts](https://recharts.org/)

## 🚀 Deploy

### Backend (Produção)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:4600 app:app
```

### Frontend (Produção)
```bash
npm run build
# Servir com nginx/apache
```

## 📞 Contato

Email: lucianorfilho@gmail.com

---

**Última atualização**: 2026-08-12
