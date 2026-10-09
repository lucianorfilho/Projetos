#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Servidor Flask para Dashboard do TradeBot
"""

from flask import Flask, render_template, jsonify
from datetime import datetime, timedelta
import json
import os
from indicators import TechnicalIndicators
from patterns import CandlePatterns
from signals import SignalGenerator

app = Flask(__name__)

# Dados simulados para o dashboard
class DashboardData:
    def __init__(self):
        self.signals_history = []
        self.current_analysis = None
        self.load_sample_data()

    def load_sample_data(self):
        """Carrega dados de exemplo"""
        # Simular histórico de sinais
        now = datetime.now()
        self.signals_history = [
            {
                'timestamp': (now - timedelta(minutes=10)).isoformat(),
                'signal': 'COMPRA',
                'confidence': 0.82,
                'price': 1.0870,
                'strength': 'FORTE'
            },
            {
                'timestamp': (now - timedelta(minutes=5)).isoformat(),
                'signal': 'AGUARDE',
                'confidence': 0.45,
                'price': 1.0872,
                'strength': 'FRACO'
            },
            {
                'timestamp': now.isoformat(),
                'signal': 'VENDA',
                'confidence': 0.71,
                'price': 1.0875,
                'strength': 'MODERADO'
            }
        ]

    def get_current_metrics(self):
        """Retorna métricas atuais"""
        return {
            'balance': 9529.40,
            'win_rate': 0.685,
            'total_trades': 26,
            'winning_trades': 18,
            'losing_trades': 8,
            'current_price': 1.0875,
            'daily_profit': 285.50,
            'account_status': 'DEMO'
        }

    def get_chart_data(self):
        """Retorna dados para o gráfico"""
        import random

        timestamps = []
        closes = []

        now = datetime.now()
        base_price = 1.0850

        for i in range(20):
            timestamps.append((now - timedelta(minutes=20-i)).strftime('%H:%M'))
            base_price += random.uniform(-0.0003, 0.0003)
            closes.append(round(base_price, 4))

        return {
            'timestamps': timestamps,
            'closes': closes
        }

dashboard = DashboardData()

@app.route('/')
def index():
    """Página principal do dashboard"""
    return render_template('dashboard.html')

@app.route('/api/metrics')
def get_metrics():
    """API para obter métricas"""
    return jsonify(dashboard.get_current_metrics())

@app.route('/api/signals')
def get_signals():
    """API para obter histórico de sinais"""
    return jsonify({
        'signals': dashboard.signals_history,
        'total': len(dashboard.signals_history)
    })

@app.route('/api/chart')
def get_chart():
    """API para obter dados do gráfico"""
    return jsonify(dashboard.get_chart_data())

@app.route('/api/indicators')
def get_indicators():
    """API para obter indicadores"""
    import random

    return jsonify({
        'rci': round(random.uniform(20, 80), 2),
        'ma_5': 1.0872,
        'ma_20': 1.0860,
        'bollinger_upper': 1.0890,
        'bollinger_middle': 1.0870,
        'bollinger_lower': 1.0850,
        'rsi': round(random.uniform(30, 70), 2)
    })

@app.route('/api/patterns')
def get_patterns():
    """API para obter padrões detectados"""
    return jsonify({
        'torres_gemeas': {'found': True, 'score': 0.70},
        'c3': {'found': False, 'score': 0.0},
        'padrao_2_3': {'found': True, 'score': 0.75},
        'five_flip': {'found': False, 'score': 0.0}
    })

@app.route('/api/analysis', methods=['POST'])
def analyze():
    """Realiza análise e gera sinal"""
    import random

    # Simular análise
    signal = random.choice(['COMPRA', 'VENDA', 'AGUARDE'])
    confidence = random.uniform(0.30, 0.95)

    new_signal = {
        'timestamp': datetime.now().isoformat(),
        'signal': signal,
        'confidence': round(confidence, 2),
        'price': 1.0870 + random.uniform(-0.0005, 0.0005),
        'strength': 'FORTE' if confidence > 0.75 else ('MODERADO' if confidence > 0.50 else 'FRACO')
    }

    dashboard.signals_history.append(new_signal)

    return jsonify({
        'success': True,
        'signal': new_signal,
        'message': f'Sinal {signal} gerado com {confidence*100:.1f}% confianca'
    })

if __name__ == '__main__':
    print("\n" + "="*70)
    print("DASHBOARD TRADEBOT")
    print("="*70)
    print("\nServidor iniciado em: http://localhost:5000")
    print("Pressione CTRL+C para parar\n")

    app.run(debug=True, port=5000, host='localhost')
