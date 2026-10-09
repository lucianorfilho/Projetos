// Base de conhecimento de correção gramatical.
// Foco em erros de interferência do português (erros típicos de brasileiros).
// Cada regra: padrão regex, correção e explicação em português.

const RULES = [
  {
    id: 'age-have-years',
    category: 'verbos',
    pattern: /\bi\s+have\s+(\d+)\s+years(\s+old)?\b/gi,
    replace: (m, age) => `I am ${age} years old`,
    explanation: 'Em inglês usamos o verbo "to be" para idade: "I am 30 years old", não "I have 30 years".',
  },
  {
    id: 'third-person-s',
    category: 'verbos',
    pattern: /\b(he|she|it|my (?:mother|father|brother|sister|wife|husband|son|daughter|friend|boss|dog|cat))\s+(go|want|like|need|work|study|live|play|watch|eat|drink|know|think|say|make|get|talk|speak|feel|love|hate|stay|run|walk|cook|read|write|teach|learn)\b(?!\w)/gi,
    replace: (m, subj, verb) => {
      const v = verb.toLowerCase();
      let fixed;
      if (/(ch|sh|s|x|z|o)$/.test(v)) fixed = v + 'es';
      else if (/[^aeiou]y$/.test(v)) fixed = v.slice(0, -1) + 'ies';
      else fixed = v + 's';
      return `${subj} ${fixed}`;
    },
    explanation: 'Na 3ª pessoa do singular (he/she/it), o verbo no presente leva "-s": "She works", "He likes".',
  },
  {
    id: 'have-has',
    category: 'verbos',
    pattern: /\b(he|she|it)\s+have\b/gi,
    replace: (m, subj) => `${subj} has`,
    explanation: 'Com he/she/it, "have" vira "has": "She has two kids".',
  },
  {
    id: 'do-does',
    category: 'verbos',
    pattern: /\b(he|she|it)\s+do\s+not\b/gi,
    replace: (m, subj) => `${subj} does not`,
    explanation: 'Com he/she/it, a negação usa "does not / doesn\'t".',
  },
  {
    id: 'didnt-past',
    category: 'verbos',
    pattern: /\b(didn'?t|did\s+not)\s+(went|saw|ate|made|got|took|came|said|knew|thought|bought|spoke|wrote|drank|slept|ran|gave|found|told|felt|left|met|paid|sat|stood|understood|won|lost|read|heard)\b/gi,
    replace: (m, aux, verb) => {
      const base = {
        went: 'go', saw: 'see', ate: 'eat', made: 'make', got: 'get', took: 'take',
        came: 'come', said: 'say', knew: 'know', thought: 'think', bought: 'buy',
        spoke: 'speak', wrote: 'write', drank: 'drink', slept: 'sleep', ran: 'run',
        gave: 'give', found: 'find', told: 'tell', felt: 'feel', left: 'leave',
        met: 'meet', paid: 'pay', sat: 'sit', stood: 'stand', understood: 'understand',
        won: 'win', lost: 'lose', read: 'read', heard: 'hear',
      }[verb.toLowerCase()] || verb;
      return `${aux} ${base}`;
    },
    explanation: 'Depois de "did/didn\'t" o verbo fica na forma base: "I didn\'t go" (não "didn\'t went").',
  },
  {
    id: 'peoples',
    category: 'substantivos',
    pattern: /\bpeoples\b/gi,
    replace: () => 'people',
    explanation: '"People" já é plural. "Peoples" só existe para "povos" (várias nações).',
  },
  {
    id: 'informations',
    category: 'substantivos',
    pattern: /\b(informations|advices|furnitures|homeworks|newses)\b/gi,
    replace: (m, w) => w.toLowerCase().replace(/e?s$/, '').replace('newse', 'news'),
    explanation: 'Substantivos incontáveis (information, advice, furniture, homework, news) não têm plural em inglês.',
  },
  {
    id: 'make-question',
    category: 'colocações',
    pattern: /\bmake\s+(a\s+|one\s+)?question(s)?\b/gi,
    replace: (m, art, pl) => `ask ${art || 'a '}question${pl || ''}`,
    explanation: 'Em inglês, "fazer uma pergunta" é "ask a question", não "make a question".',
  },
  {
    id: 'i-am-agree',
    category: 'verbos',
    pattern: /\bi\s*(?:'m|am)\s+agree\b/gi,
    replace: () => 'I agree',
    explanation: '"Agree" é verbo, não adjetivo: "I agree" (e não "I am agree").',
  },
  {
    id: 'depend-of',
    category: 'preposições',
    pattern: /\bdepend(s|ed|ing)?\s+of\b/gi,
    replace: (m, suf) => `depend${suf || ''} on`,
    explanation: 'O verbo "depend" pede a preposição "on": "It depends on you".',
  },
  {
    id: 'married-with',
    category: 'preposições',
    pattern: /\bmarried\s+with\b/gi,
    replace: () => 'married to',
    explanation: 'Em inglês é "married to someone", não "married with".',
  },
  {
    id: 'arrive-to',
    category: 'preposições',
    pattern: /\barrive(d|s)?\s+to\b/gi,
    replace: (m, suf) => `arrive${suf || ''} at`,
    explanation: 'Usamos "arrive at" (lugares específicos) ou "arrive in" (cidades/países) — nunca "arrive to".',
  },
  {
    id: 'explain-me',
    category: 'preposições',
    pattern: /\bexplain\s+me\b/gi,
    replace: () => 'explain to me',
    explanation: '"Explain" pede "to": "Can you explain it to me?"',
  },
  {
    id: 'more-better',
    category: 'comparativos',
    pattern: /\bmore\s+(better|worse|bigger|smaller|easier|harder|faster|cheaper|older|younger)\b/gi,
    replace: (m, comp) => comp,
    explanation: 'O comparativo já está na palavra ("better" = "mais bom"); não use "more" junto.',
  },
  {
    id: 'double-subject',
    category: 'estrutura',
    pattern: /\b(my \w+|the \w+)\s+(he|she|it|they)\s+(is|are|was|were|has|have|likes?|wants?|works?)\b/gi,
    replace: (m, subj, pron, verb) => `${subj} ${verb}`,
    explanation: 'Não repetimos o sujeito com pronome: "My brother is a doctor" (não "My brother he is").',
  },
  {
    id: 'existential-have',
    category: 'estrutura',
    pattern: /\b(?:have|has)\s+(many|a lot of|some|two|three|four|five|lots of)\s+(\w+)\s+(in|at|on)\b/gi,
    replace: (m, qty, noun, prep) => `there are ${qty} ${noun} ${prep}`,
    explanation: 'Para dizer que algo existe, usamos "there is/there are", não "have": "There are many people here" ("tem muita gente" ≠ "have").',
  },
  {
    id: 'no-have',
    category: 'negação',
    pattern: /\bi\s+(?:no|not)\s+(have|like|want|know|understand|speak|need|work)\b/gi,
    replace: (m, verb) => `I don't ${verb}`,
    explanation: 'A negação no presente usa "don\'t": "I don\'t have" (não "I no have").',
  },
  {
    id: 'how-do-you-call',
    category: 'colocações',
    pattern: /\bhow\s+do\s+you\s+call\b/gi,
    replace: () => 'what do you call',
    explanation: 'Em inglês perguntamos "What do you call this?" (não "How do you call").',
  },
  {
    id: 'want-that-you',
    category: 'estrutura',
    pattern: /\bwant\s+that\s+(you|he|she|they|we)\b/gi,
    replace: (m, pron) => `want ${pron === 'he' ? 'him' : pron === 'she' ? 'her' : pron === 'they' ? 'them' : pron === 'we' ? 'us' : pron} to`,
    explanation: 'Usamos "want + pessoa + to": "I want you to come" (não "I want that you come").',
  },
  {
    id: 'a-an',
    category: 'artigos',
    pattern: /\ba\s+(apple|orange|egg|hour|idea|umbrella|old|amazing|interesting|important|easy|awesome|engineer|artist|actor|uncle|aunt|island|office|answer|example|opportunity)\b/gi,
    replace: (m, noun) => `an ${noun}`,
    explanation: 'Antes de som de vogal usamos "an": "an apple", "an hour".',
  },
  {
    id: 'lowercase-i',
    category: 'ortografia',
    pattern: /(^|\s)i(\s|'m|'ll|'ve|'d)/g,
    replace: (m, pre, pos) => `${pre}I${pos}`,
    explanation: 'O pronome "I" (eu) é sempre maiúsculo em inglês.',
  },
  {
    id: 'missing-subject-it',
    category: 'estrutura',
    pattern: /(^|[.!?]\s+)(is|was)\s+(very|really|so|too)\s+(\w+)/gi,
    replace: (m, pre, verb, adv, adj) => `${pre}It ${verb.toLowerCase()} ${adv} ${adj}`,
    explanation: 'Frases em inglês precisam de sujeito: "It is very good" (não "Is very good").',
  },
  {
    id: 'in-the-night',
    category: 'preposições',
    pattern: /\bin\s+the\s+night\b/gi,
    replace: () => 'at night',
    explanation: 'Dizemos "at night" (à noite), embora seja "in the morning/afternoon/evening".',
  },
  {
    id: 'lose-hope-assistir',
    category: 'falsos cognatos',
    pattern: /\bassist(ed|s)?\s+(a\s+|the\s+)?(movie|film|series|game|match|video|tv|television)\b/gi,
    replace: (m, suf, art, thing) => `watch${suf === 'ed' ? 'ed' : suf === 's' ? 'es' : ''} ${art || ''}${thing}`,
    explanation: 'Falso cognato: "assistir" em inglês é "watch". "Assist" significa "ajudar".',
  },
  {
    id: 'pretend-intend',
    category: 'falsos cognatos',
    pattern: /\bi\s+pretend\s+to\s+(study|travel|learn|work|move|buy|visit|go|do|make|start|finish|improve)\b/gi,
    replace: (m, verb) => `I intend to ${verb}`,
    explanation: 'Falso cognato: "pretender" é "intend". "Pretend" significa "fingir".',
  },
];

module.exports = { RULES };
