# DBScanner — Conheça o seu banco de dados

Descoberta, catálogo e insights de bancos de dados Oracle.
Parte da família **dbtech solutions** (junto com o DBVault e o DBView).

## O problema que resolve

Muitas empresas **não conhecem o próprio banco de dados**: não sabem o que cada
tabela significa, quais relacionamentos existem de verdade, onde estão os dados
pessoais (LGPD), o que está abandonado e o que está mal modelado. O conhecimento
vive na cabeça de uma ou duas pessoas.

O DBScanner conecta no schema do cliente (somente leitura, só dicionário de
dados + estatísticas do otimizador — **nunca lê os dados em si**) e produz:

- **Catálogo com histórico**: cada scan é um snapshot completo (tabelas, colunas,
  constraints, índices, relacionamentos) guardado em SQLite — dá para ver a
  evolução do schema entre scans.
- **Motor de insights** com regras em 6 categorias:
  - **Integridade**: tabelas sem PK, relacionamentos *inferidos* (FK que existe
    na prática mas não como constraint — detectado por convenção de nome)
  - **LGPD / Segurança**: colunas com CPF, CNPJ, e-mail, telefone, salário,
    nascimento…; senhas aparentemente em texto claro
  - **Performance**: FKs sem índice, tabelas gigantes sem nenhum índice
  - **Modelagem**: datas armazenadas como VARCHAR2, etc.
  - **Documentação**: cobertura de comentários no dicionário
  - **Limpeza**: tabelas vazias/abandonadas, colunas 100% nulas
- **Base de conhecimento**: glossário de negócio por tabela/coluna que sobrevive
  entre scans e alimenta o **índice de conhecimento (0–100%)** — a métrica-chave
  do produto: *quanto do seu banco a sua empresa realmente conhece?*
- **Motor de conhecimento (aprende com o uso)**: a partir das anotações do
  usuário, dos relacionamentos e dos insights, o DBScanner **sugere** novo
  conhecimento — anotou `CLIENTES.CPF`, ele propõe o mesmo significado para
  `FUNCIONARIOS.CPF`; nomeou a tabela `CLIENTES`, ele descreve as FKs que
  apontam para ela; marcou uma tabela com tag `lgpd`, ele sugere anotar as
  colunas sensíveis detectadas. Cada sugestão aceita gera novas sugestões.
- **Evolução entre scans**: compara o snapshot atual com o anterior — tabelas e
  colunas que surgiram/sumiram, crescimento de volume, insights novos,
  recorrentes e **resolvidos**, e o histórico do índice de conhecimento.

## Como rodar

### Backend (porta 4200)
```
cd backend
npm install
npm start
```

### Frontend (porta 3200)
```
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:3200** e clique em **Executar Scan**.

## Modos de operação

Configurado em `backend/.env` (`DBSCANNER_MODE`):

- **`demo`** (padrão): escaneia um **ERP simulado com 14 tabelas** e problemas
  realistas plantados (tabela de log sem PK, FK implícita de vendedores, CPF e
  senha em texto na tabela de funcionários, tabela temporária abandonada, data
  como VARCHAR2…) — ideal para demonstração ao cliente.
- **`oracle`**: conecta em um Oracle real via `node-oracledb` em modo thin
  (sem Instant Client). Configure `ORACLE_USER`, `ORACLE_PASSWORD`,
  `ORACLE_CONNECT_STRING` e opcionalmente `ORACLE_TARGET_SCHEMA`.

### Usuário de scan no Oracle (somente leitura)

```sql
CREATE USER dbscanner_ro IDENTIFIED BY "SenhaForte#2026";
GRANT CREATE SESSION TO dbscanner_ro;
GRANT SELECT_CATALOG_ROLE TO dbscanner_ro;
```

O scanner só consulta `all_tables`, `all_tab_columns`, `all_constraints`,
`all_indexes`, `all_objects` e comentários — argumento comercial importante:
**o DBScanner não precisa de acesso aos dados do cliente.**

## Arquitetura

```
backend/
  src/catalog.js       repositório SQLite (snapshots + base de conhecimento)
  src/scanner/         oracle.js (dicionário real) | simulator.js (demo)
  src/engine/          insights.js (regras + relações inferidas + métricas)
                       knowledge.js (sugestões aprendidas das anotações)
                       evolution.js (diff entre snapshots + histórico)
  src/routes/api.js    API REST
  data/catalog.db      catálogo persistente (criado no 1º boot)
frontend/              Next.js 16 + Tailwind 4 (mesmo padrão DBView/DBVault)
  /                    dashboard (métricas, severidades, índice de conhecimento)
  /tables[/NOME]       navegador do schema (colunas, índices, relações, insights)
  /insights            todos os achados com filtros
  /knowledge           editor da base de conhecimento + sugestões do motor
  /evolution           o que mudou entre os dois últimos scans
```

## Roadmap

- **Fase 2 — Perfilamento profundo** (opt-in): amostragem real dos dados para
  validar CPF/CNPJ por conteúdo (não só nome de coluna), detectar órfãos de FK
  inferida e domínios de valores.
- **Fase 3 — Motor de conhecimento com IA**: usar a API do Claude para sugerir
  descrições de negócio a partir de nomes/valores e responder perguntas em
  linguagem natural ("onde ficam os dados de faturamento?").
- **Fase 4 — Multi-SGBD**: SQL Server e PostgreSQL (o snapshot canônico já é
  neutro de fornecedor).
- **Integrações**: exportar inventário LGPD; abrir proteção no DBVault a partir
  de um insight de dado sensível.
