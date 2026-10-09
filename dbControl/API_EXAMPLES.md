# 📚 Exemplos de Uso da API dbControl

Guia completo com exemplos de requisições HTTP para todas as funcionalidades da API.

## 🔗 Base URL
```
http://localhost:4600/api
```

## ✅ Health Check

### Verificar se o servidor está rodando
```bash
curl http://localhost:4600/api/health
```

**Resposta:**
```json
{
  "status": "ok"
}
```

---

## 📦 Produtos

### 1. Listar Todos os Produtos

```bash
curl http://localhost:4600/api/produtos
```

**Resposta:**
```json
[
  {
    "id": 1,
    "nome": "Arroz Integral 5kg",
    "descricao": "Arroz de qualidade premium",
    "sku": "ARR-INT-5",
    "preco_custo": 18.00,
    "preco_venda": 25.00,
    "estoque_atual": 45,
    "estoque_minimo": 20,
    "categoria": "Alimentos",
    "ativo": true,
    "data_cadastro": "2026-08-12T10:30:00"
  },
  ...
]
```

### 2. Obter Detalhes de um Produto

```bash
curl http://localhost:4600/api/produtos/1
```

**Resposta:**
```json
{
  "id": 1,
  "nome": "Arroz Integral 5kg",
  "descricao": "Arroz de qualidade premium",
  "sku": "ARR-INT-5",
  "preco_custo": 18.00,
  "preco_venda": 25.00,
  "estoque_atual": 45,
  "estoque_minimo": 20,
  "categoria": "Alimentos",
  "ativo": true
}
```

### 3. Criar Novo Produto

```bash
curl -X POST http://localhost:4600/api/produtos \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Feijão Premium 2kg",
    "descricao": "Feijão de primeira qualidade",
    "sku": "FEI-PREM-2",
    "preco_custo": 10.00,
    "preco_venda": 16.50,
    "estoque_atual": 30,
    "estoque_minimo": 15,
    "categoria": "Alimentos"
  }'
```

**Resposta (Sucesso - 201):**
```json
{
  "id": 11,
  "mensagem": "Produto criado com sucesso"
}
```

**Resposta (Erro - 400):**
```json
{
  "erro": "Campos obrigatórios faltando"
}
```

### 4. Atualizar Produto

```bash
curl -X PUT http://localhost:4600/api/produtos/1 \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Arroz Integral 5kg - Premium",
    "preco_venda": 26.50,
    "estoque_minimo": 25,
    "categoria": "Alimentos - Premium"
  }'
```

**Resposta:**
```json
{
  "mensagem": "Produto atualizado com sucesso"
}
```

---

## 🛍️ Vendas

### 1. Registrar Nova Venda

```bash
curl -X POST http://localhost:4600/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "quantidade": 3,
    "preco_unitario": 25.00,
    "desconto_aplicado": 5.00
  }'
```

**Resposta (Sucesso - 201):**
```json
{
  "id": 1,
  "mensagem": "Venda registrada com sucesso"
}
```

**Resposta (Erro - Estoque insuficiente):**
```json
{
  "erro": "Estoque insuficiente"
}
```

### 2. Listar Vendas (Todas)

```bash
curl http://localhost:4600/api/vendas
```

**Resposta:**
```json
[
  {
    "id": 1,
    "produto_nome": "Arroz Integral 5kg",
    "quantidade": 3,
    "preco_unitario": 25.00,
    "total": 70.00,
    "desconto_aplicado": 5.00,
    "data_venda": "2026-08-12T14:30:00"
  },
  ...
]
```

### 3. Listar Vendas com Filtro de Data

```bash
curl "http://localhost:4600/api/vendas?data_inicio=2026-08-01&data_fim=2026-08-15"
```

---

## ⚠️ Alertas de Estoque

### 1. Listar Alertas Pendentes

```bash
curl http://localhost:4600/api/alertas
```

**Resposta:**
```json
[
  {
    "id": 1,
    "produto_nome": "Feijão Carioca 1kg",
    "estoque_atual": 8,
    "estoque_minimo": 15,
    "data_alerta": "2026-08-12T10:30:00"
  },
  {
    "id": 2,
    "produto_nome": "Leite Integral 1L",
    "estoque_atual": 5,
    "estoque_minimo": 30,
    "data_alerta": "2026-08-12T11:45:00"
  }
]
```

### 2. Marcar Alerta como Resolvido

```bash
curl -X PUT http://localhost:4600/api/alertas/1/resolver
```

**Resposta:**
```json
{
  "mensagem": "Alerta resolvido"
}
```

---

## 🎯 Promoções

### 1. Criar Nova Promoção

```bash
curl -X POST http://localhost:4600/api/promocoes \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "desconto_percentual": 15.5,
    "data_inicio": "2026-08-15T00:00:00",
    "data_fim": "2026-08-31T23:59:59"
  }'
```

**Resposta:**
```json
{
  "id": 1,
  "mensagem": "Promoção criada"
}
```

---

## 📊 Relatórios

### 1. Dashboard - Métricas Principais

```bash
curl http://localhost:4600/api/relatorios/dashboard
```

**Resposta:**
```json
{
  "total_produtos": 10,
  "produtos_baixo_estoque": 2,
  "vendas_hoje": 125.50,
  "alertas_pendentes": 2
}
```

### 2. Produtos Mais Vendidos (Últimos 30 dias)

```bash
curl "http://localhost:4600/api/relatorios/produtos-mais-vendidos?dias=30"
```

**Resposta:**
```json
[
  {
    "produto_id": 1,
    "nome": "Arroz Integral 5kg",
    "quantidade_vendida": 25,
    "total_vendido": 625.00
  },
  {
    "produto_id": 3,
    "nome": "Açúcar Cristal 1kg",
    "quantidade_vendida": 18,
    "total_vendido": 117.00
  },
  ...
]
```

### 3. Relatório Completo de Estoque

```bash
curl http://localhost:4600/api/relatorios/estoque
```

**Resposta:**
```json
[
  {
    "id": 1,
    "nome": "Arroz Integral 5kg",
    "sku": "ARR-INT-5",
    "estoque_atual": 45,
    "estoque_minimo": 20,
    "preco_venda": 25.00,
    "valor_estoque": 1125.00,
    "status": "Normal"
  },
  {
    "id": 2,
    "nome": "Feijão Carioca 1kg",
    "sku": "FEI-CAR-1",
    "estoque_atual": 8,
    "estoque_minimo": 15,
    "preco_venda": 8.50,
    "valor_estoque": 68.00,
    "status": "Crítico"
  },
  ...
]
```

---

## 🔄 Filtros e Paginação

### Filtros de Data

Todos os endpoints que retornam dados com data suportam filtros:

```bash
# Vendas de um período específico
curl "http://localhost:4600/api/vendas?data_inicio=2026-08-01&data_fim=2026-08-15"

# Produtos mais vendidos em diferentes períodos
curl "http://localhost:4600/api/relatorios/produtos-mais-vendidos?dias=7"    # 7 dias
curl "http://localhost:4600/api/relatorios/produtos-mais-vendidos?dias=30"   # 30 dias
curl "http://localhost:4600/api/relatorios/produtos-mais-vendidos?dias=90"   # 90 dias
```

---

## 📈 Casos de Uso Comuns

### Fluxo Completo: Registrar Venda com Desconto

1. **Verificar estoque do produto:**
```bash
curl http://localhost:4600/api/produtos/1
```

2. **Registrar a venda:**
```bash
curl -X POST http://localhost:4600/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "quantidade": 2,
    "preco_unitario": 25.00,
    "desconto_aplicado": 5.00
  }'
```

3. **Verificar alertas de estoque:**
```bash
curl http://localhost:4600/api/alertas
```

### Criar Promoción com Produto

1. **Criar promoção:**
```bash
curl -X POST http://localhost:4600/api/promocoes \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "desconto_percentual": 20,
    "data_inicio": "2026-08-20T00:00:00",
    "data_fim": "2026-08-31T23:59:59"
  }'
```

2. **Registrar venda com desconto de promoção:**
```bash
# Preço normal: 25.00, com 20% desconto = 5.00
curl -X POST http://localhost:4600/api/vendas \
  -H "Content-Type: application/json" \
  -d '{
    "produto_id": 1,
    "quantidade": 1,
    "preco_unitario": 25.00,
    "desconto_aplicado": 5.00
  }'
```

---

## ❌ Tratamento de Erros

### Erros Comuns

| Erro | Código | Mensagem |
|------|--------|----------|
| Campos faltando | 400 | "Campos obrigatórios faltando" |
| Produto não encontrado | 404 | (implícito) |
| Estoque insuficiente | 400 | "Estoque insuficiente" |
| Dados incompletos | 400 | "Dados incompletos" |

---

## 🧪 Script de Teste Completo

Crie um arquivo `test_api.sh` para testar toda a API:

```bash
#!/bin/bash

BASE_URL="http://localhost:4600/api"

echo "🧪 Testando dbControl API..."
echo ""

# 1. Health check
echo "✅ Health check..."
curl -s $BASE_URL/health | jq .

# 2. Listar produtos
echo ""
echo "✅ Listar produtos..."
curl -s $BASE_URL/produtos | jq '.[0:2]'

# 3. Criar produto
echo ""
echo "✅ Criar produto..."
curl -s -X POST $BASE_URL/produtos \
  -H "Content-Type: application/json" \
  -d '{"nome":"Teste","sku":"TST-001","preco_venda":10}' | jq .

# 4. Dashboard
echo ""
echo "✅ Dashboard..."
curl -s $BASE_URL/relatorios/dashboard | jq .

# 5. Alertas
echo ""
echo "✅ Alertas de estoque..."
curl -s $BASE_URL/alertas | jq '.[0:2]'

echo ""
echo "✨ Testes completos!"
```

Execute com:
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## 📞 Formato de Datas

Todas as datas usam o formato ISO 8601:
```
2026-08-12T14:30:00
```

Para conversão, use online tools ou sua linguagem de programação:
- Python: `datetime.fromisoformat('2026-08-12T14:30:00')`
- JavaScript: `new Date('2026-08-12T14:30:00')`
- cURL: Use diretamente na string JSON

---

**Última atualização**: 2026-08-12
