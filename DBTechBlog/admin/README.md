# Admin do Blog — DBTech Solutions

Painel simples pra criar/editar/apagar posts e grupos (categorias) do blog, sem precisar mexer em
Markdown ou Git. Escreve direto nos arquivos `.md` que o Astro lê em `../src/content/blog/`.

## Rodando local

```bash
cd DBTechBlog/admin
cp .env.example .env
# gerar o hash da senha de admin:
node -e "require('bcryptjs').hash('SUA_SENHA',10).then(h=>console.log(h))"
# colar o resultado em ADMIN_PASSWORD_HASH no .env, e um JWT_SECRET qualquer (string aleatória)

npm install
node server.js
# abrir http://localhost:4400
```

## O que o painel faz

- **Login** com uma senha só (definida no `.env`, nunca em texto puro).
- **Posts**: listar, criar, editar e apagar — grava/apaga o `.md` correspondente.
- **Grupos**: criar e apagar categorias usadas para organizar os posts (não deixa apagar um grupo
  que algum post ainda está usando).
- **Publicar**: roda `npm run build` no blog e, se `DEPLOY_TARGET` estiver configurado no `.env`,
  copia o resultado para a pasta que o Nginx serve — ou seja, o botão "Publicar" já deixa o site no
  ar com o conteúdo novo.

## Deploy na VPS

1. Subir a pasta `DBTechBlog/admin` (sem `node_modules`) pra VPS, dentro de
   `/opt/dbtechblog/admin` por exemplo.
2. Criar o `.env` lá com uma senha forte de verdade e:
   ```
   DEPLOY_TARGET=/var/www/dbtechsolutions/html
   ```
3. Rodar com PM2 (igual os outros serviços):
   ```bash
   cd /opt/dbtechblog/admin
   npm install --production
   pm2 start server.js --name dbtechblog-admin
   pm2 save
   ```
4. Expor só pra você (nunca público) — duas opções:
   - **Mais simples**: acessar via túnel SSH (`ssh -L 4400:localhost:4400 root@23.106.45.221`) e
     abrir `http://localhost:4400` no seu navegador. Não precisa mexer no Nginx.
   - **Com subdomínio**: criar `admin.dbtechsolutions.com.br` no Nginx, com `proxy_pass` pra
     `localhost:4400`, protegido por HTTP Basic Auth (`auth_basic`) além do login do próprio painel
     — camada extra, já que esse painel escreve arquivo no servidor.

Recomendo a opção do túnel SSH pra começar: zero superfície exposta, e você já tem a chave SSH
configurada.
