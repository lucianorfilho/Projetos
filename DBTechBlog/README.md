# DBTech Solutions — Blog + Site Institucional

Site em [Astro](https://astro.build): gera HTML estático puro no build (sem backend, sem processo
Node rodando em produção) — serve direto pelo Nginx, igual o site atual.

Substitui o `DBTechSite/` (versão estática simples anterior). Esse aqui segue formato de blog, com
páginas de produto na aba **Produtos**.

## Estrutura

```
src/
  pages/
    index.astro            home (hero + produtos em destaque + últimos posts)
    about.astro             página "Sobre"
    blog/
      index.astro            listagem de todos os posts
      [...slug].astro         página de um post (gerada automaticamente)
    produtos/
      index.astro            listagem de produtos
      dbvault.astro           página do DBVault
      dbvendas.astro          página do DBVendas
      dbwatch.astro           página do DBWatch
  content/
    blog/*.md                 CADA ARQUIVO AQUI = UM POST. É só isso que se edita no dia a dia.
  layouts/
    BlogPost.astro             layout de um post do blog
    ProductLayout.astro        layout compartilhado pelas páginas de produto
  components/                 Header, Footer, etc.
  styles/global.css           tema (cores, tipografia)
```

## Como escrever um novo post

1. Crie um arquivo `.md` novo em `src/content/blog/`, por exemplo `meu-novo-post.md`.
2. Comece com o front-matter:
   ```md
   ---
   title: 'Título do post'
   description: 'Resumo de uma linha, aparece na listagem.'
   pubDate: 'Oct 15 2026'
   ---

   Texto normal em Markdown. Pode usar **negrito**, listas, e blocos de código:

   ​```bash
   comando aqui
   ​```
   ```
3. Salve. Pronto — o post aparece automaticamente na home e em `/blog`, ordenado por data.

Não precisa editar nenhum outro arquivo, nem mexer em HTML.

## Como adicionar um novo produto

1. Duplique um dos arquivos em `src/pages/produtos/` (ex. `dbvault.astro`).
2. Troque `name`, `tag`, `tagline`, `description` e o conteúdo dentro de `<ProductLayout>...</ProductLayout>`.
3. Adicione o novo produto também na lista `products` em `src/pages/index.astro` e
   `src/pages/produtos/index.astro` (nome, slug, tag e descrição curta) para ele aparecer nos cards.

## Rodando local para testar

```bash
cd DBTechBlog
npm install
npm run dev -- --host 127.0.0.1
# abrir http://localhost:4321
```

> Nota: o servidor de dev do Astro às vezes escuta só em IPv6 (`::1`). Se a página não abrir, use
> `--host 127.0.0.1` como acima para forçar IPv4.

## Build de produção

```bash
npm run build
# gera tudo estático em dist/
```

## Deploy na VPS

```bash
npm run build
scp -r dist/* root@23.106.45.221:/var/www/dbtechsolutions/html/
```

Nginx já serve esse diretório como estático — não precisa reiniciar nada depois do deploy.

## Stack

- [Astro](https://astro.build) — gerador de site estático, Markdown vira HTML no build.
- Zero framework de UI (sem React/Vue) — só Astro components + CSS puro.
- RSS (`/rss.xml`) e sitemap já configurados.
