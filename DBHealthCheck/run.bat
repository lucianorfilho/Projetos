@echo off
REM Script para executar DBHealthCheck no Windows

echo.
echo ========================================
echo     DBHealthCheck - Monitor Oracle
echo ========================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Erro: Python não encontrado!
    echo Por favor, instale Python 3.9+ de https://www.python.org
    pause
    exit /b 1
)

REM Instalar dependências se necessário
echo Verificando dependências...
pip install -q -r requirements.txt

REM Executar a aplicação
echo.
echo Iniciando DBHealthCheck...
echo Acesse: http://localhost:5000 no seu navegador
echo.
python main.py

pause
