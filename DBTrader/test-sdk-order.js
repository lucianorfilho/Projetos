/**
 * Teste com SDK oficial do Coinbase
 */
const { CoinbaseAdvancedTradeClient } = require('@coinbase/cdp-sdk');
const fs = require('fs');

const API_KEY = 'organizations/b252d89f-0a68-419f-87a2-baf7258f5956/apiKeys/bdadfa05-d9ec-47e6-adc0-27ef9e08580a';
const PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIOIYtz8vkMjOrj5IoWwdY8/nrlyS4rW1zKG/Mi7ZYzaCoAoGCCqGSM49
AwEHoUQDQgAEySO1N81pngOtBkrVKLceJIA3ml6c9MCPwYWLKsdL2+DS5bEMg/nS
FvXbF31C/IQuCOn7pkhK/BSLQIehfWTJOw==
-----END EC PRIVATE KEY-----`;

async function testSDK() {
  try {
    console.log('🧪 Testando com SDK oficial do Coinbase...\n');

    // Inicializar cliente com credenciais
    const client = new CoinbaseAdvancedTradeClient({
      apiKey: API_KEY,
      privateKey: PRIVATE_KEY,
    });

    console.log('[SDK] ✅ Cliente inicializado com sucesso\n');

    // Testar GET primeiro
    console.log('[SDK] Testando GET /accounts...');
    const accounts = await client.getAccounts();
    console.log('[SDK] ✅ GET funcionou! Contas:', accounts.accounts?.length || 0);

    // Testar POST - criar ordem
    console.log('\n[SDK] Testando POST /orders (criar ordem)...');
    const order = await client.createOrder({
      client_order_id: `test_sdk_${Date.now()}`,
      product_id: 'BTC-USD',
      side: 'BUY',
      order_configuration: {
        market_market_ioc: {
          quote_size: '1' // $1 USD
        }
      }
    });

    console.log('[SDK] ✅ POST FUNCIONOU! Ordem criada:');
    console.log('[SDK] Order ID:', order.order_id);
    console.log('[SDK] Status:', order.status);
    console.log('\n✅ ✅ ✅ SDK OFICIAL FUNCIONA! Problema estava na implementação manual!');

  } catch (error) {
    console.error('[SDK] ❌ Erro:', error.message);
    if (error.response?.data) {
      console.error('[SDK] Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\n❌ SDK oficial retornou erro - problema pode estar nas credenciais ou permissões');
  }
}

testSDK();
