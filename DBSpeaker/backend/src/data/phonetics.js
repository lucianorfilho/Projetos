// Base de conhecimento fonético: sons do inglês difíceis para brasileiros,
// com dicas em português e frases de treino por nível.

const SOUNDS = [
  {
    id: 'th',
    label: 'TH (θ/ð)',
    test: /th/i,
    tip: 'O "th" não existe em português. Coloque a ponta da língua entre os dentes e sopre: "think" (θ) e "this" (ð). Cuidado para não virar "f", "t" ou "d".',
    words: ['think', 'this', 'that', 'three', 'thanks', 'mother', 'weather', 'birthday'],
  },
  {
    id: 'ed',
    label: 'Terminação -ED',
    test: /\w{3,}ed\b/i,
    tip: 'O "-ed" quase nunca é uma sílaba extra: "worked" soa como "workt", "played" como "plaid". Só vira sílaba ("id") depois de T ou D: "wanted", "needed".',
    words: ['worked', 'played', 'stopped', 'wanted', 'needed', 'watched', 'lived'],
  },
  {
    id: 'h',
    label: 'H aspirado',
    test: /\bh\w+/i,
    tip: 'O "h" inicial em inglês é aspirado, como um sopro (parecido com o "rr" carioca leve): "house", "happy". Não é mudo como em português.',
    words: ['house', 'happy', 'hungry', 'hotel', 'hospital', 'behind'],
  },
  {
    id: 'r',
    label: 'R americano',
    test: /r/i,
    tip: 'O "r" americano é feito enrolando levemente a língua para trás, sem vibrar: "red", "car". Não use o "r" de "rato" nem o "r" de "caro".',
    words: ['red', 'car', 'work', 'world', 'around', 'restaurant'],
  },
  {
    id: 'ii',
    label: 'Vogal curta vs longa (ship/sheep)',
    test: /\b(ship|sheep|live|leave|it|eat|sit|seat|chip|cheap|fill|feel|this|these)\b/i,
    tip: 'Inglês tem duas vogais onde o português tem uma: "ship" (i curto, relaxado) vs "sheep" (ii longo). "Live" ≠ "leave", "it" ≠ "eat".',
    words: ['ship', 'sheep', 'live', 'leave', 'it', 'eat', 'this', 'these'],
  },
  {
    id: 'sclusters',
    label: 'S + consoante (sem "e" antes)',
    test: /\b(st|sp|sc|sk|sl|sm|sn)\w+/i,
    tip: 'Brasileiros tendem a falar "eS-tudent", "eS-chool". Comece direto no "s": "student", "school", "speak", sem vogal antes.',
    words: ['student', 'school', 'speak', 'start', 'Spanish', 'street', 'small'],
  },
  {
    id: 'final-l',
    label: 'L final',
    test: /\w+l\b/i,
    tip: 'O "l" no fim da palavra não vira "u" como em português ("Brasil" → "Brasiu"). Encoste a língua no céu da boca: "will", "school", "beautiful".',
    words: ['will', 'school', 'beautiful', 'well', 'feel', 'hotel'],
  },
  {
    id: 'w-v',
    label: 'W vs V',
    test: /\b[wv]\w+/i,
    tip: '"W" é feito com os lábios arredondados sem encostar nos dentes ("water"); "V" encosta os dentes no lábio ("very"). Não troque um pelo outro.',
    words: ['water', 'very', 'wine', 'vine', 'west', 'vest', 'world'],
  },
  {
    id: 'final-consonants',
    label: 'Consoante final seca',
    test: /\w+(t|d|k|g|p|b)\b/i,
    tip: 'Não adicione um "i" no final: "big" não é "bigui", "internet" não é "interneti". Termine a palavra na consoante, seca.',
    words: ['big', 'internet', 'good', 'book', 'stop', 'job'],
  },
];

// Frases de treino por nível, cada uma marcada com os sons que exercita
const EXERCISES = {
  A1: [
    { text: 'I think this is my house.', sounds: ['th', 'h', 'ii'] },
    { text: 'The students speak at school.', sounds: ['sclusters', 'ed'] },
    { text: 'I live in a big city.', sounds: ['ii', 'final-consonants'] },
    { text: 'My mother is very happy.', sounds: ['th', 'w-v', 'h'] },
    { text: 'I worked and played yesterday.', sounds: ['ed', 'r'] },
  ],
  A2: [
    { text: 'I watched three movies this weekend.', sounds: ['ed', 'th', 'ii'] },
    { text: 'The weather in Brazil is beautiful.', sounds: ['th', 'final-l', 'r'] },
    { text: 'She stopped at the small hotel.', sounds: ['ed', 'sclusters', 'h', 'final-l'] },
    { text: 'I feel hungry, I want to eat something.', sounds: ['ii', 'h', 'th'] },
    { text: 'We will travel around the world.', sounds: ['final-l', 'r', 'w-v', 'th'] },
  ],
  B1: [
    { text: 'I thought the restaurant was really crowded.', sounds: ['th', 'r', 'ed'] },
    { text: 'Everybody needed help with their homework.', sounds: ['ed', 'th', 'h'] },
    { text: 'These three students studied Spanish together.', sounds: ['th', 'ii', 'sclusters', 'ed'] },
    { text: 'The world is changing faster than we think.', sounds: ['w-v', 'r', 'th', 'final-consonants'] },
    { text: 'I would rather live near the beach.', sounds: ['r', 'ii', 'th'] },
  ],
  B2: [
    { text: 'Although the weather was terrible, we thoroughly enjoyed the trip.', sounds: ['th', 'r', 'ed'] },
    { text: 'She achieved everything she planned through hard work.', sounds: ['th', 'ed', 'r', 'h'] },
    { text: 'The theory seemed thorough, but the results were worthless.', sounds: ['th', 'r', 'ii'] },
    { text: 'Vegetables and vitamins are vital for a healthy life.', sounds: ['w-v', 'th', 'final-l'] },
  ],
  C1: [
    { text: 'The three witches watched three watches; which witch watched which watch?', sounds: ['th', 'w-v', 'ii'] },
    { text: 'Notwithstanding the thunderstorm, the enthusiastic athletes threw themselves into the marathon.', sounds: ['th', 'sclusters', 'r'] },
    { text: 'She sells seashells by the seashore, and the shells she sells are seashells for sure.', sounds: ['ii', 'sclusters', 'r'] },
  ],
  C2: [
    { text: 'The sixth sick sheikh’s sixth sheep is sick.', sounds: ['ii', 'sclusters', 'final-consonants'] },
    { text: 'Rural jurors truly endure rarely rewarding, thoroughly arduous procedures.', sounds: ['r', 'th', 'ed'] },
  ],
};

module.exports = { SOUNDS, EXERCISES };
