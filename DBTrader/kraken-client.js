const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');

class KrakenClient {
  constructor() {
    this.apiKey = process.env.KRAKEN_API_KEY;
    this.secretKey = process.env.KRAKEN_SECRET_KEY;

    // Usar endpoint Sandbox (teste) ou Produção (real)
    const isSandbox = process.env.KRAKEN_SANDBOX === 'true';
    this.baseUrl = isSandbox
      ? 'https://api.sandbox.kraken.com'
      : 'https://api.kraken.com';
    this.useRealAPI = process.env.KRAKEN_USE_REAL_API === 'true';

    this.lastNonce = 0;

    console.log('[KRAKEN] 🚀 Inicializado com endpoint:', this.baseUrl);
    console.log('[KRAKEN] Modo:', isSandbox ? '🧪 SANDBOX (Teste)' : '💰 PRODUÇÃO (Real)');
    console.log('[KRAKEN] API Key carregada:', this.apiKey?.substring(0, 20) + '...');
  }

  /**
   * Gerar assinatura HMAC-SHA256 para Kraken
   */
  generateSignature(path, data) {
    // Nonce deve ser único e incrementado a cada requisição
    const now = Date.now();
    const nonce = Math.max(now, this.lastNonce + 1);
    this.lastNonce = nonce;

    const postData = querystring.stringify({ ...data, nonce });

    // SHA256(nonce + POST data)
    const shasum = crypto
      .createHash('sha256')
      .update(postData)
      .digest('binary');

    // HMAC-SHA256(API path + SHA256, base64_decoded_secret)
    const secretBinary = Buffer.from(this.secretKey, 'base64').toString('binary');
    const message = path + shasum;
    const signature = crypto
      .createHmac('sha256', secretBinary)
      .update(message, 'binary')
      .digest('base64');

    console.log('[KRAKEN-SIGN] Path:', path);
    console.log('[KRAKEN-SIGN] Nonce:', nonce);
    console.log('[KRAKEN-SIGN] Signature:', signature.substring(0, 30) + '...');

    return { signature, postData, nonce };
  }

  /**
   * Fazer requisição autenticada à API Kraken
   */
  async makeRequest(method, path, data = {}) {
    try {
      if (!this.useRealAPI) {
        console.log('[KRAKEN] Modo simulado - não fazendo requisição real');
        return { success: true, simulated: true };
      }

      const { signature, postData, nonce } = this.generateSignature(path, data);

      console.log(`[KRAKEN] ${method} ${path}`);
      console.log(`[KRAKEN] Headers: KEY=${this.apiKey?.substring(0, 20)}..., SIGN=${signature?.substring(0, 20)}..., NONCE=${nonce}`);

      const url = `${this.baseUrl}${path}`;

      const config = {
        method,
        url,
        headers: {
          'API-Key': this.apiKey,
          'API-Sign': signature,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: postData
      };

      const response = await axios(config);
      console.log(`[KRAKEN] ✅ Sucesso: ${response.status}`);
      console.log(`[KRAKEN] Response completo:`, JSON.stringify(response.data, null, 2));

      // Kraken retorna { result: {}, error: [] }
      if (response.data?.error?.length > 0) {
        throw new Error(`Kraken Error: ${response.data.error.join(', ')}`);
      }

      return response.data.result || response.data;
    } catch (err) {
      console.error(`[KRAKEN] ❌ Erro: ${err.message}`);
      if (err.response) {
        console.error(`[KRAKEN] Status: ${err.response.status}`);
        console.error(`[KRAKEN] Response:`, JSON.stringify(err.response.data, null, 2));
      }
      throw err;
    }
  }

  /**
   * Obter saldo da conta
   */
  async getAccounts() {
    return this.makeRequest('POST', '/0/private/Balance', {});
  }

  /**
   * Obter preço atual de um par
   */
  async getPrice(pair) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/0/public/Ticker?pair=${pair}`
      );

      // Kraken retorna com uma chave diferente, então pegamos o primeiro resultado
      const result = response.data?.result;
      if (result && Object.keys(result).length > 0) {
        const key = Object.keys(result)[0];
        return parseFloat(result[key].c[0]); // Último preço
      }
      throw new Error(`Preço não encontrado para ${pair}`);
    } catch (err) {
      console.error(`[KRAKEN] Erro ao obter preço de ${pair}`);
      throw err;
    }
  }

  /**
   * Criar ordem de compra/venda (order type = market)
   */
  async createOrder(pair, side, volume, orderType = 'market') {
    const data = {
      pair,
      type: side.toUpperCase(),
      ordertype: orderType,
      volume: String(volume)
    };

    console.log(`[KRAKEN] Criando ordem ${side.toUpperCase()} de ${volume} em ${pair}`);
    return this.makeRequest('POST', '/0/private/AddOrder', data);
  }

  /**
   * Obter informações de uma ordem
   */
  async getOrder(txid) {
    const data = {
      txid: txid
    };
    return this.makeRequest('POST', '/0/private/QueryOrders', data);
  }

  /**
   * Listar ordens abertas
   */
  async listOpenOrders() {
    return this.makeRequest('POST', '/0/private/OpenOrders', {});
  }

  /**
   * Listar ordens fechadas
   */
  async listClosedOrders() {
    return this.makeRequest('POST', '/0/private/ClosedOrders', {});
  }

  /**
   * Converter par "BTC/USD" para "XBTUSDT" (formato Kraken)
   * Kraken usa XBT em vez de BTC
   */
  formatProductId(pair) {
    // BTC/USD -> XBTUSD
    return pair
      .replace('BTC', 'XBT')
      .replace('/', '');
  }
}

module.exports = new KrakenClient();
