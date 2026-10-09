@echo off
echo.
echo ===============================================================
echo         TRADEBOT DASHBOARD LAUNCHER
echo ===============================================================
echo.

cd /d "%~dp0"

echo Verificando Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Python nao encontrado!
    echo Instale Python em https://www.python.org
    pause
    exit /b 1
)

echo Verificando dependencias...
python -c "import flask" >nul 2>&1
if errorlevel 1 (
    echo Instalando Flask...
    pip install Flask Flask-CORS
)

echo.
echo ===============================================================
echo Iniciando Dashboard em http://localhost:5000
echo ===============================================================
echo.
echo Pressione CTRL+C para parar
echo.

python dashboard_server.py

pause
