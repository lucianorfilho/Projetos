const WebSocket = require('ws');
const axios = require('axios');

class DerivClient {
  constructor() {
    this.apiToken = process.env.DERIV_API_TOKEN;
    this.useRealAPI = process.env.DERIV_USE_REAL_API === 'true';

    // Deriv WebSocket endpoints
    this.wsUrl = 'wss://ws.binaryws.com/websockets/v3';
    this.restUrl = 'https://api.deriv.com';

    this.ws = null;
    this.requestId = 1;
    this.pendingRequests = {};

    console.log('[DERIV] 🚀 Inicializado');
    console.log('[DERIV] Modo:', this.useRealAPI ? '💰 PRODUÇÃO (Real)' : '🧪 Simulado');
    console.log('[DERIV] API Token carregado:', this.apiToken?.substring(0, 20) + '...');
  }

  /**
   * Conectar ao WebSocket do Deriv
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          console.log('[DERIV] ✅ WebSocket conectado');

          // Autenticar
          const authRequest = {
            authorize: this.apiToken,
            req_id: this.requestId++
          };

          this.ws.send(JSON.stringify(authRequest));
        });

        this.ws.on('message', (data) => {
          try {
            const response = JSON.parse(data);
            this.handleMessage(response);

            // Se for authorize, resolver promise
            if (response.authorize && !response.error) {
              console.log('[DERIV] ✅ Autenticado com sucesso');
              resolve(true);
            }
          } catch (err) {
            console.error('[DERIV] Erro ao parsear mensagem:', err.message);
          }
        });

        this.ws.on('error', (err) => {
          console.error('[DERIV] ❌ Erro WebSocket:', err.message);
          reject(err);
        });

        this.ws.on('close', () => {
          console.log('[DERIV] ⚠️ WebSocket desconectado');
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Processar mensagens do WebSocket
   */
  handleMessage(response) {
    const { req_id, error } = response;

    if (error) {
      console.error('[DERIV] ❌ Erro na resposta:', error);
      if (req_id && this.pendingRequests[req_id]) {
        this.pendingRequests[req_id].reject(new Error(error));
        delete this.pendingRequests[req_id];
      }
      return;
    }

    // Se há uma requisição pendente, resolver
    if (req_id && this.pendingRequests[req_id]) {
      this.pendingRequests[req_id].resolve(response);
      delete this.pendingRequests[req_id];
    }
  }

  /**
   * Enviar requisição WebSocket e aguardar resposta
   */
  async sendRequest(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket não está conectado');
    }

    const req_id = this.requestId++;
    payload.req_id = req_id;

    return new Promise((resolve, reject) => {
      // Timeout de 10 segundos
      const timeout = setTimeout(() => {
        delete this.pendingRequests[req_id];
        reject(new Error('Requisição expirou'));
      }, 10000);

      this.pendingRequests[req_id] = {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      };

      this.ws.send(JSON.stringify(payload));
    });
  }

  /**
   * Obter preço atual de um símbolo
   */
  async getPrice(symbol) {
    try {
      const response = await this.sendRequest({
        ticks: symbol,
        subscribe: 1
      });

      if (response.tick) {
        return parseFloat(response.tick.quote);
      }
      throw new Error(`Preço não encontrado para ${symbol}`);
    } catch (err) {
      console.error(`[DERIV] Erro ao obter preço de ${symbol}:`, err.message);
      throw err;
    }
  }

  /**
   * Criar contrato binário (compra/venda)
   */
  async buyContract(symbol, direction, amount, duration, durationUnit = 'm') {
    if (!this.useRealAPI) {
      console.log('[DERIV] Modo simulado - não fazendo contrato real');
      return { simulated: true, contract_id: `sim_${Date.now()}` };
    }

    try {
      const contractPayload = {
        buy: 1,
        subscription: {
          k1cqwgea: 1 // Exemplo de subscription ID
        },
        parameters: {
          contract_type: direction === 'BUY' || direction === 'CALL' ? 'CALL' : 'PUT',
          currency: 'USD',
          duration: duration,
          duration_unit: durationUnit,
          symbol: symbol,
          amount: amount
        }
      };

      console.log(`[DERIV] Criando contrato ${direction} de $${amount} em ${symbol} por ${duration}${durationUnit}`);

      const response = await this.sendRequest(contractPayload);

      if (response.buy) {
        console.log(`[DERIV] ✅ Contrato criado: ${response.buy}`);
        return {
          contract_id: response.buy,
          payout: response.payout,
          cost: response.cost
        };
      }

      throw new Error('Falha ao criar contrato');
    } catch (err) {
      console.error(`[DERIV] Erro ao criar contrato:`, err.message);
      throw err;
    }
  }

  /**
   * Obter resultado do contrato
   */
  async getContractResult(contractId) {
    try {
      const response = await this.sendRequest({
        proposal_open_contract: 1,
        contract_id: contractId
      });

      if (response.proposal_open_contract) {
        const contract = response.proposal_open_contract;
        return {
          contract_id: contract.contract_id,
          status: contract.status,
          profit_loss: contract.profit,
          payout: contract.payout,
          entry_price: contract.entry_tick,
          exit_price: contract.exit_tick,
          entry_time: contract.entry_time,
          exit_time: contract.exit_time
        };
      }

      throw new Error('Contrato não encontrado');
    } catch (err) {
      console.error(`[DERIV] Erro ao obter resultado:`, err.message);
      throw err;
    }
  }

  /**
   * Desconectar WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

module.exports = new DerivClient();
