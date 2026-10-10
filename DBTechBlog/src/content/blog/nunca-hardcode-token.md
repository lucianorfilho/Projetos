---
title: 'Nunca hardcodear tokens e credenciais no código-fonte'
description: 'Um PAR (Pre-Authenticated Request) da OCI direto numa constante no .js é uma credencial completa de acesso ao bucket.'
pubDate: 'Oct 09 2026'
category: 'Segurança'
---

Um **PAR (Pre-Authenticated Request)** da Oracle Cloud é uma URL que já contém a autorização
embutida — qualquer um que tenha a URL pode fazer upload/download no bucket, sem precisar de
usuário, senha ou chave. É, na prática, uma senha.

Guardar esse valor como constante no código-fonte (em vez de variável de ambiente) significa que
ele vai parar em qualquer lugar que o código for parar: repositório Git, backup, zip enviado por
e-mail, etc.

```js
// ERRADO — credencial completa no código
const PAR_BASE = 'https://objectstorage.../p/TOKEN_SECRETO/n/.../o';

// CERTO — só o .env tem o valor real, e o .env nunca é versionado
const PAR_BASE = process.env.OCI_PAR_BASE;
if (!PAR_BASE) throw new Error('OCI_PAR_BASE não configurado no .env');
```

Regra prática: qualquer coisa que, se vazar, dá acesso a algo (senha, token, chave privada `.pem`,
string de conexão com senha embutida) vai para o `.env` — nunca para um arquivo versionado. E o
`.gitignore` do projeto precisa cobrir `.env`, `*.pem` e `*.key` desde o primeiro commit.

Se um segredo já foi commitado: trocar o valor (revogar/gerar novo) resolve o problema de verdade —
remover do código só evita que *o próximo* commit continue exposto; o valor antigo continua legível
no histórico do Git até alguém reescrever esse histórico.
