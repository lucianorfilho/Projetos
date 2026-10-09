const axios = require('axios');
const crypto = require('crypto');

class CoinbaseClient {
  constructor() {
    this.apiKey = process.env.COINBASE_API_KEY;
    // Converter \n literais em quebras de linha reais
    this.privateKey = (process.env.COINBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    // Usar endpoint PRODUÇÃO (real) ou SANDBOX (teste)
    const isProduction = process.env.COINBASE_PRODUCTION === 'true';
    this.baseUrl = isProduction ? 'https://api.coinbase.com' : 'https://api-sandbox.coinbase.com';
    this.useRealAPI = process.env.COINBASE_USE_REAL_API === 'true';

    console.log('[COINBASE] 🚀 Inicializado com endpoint:', this.baseUrl);
    console.log('[COINBASE] Modo:', this.useRealAPI ? '💰 PRODUÇÃO (REAL)' : '🧪 SANDBOX (Teste)');
    console.log('[COINBASE] Ambiante:', isProduction ? 'REAL MONEY' : 'DEMO');
    console.log('[COINBASE] API Key carregada:', this.apiKey?.substring(0, 50) + '...');
    console.log('[COINBASE] Private Key carregada:', this.privateKey?.substring(0, 20) + '...');
  }

  /**
   * Gerar assinatura EC (ECDSA) para requisições da API Coinbase
   */
  generateSignature(timestamp, method, requestPath, body) {
    const message = timestamp + method + requestPath + (body || '');
    console.log('[COINBASE-SIGN] Message:', message);
    console.log('[COINBASE-SIGN] Private Key (EC):', this.privateKey?.substring(0, 30) + '...');

    try {
      // Usar createSign() para ECDSA
      const sign = crypto.createSign('SHA256');
      sign.update(message);
      const signature = sign.sign(this.privateKey, 'base64');

      console.log('[COINBASE-SIGN] Generated Signature:', signature?.substring(0, 30) + '...');
      return signature;
    } catch (err) {
      console.error('[COINBASE-SIGN] Erro ao gerar assinatura:', err.message);
      throw err;
    }
  }

  /**
   * Fazer requisição autenticada à API Coinbase
   */
  async makeRequest(method, path, data = null) {
    try {
      if (!this.useRealAPI) {
        console.log('[COINBASE] Modo simulado - não fazendo requisição real');
        return { success: true, simulated: true };
      }

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const body = data ? JSON.stringify(data) : '';
      const signature = this.generateSignature(timestamp, method, path, body);

      console.log(`[COINBASE] ${method} ${path}`);
      console.log(`[COINBASE] Headers: KEY=${this.apiKey?.substring(0, 30)}..., SIGN=${signature?.substring(0, 20)}..., TS=${timestamp}`);

      const config = {
        method,
        url: this.baseUrl + path,
        headers: {
          'CB-ACCESS-KEY': this.apiKey,
          'CB-ACCESS-SIGN': signature,
          'CB-ACCESS-TIMESTAMP': timestamp,
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        config.data = data;
        console.log(`[COINBASE] Body: ${body}`);
      }

      const response = await axios(config);
      console.log(`[COINBASE] ✅ Sucesso: ${response.status}`);
      return response.data;
    } catch (err) {
      console.error(`[COINBASE] ❌ Erro: ${err.message}`);
      if (err.response) {
        console.error(`[COINBASE] Status: ${err.response.status}`);
        console.error(`[COINBASE] Response:`, JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }

  /**
   * Obter saldo da conta
   */
  async getAccounts() {
    return this.makeRequest('GET', '/api/v3/brokerage/accounts');
  }

  /**
   * Obter preço atual de um par
   */
  async getPrice(productId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v3/brokerage/product_books?product_id=${productId}`
      );
      return response.data.asks[0][0]; // Melhor ask price
    } catch (err) {
      console.error(`[COINBASE] Erro ao obter preço de ${productId}`);
      throw err;
    }
  }

  /**
   * Criar ordem de compra/venda
   */
  async createOrder(productId, side, size, orderType = 'market') {
    // Converter side para maiúscula (BUY ou SELL)
    const sideUpper = side.toUpperCase();

    const data = {
      client_order_id: `trade_${Date.now()}`,
      product_id: productId,
      side: sideUpper,
      order_configuration: {
        market_market_ioc: {
          quote_size: String(size) // Tamanho em USD como STRING
        }
      }
    };

    console.log(`[COINBASE] Criando ordem ${sideUpper} de $${size} em ${productId}`);
    return this.makeRequest('POST', '/api/v3/brokerage/orders', data);
  }

  /**
   * Obter informações de uma ordem
   */
  async getOrder(orderId) {
    return this.makeRequest('GET', `/api/v3/brokerage/orders/${orderId}`);
  }

  /**
   * Listar ordens recentes
   */
  async listOrders(productId, limit = 10) {
    return this.makeRequest('GET', `/api/v3/brokerage/orders/historical/batch?product_id=${productId}&limit=${limit}`);
  }

  /**
   * Converter par "BTC-USD" para "BTC-USD" (formato Coinbase)
   */
  formatProductId(pair) {
    return pair.replace('/', '-'); // BTC/USD -> BTC-USD
  }
}

module.exports = new CoinbaseClient();
