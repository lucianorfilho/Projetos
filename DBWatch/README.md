# DBWatch

Monitor desktop (não-web) para múltiplas instâncias Oracle: status do banco,
sistema operacional Linux do servidor (CPU, IOPS, rede) e verificação de
backup. Interface interativa em PySide6, com licenciamento por máquina.

## Rodando em modo desenvolvimento

```bash
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python run.py
```

## Licenciamento

O app só roda em máquinas ativadas. Funcionamento:

1. Na primeira execução (ou pelo botão **Licença**), o app mostra o **HWID**
   da máquina (derivado de disco/CPU/placa-mãe — não é um valor fixo igual
   em todas as máquinas).
2. Rode `tools/generate_keypair.py` **uma única vez**, em uma máquina sua
   (não precisa ser a mesma que roda o app), para gerar o par de chaves.
   A chave privada fica em `tools/private_key.pem` — **nunca** vai para o
   .exe nem para o repositório.
3. Para emitir uma licença para um HWID:
   ```bash
   python tools/generate_license.py --hwid 7F3A-9C21-4B6E-0D18 --customer "Fulano" --days 365
   ```
   Omita `--days` para licença sem expiração.
4. Cole o token gerado na tela de ativação do app. Ele só valida nessa
   máquina específica (o token amarra o HWID) e só se a assinatura bater
   com a chave pública embutida no app — ou seja, só quem tem a chave
   privada consegue gerar tokens válidos.

## Cadastro de instâncias

Cada instância tem 4 abas de configuração:

- **Oracle**: host, porta, service name, usuário/senha.
- **SO (SSH)**: opcional — se preenchido, monitora CPU, load, memória,
  IOPS/throughput de disco e rede do servidor Linux via SSH (usa `/proc`,
  não precisa de agente instalado).
- **Backup**: pasta a monitorar (remota via SSH, ou local/rede) e um
  filtro de arquivo (ex: `*.rman`). Mostra há quantas horas está o backup
  mais recente.
- **Limites de alerta**: thresholds de % de tablespace, sessões, CPU e
  atraso de backup que disparam aviso (amarelo) ou crítico (vermelho).

Senhas ficam criptografadas localmente (Fernet) em
`%LOCALAPPDATA%\DBWatch\secret.key` + `dbwatch.sqlite3` — nenhuma é
exibida em texto puro depois de salva.

## Gerando o executável

```bash
.venv\Scripts\python build.py            # dist/DBWatch.exe, sem console
.venv\Scripts\python build.py --debug    # mantém console, útil pra depurar
```

O `.exe` é standalone (`--onefile`), não precisa de Python instalado na
máquina de destino — só precisa da licença ativada para aquele PC.

## Estrutura

```
app/
  core/        modelos, SQLite de instâncias, coletores (Oracle/SSH/backup), poller em background
  license/     HWID + validação de token assinado (Ed25519)
  ui/          janela principal, cards do dashboard, detalhe com gráficos (pyqtgraph), diálogos
tools/
  generate_keypair.py   gera o par de chaves (rodar uma vez, guardar a privada)
  generate_license.py   emite tokens de licença a partir do HWID do cliente
```
