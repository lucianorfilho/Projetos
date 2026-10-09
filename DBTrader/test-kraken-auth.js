/**
 * Teste de autenticação com Kraken
 */
require('dotenv').config();
const krakenClient = require('./kraken-client');

async function testKrakenAuth() {
  try {
    console.log('🧪 Testando autenticação com Kraken...\n');

    // Teste 1: GET /Ticker (preço, sem autenticação)
    console.log('[TEST] 1️⃣ Testando GET /Ticker (preço de XBTUSD)...');
    const price = await krakenClient.getPrice('XBTUSD');
    console.log('[TEST] ✅ Preço atual de BTC:', price);

    // Teste 2: GET /Balance (autenticado)
    console.log('\n[TEST] 2️⃣ Testando GET /Balance (saldo da conta)...');
    const balance = await krakenClient.getAccounts();
    console.log('[TEST] ✅ GET /Balance funcionou!');
    console.log('[TEST] Saldo em USD:', balance.ZUSD || '0');
    console.log('[TEST] Saldo em BTC:', balance.XXBT || '0');

    // Teste 3: Listar ordens abertas
    console.log('\n[TEST] 3️⃣ Testando GET /OpenOrders...');
    const openOrders = await krakenClient.listOpenOrders();
    console.log('[TEST] ✅ Ordens abertas:', Object.keys(openOrders).length);

    // Teste 4: Criar ordem de teste (MARKET BUY)
    console.log('\n[TEST] 4️⃣ Testando POST /AddOrder (criar ordem de teste)...');
    const order = await krakenClient.createOrder('XBTUSD', 'buy', '0.001', 'market');
    console.log('[TEST] ✅ Ordem criada!');
    console.log('[TEST] Order TXID:', order.txid);
    console.log('[TEST] Descrição:', order.descr);

    console.log('\n✅ ✅ ✅ KRAKEN FUNCIONANDO PERFEITAMENTE!');

  } catch (err) {
    console.error('\n❌ Erro durante teste:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

testKrakenAuth();
