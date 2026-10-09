// Motor de pronúncia: compara a frase-alvo com o que o reconhecimento de voz
// entendeu, pontua palavra a palavra e gera dicas fonéticas em português
// focadas nos sons difíceis para brasileiros.

const db = require('../db');
const { SOUNDS, EXERCISES } = require('../data/phonetics');
const { LEVELS } = require('../data/vocabulary');

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9'\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function wordSimilarity(a, b) {
  if (a === b) return 1;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

/**
 * Alinha as palavras do alvo com as do transcript (programação dinâmica)
 * e pontua cada palavra do alvo.
 */
function alignWords(targetWords, saidWords) {
  const m = targetWords.length;
  const n = saidWords.length;
  // DP de alinhamento maximizando similaridade
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.max(
        dp[i - 1][j],
        dp[i][j - 1],
        dp[i - 1][j - 1] + wordSimilarity(targetWords[i - 1], saidWords[j - 1])
      );
    }
  }
  // Backtrack para saber o que casou com o quê
  const result = targetWords.map((w) => ({ word: w, heard: null, similarity: 0 }));
  let i = m;
  let j = n;
  while (i > 0 && j > 0) {
    const sim = wordSimilarity(targetWords[i - 1], saidWords[j - 1]);
    if (dp[i][j] === dp[i - 1][j - 1] + sim && sim > 0.3) {
      result[i - 1] = { word: targetWords[i - 1], heard: saidWords[j - 1], similarity: sim };
      i--; j--;
    } else if (dp[i][j] === dp[i - 1][j]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}

/**
 * Avalia uma tentativa de pronúncia.
 * Retorna score 0-100, avaliação palavra a palavra e dicas fonéticas.
 */
function evaluate(learnerId, target, transcript) {
  const targetWords = normalize(target);
  const saidWords = normalize(transcript);

  const words = alignWords(targetWords, saidWords).map((w) => ({
    ...w,
    ok: w.similarity >= 0.8,
    close: w.similarity >= 0.5 && w.similarity < 0.8,
  }));

  const score = Math.round((words.reduce((a, w) => a + w.similarity, 0) / (words.length || 1)) * 100);

  // Sons problemáticos: sons presentes nas palavras erradas
  const weakSoundIds = new Set();
  for (const w of words) {
    if (w.ok) continue;
    for (const sound of SOUNDS) {
      if (sound.test.test(w.word)) weakSoundIds.add(sound.id);
    }
  }

  const tips = SOUNDS.filter((s) => weakSoundIds.has(s.id)).map((s) => ({
    id: s.id,
    label: s.label,
    tip: s.tip,
    practiceWords: s.words.slice(0, 5),
  }));

  db.prepare(
    'INSERT INTO pronunciation_attempts (learner_id, target, transcript, score, weak_sounds) VALUES (?, ?, ?, ?, ?)'
  ).run(learnerId, target, transcript, score, JSON.stringify([...weakSoundIds]));

  let verdict;
  if (score >= 90) verdict = 'Excelente! Pronúncia muito clara. 🏆';
  else if (score >= 75) verdict = 'Muito bom! Só alguns detalhes para polir. 👏';
  else if (score >= 55) verdict = 'Bom começo — repita focando nas palavras marcadas. 💪';
  else verdict = 'Vamos com calma: ouça a frase de novo e tente palavra por palavra. 🎯';

  return { score, words, tips, verdict };
}

/**
 * Escolhe um exercício de pronúncia para o aluno:
 * prioriza frases que treinam os sons em que ele mais erra.
 */
function getExercise(learnerId, cefr) {
  const level = LEVELS.includes(cefr) ? cefr : 'A1';
  const pool = EXERCISES[level] || EXERCISES.A1;

  // Sons fracos históricos do aluno
  const rows = db
    .prepare('SELECT weak_sounds FROM pronunciation_attempts WHERE learner_id = ? ORDER BY id DESC LIMIT 10')
    .all(learnerId);
  const freq = {};
  for (const r of rows) {
    for (const id of JSON.parse(r.weak_sounds || '[]')) freq[id] = (freq[id] || 0) + 1;
  }
  const weakest = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([id]) => id);

  let candidates = pool;
  if (weakest.length) {
    const focused = pool.filter((e) => e.sounds.some((s) => weakest.slice(0, 3).includes(s)));
    if (focused.length) candidates = focused;
  }

  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const soundInfo = SOUNDS.filter((s) => pick.sounds.includes(s.id)).map((s) => ({ id: s.id, label: s.label, tip: s.tip }));
  return { text: pick.text, level, focusSounds: soundInfo };
}

function getHistory(learnerId) {
  return db
    .prepare('SELECT target, transcript, score, weak_sounds, created_at FROM pronunciation_attempts WHERE learner_id = ? ORDER BY id DESC LIMIT 30')
    .all(learnerId)
    .map((r) => ({ ...r, weak_sounds: JSON.parse(r.weak_sounds || '[]') }));
}

module.exports = { evaluate, getExercise, getHistory };
