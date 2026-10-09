# DBVault Agent — Windows
# Uso: .\install.ps1 -Token SEU_TOKEN -Server http://SEU_SERVIDOR

param(
    [Parameter(Mandatory=$true)][string]$Token,
    [Parameter(Mandatory=$true)][string]$Server
)

$AgentDir   = "C:\Program Files\DBVault"
$ConfigFile = "$AgentDir\config.json"

Write-Host "================================================"
Write-Host "   DBVault - Instalacao do dbvault-sendfile"
Write-Host "================================================"
Write-Host "Servidor: $Server"
Write-Host "Token: $($Token.Substring(0, [Math]::Min(8, $Token.Length)))..."

Write-Host "[1/3] Salvando configuracao..."
New-Item -ItemType Directory -Force -Path $AgentDir | Out-Null
@{
    token      = $Token
    server_url = $Server
} | ConvertTo-Json | Set-Content $ConfigFile

Write-Host "[2/3] Instalando comando dbvault-sendfile..."

$SendFileScript = @'
param([Parameter(Mandatory=$true, Position=0)][string]$FilePath)

$ConfigFile = "C:\Program Files\DBVault\config.json"

if (-not (Test-Path $ConfigFile)) {
    Write-Host "DBVault nao esta configurado. Reinstale o agente." -ForegroundColor Red
    exit 1
}
$Config = Get-Content $ConfigFile | ConvertFrom-Json

if (-not (Test-Path $FilePath)) {
    Write-Host "Arquivo nao encontrado: $FilePath" -ForegroundColor Red
    exit 1
}

Write-Host "Enviando $(Split-Path $FilePath -Leaf)..."

Add-Type -AssemblyName System.Net.Http
$Client = New-Object System.Net.Http.HttpClient
$Client.Timeout = [TimeSpan]::FromMinutes(10)
$Client.DefaultRequestHeaders.Add("X-DBVault-Token", $Config.token)
$Content = New-Object System.Net.Http.MultipartFormDataContent
$Content.Add((New-Object System.Net.Http.StringContent($Config.token)), "token")
$FileStream = [System.IO.File]::OpenRead($FilePath)
$FileContent = New-Object System.Net.Http.StreamContent($FileStream)
$Content.Add($FileContent, "file", (Split-Path $FilePath -Leaf))

try {
    $Response = $Client.PostAsync("$($Config.server_url)/api/agent/upload", $Content).Result
    $Body = $Response.Content.ReadAsStringAsync().Result
    if ($Response.IsSuccessStatusCode) {
        Write-Host "Arquivo enviado com sucesso!" -ForegroundColor Green
        exit 0
    } else {
        try {
            $Json = $Body | ConvertFrom-Json
            Write-Host "Erro: $($Json.error)" -ForegroundColor Red
        } catch {
            Write-Host "Erro: falha no envio (HTTP $([int]$Response.StatusCode))" -ForegroundColor Red
        }
        exit 1
    }
} finally {
    $FileStream.Close()
    $Client.Dispose()
}
'@

Set-Content -Path "$AgentDir\dbvault-sendfile.ps1" -Value $SendFileScript

$ShimContent = "@echo off`r`npowershell -NoProfile -ExecutionPolicy Bypass -File `"$AgentDir\dbvault-sendfile.ps1`" %*"
Set-Content -Path "$AgentDir\dbvault-sendfile.cmd" -Value $ShimContent

Write-Host "[3/3] Adicionando ao PATH do sistema..."
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
if ($CurrentPath -notlike "*$AgentDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$AgentDir", "Machine")
    Write-Host "PATH atualizado. Abra um novo terminal para usar o comando dbvault-sendfile."
} else {
    Write-Host "PATH ja configurado."
}

Write-Host ""
Write-Host "================================================"
Write-Host "   DBVault instalado com sucesso!"
Write-Host "   Uso: dbvault-sendfile C:\caminho\do\arquivo.bak"
Write-Host "   (abra um novo terminal antes de usar)"
Write-Host "================================================"
