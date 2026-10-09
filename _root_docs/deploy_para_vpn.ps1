# Deploy via SCP - DBVault
# Este script copia os arquivos modificados para a VPS

# ============================================================
# CONFIGURAÇÃO
# ============================================================

$VPS_IP = "23.106.45.221"
$VPS_USER = "root"
$VPS_PATH = "/var/www/guardsaas/backend"
$LOCAL_PATH = "C:\Users\lucia\claude_kiwifi\GuardSaaS\backend"

Write-Host "========================================" -ForegroundColor Green
Write-Host "Deploy DBVault - Liberação Automática" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# ============================================================
# 1. VERIFICAR SE ARQUIVOS EXISTEM LOCALMENTE
# ============================================================

Write-Host "[1/5] Verificando arquivos locais..." -ForegroundColor Cyan

$files = @(
    "$LOCAL_PATH\src\scheduler.js",
    "$LOCAL_PATH\src\routes\admin.js",
    "$LOCAL_PATH\src\index.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ARQUIVO NÃO ENCONTRADO: $file" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# ============================================================
# 2. FAZER BACKUP NA VPS
# ============================================================

Write-Host "[2/5] Fazendo backup na VPS..." -ForegroundColor Cyan

$backup_cmd = "cd $VPS_PATH && tar -czf backup_`$(date +%Y%m%d_%H%M%S).tar.gz src/"
ssh $VPS_USER@$VPS_IP $backup_cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Backup criado com sucesso" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Erro ao criar backup (continuando mesmo assim...)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 3. COPIAR ARQUIVOS VIA SCP
# ============================================================

Write-Host "[3/5] Copiando arquivos para VPS..." -ForegroundColor Cyan

# Copiar scheduler.js
Write-Host "  → Copiando scheduler.js..." -ForegroundColor Yellow
scp -P 22 "$LOCAL_PATH\src\scheduler.js" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/scheduler.js"
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ scheduler.js enviado" -ForegroundColor Green
} else {
    Write-Host "    ❌ ERRO ao enviar scheduler.js" -ForegroundColor Red
    exit 1
}

# Copiar admin.js
Write-Host "  → Copiando admin.js..." -ForegroundColor Yellow
scp -P 22 "$LOCAL_PATH\src\routes\admin.js" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/routes/admin.js"
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ admin.js enviado" -ForegroundColor Green
} else {
    Write-Host "    ❌ ERRO ao enviar admin.js" -ForegroundColor Red
    exit 1
}

# Copiar index.js
Write-Host "  → Copiando index.js..." -ForegroundColor Yellow
scp -P 22 "$LOCAL_PATH\src\index.js" "${VPS_USER}@${VPS_IP}:${VPS_PATH}/src/index.js"
if ($LASTEXITCODE -eq 0) {
    Write-Host "    ✅ index.js enviado" -ForegroundColor Green
} else {
    Write-Host "    ❌ ERRO ao enviar index.js" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================
# 4. VERIFICAR ARQUIVOS NA VPS
# ============================================================

Write-Host "[4/5] Verificando arquivos na VPS..." -ForegroundColor Cyan

$verify_cmd = "ls -lh $VPS_PATH/src/scheduler.js $VPS_PATH/src/routes/admin.js $VPS_PATH/src/index.js"
ssh $VPS_USER@$VPS_IP $verify_cmd

Write-Host ""

# ============================================================
# 5. REINICIAR APLICAÇÃO
# ============================================================

Write-Host "[5/5] Reiniciando aplicação..." -ForegroundColor Cyan

$restart_cmd = "cd $VPS_PATH && pm2 restart all"
ssh $VPS_USER@$VPS_IP $restart_cmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✅ Aplicação reiniciada" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Erro ao reiniciar (verifique manualmente)" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================
# 6. VALIDAÇÃO
# ============================================================

Write-Host "[✓] Aguardando aplicação iniciar..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

Write-Host "[✓] Verificando logs..." -ForegroundColor Cyan
$log_cmd = "pm2 logs guardsaas --lines 20"
ssh $VPS_USER@$VPS_IP $log_cmd

Write-Host ""

# ============================================================
# FIM
# ============================================================

Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "  1. Aguarde 15 segundos para aplicação estabilizar"
Write-Host "  2. Teste o scheduler: curl http://localhost:4000/api/admin/pending-payments"
Write-Host "  3. Recupere cliente 'cupper store'"
Write-Host ""
