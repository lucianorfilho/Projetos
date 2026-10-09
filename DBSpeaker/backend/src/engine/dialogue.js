// Motor de diálogo local: conversa como um "estrangeiro amigável",
// adaptando profundidade das perguntas ao nível detectado do aluno.
// Não precisa de chave de API — é a inteligência embarcada do DBSpeaker.

const { TOPICS, REACTIONS, PRAISE } = require('../data/scenarios');
const { scoreToBand } = require('./profiler');

// Estado de conversa por sessão (em memória; o histórico persistente fica no SQLite)
const sessionState = new Map();

function getState(sessionId) {
  if (!sessionState.has(sessionId)) {
    sessionState.set(sessionId, { topicId: null, usedFollowups: new Set(), usedTopics: new Set(), turns: 0 });
  }
  return sessionState.get(sessionId);
}

function detectTopic(text) {
  const t = text.toLowerCase();
  let best = null;
  let bestHits = 0;
  for (const topic of TOPICS) {
    const hits = topic.keywords.filter((k) => t.includes(k)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = topic;
    }
  }
  return bestHits > 0 ? best : null;
}

function pick(arr, avoid = new Set()) {
  const fresh = arr.filter((x) => !avoid.has(x));
  const pool = fresh.length ? fresh : arr;
  return pool[Math.floor(Math.random() * pool.length)];
}

// Abre a conversa (primeira mensagem do tutor)
function openConversation(sessionId, levelScore) {
  const band = scoreToBand(levelScore);
  const state = getState(sessionId);
  const topic = pick(TOPICS.map((t) => t), state.usedTopics);
  state.topicId = topic.id;
  state.usedTopics.add(topic);
  return topic.starter[band];
}

/**
 * Gera a resposta do tutor à mensagem do aluno.
 * A resposta tem 3 partes: reação natural + (recast da correção) + pergunta de aprofundamento.
 */
function reply(sessionId, userText, levelScore, corrections) {
  const band = scoreToBand(levelScore);
  const state = getState(sessionId);
  state.turns++;

  // Segue o tópico da mensagem do aluno, se ele mudou de assunto
  const detected = detectTopic(userText);
  if (detected && detected.id !== state.topicId) {
    state.topicId = detected.id;
  }
  let topic = TOPICS.find((t) => t.id === state.topicId);

  // 1. Pergunta de aprofundamento no nível do aluno (escolhida primeiro,
  //    para não duplicar interjeições como "Nice! ... Nice!")
  let question;
  if (topic) {
    const options = topic.followups[band];
    const available = options.filter((q) => !state.usedFollowups.has(q));
    if (available.length > 0) {
      question = pick(available);
      state.usedFollowups.add(question);
    }
  }
  // Esgotou o tópico (ou não há tópico): muda de assunto
  if (!question) {
    const nextTopic = pick(TOPICS.filter((t) => t.id !== state.topicId), state.usedTopics);
    state.topicId = nextTopic.id;
    state.usedTopics.add(nextTopic);
    const transition = {
      basic: "Let's talk about something new!",
      inter: 'Okay, switching gears a little —',
      adv: 'Let me steer us somewhere new —',
    }[band];
    question = `${transition} ${nextTopic.starter[band]}`;
  }

  const parts = [];

  // 2. Reação natural — só se a pergunta já não começar com uma interjeição
  if (!/^(nice|cool|yum|wow|great|okay|oh|that's|interesting)\b/i.test(question)) {
    parts.push(pick(REACTIONS[band]));
  }

  // 3. Recast: repete a forma correta naturalmente (técnica de ensino) —
  //    a explicação detalhada vai à parte, no card de correções.
  const recastable = corrections.find((c) => c.category !== 'ortografia' && String(c.corrected).trim().length > 2);
  if (recastable) {
    parts.push(`(By the way, we usually say "${String(recastable.corrected).trim()}" 😉)`);
  } else if (corrections.length === 0 && userText.split(/\s+/).length >= 6 && Math.random() < 0.35) {
    parts.push(PRAISE[band]);
  }

  parts.push(question);

  return parts.join(' ');
}

function clearSession(sessionId) {
  sessionState.delete(sessionId);
}

module.exports = { openConversation, reply, clearSession };
