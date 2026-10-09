# DBView — Raio-X do seu Oracle

Monitoramento visual e alertas inteligentes para bancos de dados Oracle.
Parte da família **dbtech solutions** (junto com o DBVault).

## O que ele faz

O DBView coleta continuamente as métricas dos bancos (views `v$` e `dba_`) e:

- **Visão de frota**: um card por banco com status bem/mal — clique para expandir o raio-X completo
- **Gráfico Top Activity (ASH)** estilo Enterprise Manager: sessões ativas empilhadas
  por classe de espera (CPU, User I/O, Concurrency...), linha de CPU máxima e
  painéis de **Top SQL** / **Top Sessões** (no modo real usa amostragem de
  `v$session` — não exige licença do Diagnostics Pack)
- **Índice de saúde (0–100)** com classificação de velocidade: **Rápido / Normal / Lento / Sobrecarga**
- **Alertas com sugestão de ação**, por exemplo:
  - Senha de usuário expirando (antes da aplicação parar de conectar)
  - Sessões/processos chegando perto do limite → sugestão de aumentar `SESSIONS`/`PROCESSES`
  - Cursores perto do `OPEN_CURSORS` → sugestão de aumentar o parâmetro
  - Sessões demorando mais que o normal, bloqueios entre sessões
  - Carga/latência **fora do padrão histórico** do próprio banco (baseline automático)
  - Tablespaces acima de 85%/95%
- **Gráficos em tempo real** de sessões ativas, CPU e latência
- Telas de **Sessões**, **Alertas**, **Segurança**, **Tablespaces** e **Parâmetros**

## Como rodar

### Backend (porta 4100)
```
cd backend
npm install
npm start
```

### Frontend (porta 3100)
```
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:3100**.

## Modos de operação

Configurado em `backend/.env` (`DBVIEW_MODE`):

- **`demo`** (padrão): simula uma **frota de 4 bancos** com perfis distintos
  (produção ERP com incidentes cíclicos, data warehouse com cargas ETL, PDV com
  vazamento de sessões, homologação saudável) — ideal para demonstração ao
  cliente sem precisar de banco.
- **`oracle`**: conecta em um Oracle real via `node-oracledb` em **modo thin**
  (não precisa de Oracle Instant Client). Configure `ORACLE_USER`,
  `ORACLE_PASSWORD` e `ORACLE_CONNECT_STRING` (ex.: `host:1521/SERVICE`).

`DBVIEW_PLAN` define o plano do cliente: **`free`** monitora 1 instância,
**`pro`** monitora até 5 (base do modelo de negócio free/pago).

### Usuário de monitoramento no Oracle

```sql
CREATE USER dbview_mon IDENTIFIED BY "SenhaForte#2026";
GRANT CREATE SESSION TO dbview_mon;
GRANT SELECT ON v_$instance TO dbview_mon;
GRANT SELECT ON v_$session TO dbview_mon;
GRANT SELECT ON v_$process TO dbview_mon;
GRANT SELECT ON v_$parameter TO dbview_mon;
GRANT SELECT ON v_$sysmetric TO dbview_mon;
GRANT SELECT ON v_$system_wait_class TO dbview_mon;
GRANT SELECT ON v_$sesstat TO dbview_mon;
GRANT SELECT ON v_$statname TO dbview_mon;
GRANT SELECT ON v_$sql TO dbview_mon;
GRANT SELECT ON dba_users TO dbview_mon;
GRANT SELECT ON dba_objects TO dbview_mon;
GRANT SELECT ON dba_tablespaces TO dbview_mon;
GRANT SELECT ON dba_tablespace_usage_metrics TO dbview_mon;
```

(ou simplesmente `GRANT SELECT_CATALOG_ROLE TO dbview_mon;`)

## Arquitetura

```
backend/
  src/collector/   coleta (oracle.js = real, simulator.js = demo)
  src/store/       histórico em memória + baseline (média móvel)
  src/engine/      alerts.js (regras + anomalia) e health.js (índice de saúde)
  src/routes/      API REST consumida pelo frontend
frontend/          Next.js 16 + Tailwind 4 + Recharts (mesmo padrão do DBVault)
```
