$API_KEY = "JGwQfbqwPPNrBWjG6Yk9Hf0NFX8ezFyzKndwOjX483obKlC/wyttZ3Bb"
$SECRET_KEY = "spiBwIC1cnHQkQwLRe9seSHyyYVmLIf8tm27N//goC5TNvRaUN1YGYfnRisyA09kImbi4pKIsGFqfcgq+nkZig=="

$NONCE = [long]([DateTime]::UtcNow.Subtract([DateTime]::new(1970,1,1)).TotalMilliseconds).ToString()
$ENDPOINT = "/0/private/Balance"
$POSTDATA = "nonce=$NONCE"

Write-Host "Testing Kraken with PowerShell"
Write-Host "NONCE: $NONCE"

# SHA256 of postdata
$postBytes = [System.Text.Encoding]::UTF8.GetBytes($POSTDATA)
$sha256 = [System.Security.Cryptography.SHA256]::Create()
$hash = $sha256.ComputeHash($postBytes)

# Message: path + hash
$messageBytes = [System.Text.Encoding]::UTF8.GetBytes($ENDPOINT) + $hash

# HMAC
$secretBytes = [System.Convert]::FromBase64String($SECRET_KEY)
$hmac = New-Object System.Security.Cryptography.HMACSHA256
$hmac.Key = $secretBytes
$signatureBytes = $hmac.ComputeHash($messageBytes)
$signature = [System.Convert]::ToBase64String($signatureBytes)

Write-Host "Signature: $($signature.Substring(0, 30))..."

# Request
$headers = @{"API-Key" = $API_KEY; "API-Sign" = $signature}

try {
    $response = Invoke-WebRequest -Uri "https://api.kraken.com/0/private/Balance" `
        -Method POST -Headers $headers -Body $POSTDATA
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
