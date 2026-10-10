# DBTech Solutions — Site Institucional

Site estático (HTML/CSS/JS puro, sem build, sem dependências) para `dbtechsolutions.com.br`.

## Estrutura

```
DBTechSite/
  index.html              página inicial (hero + serviços)
  style.css                estilo único, compartilhado por todas as páginas
  conhecimento/
    index.html              página da base de conhecimento (busca + filtro)
    data.js                 TODO O CONTEÚDO dos artigos — é só isso que se edita no dia a dia
```

## Como adicionar um novo artigo na Base de Conhecimento

Não precisa de build, servidor ou painel administrativo — é só editar um arquivo:

1. Abra `conhecimento/data.js`.
2. Copie um dos objetos dentro do array `KB_ITEMS`.
3. Troque `id` (único, sem espaço), `title`, `category` e `summary`.
4. Escreva o `body` em HTML simples (parágrafos `<p>`, listas `<ul>/<li>`, comandos dentro de
   `<pre><code>...</code></pre>`).
5. Salve. Não precisa rodar nada — é só subir o arquivo para a VPS (ou recarregar a página, se
   estiver testando local).

Categorias disponíveis: `banco`, `monitoramento`, `seguranca`, `deploy`.

## Rodando local para testar

```bash
cd DBTechSite
python -m http.server 8800
# abrir http://localhost:8800
```

## Deploy na VPS

O site institucional é servido como estático puro pelo Nginx, a partir de
`/var/www/dbtechsolutions/html/` (sem backend, sem build step).

```bash
scp -r DBTechSite/* root@23.106.45.221:/var/www/dbtechsolutions/html/
```

Depois de qualquer deploy, não é preciso reiniciar nada — é Nginx servindo arquivo estático
diretamente.

## Próximos passos possíveis

- Trocar os 6 artigos de exemplo por conteúdo real conforme formos resolvendo problemas.
- Se o volume de artigos crescer muito (50+), considerar mover `data.js` para um JSON carregado
  via fetch, ou um gerador estático (ainda mantendo a edição simples em arquivo único).
- Adicionar formulário de contato / botão de WhatsApp na home.
