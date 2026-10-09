const axios = require('axios');

class ForexDataClient {
  constructor() {
    this.baseUrl = 'https://api.exchangerate-api.com/v4/latest';
    console.log('[FOREX-DATA] 🌍 Inicializado (Exchange Rate API - Gratuito)');
  }

  /**
   * Obter velas simuladas de forex com dados REAIS de taxa de câmbio
   * @param {string} pair - Ex: EURUSD
   * @param {number} limit - Número de velas (padrão: 60)
   */
  async getCandles(pair, limit = 60) {
    try {
      const [fromSymbol, toSymbol] = pair.match(/^([A-Z]{3})([A-Z]{3})$/).slice(1, 3);

      // Obter taxa de câmbio REAL atual
      const response = await axios.get(`${this.baseUrl}/${fromSymbol}`, { timeout: 5000 });
      const rate = response.data.rates[toSymbol];

      if (!rate) {
        throw new Error(`Par ${pair} não suportado`);
      }

      console.log(`[FOREX-DATA] Taxa atual ${pair}: ${rate}`);

      // Simular velas com variações realistas
      const candles = [];
      const now = Math.floor(Date.now() / 1000);
      let currentPrice = rate;

      for (let i = limit - 1; i >= 0; i--) {
        // Variação realista: ±0.5% por minuto é razoável para forex
        const variation = (Math.random() - 0.5) * 0.01;
        const open = currentPrice;
        const close = currentPrice * (1 + variation);
        const high = Math.max(open, close) * (1 + Math.random() * 0.003);
        const low = Math.min(open, close) * (1 - Math.random() * 0.003);

        candles.push({
          time: now - (i * 60),
          open: parseFloat(open.toFixed(5)),
          high: parseFloat(high.toFixed(5)),
          low: parseFloat(low.toFixed(5)),
          close: parseFloat(close.toFixed(5)),
          volume: 0
        });

        currentPrice = close;
      }

      return candles;
    } catch (err) {
      console.error(`[FOREX-DATA] Erro ao obter velas de ${pair}:`, err.message);
      throw err;
    }
  }

  /**
   * Obter preço REAL atual de forex
   */
  async getPrice(pair) {
    try {
      const [fromSymbol, toSymbol] = pair.match(/^([A-Z]{3})([A-Z]{3})$/).slice(1, 3);

      const response = await axios.get(`${this.baseUrl}/${fromSymbol}`);
      const rate = response.data.rates[toSymbol];

      if (!rate) {
        throw new Error(`Par ${pair} não suportado`);
      }

      return rate;
    } catch (err) {
      console.error(`[FOREX-DATA] Erro ao obter preço:`, err.message);
      throw err;
    }
  }
}

module.exports = new ForexDataClient();
