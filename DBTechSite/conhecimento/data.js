// Base de Conhecimento — DBTech Solutions
//
// COMO ADICIONAR UM NOVO ARTIGO:
// 1. Copie um objeto do array KB_ITEMS abaixo.
// 2. Troque id (único, sem espaço), title, category e summary.
// 3. Escreva o body em HTML simples (parágrafos <p>, listas <ul>/<li>,
//    comandos dentro de <pre><code>...</code></pre>).
// 4. Salve o arquivo. Não precisa rodar nenhum build — é só abrir a página.
//
// Categorias válidas: "banco", "monitoramento", "seguranca", "deploy"

const KB_ITEMS = [
  {
    id: "pm2-sobrevive-reboot",
    title: "Fazer processos PM2 sobreviverem a um reboot da VPS",
    category: "monitoramento",
    summary: "pm2 start sozinho não é suficiente — sem 'pm2 save', o processo some depois do próximo reboot.",
    body: `
      <p>O PM2 só re-inicia automaticamente, depois de um reboot do servidor, os processos que
      estavam salvos na última chamada de <code>pm2 save</code>. Se você rodou <code>pm2 start</code>
      manualmente e nunca salvou, o processo volta a não existir após o próximo boot — mesmo que
      ele estivesse "online" havia meses.</p>
      <pre><code># depois de iniciar (ou reiniciar) qualquer processo:
pm2 start ecosystem.config.js
pm2 save

# conferir o que está salvo para resurrect automático:
cat ~/.pm2/dump.pm2 | grep -o '"name":"[^"]*"'

# garantir que o pm2 tem um serviço systemd registrado no boot (só 1x por servidor):
pm2 startup systemd</code></pre>
      <p>Sintoma típico desse problema: a VPS caiu ou foi desligada por um tempo, voltou, e só
      <em>parte</em> das aplicações está no ar — exatamente as que foram salvas por último.</p>
    `
  },
  {
    id: "nunca-hardcode-token",
    title: "Nunca hardcodear tokens/credenciais no código-fonte",
    category: "seguranca",
    summary: "Um PAR (Pre-Authenticated Request) da OCI direto numa constante no .js é uma credencial completa de acesso ao bucket.",
    body: `
      <p>Um <strong>PAR (Pre-Authenticated Request)</strong> da Oracle Cloud é uma URL que já contém
      a autorização embutida — qualquer um que tenha a URL pode fazer upload/download no bucket,
      sem precisar de usuário, senha ou chave. É, na prática, uma senha.</p>
      <p>Guardar esse valor como constante no código-fonte (em vez de variável de ambiente) significa
      que ele vai parar em qualquer lugar que o código for parar: repositório Git, backup, zip
      enviado por e-mail, etc.</p>
      <pre><code>// ERRADO — credencial completa no código
const PAR_BASE = 'https://objectstorage.../p/TOKEN_SECRETO/n/.../o';

// CERTO — só o .env tem o valor real, e o .env nunca é versionado
const PAR_BASE = process.env.OCI_PAR_BASE;
if (!PAR_BASE) throw new Error('OCI_PAR_BASE não configurado no .env');</code></pre>
      <p>Regra prática: qualquer coisa que, se vazar, dá acesso a algo (senha, token, chave privada
      .pem, string de conexão com senha embutida) vai para o <code>.env</code> — nunca para um
      arquivo versionado. E o <code>.gitignore</code> do projeto precisa cobrir <code>.env</code>,
      <code>*.pem</code> e <code>*.key</code> desde o primeiro commit.</p>
      <p>Se um segredo já foi commitado: trocar o valor (revogar/gerar novo) resolve o problema de
      verdade — remover do código só evita que <em>o próximo</em> commit continue exposto; o valor
      antigo continua legível no histórico do Git até alguém reescrever esse histórico.</p>
    `
  },
  {
    id: "checklist-pos-reboot-vps",
    title: "Checklist pós-reboot de uma VPS com múltiplos serviços",
    category: "monitoramento",
    summary: "Depois de queda/reboot: o que checar, em que ordem, antes de considerar tudo normalizado.",
    body: `
      <ul>
        <li><code>uptime</code> — confirma há quanto tempo o servidor está de pé.</li>
        <li><code>pm2 list</code> — compara com o que deveria estar rodando. Qualquer serviço
          ausente da lista precisa ser investigado (não aparece nem como "stopped" — some mesmo).</li>
        <li><code>systemctl is-active postgresql mysql nginx</code> — bancos e proxy reverso voltaram?</li>
        <li><code>df -h</code> e <code>free -h</code> — descarta causa de disco cheio / falta de memória.</li>
        <li>Testar cada domínio com <code>curl -I</code> (não só <code>ping</code>) — um 502 do
          Nginx geralmente indica que o processo de backend daquele domínio não subiu.</li>
        <li>Abrir no navegador de verdade pelo menos a tela de login de cada sistema — um 200 do
          curl não garante que o front-end carregou os assets certos.</li>
      </ul>
      <p>Depois de corrigir: rodar <code>pm2 save</code> de novo para o estado atual não se perder
      no próximo reboot.</p>
    `
  },
  {
    id: "nginx-spa-api-mesma-rota",
    title: "Nginx: evitar colisão entre rota de SPA e rota de API com o mesmo nome",
    category: "deploy",
    summary: "Uma página React chamada /vendas e um endpoint de API /vendas no mesmo domínio competem pela mesma location.",
    body: `
      <p>Quando o front-end React/Vite e a API Express dividem o mesmo domínio, é comum uma tela
      do sistema ter o mesmo nome de um endpoint (ex.: a tela <code>/vendas</code> e a rota
      <code>GET /vendas</code> da API). Sem tratamento, a regra de proxy para API "vence" e a
      navegação direta pela URL (F5, favorito, digitar no navegador) recebe JSON cru em vez da
      página.</p>
      <p>A diferença entre as duas situações está no header <code>Accept</code> que o navegador
      manda: navegação de página manda <code>text/html</code>; chamadas do axios/fetch do
      front-end mandam <code>application/json</code>. Isso dá pra usar no Nginx:</p>
      <pre><code>location = /vendas {
    if ($http_accept ~* text/html) {
        rewrite ^ /index.html last;
    }
    # senão, cai no proxy_pass normal para a API
    proxy_pass http://backend;
    ...
}</code></pre>
      <p>Regra geral: sempre que front-end e API dividem domínio, as <code>location</code> de
      assets estáticos e de exceções como essa precisam vir <strong>antes</strong>, no arquivo de
      config, da regra genérica de proxy para API.</p>
    `
  },
  {
    id: "rota-definida-mas-nao-montada",
    title: "Rota existe no código mas devolve 404: verificar se foi registrada no app principal",
    category: "deploy",
    summary: "Um arquivo de rotas (ex. admin.js) correto e completo não funciona sozinho — precisa de um app.use() no index.js.",
    body: `
      <p>Em apps Express organizados por módulo de rota (<code>routes/admin.js</code>,
      <code>routes/auth.js</code>...), é fácil criar um arquivo de rotas inteiro, com toda a lógica
      certa, e esquecer de conectá-lo no arquivo principal:</p>
      <pre><code>// routes/admin.js — está correto, mas sozinho não serve pra nada
router.get('/pending-payments', auth, adminAuth, async (req, res) => { ... });
module.exports = router;

// index.js — SEM esta linha, toda rota de admin.js devolve 404:
app.use('/api/admin', require('./routes/admin'));</code></pre>
      <p>Sintoma: a rota devolve <code>404 Cannot GET ...</code> mesmo com o código "certo" —
      porque o Express nunca chegou a carregar aquele router. Vale conferir com um grep simples
      sempre que uma funcionalidade "devia existir" mas não responde:</p>
      <pre><code>grep -n "require('./routes" index.js</code></pre>
      <p>Esse tipo de gap também aparece quando o deploy manual (scp de arquivos avulsos) esquece
      de subir o <code>index.js</code> atualizado junto com o novo arquivo de rota — o código local
      está certo, mas o servidor está rodando uma versão antiga do arquivo principal.</p>
    `
  },
  {
    id: "webhook-idempotencia-pagamento",
    title: "Webhook de pagamento: sempre tratar reentrega (idempotência)",
    category: "banco",
    summary: "Provedores de pagamento reenviam o mesmo evento de webhook em caso de timeout — sem controle de idempotência, isso duplica cobrança/liberação.",
    body: `
      <p>Provedores como Asaas reenviam um evento de webhook se não receberem uma resposta 200 a
      tempo — o que significa que o mesmo evento (ex.: "pagamento confirmado") pode chegar mais de
      uma vez. Processar duas vezes sem controle pode liberar espaço em dobro, mandar e-mail
      duplicado, etc.</p>
      <pre><code>-- tabela de controle, com unique constraint no id do evento
CREATE TABLE webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50),
  event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);</code></pre>
      <pre><code>// no handler: tenta inserir o evento ANTES de processar.
// se der erro de duplicado, já foi processado — responde 200 e não reprocessa.
try {
  await execute(
    'INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES (?, ?, ?, ?)',
    [provider, eventId, eventType, JSON.stringify(body)]
  );
} catch (err) {
  if (err.code === 'ER_DUP_ENTRY') return res.status(200).json({ message: 'Evento já processado' });
  throw err;
}</code></pre>
      <p>Outra prática importante: sempre validar um token/assinatura do provedor no header antes
      de processar qualquer coisa (ex. <code>asaas-access-token</code>), e responder 200 mesmo
      quando o processamento interno falha — para o provedor não entrar num loop de retentativas
      por um erro que já ficou registrado para investigação manual.</p>
    `
  }
];
