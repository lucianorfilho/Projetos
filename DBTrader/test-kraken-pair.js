/**
 * Descobrir o par correto no Kraken
 */
require('dotenv').config();
const axios = require('axios');

async function findKrakenPair() {
  try {
    console.log('🔍 Procurando par BTC no Kraken...\n');

    const pairs = ['XBTUSD', 'BTCUSD', 'XBTUSDT', 'BTCUSDT', 'BTC/USD'];

    for (const pair of pairs) {
      try {
        const response = await axios.get(
          `https://api.kraken.com/0/public/Ticker?pair=${pair}`,
          { timeout: 5000 }
        );

        if (response.data?.result && Object.keys(response.data.result).length > 0) {
          const resultKey = Object.keys(response.data.result)[0];
          const price = response.data.result[resultKey].c[0];
          console.log(`✅ Par encontrado: ${pair} (chave: ${resultKey}) - Preço: $${price}`);
          return { pair, resultKey, price };
        }
      } catch (e) {
        console.log(`❌ ${pair} - erro: ${e.message?.substring(0, 30)}`);
      }
    }

    console.log('\n❌ Nenhum par encontrado');

  } catch (err) {
    console.error('Erro:', err.message);
  }
}

findKrakenPair();
