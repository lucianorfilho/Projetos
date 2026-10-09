/**
 * Teste de autenticação com Binance
 */
require('dotenv').config();
const binanceClient = require('./binance-client');

async function testBinanceAuth() {
  try {
    console.log('🧪 Testando autenticação com Binance...\n');

    // Teste 1: GET /account
    console.log('[TEST] 1️⃣ Testando GET /account (saldo)...');
    const accounts = await binanceClient.getAccounts();
    console.log('[TEST] ✅ GET /account funcionou!');
    console.log('[TEST] Saldo em USDT:', accounts.balances?.find(b => b.asset === 'USDT')?.free || '0');

    // Teste 2: Obter preço
    console.log('\n[TEST] 2️⃣ Testando GET preço de BTCUSDT...');
    const price = await binanceClient.getPrice('BTCUSDT');
    console.log('[TEST] ✅ Preço atual:', price);

    // Teste 3: Criar ordem de teste
    console.log('\n[TEST] 3️⃣ Testando POST /order (criar ordem)...');
    const order = await binanceClient.createMarketOrderByQuote('BTCUSDT', 'BUY', '1');
    console.log('[TEST] ✅ Ordem criada!');
    console.log('[TEST] Order ID:', order.orderId);
    console.log('[TEST] Status:', order.status);
    console.log('[TEST] Executada (filled):', order.executedQty);

    console.log('\n✅ ✅ ✅ BINANCE FUNCIONANDO PERFEITAMENTE!');

  } catch (err) {
    console.error('\n❌ Erro durante teste:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

testBinanceAuth();
