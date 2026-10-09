#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
TradeBot Launcher
Inicializa o dashboard de forma simples
"""

import subprocess
import sys
import os
import webbrowser
import time

def check_dependencies():
    """Verifica se as dependências estão instaladas"""
    print("\n" + "="*70)
    print("VERIFICANDO DEPENDÊNCIAS")
    print("="*70 + "\n")

    required = ['flask', 'numpy', 'pandas']
    missing = []

    for package in required:
        try:
            __import__(package)
            print(f"✓ {package}: OK")
        except ImportError:
            print(f"✗ {package}: NÃO INSTALADO")
            missing.append(package)

    if missing:
        print(f"\nInstalando pacotes faltantes: {', '.join(missing)}")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '-q'] + missing)
        print("✓ Dependências instaladas com sucesso!")

    return len(missing) == 0

def start_dashboard():
    """Inicia o servidor dashboard"""
    print("\n" + "="*70)
    print("INICIANDO DASHBOARD TRADEBOT")
    print("="*70 + "\n")

    print("Servidor iniciado em: http://localhost:5000")
    print("Abrindo navegador em 3 segundos...\n")
    print("Pressione CTRL+C para parar\n")

    # Abrir navegador após 3 segundos
    time.sleep(3)
    try:
        webbrowser.open('http://localhost:5000')
    except:
        print("Não conseguiu abrir navegador automaticamente.")
        print("Abra manualmente: http://localhost:5000\n")

    # Iniciar servidor
    try:
        from dashboard_server import app
        app.run(debug=True, port=5000, host='localhost', use_reloader=False)
    except KeyboardInterrupt:
        print("\n\n✓ Dashboard parado com sucesso")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Erro ao iniciar dashboard: {e}")
        sys.exit(1)

def show_menu():
    """Mostra menu de opções"""
    print("\n" + "="*70)
    print("TRADEBOT - MENU PRINCIPAL")
    print("="*70)
    print("""
1. Iniciar Dashboard (recomendado)
2. Executar Testes
3. Ver Configurações
4. Sair
    """)

    choice = input("Escolha uma opcao (1-4): ").strip()
    return choice

def run_tests():
    """Executa os testes"""
    print("\nExecutando testes...\n")
    try:
        subprocess.check_call([sys.executable, 'test_simple.py'])
    except subprocess.CalledProcessError:
        print("✗ Erro ao executar testes")

def show_config():
    """Mostra configurações atuais"""
    print("\n" + "="*70)
    print("CONFIGURAÇÕES ATUAIS")
    print("="*70 + "\n")

    try:
        from config import SIGNAL_CONFIG, ANALYSIS_CONFIG
        print("Thresholds de Sinais:")
        for key, value in SIGNAL_CONFIG.items():
            print(f"  {key}: {value}")

        print("\nConfigurações de Análise:")
        for key, value in ANALYSIS_CONFIG.items():
            print(f"  {key}: {value}")
    except Exception as e:
        print(f"Erro ao carregar configurações: {e}")

    print("\nEdite config.py para alterar as configurações.")

def main():
    """Função principal"""
    print("\n" + "="*70)
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║                  TRADEBOT - LAUNCHER                          ║")
    print("║         Análise Confluente de Gráficos - Avalon Broker         ║")
    print("║                    Versão 1.0                                  ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    print("="*70)

    # Verificar dependências
    if not check_dependencies():
        print("\n✗ Erro ao instalar dependências")
        sys.exit(1)

    # Menu
    while True:
        choice = show_menu()

        if choice == '1':
            if check_dependencies():
                start_dashboard()
            break

        elif choice == '2':
            run_tests()

        elif choice == '3':
            show_config()

        elif choice == '4':
            print("\nAté logo! 👋\n")
            sys.exit(0)

        else:
            print("Opção inválida. Tente novamente.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProcrama interrompido pelo usuário")
        sys.exit(0)
    except Exception as e:
        print(f"\n✗ Erro inesperado: {e}")
        sys.exit(1)
