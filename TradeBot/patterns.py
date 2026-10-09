import numpy as np

class CandlePatterns:
    """Identifica padrões de candlestick"""

    @staticmethod
    def is_bullish_candle(open_price, close_price):
        """Vela bullish (verde)"""
        return close_price > open_price

    @staticmethod
    def is_bearish_candle(open_price, close_price):
        """Vela bearish (vermelha)"""
        return close_price < open_price

    @staticmethod
    def get_body_size(open_price, close_price):
        """Tamanho do corpo da vela"""
        return abs(close_price - open_price)

    @staticmethod
    def get_upper_wick(high_price, open_price, close_price):
        """Tamanho do pavio superior"""
        return high_price - max(open_price, close_price)

    @staticmethod
    def get_lower_wick(open_price, close_price, low_price):
        """Tamanho do pavio inferior"""
        return min(open_price, close_price) - low_price

    @staticmethod
    def torres_gemeas(opens, highs, lows, closes):
        """
        Padrão de Torres Gêmeas:
        - Duas velas de mesmo tamanho aproximado
        - Mesma direção (ambas bullish ou ambas bearish)
        - Separadas por um gap
        """
        if len(opens) < 3:
            return False, 0

        open1, open2 = opens[-2], opens[-1]
        close1, close2 = closes[-2], closes[-1]
        high1, high2 = highs[-2], highs[-1]
        low1, low2 = lows[-2], lows[-1]

        body1 = CandlePatterns.get_body_size(open1, close1)
        body2 = CandlePatterns.get_body_size(open2, close2)

        size_similar = abs(body1 - body2) < (body1 * 0.15)
        same_direction = CandlePatterns.is_bullish_candle(open1, close1) == CandlePatterns.is_bullish_candle(
            open2, close2)

        torres_score = 0
        if size_similar and same_direction:
            torres_score = 0.7

        return torres_score > 0.5, torres_score

    @staticmethod
    def padrao_c3(opens, highs, lows, closes):
        """
        Padrão C3:
        - Três velas consecutivas
        - Primeira bullish, segunda pequena (indecisão), terceira bullish continuando
        """
        if len(opens) < 3:
            return False, 0

        open1, open2, open3 = opens[-3], opens[-2], opens[-1]
        close1, close2, close3 = closes[-3], closes[-2], closes[-1]
        low1, low2, low3 = lows[-3], lows[-2], lows[-1]

        body1 = CandlePatterns.get_body_size(open1, close1)
        body2 = CandlePatterns.get_body_size(open2, close2)
        body3 = CandlePatterns.get_body_size(open3, close3)

        bullish1 = CandlePatterns.is_bullish_candle(open1, close1)
        bullish3 = CandlePatterns.is_bullish_candle(open3, close3)
        small_body = body2 < body1 * 0.5
        continues_up = close3 > close1

        c3_score = 0
        if bullish1 and small_body and bullish3 and continues_up:
            c3_score = 0.8

        return c3_score > 0.5, c3_score

    @staticmethod
    def padrao_23(opens, highs, lows, closes):
        """
        Padrão 2.3:
        - Segunda vela fecha dentro da primeira
        - Terceira vela "quebra" a segunda (breakout)
        """
        if len(opens) < 3:
            return False, 0

        open1, open2, open3 = opens[-3], opens[-2], opens[-1]
        close1, close2, close3 = closes[-3], closes[-2], closes[-1]
        high1, high2, high3 = highs[-3], highs[-2], highs[-1]
        low1, low2, low3 = lows[-3], lows[-2], lows[-1]

        inside_bar = (min(high1, high2) >= max(low1, low2)) and (close2 > min(close1, open2))
        breakout = high3 > high1 or low3 < low1

        padrao_23_score = 0
        if inside_bar and breakout:
            padrao_23_score = 0.75

        return padrao_23_score > 0.5, padrao_23_score

    @staticmethod
    def five_flip(opens, highs, lows, closes):
        """
        Five Flip:
        - Mudança de direção na quinta vela
        - Padrão de reversão
        """
        if len(closes) < 5:
            return False, 0

        closes_recent = closes[-5:]

        bullish_sequence = (closes_recent[1] > closes_recent[0] and
                           closes_recent[2] > closes_recent[1] and
                           closes_recent[3] > closes_recent[2])

        bearish_reversal = closes_recent[4] < closes_recent[3]

        five_flip_score = 0
        if bullish_sequence and bearish_reversal:
            five_flip_score = 0.7

        return five_flip_score > 0.5, five_flip_score

    @staticmethod
    def analyze_patterns(opens, highs, lows, closes):
        """Analisa todos os padrões"""
        torres, torres_score = CandlePatterns.torres_gemeas(opens, highs, lows, closes)
        c3, c3_score = CandlePatterns.padrao_c3(opens, highs, lows, closes)
        padrao23, padrao23_score = CandlePatterns.padrao_23(opens, highs, lows, closes)
        flip5, flip5_score = CandlePatterns.five_flip(opens, highs, lows, closes)

        patterns = {
            'torres_gemeas': {'found': torres, 'score': torres_score},
            'c3': {'found': c3, 'score': c3_score},
            'padrao_2.3': {'found': padrao23, 'score': padrao23_score},
            'five_flip': {'found': flip5, 'score': flip5_score}
        }

        return patterns
