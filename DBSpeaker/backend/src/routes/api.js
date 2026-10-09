const express = require('express');
const db = require('../db');
const config = require('../config');
const { correct } = require('../engine/corrector');
const profiler = require('../engine/profiler');
const dialogue = require('../engine/dialogue');
const vocabulary = require('../engine/vocabulary');
const pronunciation = require('../engine/pronunciation');
const wallet = require('../engine/wallet');

const router = express.Router();

// ---------- helpers ----------

function getLearner(id) {
  return db.prepare('SELECT * FROM learners WHERE id = ?').get(id);
}

function weakPoints(learnerId) {
  return db
    .prepare(
      `SELECT category, COUNT(*) as n FROM corrections WHERE learner_id = ? GROUP BY category ORDER BY n DESC LIMIT 5`
    )
    .all(learnerId);
}

// ---------- infra ----------

router.get('/health', (req, res) => res.json({ ok: true, product: 'dbspeaker', engine: config.engine }));

router.get('/engine', (req, res) =>
  res.json({ engine: config.engine, model: config.engine === 'claude' ? config.model : 'dbspeaker-local' })
);

// ---------- learner ----------

// Cria ou recupera aluno pelo nome
router.post('/learner', (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name é obrigatório' });

  let learner = db.prepare('SELECT * FROM learners WHERE name = ?').get(name);
  if (!learner) {
    const info = db.prepare('INSERT INTO learners (name) VALUES (?)').run(name);
    db.prepare('INSERT INTO level_history (learner_id, score, cefr) VALUES (?, ?, ?)').run(
      info.lastInsertRowid, 1.5, 'A1'
    );
    wallet.grantWelcomeBonus(info.lastInsertRowid);
    learner = getLearner(info.lastInsertRowid);
  }
  res.json(learner);
});

router.get('/learner/:id/profile', (req, res) => {
  const learner = getLearner(req.params.id);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });

  const history = db
    .prepare('SELECT score, cefr, created_at FROM level_history WHERE learner_id = ? ORDER BY id')
    .all(learner.id);
  const corrections = db
    .prepare('SELECT COUNT(*) as n FROM corrections WHERE learner_id = ?')
    .get(learner.id).n;
  const pronAttempts = db
    .prepare('SELECT COUNT(*) as n, AVG(score) as avg FROM pronunciation_attempts WHERE learner_id = ?')
    .get(learner.id);
  const vocab = vocabulary.getProgress(learner.id);

  res.json({
    learner,
    levelHistory: history,
    weakPoints: weakPoints(learner.id),
    totals: {
      messages: learner.messages_count,
      corrections,
      pronunciationAttempts: pronAttempts.n,
      pronunciationAvg: pronAttempts.avg ? Math.round(pronAttempts.avg) : null,
      wordsLearned: vocab.filter((v) => v.mastered).length,
      wordsSeen: vocab.length,
    },
  });
});

router.get('/learner/:id/corrections', (req, res) => {
  const rows = db
    .prepare('SELECT original, corrected, category, explanation, created_at FROM corrections WHERE learner_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.params.id);
  res.json(rows);
});

// ---------- chat ----------

// Inicia uma sessão de conversa: o tutor abre com uma pergunta no nível do aluno
router.post('/chat/start', (req, res) => {
  const learner = getLearner(req.body.learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });

  const info = db.prepare('INSERT INTO sessions (learner_id) VALUES (?)').run(learner.id);
  const sessionId = info.lastInsertRowid;

  const opening = dialogue.openConversation(sessionId, learner.level_score);
  db.prepare('INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)').run(sessionId, 'assistant', opening);

  res.json({ sessionId, message: opening, cefr: learner.cefr, levelScore: learner.level_score });
});

// Mensagem do aluno → correções + atualização de nível + resposta do tutor
router.post('/chat/message', async (req, res) => {
  const { learnerId, sessionId, text } = req.body;
  const learner = getLearner(learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });
  if (!sessionId || !text || !String(text).trim()) return res.status(400).json({ error: 'sessionId e text são obrigatórios' });

  // Pague-e-use: cobra a mensagem antes de processar
  const billing = wallet.charge(learnerId, config.billing.priceMessage, 'Mensagem de conversação');
  if (!billing.ok) {
    return res.status(402).json({
      error: 'saldo_insuficiente',
      message: 'Seus créditos acabaram. Recarregue para continuar conversando!',
      balance: billing.balance,
    });
  }

  const userText = String(text).trim();
  db.prepare('INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)').run(sessionId, 'user', userText);

  // 1. Correção (base de regras — sempre roda, mesmo no modo Claude, como rede de segurança)
  const { corrections: ruleCorrections } = correct(userText);

  let reply;
  let corrections = ruleCorrections.map((c) => ({
    original: c.original,
    corrected: c.corrected,
    explanation: c.explanation,
    category: c.category,
  }));
  let claudeLevel = null;
  let engineUsed = 'local';

  // 2. Resposta do tutor
  if (config.engine === 'claude') {
    try {
      const history = db
        .prepare('SELECT role, text FROM messages WHERE session_id = ? ORDER BY id')
        .all(sessionId);
      const result = await require('../engine/claude').chat(
        {
          name: learner.name,
          cefr: learner.cefr,
          levelScore: learner.level_score,
          messagesCount: learner.messages_count,
          weakPoints: weakPoints(learner.id).map((w) => w.category),
        },
        history
      );
      reply = result.reply;
      if (Array.isArray(result.corrections) && result.corrections.length) {
        corrections = result.corrections; // correções do Claude são mais ricas
      }
      claudeLevel = result.estimated_level;
      engineUsed = 'claude';
    } catch (err) {
      console.error('[dbspeaker] Claude falhou, usando motor local:', err.message);
    }
  }

  // 3. Perfil: estimar nível da mensagem e atualizar com média móvel
  const analysis = profiler.analyzeMessage(userText, corrections.length);
  let newScore = learner.level_score;
  if (analysis) {
    let estimate = analysis.estimate;
    if (claudeLevel) {
      // Combina estimativa do Claude (peso maior) com a heurística local
      estimate = (profiler.LEVEL_SCORE[claudeLevel] + 0.5) * 0.6 + estimate * 0.4;
    }
    newScore = profiler.updateLevel(learner.level_score, estimate, analysis.tokens.length);
    vocabulary.recordUsage(learner.id, analysis.tokens);
  }
  const newCefr = profiler.scoreToCefr(newScore);
  const leveledUp = newCefr !== learner.cefr && newScore > learner.level_score;

  db.prepare(
    "UPDATE learners SET level_score = ?, cefr = ?, messages_count = messages_count + 1, updated_at = datetime('now') WHERE id = ?"
  ).run(newScore, newCefr, learner.id);
  db.prepare('INSERT INTO level_history (learner_id, score, cefr) VALUES (?, ?, ?)').run(learner.id, newScore, newCefr);

  // 4. Persistir correções (para mapear pontos fracos)
  const insCorr = db.prepare(
    'INSERT INTO corrections (learner_id, session_id, original, corrected, category, explanation) VALUES (?, ?, ?, ?, ?, ?)'
  );
  for (const c of corrections) {
    insCorr.run(learner.id, sessionId, c.original, c.corrected, c.category || 'geral', c.explanation);
  }

  // 5. Resposta local se Claude não respondeu
  if (!reply) {
    reply = dialogue.reply(sessionId, userText, newScore, corrections);
  }
  db.prepare('INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)').run(sessionId, 'assistant', reply);

  // 6. Sugestão de vocabulário (a cada ~3 mensagens)
  let vocabSuggestion = null;
  const msgCount = learner.messages_count + 1;
  if (msgCount % 3 === 0) {
    vocabSuggestion = vocabulary.suggestWord(learner.id, newCefr);
  }

  res.json({
    reply,
    corrections,
    level: { score: newScore, cefr: newCefr, leveledUp },
    vocabSuggestion,
    engine: engineUsed,
    wallet: { balance: billing.balance, charged: billing.charged },
  });
});

// ---------- pronúncia ----------

router.get('/pronunciation/exercise', (req, res) => {
  const learner = getLearner(req.query.learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });
  res.json(pronunciation.getExercise(learner.id, learner.cefr));
});

router.post('/pronunciation/attempt', (req, res) => {
  const { learnerId, target, transcript } = req.body;
  const learner = getLearner(learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });
  if (!target || !transcript) return res.status(400).json({ error: 'target e transcript são obrigatórios' });

  const billing = wallet.charge(learnerId, config.billing.pricePronunciation, 'Avaliação de pronúncia');
  if (!billing.ok) {
    return res.status(402).json({
      error: 'saldo_insuficiente',
      message: 'Seus créditos acabaram. Recarregue para continuar treinando!',
      balance: billing.balance,
    });
  }

  const result = pronunciation.evaluate(learner.id, target, transcript);
  res.json({ ...result, wallet: { balance: billing.balance, charged: billing.charged } });
});

router.get('/pronunciation/history/:learnerId', (req, res) => {
  res.json(pronunciation.getHistory(req.params.learnerId));
});

// ---------- carteira (pague e use) ----------

router.get('/wallet/:learnerId', (req, res) => {
  const learner = getLearner(req.params.learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });
  res.json({
    balance: wallet.balance(learner.id),
    prices: {
      message: config.billing.priceMessage,
      pronunciation: config.billing.pricePronunciation,
    },
    enabled: config.billing.enabled,
    transactions: wallet.statement(learner.id),
  });
});

// Recarga (MVP: crédito imediato — integração com gateway de pagamento vem depois)
router.post('/wallet/topup', (req, res) => {
  const { learnerId, amountCents } = req.body;
  const learner = getLearner(learnerId);
  if (!learner) return res.status(404).json({ error: 'aluno não encontrado' });
  const amount = Number(amountCents);
  if (!Number.isInteger(amount) || amount < 100 || amount > 50000) {
    return res.status(400).json({ error: 'valor inválido (mínimo R$ 1,00, máximo R$ 500,00)' });
  }
  const balance = wallet.topup(learner.id, amount);
  res.json({ balance });
});

// ---------- vocabulário ----------

router.get('/vocabulary/:learnerId', (req, res) => {
  res.json(vocabulary.getProgress(req.params.learnerId));
});

module.exports = router;
