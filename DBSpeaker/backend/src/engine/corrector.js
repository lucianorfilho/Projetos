// Corretor gramatical: aplica a base de regras (erros típicos de brasileiros)
// e devolve a frase corrigida + explicações em português.

const { RULES } = require('../data/rules');

function correct(text) {
  let corrected = text;
  const corrections = [];

  for (const rule of RULES) {
    // Regex com estado (flag g): resetar antes de usar
    rule.pattern.lastIndex = 0;
    if (!rule.pattern.test(corrected)) continue;
    rule.pattern.lastIndex = 0;

    const before = corrected;
    corrected = corrected.replace(rule.pattern, (...args) => rule.replace(...args));

    if (before !== corrected) {
      // Captura o trecho original para mostrar ao aluno
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(before);
      // Trecho corrigido correspondente
      const fixedMatch = match ? match[0].replace(rule.pattern, (...a) => rule.replace(...a)) : corrected;
      corrections.push({
        ruleId: rule.id,
        category: rule.category,
        original: (match ? match[0] : before).trim(),
        corrected: String(fixedMatch).trim(),
        explanation: rule.explanation,
      });
    }
  }

  // Garante inicial maiúscula na frase corrigida
  corrected = corrected.replace(/(^|[.!?]\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());

  return { corrected, corrections, hasErrors: corrections.length > 0 };
}

module.exports = { correct };
