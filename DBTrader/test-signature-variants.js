/**
 * Testar diferentes variantes de assinatura ECDSA
 */
const crypto = require('crypto');
const https = require('https');

const API_KEY = 'organizations/b252d89f-0a68-419f-87a2-baf7258f5956/apiKeys/bdadfa05-d9ec-47e6-adc0-27ef9e08580a';
const PRIVATE_KEY = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIOIYtz8vkMjOrj5IoWwdY8/nrlyS4rW1zKG/Mi7ZYzaCoAoGCCqGSM49
AwEHoUQDQgAEySO1N81pngOtBkrVKLceJIA3ml6c9MCPwYWLKsdL2+DS5bEMg/nS
FvXbF31C/IQuCOn7pkhK/BSLQIehfWTJOw==
-----END EC PRIVATE KEY-----`;

function generateSignature(timestamp, method, requestPath, body, variant) {
  let message;

  switch(variant) {
    case 1:
      // Original: timestamp + method + path + body
      message = timestamp + method + requestPath + body;
      break;
    case 2:
      // Sem body
      message = timestamp + method + requestPath;
      break;
    case 3:
      // Body como hash
      const bodyHash = crypto.createHash('sha256').update(body).digest('base64');
      message = timestamp + method + requestPath + bodyHash;
      break;
    case 4:
      // Apenas body
      message = body;
      break;
  }

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  const signature = sign.sign(PRIVATE_KEY, 'base64');

  return { signature, message: message.substring(0, 100) };
}

function testVariant(variant) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'POST';
  const requestPath = '/api/v3/brokerage/orders';
  const body = JSON.stringify({
    client_order_id: `test_${Date.now()}`,
    product_id: 'BTC-USD',
    side: 'BUY',
    order_configuration: {
      market_market_ioc: {
        quote_size: '1'
      }
    }
  });

  const { signature, message } = generateSignature(timestamp, method, requestPath, body, variant);

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

  return new Promise((resolve) => {
    console.log(`\n[VARIANT ${variant}] Message: ${message}...`);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`[VARIANT ${variant}] Status: ${res.statusCode}`);
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`[VARIANT ${variant}] ✅ FUNCIONOU!`);
        }
        resolve(res.statusCode);
      });
    });

    req.on('error', () => resolve(0));
    req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testando 4 variantes de assinatura ECDSA...\n');

  const results = [];
  for (let i = 1; i <= 4; i++) {
    const status = await testVariant(i);
    results.push({ variant: i, status });
    await new Promise(r => setTimeout(r, 500)); // Aguardar entre requisições
  }

  console.log('\n\n📊 RESULTADOS:');
  results.forEach(r => {
    const variant_names = {
      1: 'timestamp + method + path + body',
      2: 'timestamp + method + path (SEM body)',
      3: 'timestamp + method + path + bodyHash',
      4: 'apenas body'
    };
    console.log(`  Variante ${r.variant} (${variant_names[r.variant]}): ${r.status === 200 || r.status === 201 ? '✅' : '❌'} (${r.status})`);
  });
}

runTests();
