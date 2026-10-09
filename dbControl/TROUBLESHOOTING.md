# 🔧 Guia de Resolução de Problemas - dbControl

Soluções para problemas comuns encontrados ao usar o dbControl.

## 🚨 Problemas de Conexão

### Erro: "Connection refused" ao acessar a API

**Sintoma:**
```
ERR_CONNECTION_REFUSED (localhost:4600)
```

**Possíveis Causas:**
1. Backend não está rodando
2. Porta 4600 já está em uso
3. Firewall está bloqueando

**Soluções:**

1. **Verificar se o backend está rodando:**
```bash
cd backend
python app.py
# Você deve ver: "Running on http://localhost:4600"
```

2. **Verificar se a porta está em uso:**
```bash
# Windows
netstat -ano | findstr :4600

# Linux/Mac
lsof -i :4600
```

3. **Matar processo usando a porta:**
```bash
# Windows (PowerShell como admin)
taskkill /PID <PID> /F

# Linux/Mac
kill -9 <PID>
```

4. **Usar uma porta diferente:**
Edite `backend/app.py`:
```python
if __name__ == '__main__':
    app.run(debug=True, port=4601)  # Mude de 4600 para 4601
```

---

## 🎨 Problemas com Frontend

### Erro: "npm: command not found"

**Sintoma:**
```
npm: command not found
```

**Solução:**
- Instale Node.js em https://nodejs.org/
- Verifique a instalação:
```bash
node --version
npm --version
```

### Erro: "Cannot GET /" ao acessar http://localhost:3600

**Sintoma:**
Frontend carrega mas mostra erro

**Possíveis Causas:**
1. Frontend não foi iniciado
2. Vite não compilou corretamente

**Soluções:**

1. **Iniciar o frontend:**
```bash
cd frontend
npm run dev
```

2. **Limpar cache e reinstalar:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

3. **Verificar se está na porta 3600:**
```bash
# Windows
netstat -ano | findstr :3600

# Linux/Mac
lsof -i :3600
```

### Erro CORS: "Access to XMLHttpRequest blocked"

**Sintoma:**
```
Access to XMLHttpRequest at 'http://localhost:4600/api/...' 
from origin 'http://localhost:3600' has been blocked by CORS policy
```

**Solução:**
Verifique se `Flask-CORS` está instalado no backend:

```bash
cd backend
pip list | grep CORS
# Deve estar: Flask-CORS

# Se não estiver:
pip install Flask-CORS
```

---

## 💾 Problemas de Banco de Dados

### Erro: "Database is locked"

**Sintoma:**
```
sqlite3.OperationalError: database is locked
```

**Possíveis Causas:**
1. Outro processo está usando o banco
2. Conexão anterior não foi fechada

**Soluções:**

1. **Fechar outras instâncias do app:**
```bash
# Windows
taskkill /IM python.exe /F

# Linux/Mac
killall python
```

2. **Remover o banco de dados e recriar:**
```bash
cd backend
rm dbcontrol.db
python app.py
# O banco será recriado automaticamente
```

3. **Verificar se há múltiplas conexões:**
```python
# Edite backend/app.py
# Procure por app.config e adicione:
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 3600,
}
```

### Erro: "No such table: produtos"

**Sintoma:**
```
sqlite3.OperationalError: no such table: produtos
```

**Solução:**
As tabelas não foram criadas. Recrie o banco:

```bash
cd backend
rm dbcontrol.db
python app.py
```

Ou popule com dados de exemplo:
```bash
python seed_data.py
```

---

## 🐍 Problemas com Python/Backend

### Erro: "ModuleNotFoundError: No module named 'flask'"

**Sintoma:**
```
ModuleNotFoundError: No module named 'flask'
```

**Solução:**

1. **Criar ambiente virtual:**
```bash
cd backend
python -m venv venv

# Ativar
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
```

2. **Instalar dependências:**
```bash
pip install -r requirements.txt
```

### Erro: "Python version too old"

**Sintoma:**
```
Python 3.7 is not supported
```

**Solução:**
- Instale Python 3.8 ou superior
- Verifique a versão:
```bash
python --version
```

### Erro: "Port already in use"

**Sintoma:**
```
Address already in use
```

**Solução:**

```bash
# Encontrar qual processo está usando a porta
# Windows
netstat -ano | findstr :4600

# Matar o processo
taskkill /PID <PID> /F
```

---

## 📱 Problemas no Navegador

### Frontend não carrega estilos CSS

**Sintoma:**
- Página carrega sem cores/styling

**Solução:**
1. Limpar cache do navegador (Ctrl+F5 ou Cmd+Shift+R)
2. Verificar console (F12) para erros

### Dados não atualizam automaticamente

**Sintoma:**
- Criar produto não aparece na lista sem recarregar

**Solução:**
Recarregue manualmente a página:
```javascript
// No console do navegador (F12)
location.reload()
```

Ou clique no botão de recarregar do navegador.

### Alertas não aparecem

**Sintoma:**
- Página de Alertas está vazia mas há produtos com baixo estoque

**Possível Causa:**
Os alertas são criados apenas quando uma venda reduz o estoque.

**Solução:**
1. Registre uma venda para um produto
2. Se o estoque ficar abaixo do mínimo, o alerta será criado

---

## 📊 Problemas com Relatórios

### Gráfico não aparece

**Sintoma:**
- Página de Relatórios carrega mas sem gráfico

**Possível Causa:**
Biblioteca Recharts não foi instalada

**Solução:**
```bash
cd frontend
npm install recharts
```

### Dados do relatório vazios

**Sintoma:**
- "Produtos Mais Vendidos" está vazio

**Possível Causa:**
Nenhuma venda foi registrada

**Solução:**
1. Populate o banco com seed data:
```bash
cd backend
python seed_data.py
```

2. Ou registre vendas manualmente via UI

---

## 🔄 Reset Completo

Se nenhuma das soluções acima funcionar, você pode fazer um reset completo:

### Reset Completo do Projeto

```bash
# 1. Parar todos os servidores (Ctrl+C)

# 2. Remover banco de dados
cd backend
rm dbcontrol.db

# 3. Remover node_modules (frontend)
cd ../frontend
rm -rf node_modules
rm package-lock.json

# 4. Reinstalar tudo
pip install -r requirements.txt

# 5. Reinstalar frontend
npm install

# 6. Popular com dados de exemplo (opcional)
cd ../backend
python seed_data.py

# 7. Iniciar novamente
# Terminal 1:
python app.py

# Terminal 2:
cd frontend
npm run dev
```

---

## 📋 Checklist de Debug

Quando algo não funciona, siga este checklist:

- [ ] Backend está rodando em http://localhost:4600?
- [ ] Frontend está rodando em http://localhost:3600?
- [ ] Banco de dados dbcontrol.db existe?
- [ ] Nenhuma erro em Console (F12)?
- [ ] CORS está configurado?
- [ ] Flask-CORS está instalado?
- [ ] Dependências Python estão instaladas?
- [ ] Dependências Node estão instaladas?
- [ ] Porta 4600 está livre?
- [ ] Porta 3600 está livre?

---

## 🆘 Quando Nada Funciona

1. **Colete informações:**
```bash
python --version
node --version
npm --version
```

2. **Verifique logs:**
- Abra Console do navegador (F12)
- Veja terminal do backend
- Veja terminal do frontend

3. **Tente zero:**
```bash
# Apague tudo e comece do zero
rm -rf backend/venv frontend/node_modules backend/dbcontrol.db
pip install -r backend/requirements.txt
cd frontend && npm install
```

4. **Reinicie sua máquina:**
- Às vezes funciona! 😄

---

## 📞 Mais Ajuda

- Verificar logs mais detalhados em Console do navegador (F12)
- Ver resposta da API em Network tab (F12 > Network)
- Ativar debug no backend:
```python
# Em backend/app.py
app.run(debug=True)  # Já está ativado
```

---

**Última atualização**: 2026-08-12

Se o problema persistir, verifique:
1. Arquivo README.md para instruções gerais
2. CLAUDE.md para detalhes técnicos
3. API_EXAMPLES.md para testes de API
