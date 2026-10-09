const axios = require('axios');

class TimeSeriesAnalyzer {
  constructor(avalonClient = null) {
    this.coinbaseUrl = 'https://api.exchange.coinbase.com';
    this.avalonClient = avalonClient;
  }

  /**
   * Análise de Tendência Curta (últimas 2-3 horas)
   * Foco: contexto de CURTO prazo, não série temporal longa
   */
  async analyzeShortTermTrend(pair, timeframe) {
    console.log(`\n[TENDÊNCIA CURTA] Analisando últimas 2-3 horas para ${pair} em ${timeframe}...`);

    try {
      // Buscar apenas últimas 20-40 candles (2-3 horas dependendo do timeframe)
      const limit = this.getShortTermCandles(timeframe);
      const candles = await this.fetchCandles(pair, timeframe, limit);

      if (!candles || candles.length < 10) {
        throw new Error('Insufficient short-term data');
      }

      const closes = candles.map(c => c.close);
      const currentPrice = closes[closes.length - 1];
      const previousPrice = closes[0];

      // Análise simples de tendência curta
      const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
      const volatility = this.calculateVolatility(closes);
      const trend = this.detectShortTrend(closes);
      const support_resistance = this.detectSupportResistance(closes);

      console.log(`  → Tendência: ${trend.direction}`);
      console.log(`  → Mudança de preço: ${priceChange.toFixed(2)}%`);
      console.log(`  → Volatilidade: ${volatility.toFixed(2)}%`);

      return {
        trend,
        priceChange: priceChange.toFixed(2),
        volatility,
        support_resistance,
        timeRange: `${limit} candles (últimas ${this.estimateHours(timeframe, limit)} horas)`
      };
    } catch (err) {
      console.error(`  ❌ Erro na análise de tendência curta:`, err.message);
      return null;
    }
  }

  /**
   * Calcular quantos candles são 2-3 horas
   */
  getShortTermCandles(timeframe) {
    const map = {
      '1m': 180,  // 3 horas
      '5m': 36,   // 3 horas
      '15m': 12   // 3 horas
    };
    return map[timeframe] || 36;
  }

  /**
   * Estimar horas baseado em timeframe e candles
   */
  estimateHours(timeframe, candles) {
    if (timeframe === '1m') return (candles / 60).toFixed(1);
    if (timeframe === '5m') return (candles * 5 / 60).toFixed(1);
    if (timeframe === '15m') return (candles * 15 / 60).toFixed(1);
    return '?';
  }

  /**
   * Detectar tendência curta (mais sensível que macro)
   */
  detectShortTrend(closes) {
    const shortEMA = this.calculateEMA(closes, 5);
    const longEMA = this.calculateEMA(closes, 10);
    const current = closes[closes.length - 1];

    let direction = 'SIDEWAYS';
    if (current > shortEMA && shortEMA > longEMA) {
      direction = 'UPTREND_CURTO';
    } else if (current < shortEMA && shortEMA < longEMA) {
      direction = 'DOWNTREND_CURTO';
    }

    return {
      direction,
      shortEMA,
      longEMA
    };
  }

  /**
   * Análise MICRO: Padrões recentes e dinâmica do momento
   */
  analyzeMicroDynamics(candles) {
    console.log(`\n[MICRO] Analisando dinâmica dos últimos momentos...`);

    if (!candles || candles.length < 5) {
      return null;
    }

    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    // Pegar últimos 5 candles para análise de momento
    const recentCandles = candles.slice(-5);

    const microMetrics = {
      lastCandlePattern: this.analyzeLastCandlePattern(recentCandles),
      recentMovement: this.analyzeRecentMovement(closes),
      volumeProfile: this.analyzeVolumeProfile(volumes),
      priceAction: this.analyzePriceAction(recentCandles),
      reversalSignals: this.detectReversalSignals(recentCandles),
      momentum: this.calculateMicroMomentum(closes)
    };

    console.log(`  → Padrão do último candle: ${microMetrics.lastCandlePattern.type}`);
    console.log(`  → Sinais de reversão: ${microMetrics.reversalSignals.count}`);

    return microMetrics;
  }

  /**
   * Combinar análise de tendência curta + MICRO para sinal inteligente
   * PRIORIDADE TOTAL: MICRO (90%) vs Tendência Curta (10%)
   */
  combinedSignalAnalysis(shortTerm, micro, strategyScores, confluence) {
    console.log(`\n[COMBINADO] Analisando o MOMENTO ATUAL para sinal de entrada...`);

    let buyScore = 0;
    let sellScore = 0;
    let reasoning = [];

    // ===== ANÁLISE MICRO (90% DO PESO - O QUE IMPORTA AGORA) =====
    console.log(`[DEBUG] Focando em MICRO (agora)...`);

    // Padrão do último candle (MICRO) - PESO MÁXIMO
    if (micro && micro.lastCandlePattern) {
      const pattern = micro.lastCandlePattern;
      console.log(`[DEBUG] Padrão AGORA: ${pattern.type}`);

      if (pattern.bullish) {
        const weight = pattern.strength * 50;
        buyScore += weight;
        reasoning.push(`✓✓ PADRÃO BULLISH AGORA: ${pattern.type} (${(pattern.strength * 100).toFixed(0)}%)`);
      } else if (pattern.bearish) {
        const weight = pattern.strength * 50;
        sellScore += weight;
        reasoning.push(`✓✓ PADRÃO BEARISH AGORA: ${pattern.type} (${(pattern.strength * 100).toFixed(0)}%)`);
      } else if (pattern.type === 'DOJI') {
        reasoning.push(`⚠️ INDECISÃO AGORA (DOJI) - mercado em transição`);
      }
    }

    // Movimento recente (últimos 5 candles) - PESO MÁXIMO
    if (micro && micro.recentMovement) {
      const movement = micro.recentMovement;
      console.log(`[DEBUG] Movimento AGORA: ${movement.dominantDirection}`);

      if (movement.dominantDirection === 'UP') {
        const weight = movement.consistency * 40;
        buyScore += weight;
        reasoning.push(`✓✓ MOVIMENTO UP AGORA: ${movement.upMoves} altas vs ${movement.downMoves} baixas`);
      } else if (movement.dominantDirection === 'DOWN') {
        const weight = movement.consistency * 40;
        sellScore += weight;
        reasoning.push(`✓✓ MOVIMENTO DOWN AGORA: ${movement.upMoves} altas vs ${movement.downMoves} baixas`);
      } else if (movement.dominantDirection === 'MIXED') {
        reasoning.push(`⚠️ MOVIMENTO MISTO AGORA - sem direção clara`);
      }
    }

    // Momentum micro (o que está acontecendo AGORA) - PESO FORTE
    if (micro && micro.momentum !== undefined) {
      if (micro.momentum > 0.3) {
        const weight = micro.momentum * 30;
        buyScore += weight;
        reasoning.push(`✓ Momentum positivo: ${(micro.momentum * 100).toFixed(0)}%`);
      } else if (micro.momentum < -0.3) {
        const weight = Math.abs(micro.momentum) * 30;
        sellScore += weight;
        reasoning.push(`✓ Momentum negativo: ${(micro.momentum * 100).toFixed(0)}%`);
      }
    }

    // ===== CONTEXTO DE TENDÊNCIA CURTA (10% DO PESO) =====
    console.log(`[DEBUG] Verificando contexto de curto prazo...`);

    if (shortTerm && shortTerm.trend) {
      if (shortTerm.trend.direction === 'UPTREND_CURTO') {
        buyScore += 5;
        reasoning.push(`📈 Contexto: Tendência CURTA de alta nos últimos momentos`);
      } else if (shortTerm.trend.direction === 'DOWNTREND_CURTO') {
        sellScore += 5;
        reasoning.push(`📉 Contexto: Tendência CURTA de baixa nos últimos momentos`);
      } else if (shortTerm.trend.direction === 'SIDEWAYS') {
        reasoning.push(`➡️ Contexto: Tendência CURTA lateral - qualquer direção possível`);
      }
    }

    // Mudança de preço nos últimos momentos
    if (shortTerm && shortTerm.priceChange) {
      const change = parseFloat(shortTerm.priceChange);
      if (change > 0.5) {
        buyScore += 2;
      } else if (change < -0.5) {
        sellScore += 2;
      }
    }

    // ===== SINAIS DE REVERSÃO (Informativo) =====
    if (micro && micro.reversalSignals && micro.reversalSignals.count > 0) {
      reasoning.push(`⚠️ Reversão potencial: ${micro.reversalSignals.signals.join(', ')}`);
    }

    // ===== ESTRATÉGIAS TRADICIONAIS - PESO MÍNIMO =====
    if (confluence) {
      buyScore += confluence.buyConfluence * 0.1;
      sellScore += confluence.sellConfluence * 0.1;
    }

    console.log(`[DEBUG] Scores finais - COMPRA: ${buyScore.toFixed(0)}, VENDA: ${sellScore.toFixed(0)}`);

    // Determinar sinal final
    const signalData = {
      buyScore: Math.round(buyScore),
      sellScore: Math.round(sellScore),
      reasoning,
      recommendedAction: this.determineAction(buyScore, sellScore, micro)
    };

    return signalData;
  }

  /**
   * Determinar ação baseada em análise combinada
   */
  determineAction(buyScore, sellScore, micro) {
    const difference = Math.abs(buyScore - sellScore);
    const confidence = Math.min(100, difference / (buyScore + sellScore + 0.001) * 100);

    // Se há sinais de reversão, ser mais cauteloso
    const hasReversalSignals = micro && micro.reversalSignals && micro.reversalSignals.count > 0;

    // Determinar timing de entrada
    const entryTiming = this.determineEntryTiming(micro);

    if (buyScore > sellScore && confidence > 35) {
      return {
        signal: hasReversalSignals ? 'CALL ↑ (COMPRA - com possível reversão)' : 'CALL ↑ (COMPRA)',
        confidence: Math.min(100, confidence),
        riskLevel: hasReversalSignals ? 'MÉDIO' : 'BAIXO',
        entryTiming: entryTiming.buy,
        entryExplanation: entryTiming.buyReason
      };
    } else if (sellScore > buyScore && confidence > 35) {
      return {
        signal: hasReversalSignals ? 'PUT ↓ (VENDA - com possível reversão)' : 'PUT ↓ (VENDA)',
        confidence: Math.min(100, confidence),
        riskLevel: hasReversalSignals ? 'MÉDIO' : 'BAIXO',
        entryTiming: entryTiming.sell,
        entryExplanation: entryTiming.sellReason
      };
    } else {
      return {
        signal: 'HOLD (AGUARDE CONFIRMAÇÃO)',
        confidence: 50,
        riskLevel: 'MÉDIO',
        entryTiming: 'Não fazer entrada agora',
        entryExplanation: 'Mercado sem direção clara - aguarde próximo candle para confirmação'
      };
    }
  }

  /**
   * Determinar melhor horário/timing para entrada
   */
  determineEntryTiming(micro) {
    const now = new Date();
    let nextMinute = new Date(now.getTime() + 60000);
    nextMinute.setSeconds(0);
    nextMinute.setMilliseconds(0);

    const timeStr = `${nextMinute.getHours().toString().padStart(2, '0')}:${nextMinute.getMinutes().toString().padStart(2, '0')}`;

    // Analisar qual é o melhor momento
    let buyTiming = `⏱️ Próximo candle às ${timeStr}`;
    let buyReason = 'Entrada recomendada no fechamento do candle atual ou abertura do próximo';

    let sellTiming = `⏱️ Próximo candle às ${timeStr}`;
    let sellReason = 'Entrada recomendada no fechamento do candle atual ou abertura do próximo';

    // Se houver sinais de reversão, aguardar confirmação
    if (micro && micro.reversalSignals && micro.reversalSignals.count > 0) {
      buyReason += ' | ⚠️ Aguarde confirmação da reversão';
      sellReason += ' | ⚠️ Aguarde confirmação da reversão';
    }

    // Se movimento for consistente, pode entrar mais cedo
    if (micro && micro.recentMovement && micro.recentMovement.consistency > 0.7) {
      buyReason = 'Movimento consistente - Entrada recomendada AGORA ou no próximo toque de suporte';
      sellReason = 'Movimento consistente - Entrada recomendada AGORA ou no próximo toque de resistência';
    }

    return {
      buy: buyTiming,
      buyReason,
      sell: sellTiming,
      sellReason
    };
  }

  /**
   * Detectar tendência geral (UPTREND, DOWNTREND, SIDEWAYS)
   */
  detectTrend(closes) {
    const shortEMA = this.calculateEMA(closes, 20);
    const longEMA = this.calculateEMA(closes, 50);

    // Regressão linear para força da tendência
    const regression = this.linearRegression(closes);
    const strength = Math.abs(regression.slope) / (closes[closes.length - 1] / 100);

    let direction = 'SIDEWAYS';
    if (shortEMA > longEMA * 1.01) {
      direction = 'UPTREND';
    } else if (shortEMA < longEMA * 0.99) {
      direction = 'DOWNTREND';
    }

    return {
      direction,
      strength: Math.min(1, strength),
      shortEMA,
      longEMA
    };
  }

  /**
   * Detectar padrões cíclicos usando autocorrelação
   */
  detectCyclicity(closes) {
    // Normalizar dados
    const mean = closes.reduce((a, b) => a + b) / closes.length;
    const normalized = closes.map(c => c - mean);

    // Testar períodos comuns (5, 10, 20, 30 candles)
    const periods = [5, 10, 20, 30];
    let bestPeriod = null;
    let bestCorrelation = 0;

    for (const period of periods) {
      if (period >= closes.length / 3) continue;

      const correlation = this.autocorrelation(normalized, period);
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestPeriod = period;
      }
    }

    return {
      hasCyclicity: bestCorrelation > 0.4,
      period: bestPeriod || 0,
      strength: Math.min(1, bestCorrelation),
      correlation: bestCorrelation.toFixed(3)
    };
  }

  /**
   * Autocorrelação para detectar ciclos
   */
  autocorrelation(data, lag) {
    const c0 = data.reduce((a, b) => a + b * b) / data.length;
    let sum = 0;
    for (let i = 0; i < data.length - lag; i++) {
      sum += data[i] * data[i + lag];
    }
    const c = sum / data.length;
    return c / c0;
  }

  /**
   * Calcular volatilidade
   */
  calculateVolatility(closes, period = 20) {
    const recent = closes.slice(-period);
    const mean = recent.reduce((a, b) => a + b) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2)) / recent.length;
    const stdDev = Math.sqrt(variance);
    return (stdDev / mean) * 100;
  }

  /**
   * Detectar suporte e resistência
   */
  detectSupportResistance(closes) {
    const highPrice = Math.max(...closes);
    const lowPrice = Math.min(...closes);
    const range = highPrice - lowPrice;

    return {
      resistance: highPrice,
      support: lowPrice,
      range,
      midpoint: (highPrice + lowPrice) / 2
    };
  }

  /**
   * Detectar sazonalidade
   */
  detectSeasonality(closes) {
    // Análise simplificada de sazonalidade
    const firstHalf = closes.slice(0, Math.floor(closes.length / 2));
    const secondHalf = closes.slice(Math.floor(closes.length / 2));

    const firstHalfAvg = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    const change = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;

    return {
      trend: change > 0 ? 'ASCENDING' : 'DESCENDING',
      change: change.toFixed(2),
      firstHalfAvg: firstHalfAvg.toFixed(2),
      secondHalfAvg: secondHalfAvg.toFixed(2)
    };
  }

  /**
   * Calcular momentum macro
   */
  calculateMomentum(closes, period = 10) {
    if (closes.length < period + 1) return 0;

    const current = closes[closes.length - 1];
    const previous = closes[closes.length - period - 1];
    const momentum = (current - previous) / previous;

    return Math.max(-1, Math.min(1, momentum));
  }

  /**
   * Calcular força da análise
   */
  calculateAnalysisStrength(trend, cyclicity) {
    let strength = 0.5;

    if (trend.strength > 0.5) strength += 0.2;
    if (cyclicity.hasCyclicity && cyclicity.strength > 0.5) strength += 0.2;

    return Math.min(1, strength);
  }

  // ============= MICRO ANALYSIS =============

  /**
   * Analisar padrão do último candle
   */
  analyzeLastCandlePattern(candles) {
    const last = candles[candles.length - 1];
    const bodySize = Math.abs(last.close - last.open);
    const totalSize = last.high - last.low;
    const bodyPercentage = (bodySize / totalSize) * 100;

    let type = 'DOJI'; // padrão neutro por padrão
    let bullish = false;
    let bearish = false;
    let strength = 0.5;

    if (bodyPercentage < 20) {
      type = 'DOJI';
      strength = 0.3; // Fraco, indecisão
    } else if (last.close > last.open) {
      type = 'BULLISH';
      bullish = true;
      strength = Math.min(1, bodyPercentage / 100);
    } else {
      type = 'BEARISH';
      bearish = true;
      strength = Math.min(1, bodyPercentage / 100);
    }

    // Detectar sombras longas (possível reversão)
    const upperShadow = last.high - Math.max(last.open, last.close);
    const lowerShadow = Math.min(last.open, last.close) - last.low;

    if (upperShadow > bodySize * 1.5 || lowerShadow > bodySize * 1.5) {
      type = 'HAMMER/INVERTED_HAMMER';
    }

    return {
      type,
      bullish,
      bearish,
      strength,
      bodyPercentage: bodyPercentage.toFixed(1),
      upperShadow: upperShadow.toFixed(2),
      lowerShadow: lowerShadow.toFixed(2)
    };
  }

  /**
   * Analisar movimento recente dos últimos candles
   */
  analyzeRecentMovement(closes) {
    if (closes.length < 5) return null;

    const last5 = closes.slice(-5);
    let upMoves = 0;
    let downMoves = 0;

    for (let i = 1; i < last5.length; i++) {
      if (last5[i] > last5[i - 1]) upMoves++;
      else downMoves++;
    }

    return {
      upMoves,
      downMoves,
      dominantDirection: upMoves > downMoves ? 'UP' : downMoves > upMoves ? 'DOWN' : 'MIXED',
      consistency: Math.max(upMoves, downMoves) / (upMoves + downMoves)
    };
  }

  /**
   * Analisar perfil de volume
   */
  analyzeVolumeProfile(volumes) {
    if (volumes.length < 5) return null;

    const recent5 = volumes.slice(-5);
    const avgVolume = recent5.reduce((a, b) => a + b) / recent5.length;
    const currentVolume = recent5[recent5.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    return {
      currentVolume: currentVolume.toFixed(0),
      avgVolume: avgVolume.toFixed(0),
      volumeRatio: volumeRatio.toFixed(2),
      isHighVolume: volumeRatio > 1.2,
      isLowVolume: volumeRatio < 0.8
    };
  }

  /**
   * Analisar price action
   */
  analyzePriceAction(candles) {
    const closes = candles.map(c => c.close);

    // Estrutura: são os mínimos decrescentes e máximos decrescentes? Ou inverso?
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);

    let lowTrend = 'NEUTRAL';
    let highTrend = 'NEUTRAL';

    // Comparar últimas 3 lows
    if (candles.length >= 3) {
      if (lows[lows.length - 1] < lows[lows.length - 2] && lows[lows.length - 2] < lows[lows.length - 3]) {
        lowTrend = 'DECREASING';
      } else if (lows[lows.length - 1] > lows[lows.length - 2] && lows[lows.length - 2] > lows[lows.length - 3]) {
        lowTrend = 'INCREASING';
      }

      if (highs[highs.length - 1] > highs[highs.length - 2] && highs[highs.length - 2] > highs[highs.length - 3]) {
        highTrend = 'INCREASING';
      } else if (highs[highs.length - 1] < highs[highs.length - 2] && highs[highs.length - 2] < highs[highs.length - 3]) {
        highTrend = 'DECREASING';
      }
    }

    return {
      highTrend,
      lowTrend,
      structure: `${highTrend} highs / ${lowTrend} lows`,
      isHeadAndShoulders: highTrend === 'DECREASING' && lowTrend === 'DECREASING'
    };
  }

  /**
   * Detectar sinais de reversão
   */
  detectReversalSignals(candles) {
    const signals = [];
    const closes = candles.map(c => c.close);

    // Sinal 1: Engulfing (um candle engole o anterior)
    if (candles.length >= 2) {
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];

      if (last.close > prev.high && last.open < prev.low) {
        signals.push('Bullish Engulfing');
      } else if (last.close < prev.low && last.open > prev.high) {
        signals.push('Bearish Engulfing');
      }
    }

    // Sinal 2: Piercing ou Dark Cloud
    if (candles.length >= 2) {
      const last = candles[candles.length - 1];
      const prev = candles[candles.length - 2];

      if (last.close > prev.close * 1.01 && prev.close < prev.open) {
        signals.push('Piercing Pattern');
      } else if (last.close < prev.close * 0.99 && prev.close > prev.open) {
        signals.push('Dark Cloud Cover');
      }
    }

    // Sinal 3: Reversão de movimento (últimos 3 candles mostram reversão)
    if (closes.length >= 3) {
      const last3 = closes.slice(-3);
      if (last3[0] < last3[1] && last3[1] < last3[2]) {
        // Era para baixo, agora para cima
        if (last3[1] - last3[0] < last3[2] - last3[1]) {
          signals.push('Reversal Up');
        }
      } else if (last3[0] > last3[1] && last3[1] > last3[2]) {
        // Era para cima, agora para baixo
        if (last3[0] - last3[1] < last3[1] - last3[2]) {
          signals.push('Reversal Down');
        }
      }
    }

    return {
      count: signals.length,
      signals,
      isReverting: signals.length >= 2
    };
  }

  /**
   * Momentum micro (últimos momentos)
   */
  calculateMicroMomentum(closes) {
    if (closes.length < 3) return 0;

    const last3 = closes.slice(-3);
    const recent = closes.slice(-5);

    const trendStrength = (last3[2] - last3[0]) / last3[0];
    const recentAvg = recent.reduce((a, b) => a + b) / recent.length;
    const currentPrice = closes[closes.length - 1];
    const distanceFromAvg = (currentPrice - recentAvg) / recentAvg;

    return Math.max(-1, Math.min(1, trendStrength + distanceFromAvg * 0.5));
  }

  // ============= UTILITY FUNCTIONS =============

  /**
   * Regressão linear para detectar força da tendência
   */
  linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  /**
   * EMA - Exponential Moving Average
   */
  calculateEMA(closes, period) {
    if (closes.length < period) return closes[closes.length - 1];

    let ema = closes.slice(0, period).reduce((a, b) => a + b) / period;
    const multiplier = 2 / (period + 1);

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  /**
   * Buscar candles (Coinbase ou Avalon dependendo do par)
   */
  async fetchCandles(pair, timeframe, limit = 100) {
    try {
      // Se for par Forex, usar Avalon
      if (pair.match(/^[A-Z]{3}[A-Z]{3}$/)) {
        return await this.fetchCandlesAvalon(pair, timeframe, limit);
      }

      // Senão, usar Coinbase
      const granularity = this.timeframeToGranularity(timeframe);
      const url = `${this.coinbaseUrl}/products/${pair}/candles`;

      const response = await axios.get(url, {
        params: {
          granularity,
          limit
        },
        timeout: 10000
      });

      return response.data.map(c => ({
        timestamp: c[0] * 1000,
        low: c[1],
        high: c[2],
        open: c[3],
        close: c[4],
        volume: c[5]
      })).reverse();
    } catch (err) {
      throw new Error(`Erro ao buscar dados: ${err.message}`);
    }
  }

  async fetchCandlesAvalon(symbol, timeframe, limit = 100) {
    try {
      if (!this.avalonClient) {
        throw new Error('AvalonClient não inicializado');
      }

      const candles = await this.avalonClient.getCandles(symbol, timeframe, limit);

      if (!candles || candles.length === 0) {
        throw new Error(`Nenhum dado retornado para ${symbol}`);
      }

      return candles.map(c => ({
        timestamp: c.time * 1000 || new Date(c.timestamp).getTime(),
        low: parseFloat(c.low),
        high: parseFloat(c.high),
        open: parseFloat(c.open),
        close: parseFloat(c.close),
        volume: c.volume || 0
      }));
    } catch (err) {
      console.error(`[TSA] Erro ao buscar ${symbol} do Avalon:`, err.message);
      throw err;
    }
  }

  timeframeToGranularity(timeframe) {
    const map = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
    return map[timeframe] || 60;
  }
}

module.exports = TimeSeriesAnalyzer;
