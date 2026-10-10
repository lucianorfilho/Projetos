---
title: 'Nginx: evitar colisão entre rota de SPA e rota de API com o mesmo nome'
description: 'Uma página React chamada /vendas e um endpoint de API /vendas no mesmo domínio competem pela mesma location.'
pubDate: 'Oct 09 2026'
---

Quando o front-end React/Vite e a API Express dividem o mesmo domínio, é comum uma tela do sistema
ter o mesmo nome de um endpoint (ex.: a tela `/vendas` e a rota `GET /vendas` da API). Sem
tratamento, a regra de proxy para API "vence" e a navegação direta pela URL (F5, favorito, digitar
no navegador) recebe JSON cru em vez da página.

A diferença entre as duas situações está no header `Accept` que o navegador manda: navegação de
página manda `text/html`; chamadas do axios/fetch do front-end mandam `application/json`. Isso dá
pra usar no Nginx:

```nginx
location = /vendas {
    if ($http_accept ~* text/html) {
        rewrite ^ /index.html last;
    }
    # senão, cai no proxy_pass normal para a API
    proxy_pass http://backend;
    ...
}
```

Regra geral: sempre que front-end e API dividem domínio, as `location` de assets estáticos e de
exceções como essa precisam vir **antes**, no arquivo de config, da regra genérica de proxy para
API.
