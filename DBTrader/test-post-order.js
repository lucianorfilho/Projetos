/**
 * Teste POST para criar ordem no Coinbase
 */
const crypto = require('crypto');
const https = require('https');

const API_KEY = 'organizations/b252d89f-0a68-419f-87a2-baf7258f5956/apiKeys/bdadfa05-d9ec-47e6-adc0-27ef9e08580a';
const PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIOIYtz8vkMjOrj5IoWwdY8/nrlyS4rW1zKG/Mi7ZYzaCoAoGCCqGSM49
AwEHoUQDQgAEySO1N81pngOtBkrVKLceJIA3ml6c9MCPwYWLKsdL2+DS5bEMg/nS
FvXbF31C/IQuCOn7pkhK/BSLQIehfWTJOw==
-----END EC PRIVATE KEY-----`;

function generateSignature(timestamp, method, requestPath, body) {
  const message = timestamp + method + requestPath + body;
  console.log('[SIGN] Message:', message.substring(0, 100) + '...');

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  const signature = sign.sign(PRIVATE_KEY, 'base64');

  console.log('[SIGN] Signature:', signature.substring(0, 50) + '...');
  return signature;
}

function testPostOrder() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const requestPath = '/api/v3/brokerage/orders';
  const body = JSON.stringify({
    client_order_id: `trade_${Date.now()}`,
    product_id: 'BTC-USD',
    side: 'BUY',
    order_configuration: {
      market_market_ioc: {
        quote_size: '10'
      }
    }
  });

  const signature = generateSignature(timestamp, method, requestPath, body);

  const options = {
    hostname: 'api.coinbase.com',
    port: 443,
    path: requestPath,
    method: method,
    headers: {
      'CB-ACCESS-KEY': API_KEY,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  console.log('\n[POST TEST] Enviando POST com body...\n');

  const req = https.request(options, (res) => {
    console.log('[POST TEST] Status:', res.statusCode);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('[POST TEST] Response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('[POST TEST] Raw Response:', data);
      }

      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('\n✅ ✅ ✅ POST FUNCIONOU! Ordem será criada!');
      } else if (res.statusCode === 401) {
        console.log('\n❌ POST retornou 401 - problema com assinatura ou chaves');
      }
    });
  });

  req.on('error', (err) => {
    console.error('[POST TEST] Error:', err.message);
  });

  req.write(body);
  req.end();
}

console.log('🧪 Testando POST para criar ordem...\n');
testPostOrder();
