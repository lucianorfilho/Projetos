# Script de setup para dbControl no Windows

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "  dbControl - Setup Script" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Setup Backend
Write-Host "📦 Configurando Backend..." -ForegroundColor Green
Write-Host ""

cd backend

# Verificar se Python está instalado
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Python não encontrado. Por favor, instale Python 3.8 ou superior." -ForegroundColor Red
    exit 1
}

# Criar ambiente virtual
Write-Host "Criando ambiente virtual..." -ForegroundColor Yellow
python -m venv venv

# Ativar ambiente virtual
Write-Host "Ativando ambiente virtual..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Instalar dependências
Write-Host "Instalando dependências Python..." -ForegroundColor Yellow
pip install -r requirements.txt

cd ..

# Setup Frontend
Write-Host ""
Write-Host "🎨 Configurando Frontend..." -ForegroundColor Green
Write-Host ""

cd frontend

# Verificar se Node.js está instalado
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js/npm não encontrado. Por favor, instale Node.js 16 ou superior." -ForegroundColor Red
    exit 1
}

# Instalar dependências
Write-Host "Instalando dependências do Frontend..." -ForegroundColor Yellow
npm install

cd ..

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Setup completo!" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para iniciar o projeto:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣  Terminal 1 (Backend):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Gray
Write-Host "   python app.py" -ForegroundColor Gray
Write-Host ""
Write-Host "2️⃣  Terminal 2 (Frontend):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3️⃣  Acesse: http://localhost:3600" -ForegroundColor Cyan
