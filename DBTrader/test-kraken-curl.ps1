# Teste Kraken com PowerShell
$API_KEY = "JGwQfbqwPPNrBWjG6Yk9Hf0NFX8ezFyzKndwOjX483obKlC/wyttZ3Bb"
$SECRET_KEY = "spiBwIC1cnHQkQwLRe9seSHyyYVmLIf8tm27N//goC5TNvRaUN1YGYfnRisyA09kImbi4pKIsGFqfcgq+nkZig=="

$NONCE = [long]([DateTime]::UtcNow.Subtract([DateTime]::new(1970,1,1)).TotalMilliseconds).ToString()
$ENDPOINT = "/0/private/Balance"
$POSTDATA = "nonce=${NONCE}"

Write-Host "[TEST] Testando Kraken com PowerShell..." -ForegroundColor Cyan
Write-Host "NONCE: $NONCE"
Write-Host "API Key: $($API_KEY.Substring(0, 20))..."

# Gerar SHA256 do postdata
$postBytes = [System.Text.Encoding]::UTF8.GetBytes($POSTDATA)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha256.ComputeHash($postBytes)

# Criar mensagem para HMAC (path + sha256 hash)
$messageBytes = [System.Text.Encoding]::UTF8.GetBytes($ENDPOINT)
$messageBytes += $hash

# Decodificar secret key (base64)
$secretBytes = [System.Convert]::FromBase64String($SECRET_KEY)

# Gerar HMAC-SHA256
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $secretBytes
$signatureBytes = $hmac.ComputeHash($messageBytes)
$signature = [System.Convert]::ToBase64String($signatureBytes)

Write-Host "Signature: $($signature.Substring(0, 30))..."
Write-Host ""

# Fazer requisição
Write-Host "📡 Enviando requisição..."
$headers = @{
    "API-Key" = $API_KEY
    "API-Sign" = $signature
}

try {
    $response = Invoke-WebRequest -Uri "https://api.kraken.com/0/private/Balance" `
        -Method POST `
        -Headers $headers `
        -Body $POSTDATA `
        -ContentType "application/x-www-form-urlencoded"

    Write-Host "✅ Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "[ERRO] $($_.Exception.Message)"
}
