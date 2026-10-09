require('dotenv').config();

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

module.exports = {
  port: Number(process.env.PORT || 4300),
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  // Se há chave, usa Claude por padrão; senão, motor local
  engine: process.env.ENGINE === 'claude' && !hasKey ? 'local' : process.env.ENGINE || (hasKey ? 'claude' : 'local'),
  model: process.env.CLAUDE_MODEL || 'claude-opus-4-8',

  // ---- Pague e use (valores em centavos de R$) ----
  billing: {
    enabled: process.env.BILLING_ENABLED !== 'false',
    priceMessage: Number(process.env.PRICE_MESSAGE_CENTS || 5),         // R$ 0,05 por mensagem de conversa
    pricePronunciation: Number(process.env.PRICE_PRONUNCIATION_CENTS || 3), // R$ 0,03 por avaliação de pronúncia
    welcomeBonus: Number(process.env.WELCOME_BONUS_CENTS || 200),       // R$ 2,00 de boas-vindas para experimentar
  },
};
