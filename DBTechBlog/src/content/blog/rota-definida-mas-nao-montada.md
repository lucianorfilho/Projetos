---
title: 'Rota existe no código mas devolve 404: verificar se foi registrada no app principal'
description: 'Um arquivo de rotas (ex. admin.js) correto e completo não funciona sozinho — precisa de um app.use() no index.js.'
pubDate: 'Oct 09 2026'
---

Em apps Express organizados por módulo de rota (`routes/admin.js`, `routes/auth.js`...), é fácil
criar um arquivo de rotas inteiro, com toda a lógica certa, e esquecer de conectá-lo no arquivo
principal:

```js
// routes/admin.js — está correto, mas sozinho não serve pra nada
router.get('/pending-payments', auth, adminAuth, async (req, res) => { /* ... */ });
module.exports = router;

// index.js — SEM esta linha, toda rota de admin.js devolve 404:
app.use('/api/admin', require('./routes/admin'));
```

Sintoma: a rota devolve `404 Cannot GET ...` mesmo com o código "certo" — porque o Express nunca
chegou a carregar aquele router. Vale conferir com um grep simples sempre que uma funcionalidade
"devia existir" mas não responde:

```bash
grep -n "require('./routes" index.js
```

Esse tipo de gap também aparece quando o deploy manual (scp de arquivos avulsos) esquece de subir o
`index.js` atualizado junto com o novo arquivo de rota — o código local está certo, mas o servidor
está rodando uma versão antiga do arquivo principal.
