from indicators import TechnicalIndicators
from patterns import CandlePatterns

class SignalGenerator:
    """Gera sinais de COMPRA/VENDA baseado em confluência"""

    @staticmethod
    def calculate_confluence_score(indicators, patterns, current_price):
        """
        Calcula o score de confluência analisando:
        - RCI (oversold/overbought)
        - Médias Móveis (tendência)
        - Bollinger Bands (volatilidade/extremos)
        - Fibonacci (níveis de suporte/resistência)
        - Padrões (Torres Gêmeas, C3, 2.3, Five Flip)
        """

        score = 0
        factors = {}

        # 1. RCI Analysis (0-100)
        rci = indicators.get('rci')
        if rci is not None:
            if rci > 70:
                factors['rci_overbought'] = 0.2
                score += 0.2
            elif rci < 30:
                factors['rci_oversold'] = 0.2
                score += 0.2
            else:
                factors['rci_neutral'] = 0.05
                score += 0.05

        # 2. Moving Average Analysis
        ma5 = indicators.get('ma_5')
        ma20 = indicators.get('ma_20')
        if ma5 and ma20:
            if ma5 > ma20:
                factors['ma_bullish'] = 0.15
                score += 0.15
            elif ma5 < ma20:
                factors['ma_bearish'] = 0.15
                score += 0.15

        # 3. Bollinger Bands Analysis
        bollinger = indicators.get('bollinger')
        if bollinger[0] is not None:
            upper, middle, lower = bollinger
            if current_price > upper:
                factors['bb_overbought'] = 0.15
                score += 0.15
            elif current_price < lower:
                factors['bb_oversold'] = 0.15
                score += 0.15
            elif current_price > middle:
                factors['bb_above_middle'] = 0.1
                score += 0.1

        # 4. Pattern Analysis
        pattern_count = 0
        pattern_score = 0

        if patterns['torres_gemeas']['found']:
            pattern_score += patterns['torres_gemeas']['score']
            pattern_count += 1

        if patterns['c3']['found']:
            pattern_score += patterns['c3']['score']
            pattern_count += 1

        if patterns['padrao_2.3']['found']:
            pattern_score += patterns['padrao_2.3']['score']
            pattern_count += 1

        if patterns['five_flip']['found']:
            pattern_score += patterns['five_flip']['score']
            pattern_count += 1

        if pattern_count > 0:
            avg_pattern_score = pattern_score / pattern_count
            factors['patterns'] = min(avg_pattern_score * 0.35, 0.35)
            score += factors['patterns']

        return score, factors

    @staticmethod
    def generate_signal(opens, highs, lows, closes, current_price):
        """
        Gera sinal baseado em TODOS os indicadores e padrões
        Retorna: COMPRA, VENDA, ou AGUARDE
        """

        if len(closes) < 20:
            return "AGUARDE", 0, {}

        # Calcular indicadores
        indicators = TechnicalIndicators.calculate_all(opens, highs, lows, closes)

        # Analisar padrões
        patterns = CandlePatterns.analyze_patterns(opens, highs, lows, closes)

        # Calcular confluência
        confluence_score, factors = SignalGenerator.calculate_confluence_score(
            indicators, patterns, current_price
        )

        # Determinar sinal
        signal = "AGUARDE"
        signal_strength = "FRACO"

        if confluence_score >= 0.75:
            # Checar direção pela média móvel e RCI
            rci = indicators.get('rci')
            ma5 = indicators.get('ma_5')
            ma20 = indicators.get('ma_20')

            if ma5 and ma20 and ma5 > ma20:
                if rci and rci > 40:
                    signal = "COMPRA"
                    signal_strength = "FORTE"
            elif ma5 and ma20 and ma5 < ma20:
                if rci and rci < 60:
                    signal = "VENDA"
                    signal_strength = "FORTE"

        elif confluence_score >= 0.50:
            signal_strength = "MODERADO"
            rci = indicators.get('rci')
            ma5 = indicators.get('ma_5')
            ma20 = indicators.get('ma_20')

            if ma5 and ma20 and ma5 > ma20:
                signal = "COMPRA"
            elif ma5 and ma20 and ma5 < ma20:
                signal = "VENDA"

        signal_data = {
            'signal': signal,
            'strength': signal_strength,
            'confidence': confluence_score,
            'indicators': indicators,
            'patterns': patterns,
            'factors': factors,
            'current_price': current_price
        }

        return signal, confluence_score, signal_data

    @staticmethod
    def format_signal_report(signal_data):
        """Formata relatório legível do sinal"""
        report = f"""
==================================================================
                    SINAL DE TRADING
==================================================================
Sinal: {signal_data['signal']:^45}
Forca: {signal_data['strength']:^45}
Confianca: {signal_data['confidence']*100:.1f}%{' '*40}
==================================================================
INDICADORES:
  - RCI: {signal_data['indicators']['rci']:.1f}
  - Media Movel 5: {signal_data['indicators']['ma_5']:.4f}
  - Media Movel 20: {signal_data['indicators']['ma_20']:.4f}
  - Preco Atual: {signal_data['current_price']:.4f}
==================================================================
PADROES IDENTIFICADOS:
  - Torres Gemeas: {str(signal_data['patterns']['torres_gemeas']['found'])}
  - C3: {str(signal_data['patterns']['c3']['found'])}
  - Padrao 2.3: {str(signal_data['patterns']['padrao_2.3']['found'])}
  - Five Flip: {str(signal_data['patterns']['five_flip']['found'])}
==================================================================
        """
        return report
