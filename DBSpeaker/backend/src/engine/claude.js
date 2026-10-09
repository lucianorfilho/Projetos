// Motor Claude (opcional): quando há ANTHROPIC_API_KEY no .env, o tutor
// passa a ser um professor de conversação de verdade, com correções ricas.
// Usa structured outputs para garantir JSON válido (reply + corrections).

const config = require('../config');

let client = null;
function getClient() {
  if (!client) {
    const Anthropic = require('@anthropic-ai/sdk');
    client = new Anthropic({ apiKey: config.anthropicKey });
  }
  return client;
}

const SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Your conversational reply in English, adapted to the learner level. React to what they said and ask ONE follow-up question.',
    },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original: { type: 'string' },
          corrected: { type: 'string' },
          explanation: { type: 'string', description: 'Explicação curta EM PORTUGUÊS do erro' },
          category: { type: 'string' },
        },
        required: ['original', 'corrected', 'explanation', 'category'],
        additionalProperties: false,
      },
    },
    estimated_level: {
      type: 'string',
      enum: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      description: 'CEFR level this message suggests',
    },
  },
  required: ['reply', 'corrections', 'estimated_level'],
  additionalProperties: false,
};

function systemPrompt(profile) {
  return `You are Alex, the AI conversation partner of DBSpeaker — an English conversation app for Brazilian learners.

Learner profile:
- Name: ${profile.name}
- Current CEFR level: ${profile.cefr} (continuous score ${profile.levelScore.toFixed(2)} on a 1-7 scale)
- Messages exchanged so far: ${profile.messagesCount}
- Recent recurring mistakes: ${profile.weakPoints && profile.weakPoints.length ? profile.weakPoints.join(', ') : 'none recorded yet'}

Your job:
1. Chat naturally in English like a friendly foreigner — warm, curious, encouraging. Keep replies SHORT (2-4 sentences) and always end with exactly ONE question that keeps the conversation flowing.
2. Calibrate language complexity to the learner's level: at A1/A2 use simple words and short sentences; at B1/B2 use natural everyday English; at C1/C2 use rich, idiomatic English and challenge them with nuanced questions.
3. Gently push them slightly ABOVE their comfort zone (i+1): introduce one slightly more advanced word or structure naturally in your reply.
4. Detect every grammar/vocabulary mistake in the learner's message and list it in "corrections" with a short explanation IN PORTUGUESE (pt-BR). Include false friends (assistir≠assist, pretender≠pretend) and Portuguese-interference errors. If there are no mistakes, return an empty array.
5. Estimate the CEFR level this specific message demonstrates in "estimated_level".

Never lecture inside the reply — corrections go only in the corrections array. The reply stays friendly and conversational.`;
}

/**
 * Gera a resposta do tutor via Claude API.
 * history: [{role:'user'|'assistant', text}] — histórico da sessão.
 */
async function chat(profile, history) {
  const anthropic = getClient();

  const messages = history.slice(-20).map((m) => ({
    role: m.role,
    content: m.text,
  }));

  const response = await anthropic.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: systemPrompt(profile),
    messages,
    output_config: { format: { type: 'json_schema', schema: SCHEMA } },
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('claude_refused');
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  return JSON.parse(textBlock.text);
}

module.exports = { chat };
