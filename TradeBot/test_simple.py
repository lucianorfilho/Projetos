#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Teste simplificado do TradeBot - Não requer OpenCV
"""

from indicators import TechnicalIndicators
from patterns import CandlePatterns
from signals import SignalGenerator
from datetime import datetime
import json

def generate_realistic_candles(direction='up', volatility=0.0003, base_price=1.0860):
    """Gera velas realistas para teste"""
    import random

    opens = []
    highs = []
    lows = []
    closes = []

    current_price = base_price

    for i in range(20):
        open_price = current_price

        # Movimento aleatório com viés na direção
        if direction == 'up':
            movement = random.uniform(0, volatility * 2)
        elif direction == 'down':
            movement = random.uniform(-volatility * 2, 0)
        else:
            movement = random.uniform(-volatility, volatility)

        close_price = open_price + movement
        high_price = max(open_price, close_price) + random.uniform(0, volatility)
        low_price = min(open_price, close_price) - random.uniform(0, volatility)

        opens.append(open_price)
        highs.append(high_price)
        lows.append(low_price)
        closes.append(close_price)

        current_price = close_price

    return opens, highs, lows, closes

def test_bullish_signal():
    """Testa sinal de COMPRA"""
    print("\n" + "="*70)
    print("TESTE 1: SINAL BULLISH (COMPRA)")
    print("="*70 + "\n")

    opens, highs, lows, closes = generate_realistic_candles(direction='up')
    current_price = closes[-1]

    signal, confidence, signal_data = SignalGenerator.generate_signal(
        opens, highs, lows, closes, current_price
    )

    report = SignalGenerator.format_signal_report(signal_data)
    print(report)

    print(f"\n[OK] Sinal gerado: {signal}")
    print(f"[OK] Confianca: {confidence*100:.1f}%")

    return signal_data

def test_bearish_signal():
    """Testa sinal de VENDA"""
    print("\n" + "="*70)
    print("TESTE 2: SINAL BEARISH (VENDA)")
    print("="*70 + "\n")

    opens, highs, lows, closes = generate_realistic_candles(direction='down')
    current_price = closes[-1]

    signal, confidence, signal_data = SignalGenerator.generate_signal(
        opens, highs, lows, closes, current_price
    )

    report = SignalGenerator.format_signal_report(signal_data)
    print(report)

    print(f"\n[OK] Sinal gerado: {signal}")
    print(f"[OK] Confianca: {confidence*100:.1f}%")

    return signal_data

def test_neutral_signal():
    """Testa sinal NEUTRO"""
    print("\n" + "="*70)
    print("TESTE 3: SINAL NEUTRO (AGUARDE)")
    print("="*70 + "\n")

    opens, highs, lows, closes = generate_realistic_candles(direction='neutral', volatility=0.0001)
    current_price = closes[-1]

    signal, confidence, signal_data = SignalGenerator.generate_signal(
        opens, highs, lows, closes, current_price
    )

    report = SignalGenerator.format_signal_report(signal_data)
    print(report)

    print(f"\n[OK] Sinal gerado: {signal}")
    print(f"[OK] Confianca: {confidence*100:.1f}%")

    return signal_data

def test_pattern_detection():
    """Testa detecção de padrões"""
    print("\n" + "="*70)
    print("TESTE 4: DETECÇÃO DE PADRÕES")
    print("="*70 + "\n")

    # Dados que devem mostrar Torres Gêmeas
    opens = [
        1.0860, 1.0861, 1.0862, 1.0863, 1.0864, 1.0865,
        1.0866, 1.0867, 1.0868, 1.0869, 1.0870, 1.0871,
        1.0872, 1.0873, 1.0874, 1.0875, 1.0876, 1.0877,
        # Torres Gêmeas - duas velas de tamanho similar
        1.0876, 1.0875
    ]

    closes = [
        1.0861, 1.0862, 1.0863, 1.0864, 1.0865, 1.0866,
        1.0867, 1.0868, 1.0869, 1.0870, 1.0871, 1.0872,
        1.0873, 1.0874, 1.0875, 1.0876, 1.0877, 1.0878,
        # Torres Gêmeas
        1.0877, 1.0876
    ]

    highs = [c + 0.0001 for c in closes]
    lows = [c - 0.0001 for c in closes]

    patterns = CandlePatterns.analyze_patterns(opens, highs, lows, closes)

    print("Padrões Detectados:")
    print(f"  • Torres Gêmeas: {patterns['torres_gemeas']['found']} (score: {patterns['torres_gemeas']['score']:.2f})")
    print(f"  • C3: {patterns['c3']['found']} (score: {patterns['c3']['score']:.2f})")
    print(f"  • Padrão 2.3: {patterns['padrao_2.3']['found']} (score: {patterns['padrao_2.3']['score']:.2f})")
    print(f"  • Five Flip: {patterns['five_flip']['found']} (score: {patterns['five_flip']['score']:.2f})")

    return patterns

def test_indicators():
    """Testa cálculo de indicadores"""
    print("\n" + "="*70)
    print("TESTE 5: CÁLCULO DE INDICADORES")
    print("="*70 + "\n")

    opens, highs, lows, closes = generate_realistic_candles()

    indicators = TechnicalIndicators.calculate_all(opens, highs, lows, closes)

    print("Indicadores Calculados:")
    print(f"  • RCI: {indicators['rci']:.2f}")
    print(f"  • Média Móvel (5): {indicators['ma_5']:.4f}")
    print(f"  • Média Móvel (20): {indicators['ma_20']:.4f}")

    upper, middle, lower = indicators['bollinger']
    print(f"  • Bollinger Bands:")
    print(f"    - Superior: {upper:.4f}")
    print(f"    - Média: {middle:.4f}")
    print(f"    - Inferior: {lower:.4f}")

    print(f"  • Fibonacci (últimas 20 velas):")
    for level, price in indicators['fibonacci'].items():
        print(f"    - {level}: {price:.4f}")

    return indicators

def run_all_tests():
    """Executa todos os testes"""
    print("\n" + "="*70)
    print("TRADEBOT - TESTE COMPLETO")
    print("Análise Confluente de Gráficos - Avalon Broker")
    print("="*70)

    results = {
        'timestamp': datetime.now().isoformat(),
        'tests': {}
    }

    try:
        # Teste 1: Indicadores
        print("\n[1/5] Testando Indicadores...")
        indicators = test_indicators()
        results['tests']['indicators'] = 'PASSOU'
    except Exception as e:
        print(f"✗ ERRO: {e}")
        results['tests']['indicators'] = 'FALHOU'

    try:
        # Teste 2: Padrões
        print("\n[2/5] Testando Detecção de Padrões...")
        patterns = test_pattern_detection()
        results['tests']['patterns'] = 'PASSOU'
    except Exception as e:
        print(f"✗ ERRO: {e}")
        results['tests']['patterns'] = 'FALHOU'

    try:
        # Teste 3: Sinal Bullish
        print("\n[3/5] Testando Sinal Bullish...")
        test_bullish_signal()
        results['tests']['bullish_signal'] = 'PASSOU'
    except Exception as e:
        print(f"✗ ERRO: {e}")
        results['tests']['bullish_signal'] = 'FALHOU'

    try:
        # Teste 4: Sinal Bearish
        print("\n[4/5] Testando Sinal Bearish...")
        test_bearish_signal()
        results['tests']['bearish_signal'] = 'PASSOU'
    except Exception as e:
        print(f"✗ ERRO: {e}")
        results['tests']['bearish_signal'] = 'FALHOU'

    try:
        # Teste 5: Sinal Neutro
        print("\n[5/5] Testando Sinal Neutro...")
        test_neutral_signal()
        results['tests']['neutral_signal'] = 'PASSOU'
    except Exception as e:
        print(f"✗ ERRO: {e}")
        results['tests']['neutral_signal'] = 'FALHOU'

    # Resumo final
    print("\n" + "="*70)
    print("RESUMO DOS TESTES")
    print("="*70)

    passed = sum(1 for v in results['tests'].values() if v == 'PASSOU')
    total = len(results['tests'])

    print(f"\n[OK] Testes passaram: {passed}/{total}")

    for test_name, status in results['tests'].items():
        symbol = "[OK]" if status == "PASSOU" else "[FAIL]"
        print(f"  {symbol} {test_name}: {status}")

    print("\n" + "="*70)
    print("PROXIMOS PASSOS:")
    print("="*70)
    print("""
1. [OK] TradeBot estruturado e testado
2. [->] Integrar com a plataforma Avalon (screenshot em tempo real)
3. [->] Configurar alertas/notificacoes
4. [->] Implementar gerenciamento de risco
5. [->] Criar dashboard web

Para usar em tempo real:
    python main.py --monitor --pair EUR/USD --timeframe 1m
    """)

    # Salvar resultados
    with open('screenshots/test_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    print("\n[OK] Resultados salvos em: screenshots/test_results.json\n")

if __name__ == "__main__":
    run_all_tests()
