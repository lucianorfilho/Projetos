import cv2
import numpy as np
import os
import time
import json
from datetime import datetime
from pathlib import Path

from indicators import TechnicalIndicators
from patterns import CandlePatterns
from signals import SignalGenerator

class AvalonTradeBot:
    """Bot de análise de gráficos da Avalon"""

    def __init__(self, screenshot_path=None):
        self.screenshot_path = screenshot_path or "screenshots"
        self.signals_log = []
        Path(self.screenshot_path).mkdir(exist_ok=True)

    def extract_candle_data(self, image_path):
        """
        Extrai dados de velas do gráfico
        Retorna: opens, highs, lows, closes, timestamps
        """
        img = cv2.imread(image_path)
        if img is None:
            print(f"Erro ao carregar imagem: {image_path}")
            return None

        # Converter para HSV para detectar cores
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Detectar velas verdes (bullish)
        lower_green = np.array([35, 40, 40])
        upper_green = np.array([85, 255, 255])
        green_mask = cv2.inRange(hsv, lower_green, upper_green)

        # Detectar velas vermelhas (bearish)
        lower_red = np.array([0, 40, 40])
        upper_red = np.array([10, 255, 255])
        red_mask = cv2.inRange(hsv, lower_red, upper_red)

        # Combinar máscaras
        candle_mask = cv2.bitwise_or(green_mask, red_mask)

        # Encontrar contornos (velas)
        contours, _ = cv2.findContours(candle_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if len(contours) == 0:
            print("Nenhuma vela detectada no gráfico")
            return None

        candles = []
        for contour in contours:
            x, y, w, h = cv2.boundingRect(contour)
            if h > 10:  # Filtrar ruído
                candles.append({
                    'x': x,
                    'y': y,
                    'width': w,
                    'height': h,
                    'area': cv2.contourArea(contour)
                })

        if not candles:
            print("Nenhuma vela válida detectada")
            return None

        # Ordenar velas por posição X (esquerda para direita)
        candles.sort(key=lambda c: c['x'])

        # Normalizar valores (simulação de preços)
        # Em produção, seria necessário calibrar com valores reais do gráfico
        max_height = max(c['height'] for c in candles)
        min_height = min(c['height'] for c in candles)

        opens = []
        highs = []
        lows = []
        closes = []

        for candle in candles[-20:]:  # Pegar últimas 20 velas
            # Simular preços baseado em altura/posição
            normalized_height = (candle['height'] - min_height) / (max_height - min_height) if max_height > min_height else 0.5
            price_base = 1.0850 + (normalized_height * 0.01)  # Simular preço entre 1.0850 e 1.0950

            opens.append(price_base - 0.0002)
            highs.append(price_base + 0.0003)
            lows.append(price_base - 0.0004)
            closes.append(price_base)

        return {
            'opens': opens,
            'highs': highs,
            'lows': lows,
            'closes': closes,
            'candle_count': len(opens)
        }

    def analyze_chart(self, image_path, current_price=None):
        """
        Analisa um gráfico e gera sinal
        """
        print(f"\n{'='*60}")
        print(f"Analisando gráfico: {image_path}")
        print(f"Hora: {datetime.now().strftime('%H:%M:%S')}")
        print(f"{'='*60}\n")

        # Extrair dados do gráfico
        candle_data = self.extract_candle_data(image_path)
        if not candle_data:
            print("Erro ao extrair dados do gráfico")
            return None

        print(f"✓ Velas detectadas: {candle_data['candle_count']}")

        # Usar último close como preço atual se não informado
        current_price = current_price or candle_data['closes'][-1]

        # Gerar sinal
        signal, confidence, signal_data = SignalGenerator.generate_signal(
            candle_data['opens'],
            candle_data['highs'],
            candle_data['lows'],
            candle_data['closes'],
            current_price
        )

        # Imprimir relatório
        report = SignalGenerator.format_signal_report(signal_data)
        print(report)

        # Salvar no log
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'signal': signal,
            'confidence': float(confidence),
            'price': float(current_price),
            'indicators': {
                'rci': float(signal_data['indicators']['rci']) if signal_data['indicators']['rci'] else None,
                'ma_5': float(signal_data['indicators']['ma_5']) if signal_data['indicators']['ma_5'] else None,
                'ma_20': float(signal_data['indicators']['ma_20']) if signal_data['indicators']['ma_20'] else None,
            },
            'patterns': signal_data['patterns']
        }

        self.signals_log.append(log_entry)

        return signal_data

    def run_continuous_analysis(self, interval=60):
        """
        Executa análise contínua capturando screenshots
        interval: segundos entre análises
        """
        print("\n🤖 TradeBot iniciado!")
        print(f"Intervalo de análise: {interval} segundos")
        print("Deixe a Avalon aberta no Chrome para análise automática\n")

        iteration = 0
        while True:
            try:
                iteration += 1
                print(f"\n[Iteração {iteration}] Capturando screenshot...")

                # Simular captura de screenshot (em produção, usar pyautogui)
                # screenshot_file = f"{self.screenshot_path}/chart_{iteration}.png"
                # pyautogui.screenshot(screenshot_file)

                # Por enquanto, usar uma imagem de exemplo se existir
                test_image = f"{self.screenshot_path}/test_chart.png"
                if os.path.exists(test_image):
                    self.analyze_chart(test_image)
                else:
                    print(f"Aguardando imagem: {test_image}")
                    print("Para testar, salve um screenshot do gráfico da Avalon como 'test_chart.png' na pasta 'screenshots'")

                print(f"Próxima análise em {interval} segundos...")
                time.sleep(interval)

            except KeyboardInterrupt:
                print("\n\n⏹️  TradeBot parado")
                self.save_signals_log()
                break
            except Exception as e:
                print(f"Erro: {e}")
                time.sleep(interval)

    def save_signals_log(self):
        """Salva o log de sinais em arquivo JSON"""
        log_file = f"{self.screenshot_path}/signals_log.json"
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(self.signals_log, f, indent=2, ensure_ascii=False)
        print(f"✓ Log salvo em: {log_file}")

    def test_with_sample_data(self):
        """Testa com dados de exemplo"""
        print("\n" + "="*60)
        print("TESTE COM DADOS DE EXEMPLO")
        print("="*60 + "\n")

        # Dados de exemplo (simulando um gráfico com padrões)
        opens = [1.0860, 1.0861, 1.0862, 1.0863, 1.0864, 1.0865, 1.0864, 1.0863, 1.0862,
                 1.0863, 1.0864, 1.0865, 1.0866, 1.0867, 1.0868, 1.0869, 1.0870, 1.0869, 1.0868, 1.0870]

        highs = [1.0862, 1.0863, 1.0864, 1.0865, 1.0866, 1.0867, 1.0866, 1.0865, 1.0864,
                 1.0865, 1.0866, 1.0867, 1.0868, 1.0869, 1.0870, 1.0871, 1.0872, 1.0871, 1.0870, 1.0872]

        lows = [1.0858, 1.0859, 1.0860, 1.0861, 1.0862, 1.0863, 1.0862, 1.0861, 1.0860,
                1.0861, 1.0862, 1.0863, 1.0864, 1.0865, 1.0866, 1.0867, 1.0868, 1.0867, 1.0866, 1.0868]

        closes = [1.0861, 1.0862, 1.0863, 1.0864, 1.0865, 1.0866, 1.0865, 1.0864, 1.0863,
                  1.0864, 1.0865, 1.0866, 1.0867, 1.0868, 1.0869, 1.0870, 1.0871, 1.0870, 1.0869, 1.0871]

        current_price = 1.0871

        # Gerar sinal
        signal, confidence, signal_data = SignalGenerator.generate_signal(
            opens, highs, lows, closes, current_price
        )

        # Imprimir relatório
        report = SignalGenerator.format_signal_report(signal_data)
        print(report)

        # Salvar log
        self.signals_log.append({
            'timestamp': datetime.now().isoformat(),
            'signal': signal,
            'confidence': float(confidence),
            'price': float(current_price),
            'test': True
        })


if __name__ == "__main__":
    bot = AvalonTradeBot()

    print("\n╔════════════════════════════════════════════╗")
    print("║          TRADEBOT - AVALON BROKER         ║")
    print("║   Análise Confluente de Gráficos 1min     ║")
    print("╚════════════════════════════════════════════╝\n")

    # Teste com dados de exemplo
    bot.test_with_sample_data()

    print("\n\nPara análise em tempo real:")
    print("1. Deixe a Avalon aberta no Chrome")
    print("2. Use a função 'run_continuous_analysis()' para capturar screenshots")
    print("3. Os sinais serão salvos em 'screenshots/signals_log.json'\n")
