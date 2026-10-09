# 🚀 Guia de Instalação - DBVault Agent v2.0

## O que foi melhorado

- ✅ **Upload ilimitado** (sem limite fixo de arquivo)
- ✅ **Progress bar com feedback real-time** (%, MB/s, ETA)
- ✅ **Segurança de acesso** (apenas proprietário acessa)

---

## 📋 Pré-requisitos

- Ubuntu 20.04 ou superior
- curl instalado
- bc (calculadora bash) para cálculos de velocidade/ETA

```bash
sudo apt-get install -y curl bc
```

---

## 🔧 Instalação

### Passo 1: Fazer Backup do Script Antigo

```bash
# Backup da versão atual
sudo cp /usr/local/bin/dbvault-sendfile /usr/local/bin/dbvault-sendfile.bak
echo "✓ Backup criado: /usr/local/bin/dbvault-sendfile.bak"
```

### Passo 2: Instalar Nova Versão

Opção A: **Download Direto (recomendado)**
```bash
sudo curl -fsSL https://seu-servidor/dbvault-sendfile-v2.sh -o /usr/local/bin/dbvault-sendfile
sudo chmod +x /usr/local/bin/dbvault-sendfile
echo "✓ Agente v2.0 instalado"
```

Opção B: **Copiar manualmente**
```bash
# Se você tem o arquivo localmente:
sudo cp /caminho/para/dbvault-sendfile-v2.sh /usr/local/bin/dbvault-sendfile
sudo chmod +x /usr/local/bin/dbvault-sendfile
```

### Passo 3: Verificar Instalação

```bash
dbvault-sendfile
# Deve mostrar: "Uso: dbvault-sendfile <caminho-do-arquivo>"
```

---

## 📦 Para os 3 Agentes/Ambientes

### Ambiente 1: Production (23.106.45.221)
✅ **JÁ INSTALADO**

Verificar:
```bash
ssh root@23.106.45.221
dbvault-sendfile /tmp/teste.bin
```

### Ambiente 2: Staging/Ubuntu
```bash
# SSH para o servidor staging
ssh user@staging-server

# Executar passos de instalação acima
sudo curl -fsSL https://seu-servidor/dbvault-sendfile-v2.sh -o /usr/local/bin/dbvault-sendfile
sudo chmod +x /usr/local/bin/dbvault-sendfile

# Testar
dbvault-sendfile /tmp/arquivo_teste.bin
```

### Ambiente 3: Development/Local
```bash
# Se tiver Ubuntu localmente:
sudo cp ./dbvault-sendfile-v2.sh /usr/local/bin/dbvault-sendfile
sudo chmod +x /usr/local/bin/dbvault-sendfile

# Testar
dbvault-sendfile /tmp/arquivo_teste.bin
```

---

## 🧪 Teste de Validação

Após instalar em cada ambiente, validar com um arquivo de teste:

### Teste 1: Arquivo Pequeno (< 10MB)
```bash
# Criar arquivo de 5MB
dd if=/dev/zero of=/tmp/test_5mb.bin bs=1M count=5

# Upload (será enviado em uma única requisição)
dbvault-sendfile /tmp/test_5mb.bin

# Resultado esperado:
# ✅ Arquivo enviado com sucesso!
```

### Teste 2: Arquivo Grande (> 10MB)
```bash
# Criar arquivo de 100MB
dd if=/dev/zero of=/tmp/test_100mb.bin bs=1M count=100

# Upload (será enviado em 10 chunks)
dbvault-sendfile /tmp/test_100mb.bin

# Resultado esperado:
# Chunk 1/10: ✓ - 10% - 0.55 MB/s - ETA: 2m42s
# Chunk 2/10: ✓ - 20% - 0.57 MB/s - ETA: 2m20s
# ... (progresso em tempo real)
# ✅ Arquivo enviado com sucesso!
```

### Teste 3: Segurança
```bash
# Login como User A
# Upload um arquivo
dbvault-sendfile /tmp/documento_confidencial.bin
# ✅ Sucesso

# Login como User B
# Tentar acessar o arquivo do User A via UI
# ❌ Acesso Negado (apenas User A pode)
```

---

## 📊 O que mudou no comportamento

### Antes (v1.0)
```
$ dbvault-sendfile arquivo_10gb.bin
Enviando arquivo_10gb.bin...
✅ Arquivo enviado com sucesso!
```
❌ Sem feedback de progresso
❌ Tela travada enquanto envia

### Depois (v2.0)
```
╔════════════════════════════════════════════════╗
║     DBVault - Upload Seguro com Progresso      ║
╚════════════════════════════════════════════════╝

📄 Arquivo: arquivo_10gb.bin
📊 Tamanho: 10240.00 MB
✓ Upload em chunks ativado (1024 chunks de 10MB)

Chunk 1/1024: ✓ - 0% - 45.32 MB/s - ETA: 3m42s
Chunk 2/1024: ✓ - 0% - 45.15 MB/s - ETA: 3m41s
...
Chunk 1024/1024: ✓ - 100% - 44.98 MB/s - ETA: 0m0s

✅ Arquivo enviado com sucesso!
```
✅ Progresso em tempo real (%, MB/s, ETA)
✅ Não trava
✅ Segurança validada

---

## 🔄 Rollback (se necessário)

Se houver problema com a v2.0, reverter para v1.0:

```bash
sudo cp /usr/local/bin/dbvault-sendfile.bak /usr/local/bin/dbvault-sendfile
sudo chmod +x /usr/local/bin/dbvault-sendfile
echo "✓ Revertido para v1.0"
```

---

## 🐛 Troubleshooting

### Problema: "Script not found" ou erros de execução
```bash
# Verificar permissões
ls -la /usr/local/bin/dbvault-sendfile
# Deve mostrar: -rwxr-xr-x

# Se não, executar:
sudo chmod +x /usr/local/bin/dbvault-sendfile
```

### Problema: Cores estranhas no output
```
# Normal em alguns terminais SSH
# Não afeta funcionalidade
# Para remover: export TERM=dumb; dbvault-sendfile arquivo.bin
```

### Problema: ETA ou velocidade incorreta
```bash
# Verificar se 'bc' está instalado
which bc
# Se não: sudo apt-get install -y bc
```

### Problema: "DBVault não está configurado"
```bash
# Verificar config
cat /etc/dbvault/config.json
# Deve ter "token" e "server_url"
# Se não, reinstalar agente
```

---

## 📝 Checklist de Instalação

Para cada um dos 3 ambientes:

- [ ] Fazer backup do script antigo
- [ ] Instalar nova versão (v2.0)
- [ ] Verificar permissões (`chmod +x`)
- [ ] Testar com arquivo pequeno (5MB)
- [ ] Testar com arquivo grande (100MB)
- [ ] Validar progresso em tempo real
- [ ] Validar segurança (outro usuário não acessa)
- [ ] Documentar resultados

---

## ✅ Confirmação de Deploy

Após instalar em todos os 3 agentes:

```bash
# Environment 1 (Production)
dbvault-sendfile --version  # v2.0

# Environment 2 (Staging)
dbvault-sendfile --version  # v2.0

# Environment 3 (Development)
dbvault-sendfile --version  # v2.0
```

---

**Data:** 14/07/2026  
**Versão:** 2.0  
**Status:** Pronto para Deploy
