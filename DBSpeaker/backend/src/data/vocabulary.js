// Base de conhecimento de vocabulário por nível CEFR.
// Usada para: (1) estimar o nível do aluno pelo vocabulário que ele usa,
// (2) sugerir palavras novas um nível acima do atual.

const VOCAB = {
  A1: [
    { word: 'family', pt: 'família', example: 'I live with my family.' },
    { word: 'friend', pt: 'amigo(a)', example: 'She is my best friend.' },
    { word: 'house', pt: 'casa', example: 'My house is small.' },
    { word: 'work', pt: 'trabalho', example: 'I work in an office.' },
    { word: 'food', pt: 'comida', example: 'I like Brazilian food.' },
    { word: 'water', pt: 'água', example: 'Can I have some water?' },
    { word: 'happy', pt: 'feliz', example: 'I am happy today.' },
    { word: 'morning', pt: 'manhã', example: 'I wake up early in the morning.' },
    { word: 'school', pt: 'escola', example: 'My kids go to school.' },
    { word: 'city', pt: 'cidade', example: 'I live in a big city.' },
    { word: 'weekend', pt: 'fim de semana', example: 'What do you do on the weekend?' },
    { word: 'music', pt: 'música', example: 'I listen to music every day.' },
    { word: 'movie', pt: 'filme', example: 'Let’s watch a movie tonight.' },
    { word: 'beautiful', pt: 'bonito(a)', example: 'The beach is beautiful.' },
    { word: 'hungry', pt: 'com fome', example: 'I am hungry.' },
  ],
  A2: [
    { word: 'usually', pt: 'geralmente', example: 'I usually have coffee for breakfast.' },
    { word: 'travel', pt: 'viajar', example: 'I love to travel with my family.' },
    { word: 'weather', pt: 'clima/tempo', example: 'The weather is nice today.' },
    { word: 'expensive', pt: 'caro', example: 'This restaurant is expensive.' },
    { word: 'cheap', pt: 'barato', example: 'The bus is cheaper than a taxi.' },
    { word: 'busy', pt: 'ocupado', example: 'I was busy at work yesterday.' },
    { word: 'healthy', pt: 'saudável', example: 'I try to eat healthy food.' },
    { word: 'holiday', pt: 'feriado/férias', example: 'We went to the beach on holiday.' },
    { word: 'practice', pt: 'praticar', example: 'I practice English every day.' },
    { word: 'improve', pt: 'melhorar', example: 'I want to improve my speaking.' },
    { word: 'abroad', pt: 'no exterior', example: 'She wants to study abroad.' },
    { word: 'neighborhood', pt: 'bairro', example: 'My neighborhood is very quiet.' },
    { word: 'delicious', pt: 'delicioso', example: 'This cake is delicious!' },
    { word: 'sometimes', pt: 'às vezes', example: 'Sometimes I cook dinner.' },
    { word: 'together', pt: 'juntos', example: 'We watched the game together.' },
  ],
  B1: [
    { word: 'although', pt: 'embora', example: 'Although it was raining, we went out.' },
    { word: 'experience', pt: 'experiência', example: 'That trip was an amazing experience.' },
    { word: 'opinion', pt: 'opinião', example: 'In my opinion, it’s worth it.' },
    { word: 'probably', pt: 'provavelmente', example: 'I’ll probably stay home tonight.' },
    { word: 'advice', pt: 'conselho', example: 'Can you give me some advice?' },
    { word: 'decision', pt: 'decisão', example: 'It was a hard decision to make.' },
    { word: 'challenge', pt: 'desafio', example: 'Learning English is a fun challenge.' },
    { word: 'convenient', pt: 'conveniente', example: 'Working from home is convenient.' },
    { word: 'realize', pt: 'perceber', example: 'I realized I was wrong.' },
    { word: 'increase', pt: 'aumentar', example: 'Prices increased a lot this year.' },
    { word: 'environment', pt: 'meio ambiente', example: 'We should protect the environment.' },
    { word: 'skill', pt: 'habilidade', example: 'Speaking is the hardest skill for me.' },
    { word: 'available', pt: 'disponível', example: 'Are you available tomorrow?' },
    { word: 'instead', pt: 'em vez de', example: 'Let’s walk instead of driving.' },
    { word: 'confident', pt: 'confiante', example: 'I feel more confident now.' },
  ],
  B2: [
    { word: 'nevertheless', pt: 'no entanto', example: 'It was hard; nevertheless, we finished.' },
    { word: 'achieve', pt: 'alcançar', example: 'She achieved her goal of fluency.' },
    { word: 'significant', pt: 'significativo', example: 'There was a significant change.' },
    { word: 'assume', pt: 'presumir', example: 'I assume you’ve heard the news.' },
    { word: 'approach', pt: 'abordagem', example: 'We need a different approach.' },
    { word: 'consequence', pt: 'consequência', example: 'Every choice has consequences.' },
    { word: 'reliable', pt: 'confiável', example: 'He is a very reliable colleague.' },
    { word: 'demand', pt: 'demanda/exigir', example: 'This job demands a lot of focus.' },
    { word: 'overcome', pt: 'superar', example: 'She overcame her fear of speaking.' },
    { word: 'awareness', pt: 'consciência', example: 'There’s growing awareness about it.' },
    { word: 'efficient', pt: 'eficiente', example: 'This method is more efficient.' },
    { word: 'furthermore', pt: 'além disso', example: 'Furthermore, it saves money.' },
    { word: 'issue', pt: 'questão/problema', example: 'That’s a complex issue.' },
    { word: 'gradually', pt: 'gradualmente', example: 'My English improved gradually.' },
    { word: 'insight', pt: 'percepção/insight', example: 'The book gave me great insights.' },
  ],
  C1: [
    { word: 'compelling', pt: 'convincente/envolvente', example: 'She made a compelling argument.' },
    { word: 'nuance', pt: 'nuance', example: 'The word has a subtle nuance.' },
    { word: 'mitigate', pt: 'mitigar', example: 'We can mitigate the risks.' },
    { word: 'comprehensive', pt: 'abrangente', example: 'It’s a comprehensive report.' },
    { word: 'endeavor', pt: 'empreitada/esforço', example: 'Learning a language is a lifelong endeavor.' },
    { word: 'albeit', pt: 'embora/ainda que', example: 'He accepted, albeit reluctantly.' },
    { word: 'leverage', pt: 'alavancar', example: 'You can leverage your experience.' },
    { word: 'inherent', pt: 'inerente', example: 'There’s an inherent risk in it.' },
    { word: 'notwithstanding', pt: 'não obstante', example: 'Notwithstanding the delay, it went well.' },
    { word: 'articulate', pt: 'articular/expressar', example: 'She articulated her ideas clearly.' },
    { word: 'paramount', pt: 'primordial', example: 'Safety is paramount.' },
    { word: 'plausible', pt: 'plausível', example: 'That’s a plausible explanation.' },
  ],
  C2: [
    { word: 'quintessential', pt: 'quintessencial/típico', example: 'It’s the quintessential Brazilian dish.' },
    { word: 'ubiquitous', pt: 'onipresente', example: 'Smartphones are ubiquitous nowadays.' },
    { word: 'ephemeral', pt: 'efêmero', example: 'Fame can be ephemeral.' },
    { word: 'juxtapose', pt: 'justapor', example: 'The film juxtaposes past and present.' },
    { word: 'serendipity', pt: 'serendipidade', example: 'We met by pure serendipity.' },
    { word: 'idiosyncrasy', pt: 'idiossincrasia', example: 'Every language has its idiosyncrasies.' },
    { word: 'convoluted', pt: 'enrolado/complicado', example: 'The plot was too convoluted.' },
    { word: 'eloquent', pt: 'eloquente', example: 'He gave an eloquent speech.' },
  ],
};

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Índice palavra -> nível, para o profiler
const WORD_LEVEL = {};
for (const lvl of LEVELS) {
  for (const item of VOCAB[lvl]) WORD_LEVEL[item.word.toLowerCase()] = lvl;
}

module.exports = { VOCAB, LEVELS, WORD_LEVEL };
