/**
 * Motor de Análise Técnica
 * Bollinger Bands, Fibonacci, RSI, MACD, Padrões de Vela
 */

class TechnicalIndicators {
  /**
   * Calcular Bollinger Bands (20 períodos, 2 desvios padrão)
   */
  static bollingerBands(candles, period = 20, stdDev = 2) {
    const result = [];

    for (let i = 0; i < candles.length; i++) {
      if (i < period - 1) {
        result.push({ upper: null, middle: null, lower: null });
        continue;
      }

      const slice = candles.slice(i - period + 1, i + 1);
      const closes = slice.map(c => c.close);

      // Média Móvel Simples
      const sma = closes.reduce((a, b) => a + b) / closes.length;

      // Desvio Padrão
      const variance = closes.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / closes.length;
      const std = Math.sqrt(variance);

      result.push({
        upper: sma + (std * stdDev),
        middle: sma,
        lower: sma - (std * stdDev)
      });
    }

    return result;
  }

  /**
   * Calcular RSI (Índice de Força Relativa)
   */
  static rsi(candles, period = 14) {
    const result = [];
    const changes = [];

    for (let i = 1; i < candles.length; i++) {
      changes.push(candles[i].close - candles[i - 1].close);
    }

    for (let i = 0; i < candles.length; i++) {
      if (i < period) {
        result.push(null);
        continue;
      }

      const gains = changes.slice(i - period, i).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
      const losses = Math.abs(changes.slice(i - period, i).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;

      const rs = losses === 0 ? 100 : gains / losses;
      const rsiValue = 100 - (100 / (1 + rs));

      result.push(rsiValue);
    }

    return result;
  }

  /**
   * Calcular MACD (Convergência/Divergência de Médias Móveis)
   */
  static macd(candles, fast = 12, slow = 26, signal = 9) {
    const result = [];

    // EMA Rápida
    const emaFast = this.ema(candles, fast);
    // EMA Lenta
    const emaSlow = this.ema(candles, slow);

    // MACD Line
    const macdLine = [];
    for (let i = 0; i < candles.length; i++) {
      if (emaFast[i] !== null && emaSlow[i] !== null) {
        macdLine.push(emaFast[i] - emaSlow[i]);
      } else {
        macdLine.push(null);
      }
    }

    // Signal Line (EMA do MACD)
    const signalLine = this.emaOfArray(macdLine, signal);

    // Histogram
    for (let i = 0; i < candles.length; i++) {
      if (macdLine[i] !== null && signalLine[i] !== null) {
        result.push({
          macd: macdLine[i],
          signal: signalLine[i],
          histogram: macdLine[i] - signalLine[i]
        });
      } else {
        result.push({ macd: null, signal: null, histogram: null });
      }
    }

    return result;
  }

  /**
   * Calcular EMA (Média Móvel Exponencial)
   */
  static ema(candles, period) {
    const result = [];
    const closes = candles.map(c => c.close);
    const multiplier = 2 / (period + 1);

    let ema = null;

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        result.push(null);
        continue;
      }

      if (i === period - 1) {
        // SMA inicial
        ema = closes.slice(0, period).reduce((a, b) => a + b) / period;
      } else {
        // EMA
        ema = (closes[i] - ema) * multiplier + ema;
      }

      result.push(ema);
    }

    return result;
  }

  /**
   * Calcular EMA de um array de valores
   */
  static emaOfArray(values, period) {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;

    for (let i = 0; i < values.length; i++) {
      if (values[i] === null) {
        result.push(null);
        continue;
      }

      if (i < period - 1) {
        result.push(null);
        continue;
      }

      if (i === period - 1) {
        // SMA inicial dos valores não-nulos
        const validValues = values.slice(0, i + 1).filter(v => v !== null);
        if (validValues.length === period) {
          ema = validValues.reduce((a, b) => a + b) / period;
        }
      } else if (ema !== null) {
        ema = (values[i] - ema) * multiplier + ema;
      }

      result.push(ema);
    }

    return result;
  }

  /**
   * Detectar Padrões de Vela
   */
  static detectCandlePatterns(candles) {
    const patterns = [];

    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const pattern = [];

      // Doji - abertura ≈ fechamento
      if (Math.abs(candle.open - candle.close) / candle.close < 0.002) {
        pattern.push('Doji');
      }

      // Hammer - corpo pequeno, pavio longo embaixo
      const bodySize = Math.abs(candle.close - candle.open);
      const lowerWick = Math.min(candle.open, candle.close) - candle.low;
      if (lowerWick > bodySize * 2 && candle.close > candle.open) {
        pattern.push('Hammer');
      }

      // Engulfing Bullish
      if (i > 0) {
        const prev = candles[i - 1];
        if (prev.close < prev.open && candle.close > candle.open &&
            candle.close > prev.open && candle.open < prev.close) {
          pattern.push('Engulfing Bull');
        }
      }

      // Engulfing Bearish
      if (i > 0) {
        const prev = candles[i - 1];
        if (prev.close > prev.open && candle.close < candle.open &&
            candle.close < prev.open && candle.open > prev.close) {
          pattern.push('Engulfing Bear');
        }
      }

      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Calcular Fibonacci Retracement
   */
  static fibonacciLevels(low, high) {
    const diff = high - low;
    return {
      level_0: high,
      level_236: high - (diff * 0.236),
      level_382: high - (diff * 0.382),
      level_500: high - (diff * 0.5),
      level_618: high - (diff * 0.618),
      level_786: high - (diff * 0.786),
      level_100: low
    };
  }

  /**
   * Análise de Confluência (múltiplos sinais)
   */
  static confluenceAnalysis(candles, bollingerBands, rsi, macd, patterns) {
    if (!candles.length) return null;

    const lastIdx = candles.length - 1;
    const lastCandle = candles[lastIdx];
    const lastBB = bollingerBands[lastIdx];
    const lastRSI = rsi[lastIdx];
    const lastMACD = macd[lastIdx];
    const lastPattern = patterns[lastIdx];

    let bullishSignals = 0;
    let bearishSignals = 0;

    // Bollinger Bands
    if (lastBB && lastBB.lower !== null) {
      if (lastCandle.close > lastBB.middle) bullishSignals++;
      if (lastCandle.close < lastBB.middle) bearishSignals++;
    }

    // RSI
    if (lastRSI !== null) {
      if (lastRSI < 30) bullishSignals++; // Oversold
      if (lastRSI > 70) bearishSignals++; // Overbought
    }

    // MACD
    if (lastMACD && lastMACD.histogram !== null) {
      if (lastMACD.histogram > 0 && lastMACD.macd > lastMACD.signal) bullishSignals++;
      if (lastMACD.histogram < 0 && lastMACD.macd < lastMACD.signal) bearishSignals++;
    }

    // Padrões de Vela
    if (lastPattern && lastPattern.length > 0) {
      if (lastPattern.includes('Hammer') || lastPattern.includes('Engulfing Bull')) bullishSignals++;
      if (lastPattern.includes('Engulfing Bear')) bearishSignals++;
    }

    // Determinar sinal geral
    let signal = 'NEUTRO';
    if (bullishSignals > bearishSignals) signal = 'COMPRA 📈';
    if (bearishSignals > bullishSignals) signal = 'VENDA 📉';
    if (bullishSignals === bearishSignals && bullishSignals > 0) signal = 'CONFLUÊNCIA 🎯';

    return {
      signal,
      bullishSignals,
      bearishSignals,
      totalSignals: bullishSignals + bearishSignals,
      confidence: Math.round((Math.max(bullishSignals, bearishSignals) / Math.max(1, bullishSignals + bearishSignals)) * 100)
    };
  }
}
