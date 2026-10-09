#!/usr/bin/env python3
"""
Script para empacotar DBHealthCheck como .exe com PyInstaller
"""

import PyInstaller.__main__
import os
import shutil

def build():
    print("🔨 Iniciando build do DBHealthCheck...")

    # Diretórios
    dist_dir = os.path.join(os.getcwd(), 'dist')
    build_dir = os.path.join(os.getcwd(), 'build')

    # Limpar diretórios anteriores
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    # Argumentos do PyInstaller
    args = [
        'main.py',
        '--name=DBHealthCheck',
        '--onefile',
        '--windowed',
        '--icon=NONE',
        '--add-data=templates:templates',
        '--add-data=static:static',
        '--add-data=config.json:.',
        '--hidden-import=flask',
        '--hidden-import=cx_Oracle',
        '--hidden-import=schedule',
        '--collect-all=flask',
    ]

    print("📦 Executando PyInstaller...")
    PyInstaller.__main__.run(args)

    print("✅ Build concluído!")
    print(f"📁 Executável disponível em: {os.path.join(dist_dir, 'DBHealthCheck.exe')}")

if __name__ == '__main__':
    build()
