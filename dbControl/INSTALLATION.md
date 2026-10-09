# 🚀 Guia de Instalação Rápida - dbControl

Comece em 5 minutos!

## ⚡ Quick Start (Windows)

### 1️⃣ Executar Setup Automático

```bash
cd C:\Users\lucia\claude_kiwifi\dbControl
powershell -ExecutionPolicy Bypass -File setup.ps1
```

O script irá:
- ✅ Criar ambiente virtual Python
- ✅ Instalar dependências do backend
- ✅ Instalar dependências do frontend
- ✅ Criar banco de dados

### 2️⃣ Iniciar Backend

Abra um terminal PowerShell:

```bash
cd C:\Users\lucia\claude_kiwifi\dbControl\backend
.\venv\Scripts\Activate.ps1
python app.py
```

**Esperado:**
```
WARNING in app.run()
Running on http://127.0.0.1:4600
Press CTRL+C to quit
```

### 3️⃣ Iniciar Frontend

Abra outro terminal PowerShell:

```bash
cd C:\Users\lucia\claude_kiwifi\dbControl\frontend
npm run dev
```

**Esperado:**
```
Local:        http://localhost:3600
```

### 4️⃣ Acessar Aplicação

Abra seu navegador e acesse:
```
http://localhost:3600
```

---

## 🐧 Quick Start (Linux/Mac)

### 1️⃣ Setup Automático

```bash
cd ~/claude_kiwifi/dbControl
chmod +x setup.ps1

# Para Linux/Mac, adapte manualmente:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cd ../frontend
npm install
```

### 2️⃣ Iniciar Backend

```bash
cd backend
source venv/bin/activate
python app.py
```

### 3️⃣ Iniciar Frontend

```bash
cd frontend
npm run dev
```

### 4️⃣ Acessar

```
http://localhost:3600
```

---

## 📋 Pré-requisitos

Verifique se você tem instalado:

### Windows
```bash
# Verificar Python
python --version
# Deve ser 3.8+

# Verificar Node.js
node --version
npm --version
# Deve ser 16+
```

### Linux/Mac
```bash
python3 --version
node --version
npm --version
```

Se não tiver instalado:
- **Python**: https://www.python.org/downloads/
- **Node.js**: https://nodejs.org/

---

## 📊 Estrutura Criada

```
✅ 2 arquivos Python (backend)
✅ 5 componentes React (frontend)
✅ 4 arquivos de documentação
✅ 1 banco de dados SQLite
✅ Configuração de desenvolvimento pronta
```

---

## 🧪 Populando com Dados de Teste

Para carregar dados de exemplo:

```bash
cd backend

# Com venv ativado:
python seed_data.py
```

Isso criará:
- 10 produtos de exemplo
- 50 vendas aleatórias
- Alertas automáticos

---

## ✨ Primeiros Passos

### 1. Criar um Produto
1. Acesse http://localhost:3600/produtos
2. Clique em "+ Novo Produto"
3. Preencha: Nome, SKU, Preço
4. Clique em "Criar Produto"

### 2. Registrar uma Venda
1. Acesse http://localhost:3600/vendas
2. Clique em "+ Nova Venda"
3. Selecione produto
4. Digite quantidade e preço
5. Clique em "Registrar Venda"

### 3. Ver Relatórios
1. Acesse http://localhost:3600/relatorios
2. Veja produtos mais vendidos
3. Analise valor de estoque

---

## 🆘 Problemas?

### Porta 4600 em uso?
```bash
# Windows
netstat -ano | findstr :4600

# Matar processo
taskkill /PID <PID> /F

# Ou mudar porta em backend/app.py
# Linha: app.run(debug=True, port=4601)
```

### npm not found?
- Instale Node.js de https://nodejs.org/

### Python not found?
- Instale Python de https://www.python.org/

### Mais problemas?
- Consulte **TROUBLESHOOTING.md**

---

## 📚 Documentação

Após instalar, leia:

1. **README.md** - Visão geral completa
2. **CLAUDE.md** - Guia técnico de desenvolvimento
3. **API_EXAMPLES.md** - Exemplos de requisições HTTP
4. **PROJECT_STRUCTURE.md** - Estrutura do projeto
5. **TROUBLESHOOTING.md** - Resolução de problemas

---

## 🎯 Próximos Passos

Após a instalação:

- [ ] Explore o Dashboard
- [ ] Crie alguns produtos
- [ ] Registre algumas vendas
- [ ] Veja os relatórios
- [ ] Leia o código-fonte
- [ ] Faça suas customizações

---

## 🐛 Debug Mode

Para ver logs detalhados:

### Backend
```bash
# Já está em modo debug
# Veja terminal para erros
```

### Frontend
Abra DevTools (F12) e vá para:
- **Console** - Ver erros JavaScript
- **Network** - Ver requisições HTTP
- **Application** - Ver storage

---

## 🚀 Próxima: Deploy em Produção

Quando pronto para produção:

1. **Backend:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:4600 app:app
```

2. **Frontend:**
```bash
npm run build
# Arquivos em: frontend/dist/
```

---

## 📞 Suporte

- Email: lucianorfilho@gmail.com
- Leia **TROUBLESHOOTING.md** para problemas comuns

---

**Versão**: 1.0.0  
**Status**: ✅ Pronto para Usar

Bem-vindo ao dbControl! 🎉
