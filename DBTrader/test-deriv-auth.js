/**
 * Teste de autenticação com Deriv
 */
require('dotenv').config();
const derivClient = require('./deriv-client');

async function testDerivAuth() {
  try {
    console.log('🧪 Testando autenticação com Deriv...\n');

    // Conectar ao WebSocket
    console.log('[TEST] 1️⃣ Conectando ao Deriv...');
    await derivClient.connect();
    console.log('[TEST] ✅ Conectado!');

    // Aguardar um pouco para estabilizar
    await new Promise(r => setTimeout(r, 2000));

    // Testar obter preço
    console.log('\n[TEST] 2️⃣ Testando GET de preço (R_100)...');
    const price = await derivClient.getPrice('R_100');
    console.log('[TEST] ✅ Preço obtido:', price);

    // Testar criar contrato (simulado)
    console.log('\n[TEST] 3️⃣ Testando criação de contrato...');
    const contract = await derivClient.buyContract('R_100', 'CALL', 10, 1, 'm');
    console.log('[TEST] ✅ Contrato criado!');
    console.log('[TEST] Contrato ID:', contract.contract_id);

    console.log('\n✅ ✅ ✅ DERIV FUNCIONANDO PERFEITAMENTE!');

    // Desconectar
    derivClient.disconnect();

  } catch (err) {
    console.error('\n❌ Erro durante teste:', err.message);
    derivClient.disconnect();
  }
}

testDerivAuth();
