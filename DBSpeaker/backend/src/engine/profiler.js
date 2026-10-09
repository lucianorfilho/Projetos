// Profiler: estima o nível CEFR do aluno a partir do que ele escreve/fala.
// Combina 5 sinais linguísticos e atualiza o nível com média móvel exponencial,
// para que o nível evolua de forma estável conforme a conversa avança.

const { WORD_LEVEL, LEVELS } = require('../data/vocabulary');

// Pontuação base por nível na escala contínua (1.0 = A1 ... 6.x = C2)
const LEVEL_SCORE = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []);
}

// Detecta variedade de tempos verbais / estruturas
function grammarComplexity(text) {
  const t = text.toLowerCase();
  let score = 0;
  if (/\b(am|is|are|do|does|don't|doesn't)\b/.test(t)) score += 0.3;            // presente
  if (/\b(was|were|did|didn't|\w+ed)\b/.test(t)) score += 0.7;                  // passado
  if (/\b(will|going to|gonna)\b/.test(t)) score += 0.7;                        // futuro
  if (/\b(have|has|had)\s+(\w+ed|been|gone|done|seen|made|taken)\b/.test(t)) score += 1.2; // perfect
  if (/\b(would|could|should|might|must)\b/.test(t)) score += 1.0;              // modais
  if (/\bif\b.*\b(would|will|had)\b/.test(t)) score += 1.5;                     // condicionais
  if (/\b(although|however|despite|whereas|unless|nevertheless|furthermore)\b/.test(t)) score += 1.5; // conectivos avançados
  if (/\b(because|but|so|when|before|after)\b/.test(t)) score += 0.4;           // conectivos básicos
  if (/\b(is|are|was|were)\s+\w+ed\b/.test(t)) score += 1.3;                    // voz passiva
  return Math.min(score, 6);
}

// Nível do vocabulário usado (com base na base de conhecimento)
function vocabLevel(tokens) {
  let sum = 0;
  let hits = 0;
  const usedWords = [];
  for (const tok of tokens) {
    const lvl = WORD_LEVEL[tok];
    if (lvl) {
      sum += LEVEL_SCORE[lvl];
      hits++;
      usedWords.push({ word: tok, level: lvl });
    }
  }
  return { score: hits ? sum / hits : 0, usedWords };
}

// Riqueza lexical (type-token ratio ajustado)
function lexicalRichness(tokens) {
  if (tokens.length < 3) return 0;
  const unique = new Set(tokens).size;
  return Math.min((unique / Math.sqrt(tokens.length)) * 1.2, 6);
}

// Comprimento médio de frase
function sentenceLength(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (!sentences.length) return 0;
  const words = tokenize(text).length;
  const avg = words / sentences.length;
  // 4 palavras/frase ≈ A1; 20+ ≈ C1
  return Math.min((avg / 20) * 5 + 1, 6);
}

/**
 * Analisa uma mensagem do aluno e retorna a estimativa pontual de nível.
 * errorCount vem do corretor (quantos erros a mensagem tinha).
 */
function analyzeMessage(text, errorCount) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  const vocab = vocabLevel(tokens);
  const grammar = grammarComplexity(text);
  const richness = lexicalRichness(tokens);
  const length = sentenceLength(text);

  // Penalidade por erro: cada erro derruba a estimativa
  const errorPenalty = Math.min(errorCount * 0.6, 2.5);

  // Combinação ponderada dos sinais presentes
  const signals = [];
  if (vocab.score > 0) signals.push({ v: vocab.score, w: 1.2 });
  signals.push({ v: grammar || 0.8, w: 1.5 });
  signals.push({ v: richness, w: 0.8 });
  signals.push({ v: length, w: 0.7 });

  const totalW = signals.reduce((a, s) => a + s.w, 0);
  let estimate = signals.reduce((a, s) => a + s.v * s.w, 0) / totalW;
  estimate = Math.max(1, Math.min(6.99, estimate + 0.5 - errorPenalty));

  return { estimate, usedWords: vocab.usedWords, tokens };
}

/**
 * Atualiza o nível do aluno com média móvel exponencial.
 * Mensagens curtas pesam menos (pouca evidência).
 */
function updateLevel(currentScore, estimate, tokenCount) {
  const evidence = Math.min(tokenCount / 25, 1); // frase de 25+ palavras = evidência plena
  const alpha = 0.15 + 0.2 * evidence;           // 0.15 a 0.35
  return currentScore + alpha * (estimate - currentScore);
}

function scoreToCefr(score) {
  const idx = Math.max(0, Math.min(5, Math.floor(score) - 1));
  return LEVELS[idx];
}

// Faixa usada pelos cenários de conversa
function scoreToBand(score) {
  if (score < 3) return 'basic';
  if (score < 5) return 'inter';
  return 'adv';
}

module.exports = { analyzeMessage, updateLevel, scoreToCefr, scoreToBand, LEVEL_SCORE };
