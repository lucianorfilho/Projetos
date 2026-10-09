const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

class BinanceClient {
  constructor() {
    this.apiKey = process.env.BINANCE_API_KEY;
    this.secretKey = process.env.BINANCE_SECRET_KEY;

    // Usar endpoint PRODUÇÃO (real) ou TESTNET (teste)
    const isProduction = process.env.BINANCE_PRODUCTION === 'true';
    this.baseUrl = isProduction
      ? 'https://api.binance.com'
      : 'https://testnet.binance.vision';
    this.useRealAPI = process.env.BINANCE_USE_REAL_API === 'true';

    console.log('[BINANCE] 🚀 Inicializado com endpoint:', this.baseUrl);
    console.log('[BINANCE] Modo:', this.useRealAPI ? '💰 PRODUÇÃO (REAL)' : '🧪 TESTNET (Teste)');
    console.log('[BINANCE] API Key carregada:', this.apiKey?.substring(0, 20) + '...');
  }

  /**
   * Gerar assinatura HMAC-SHA256 para requisições Binance
   */
  generateSignature(queryString) {
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
    return signature;
  }

  /**
   * Fazer requisição autenticada à API Binance
   */
  async makeRequest(method, path, params = {}) {
    try {
      if (!this.useRealAPI) {
        console.log('[BINANCE] Modo simulado - não fazendo requisição real');
        return { success: true, simulated: true };
      }

      const timestamp = Date.now();
      params.timestamp = timestamp;

      // Construir query string
      const queryString = querystring.stringify(params);
      const signature = this.generateSignature(queryString);

      const url = `${this.baseUrl}${path}?${queryString}&signature=${signature}`;

      console.log(`[BINANCE] ${method} ${path}`);
      console.log(`[BINANCE] Headers: KEY=${this.apiKey?.substring(0, 20)}..., TS=${timestamp}`);

      const config = {
        method,
        url,
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      };

      const response = await axios(config);
      console.log(`[BINANCE] ✅ Sucesso: ${response.status}`);
      return response.data;
    } catch (err) {
      console.error(`[BINANCE] ❌ Erro: ${err.message}`);
      if (err.response) {
        console.error(`[BINANCE] Status: ${err.response.status}`);
        console.error(`[BINANCE] Response:`, JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }

  /**
   * Obter saldo da conta
   */
  async getAccounts() {
    return this.makeRequest('GET', '/api/v3/account');
  }

  /**
   * Obter preço atual de um par
   */
  async getPrice(productId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v3/ticker/price?symbol=${productId}`
      );
      return parseFloat(response.data.price);
    } catch (err) {
      console.error(`[BINANCE] Erro ao obter preço de ${productId}`);
      throw err;
    }
  }

  /**
   * Criar ordem de compra/venda
   */
  async createOrder(productId, side, quantity, orderType = 'MARKET') {
    const sideUpper = side.toUpperCase();

    // Binance usa "MARKET" para ordens de mercado
    const params = {
      symbol: productId,
      side: sideUpper,
      type: orderType,
      quantity: String(quantity)
    };

    console.log(`[BINANCE] Criando ordem ${sideUpper} de ${quantity} em ${productId}`);
    return this.makeRequest('POST', '/api/v3/order', params);
  }

  /**
   * Criar ordem de mercado com QUOTEORDERQTY (tamanho em USD, não em quantidade)
   */
  async createMarketOrderByQuote(productId, side, quoteSize) {
    const sideUpper = side.toUpperCase();

    const params = {
      symbol: productId,
      side: sideUpper,
      type: 'MARKET',
      quoteOrderQty: String(quoteSize) // Tamanho em USD (ex: "1" = $1 USD)
    };

    console.log(`[BINANCE] Criando ordem MARKET ${sideUpper} de $${quoteSize} em ${productId}`);
    return this.makeRequest('POST', '/api/v3/order', params);
  }

  /**
   * Obter informações de uma ordem
   */
  async getOrder(productId, orderId) {
    const params = {
      symbol: productId,
      orderId: orderId
    };
    return this.makeRequest('GET', '/api/v3/order', params);
  }

  /**
   * Listar ordens recentes
   */
  async listOrders(productId, limit = 10) {
    const params = {
      symbol: productId,
      limit: limit
    };
    return this.makeRequest('GET', '/api/v3/allOrders', params);
  }

  /**
   * Converter par "BTC/USD" para "BTCUSDT" (formato Binance)
   * Binance usa USDT, não USD
   */
  formatProductId(pair) {
    // BTC/USD -> BTCUSDT
    // Remove / e adiciona T no final
    return pair.replace('/', '').replace('USD', 'USDT');
  }
}

module.exports = new BinanceClient();
