import numpy as np
import pandas as pd

class TechnicalIndicators:
    """Calcula indicadores técnicos para análise de gráficos"""

    @staticmethod
    def rci(prices, period=9):
        """RCI (Range Commodity Index) - Similar ao RSI"""
        if len(prices) < period:
            return None

        high = max(prices[-period:])
        low = min(prices[-period:])

        if high == low:
            return 50

        rci = 100 * (prices[-1] - low) / (high - low)
        return rci

    @staticmethod
    def moving_average(prices, period=20):
        """Média Móvel Simples"""
        if len(prices) < period:
            return None
        return np.mean(prices[-period:])

    @staticmethod
    def bollinger_bands(prices, period=20, std_dev=2):
        """Bandas de Bollinger"""
        if len(prices) < period:
            return None, None, None

        ma = np.mean(prices[-period:])
        std = np.std(prices[-period:])

        upper = ma + (std_dev * std)
        lower = ma - (std_dev * std)

        return upper, ma, lower

    @staticmethod
    def fibonacci_levels(high, low):
        """Níveis de Fibonacci"""
        diff = high - low

        levels = {
            '0.0%': high,
            '23.6%': high - (diff * 0.236),
            '38.2%': high - (diff * 0.382),
            '50.0%': high - (diff * 0.5),
            '61.8%': high - (diff * 0.618),
            '78.6%': high - (diff * 0.786),
            '100.0%': low
        }

        return levels

    @staticmethod
    def calculate_all(open_prices, high_prices, low_prices, close_prices):
        """Calcula todos os indicadores"""
        indicators = {
            'rci': TechnicalIndicators.rci(close_prices),
            'ma_20': TechnicalIndicators.moving_average(close_prices, 20),
            'ma_5': TechnicalIndicators.moving_average(close_prices, 5),
            'bollinger': TechnicalIndicators.bollinger_bands(close_prices, 20),
            'fibonacci': TechnicalIndicators.fibonacci_levels(
                max(high_prices[-20:]) if len(high_prices) >= 20 else max(high_prices),
                min(low_prices[-20:]) if len(low_prices) >= 20 else min(low_prices)
            )
        }

        return indicators
