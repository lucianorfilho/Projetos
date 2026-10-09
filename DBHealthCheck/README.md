# 🏥 DBHealthCheck - Monitor Oracle

Aplicação simples e profissional para monitoramento de saúde de bancos Oracle, com coleta de informações e envio automático de relatórios por email.

## 🎯 Funcionalidades

- ✅ Cadastro de conexões Oracle
- ✅ Coleta de informações:
  - Espaço em tablespaces (livre/usado)
  - Memória SGA (System Global Area)
  - Memória PGA (Program Global Area)
  - Último backup
  - Espaço em discos do servidor
- ✅ Relatórios em HTML
- ✅ Envio automático por Gmail
- ✅ Agendamento diário (ex: 5:50 da manhã)
- ✅ Execução manual com um clique
- ✅ Interface web simples e intuitiva

---

## 📋 Pré-requisitos

### Para rodar localmente:
- Python 3.9+
- pip (gerenciador de pacotes Python)
- Acesso a banco Oracle (usuário com permissões)
- Conta Gmail com senha de aplicação

### Para usar o .exe:
- Windows 10 ou superior
- Oracle Instant Client (opcional, apenas se não tiver cx_Oracle)

---

## 🚀 Instalação e Uso

### Opção 1: Executável (.exe) - Recomendado para usuários finais

1. **Download do executável:**
   - Copie `DBHealthCheck.exe` para a pasta desejada
   - O arquivo é autossuficiente, sem dependências externas

2. **Primeira execução:**
   - Duplo-clique em `DBHealthCheck.exe`
   - A aplicação abrir automaticamente em `http://localhost:5000`

3. **Configuração:**
   - Vá para a aba **⚙️ Configuração**
   - Preencha os dados do Oracle
   - Preencha os dados do Gmail
   - Clique em **💾 Salvar Configuração**

### Opção 2: Rodar com Python - Para desenvolvimento

1. **Instalação de dependências:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Editar arquivo `config.json`:**
   ```json
   {
     "oracle": {
       "host": "192.168.1.100",
       "port": 1521,
       "username": "seu_usuario",
       "password": "sua_senha",
       "instance": "ORCL"
     },
     "email": {
       "email": "seu_email@gmail.com",
       "app_password": "sua_senha_app",
       "smtp_server": "smtp.gmail.com",
       "smtp_port": 587
     },
     "schedule": {
       "enabled": true,
       "time": "05:50"
     }
   }
   ```

3. **Executar a aplicação:**
   ```bash
   python main.py
   ```

4. **Acessar a interface:**
   - Abra no navegador: `http://localhost:5000`

---

## 🔧 Configuração

### 1. Oracle Database

- **Host/IP:** Endereço do servidor Oracle
- **Porta:** Normalmente 1521
- **Instância (SID):** Nome da instância (ex: ORCL)
- **Usuário:** Usuário com permissões para `dba_data_files`, `v$parameter`, `v$backup_set`
- **Senha:** Senha do usuário

**Testando a conexão:**
- Clique em 🔗 **Testar Conexão** para validar as credenciais

### 2. Gmail (SMTP)

1. Ativar verificação de dois fatores em sua conta Google
2. Gerar senha de aplicação:
   - Acesse: https://myaccount.google.com/apppasswords
   - Selecione "Mail" e "Windows Computer"
   - Copie a senha gerada (16 caracteres)
3. Preencher no formulário:
   - **Email:** Seu endereço Gmail (ex: `seu_email@gmail.com`)
   - **Senha de Aplicação:** A senha gerada acima
   - **SMTP Server:** `smtp.gmail.com` (padrão)
   - **SMTP Port:** `587` (padrão)

### 3. Agendamento

- **Ativar agendamento automático:** Marque a caixa
- **Horário:** Configure a hora e minuto (ex: 05:50)
- A aplicação executará automaticamente nesse horário todos os dias

---

## 📊 Como Usar

### Executar Monitoramento Manualmente

1. Vá para a aba **📊 Monitor**
2. Clique no botão **▶️ Analisar Agora**
3. Aguarde a execução
4. O relatório HTML será exibido na tela
5. Um email será enviado automaticamente

### Download do Relatório

- Após executar o monitoramento, clique em **📥 Download Relatório**
- O arquivo será salvo como `DBHealthCheck_YYYY-MM-DD.html`

---

## ⏰ Agendamento Automático

### Opção 1: Via Interface (Aplicação aberta)

- Ative o agendamento na aba **⏰ Agendamento**
- Deixe a aplicação aberta
- Ela executará automaticamente no horário configurado

### Opção 2: Windows Task Scheduler (Recomendado - Contínuo)

1. Abra **Agendador de Tarefas** do Windows
2. Clique em **Criar Tarefa Básica**
3. Configure:
   - **Nome:** DBHealthCheck Monitor
   - **Descrição:** Monitoramento automático Oracle
   - **Gatilho:** Diário, horário desejado (ex: 05:50)
   - **Ação:** Iniciar programa
     - Programa: `C:\caminho\para\DBHealthCheck.exe`
4. Clique em **Concluir**

A partir daí, a tarefa executará automaticamente mesmo com o Windows iniciando.

---

## 📧 Estrutura do Email

O email enviado contém:

- ✅ Tablespaces (nome, total, livre, % usado)
- ✅ Memória Oracle (SGA e PGA)
- ✅ Data do último backup
- ✅ Espaço em disco do servidor
- ✅ Alerta visual (🟢 OK / 🟠 Aviso) para espaços críticos

---

## 🔨 Gerar Executável (.exe)

Se você tem a versão Python e quer gerar o `.exe`:

```bash
# 1. Instale as dependências (incluindo PyInstaller)
pip install -r requirements.txt

# 2. Execute o script de build
python build.py

# 3. O .exe estará em: dist/DBHealthCheck.exe
```

---

## 🐛 Solução de Problemas

### Erro de Conexão Oracle
- Verifique o IP/Host e porta
- Teste a conexão com uma ferramenta como SQL Developer
- Confirme que o usuário tem permissões corretas
- Clique em 🔗 **Testar Conexão** para validar

### Email não é enviado
- Verifique se gerou a senha de app do Gmail (não a senha da conta)
- Confirme que a autenticação de dois fatores está ativada
- Teste com **🔗 Testar Conexão** (testa também o email)

### Aplicação não inicia
- Certifique-se de que Python 3.9+ está instalado
- Instale as dependências: `pip install -r requirements.txt`
- Execute no terminal: `python main.py` (para ver mensagens de erro)

---

## 📝 Licença

DBHealthCheck - Desenvolvido para monitoramento Oracle profissional

---

## 💡 Suporte

Para dúvidas ou problemas, consulte a configuração do arquivo `config.json` ou use os formulários de teste na interface.

**Desenvolvido com ❤️ para DBTechSolutions**
