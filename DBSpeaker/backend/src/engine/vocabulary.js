// Gestão de vocabulário do aluno: registra palavras usadas,
// sugere palavras novas (um nível acima) e acompanha o domínio.

const db = require('../db');
const { VOCAB, LEVELS, WORD_LEVEL } = require('../data/vocabulary');

const upsertUsed = db.prepare(`
  INSERT INTO vocab_progress (learner_id, word, level, times_used, last_seen)
  VALUES (?, ?, ?, 1, datetime('now'))
  ON CONFLICT(learner_id, word) DO UPDATE SET times_used = times_used + 1, last_seen = datetime('now')
`);

const upsertSeen = db.prepare(`
  INSERT INTO vocab_progress (learner_id, word, level, times_seen, last_seen)
  VALUES (?, ?, ?, 1, datetime('now'))
  ON CONFLICT(learner_id, word) DO UPDATE SET times_seen = times_seen + 1, last_seen = datetime('now')
`);

// Registra palavras da base que o aluno usou na mensagem
function recordUsage(learnerId, tokens) {
  for (const tok of new Set(tokens)) {
    const lvl = WORD_LEVEL[tok];
    if (lvl) upsertUsed.run(learnerId, tok, lvl);
  }
}

// Sugere uma palavra nova: do nível seguinte ao do aluno, ainda não usada/vista
function suggestWord(learnerId, cefr) {
  const idx = LEVELS.indexOf(cefr);
  const targetLevels = [LEVELS[Math.min(idx + 1, 5)], cefr];

  const known = new Set(
    db.prepare('SELECT word FROM vocab_progress WHERE learner_id = ?').all(learnerId).map((r) => r.word)
  );

  for (const lvl of targetLevels) {
    const candidates = VOCAB[lvl].filter((v) => !known.has(v.word.toLowerCase()));
    if (candidates.length) {
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      upsertSeen.run(learnerId, pick.word.toLowerCase(), lvl);
      return { ...pick, level: lvl };
    }
  }
  return null;
}

function getProgress(learnerId) {
  return db
    .prepare('SELECT word, level, times_seen, times_used, last_seen FROM vocab_progress WHERE learner_id = ? ORDER BY last_seen DESC')
    .all(learnerId)
    .map((r) => ({ ...r, mastered: r.times_used >= 3 }));
}

module.exports = { recordUsage, suggestWord, getProgress };
