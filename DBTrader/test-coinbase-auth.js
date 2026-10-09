/**
 * Script de teste para validar credenciais ECDSA do Coinbase
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
  const message = timestamp + method + requestPath + (body || '');
  console.log('[TEST] Message to sign:', message);

  const sign = crypto.createSign('SHA256');
  sign.update(message);
  const signature = sign.sign(PRIVATE_KEY, 'base64');

  console.log('[TEST] Generated signature:', signature.substring(0, 50) + '...');
  return signature;
}

function testAuthentication() {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const method = 'GET';
  const requestPath = '/api/v3/brokerage/accounts';
  const signature = generateSignature(timestamp, method, requestPath, '');

  const options = {
    hostname: 'api.coinbase.com',
    port: 443,
    path: requestPath,
    method: method,
    headers: {
      'CB-ACCESS-KEY': API_KEY,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp,
      'Content-Type': 'application/json'
    }
  };

  console.log('\n[TEST] Enviando requisição...');
  console.log('[TEST] Headers:', {
    'CB-ACCESS-KEY': API_KEY.substring(0, 50) + '...',
    'CB-ACCESS-SIGN': signature.substring(0, 50) + '...',
    'CB-ACCESS-TIMESTAMP': timestamp
  });

  const req = https.request(options, (res) => {
    console.log('\n[TEST] ✅ Response Status:', res.statusCode);
    console.log('[TEST] Response Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('[TEST] Response Body:', JSON.stringify(parsed, null, 2));

        if (res.statusCode === 200) {
          console.log('\n✅ ✅ ✅ SUCESSO! As credenciais ECDSA FUNCIONAM!');
        } else if (res.statusCode === 401) {
          console.log('\n❌ Ainda 401 - problema com as credenciais ou assinatura');
        }
      } catch (e) {
        console.log('[TEST] Raw Response:', data);
      }
    });
  });

  req.on('error', (err) => {
    console.error('[TEST] ❌ Request error:', err.message);
  });

  req.end();
}

console.log('🔐 Testando autenticação ECDSA com Coinbase...\n');
testAuthentication();
