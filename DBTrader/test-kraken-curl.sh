#!/bin/bash

API_KEY="JGwQfbqwPPNrBWjG6Yk9Hf0NFX8ezFyzKndwOjX483obKlC/wyttZ3Bb"
SECRET_KEY="spiBwIC1cnHQkQwLRe9seSHyyYVmLIf8tm27N//goC5TNvRaUN1YGYfnRisyA09kImbi4pKIsGFqfcgq+nkZig=="

NONCE=$(date +%s%N | cut -c1-13)
ENDPOINT="/0/private/Balance"
POSTDATA="nonce=${NONCE}"

# Gerar assinatura
SHASUM=$(printf "%s%s" "${NONCE}" "${POSTDATA}" | openssl dgst -sha256 -binary)
SIGNATURE=$(printf "%s" "${ENDPOINT}${SHASUM}" | openssl dgst -sha256 -hmac <(printf "%s" "${SECRET_KEY}" | base64 -d) -binary | base64)

echo "🧪 Testando Kraken com curl..."
echo "NONCE: ${NONCE}"
echo "API Key: ${API_KEY:0:20}..."
echo "Signature: ${SIGNATURE:0:30}..."

# Fazer requisição
curl -s -X POST \
  -H "API-Key: ${API_KEY}" \
  -H "API-Sign: ${SIGNATURE}" \
  -d "nonce=${NONCE}" \
  "https://api.kraken.com${ENDPOINT}" | jq .

echo ""
echo "Se vir 'error' vazio, significa que funcionou!"
