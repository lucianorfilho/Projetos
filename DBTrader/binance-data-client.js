const axios = require('axios');

class BinanceDataClient {
  constructor() {
    this.baseUrl = process.env.BINANCE_API_URL || 'https://api.binance.com';
    console.log('[BINANCE-DATA] 🚀 Inicializado (dados públicos)');
  }

  /**
   * Obter velas (candles) M1 do Binance
   * @param {string} symbol - Ex: BTCUSDT
   * @param {number} limit - Número de velas (padrão: 60)
   */
  async getCandles(symbol, limit = 60) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/klines`, {
        params: {
          symbol: symbol,
          interval: '1m', // M1 = 1 minuto
          limit: limit
        }
      });

      // Converter para formato amigável
      return response.data.map((candle) => ({
        time: Math.floor(candle[0] / 1000), // Timestamp em segundos
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[7])
      }));
    } catch (err) {
      console.error(`[BINANCE-DATA] Erro ao obter velas de ${symbol}:`, err.message);
      throw err;
    }
  }

  /**
   * Obter preço atual
   */
  async getPrice(symbol) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price`, {
        params: { symbol }
      });
      return parseFloat(response.data.price);
    } catch (err) {
      console.error(`[BINANCE-DATA] Erro ao obter preço:`, err.message);
      throw err;
    }
  }
}

module.exports = new BinanceDataClient();
