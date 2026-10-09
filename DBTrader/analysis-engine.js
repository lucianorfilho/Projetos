const axios = require('axios');

class AnalysisEngine {
  constructor(avalonClient = null) {
    this.coinbaseUrl = 'https://api.exchange.coinbase.com';
    this.avalonClient = avalonClient;
    // Estratégias testadas (com histórico de assertividade)
    this.strategies = {
      rsi_oversold: { name: 'RSI Oversold', weight: 1.8, assertivity: 0.72 },
      macd_crossover: { name: 'MACD Crossover', weight: 1.6, assertivity: 0.68 },
      bollinger_reversion: { name: 'Bollinger Reversion', weight: 1.5, assertivity: 0.65 },
      pivot_levels: { name: 'Pivot Levels', weight: 1.4, assertivity: 0.62 },
      volume_confirmation: { name: 'Volume Confirmation', weight: 1.3, assertivity: 0.60 }
    };
  }

  /**
   * Análise completa para múltiplos timeframes
   */
  async analyzeAllTimeframes(pair, timeframes = ['1m', '5m', '15m']) {
    console.log(`[MOTOR] Analisando ${pair} em timeframes: ${timeframes.join(', ')}`);

    const results = {};
    let bestTimeframe = null;
    let bestScore = 0;

    for (const tf of timeframes) {
      try {
        console.log(`  → Timeframe ${tf}...`);
        const analysis = await this.analyzeTimeframe(pair, tf);
        results[tf] = analysis;

        // Encontrar melhor timeframe
        if (analysis.overallScore > bestScore) {
          bestScore = analysis.overallScore;
          bestTimeframe = tf;
        }
      } catch (err) {
        console.error(`  ❌ Erro em ${tf}:`, err.message);
        results[tf] = { error: err.message };
      }
    }

    return {
      results,
      recommendation: this.generateRecommendation(results, bestTimeframe, bestScore)
    };
  }

  /**
   * Análise profunda de um timeframe específico
   */
  async analyzeTimeframe(pair, timeframe, candles = null) {
    // Buscar dados de preço (últimas 100 candles)
    if (!candles) {
      candles = await this.fetchCandles(pair, timeframe, 100);
    }

    if (!candles || candles.length < 20) {
      throw new Error(`Insufficient data for ${timeframe}`);
    }

    // Extrair dados
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);
    const latest = candles[candles.length - 1];

    // Calcular indicadores
    console.log(`    [INDICADORES] Calculando para ${timeframe}...`);
    const indicators = {
      rsi: this.calculateRSI(closes),
      macd: this.calculateMACD(closes),
      bollinger: this.calculateBollingerBands(closes),
      pivots: this.calculatePivots(latest.high, latest.low, latest.close),
      volumeSMA: this.calculateVolumeSMA(volumes)
    };

    // Testar cada estratégia
    console.log(`    [ESTRATÉGIAS] Testando ${Object.keys(this.strategies).length} estratégias...`);
    const strategyScores = this.testStrategies(indicators, closes);

    // Calcular confluência
    const confluence = this.calculateConfluence(strategyScores, indicators);

    // Determinar sinal
    const signal = this.generateSignal(confluence, indicators, strategyScores);

    // Score geral
    const overallScore = this.calculateOverallScore(confluence, strategyScores, indicators);

    return {
      timeframe,
      currentPrice: latest.close,
      timestamp: new Date(latest.timestamp).toISOString(),
      indicators,
      strategies: strategyScores,
      confluence,
      signal,
      overallScore,
      explanation: this.generateExplanation(strategyScores, indicators, confluence)
    };
  }

  /**
   * Buscar candles (Coinbase para Crypto, Avalon para Forex)
   */
  async fetchCandles(pair, timeframe, limit = 100) {
    try {
      // Se for par Forex (EURUSD, GBPUSD, etc), usar Avalon
      if (pair.match(/^[A-Z]{3}[A-Z]{3}$/)) {
        console.log(`[ANÁLISE] ${pair} é Forex - buscando do Avalon...`);
        return await this.fetchCandlesAvalon(pair, timeframe, limit);
      }

      // Senão, usar Coinbase para criptos
      const granularity = this.timeframeToGranularity(timeframe);
      const url = `${this.coinbaseUrl}/products/${pair}/candles`;

      const response = await axios.get(url, {
        params: {
          granularity,
          limit
        },
        timeout: 10000
      });

      // Coinbase retorna: [time, low, high, open, close, volume]
      return response.data.map(c => ({
        timestamp: c[0] * 1000,
        low: c[1],
        high: c[2],
        open: c[3],
        close: c[4],
        volume: c[5]
      })).reverse(); // Ordem crescente
    } catch (err) {
      throw new Error(`Erro ao buscar dados: ${err.message}`);
    }
  }

  /**
   * Buscar candles do Avalon (MT5)
   */
  async fetchCandlesAvalon(symbol, timeframe, limit = 100) {
    try {
      if (!this.avalonClient) {
        throw new Error('AvalonClient não inicializado');
      }

      console.log(`[ANÁLISE] Buscando ${limit} velas de ${symbol} do Avalon (${timeframe})...`);
      const candles = await this.avalonClient.getCandles(symbol, timeframe, limit);

      if (!candles || candles.length === 0) {
        throw new Error(`Nenhum dado retornado para ${symbol}`);
      }

      // Converter para formato padrão
      return candles.map(c => ({
        timestamp: c.time * 1000 || new Date(c.timestamp).getTime(),
        low: parseFloat(c.low),
        high: parseFloat(c.high),
        open: parseFloat(c.open),
        close: parseFloat(c.close),
        volume: c.volume || 0
      }));
    } catch (err) {
      console.error(`[ANÁLISE] Erro ao buscar ${symbol} do Avalon:`, err.message);
      throw err;
    }
  }

  timeframeToGranularity(timeframe) {
    const map = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };
    return map[timeframe] || 60;
  }

  /**
   * RSI - Relative Strength Index
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return null;

    const gains = [], losses = [];
    for (let i = 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      gains.push(diff > 0 ? diff : 0);
      losses.push(diff < 0 ? -diff : 0);
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b) / period;

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * MACD - Moving Average Convergence Divergence
   */
  calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const ema12 = this.calculateEMA(closes, fastPeriod);
    const ema26 = this.calculateEMA(closes, slowPeriod);

    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA(closes.map((_, i) => ema12 - ema26), signalPeriod);

    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine - (signalLine || 0)
    };
  }

  /**
   * Bollinger Bands
   */
  calculateBollingerBands(closes, period = 20, stdDev = 2) {
    const recent = closes.slice(-period);
    const mean = recent.reduce((a, b) => a + b) / recent.length;
    const variance = recent.reduce((a, b) => a + Math.pow(b - mean, 2)) / recent.length;
    const std = Math.sqrt(variance);

    return {
      upper: mean + std * stdDev,
      middle: mean,
      lower: mean - std * stdDev
    };
  }

  /**
   * Pivot Points
   */
  calculatePivots(high, low, close) {
    const pivot = (high + low + close) / 3;
    const range = high - low;

    return {
      pivot,
      r1: pivot + range,
      r2: pivot + range * 2,
      s1: pivot - range,
      s2: pivot - range * 2
    };
  }

  /**
   * Volume SMA
   */
  calculateVolumeSMA(volumes, period = 20) {
    const recent = volumes.slice(-period);
    return recent.reduce((a, b) => a + b) / recent.length;
  }

  /**
   * EMA - Exponential Moving Average
   */
  calculateEMA(closes, period) {
    if (closes.length < period) return null;

    let ema = closes.slice(0, period).reduce((a, b) => a + b) / period;
    const multiplier = 2 / (period + 1);

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  /**
   * Testar estratégias
   */
  testStrategies(indicators, closes) {
    const scores = {};
    const currentPrice = closes[closes.length - 1];

    // RSI Oversold
    if (indicators.rsi) {
      scores.rsi_oversold = {
        name: this.strategies.rsi_oversold.name,
        score: indicators.rsi < 30 ? 1 : indicators.rsi > 70 ? -1 : 0,
        value: indicators.rsi.toFixed(2),
        assertivity: this.strategies.rsi_oversold.assertivity
      };
    }

    // MACD Crossover
    if (indicators.macd) {
      scores.macd_crossover = {
        name: this.strategies.macd_crossover.name,
        score: indicators.macd > indicators.macd.signal ? 1 : -1,
        histogram: indicators.macd.histogram.toFixed(6),
        assertivity: this.strategies.macd_crossover.assertivity
      };
    }

    // Bollinger Reversion
    if (indicators.bollinger) {
      if (currentPrice < indicators.bollinger.lower) {
        scores.bollinger_reversion = {
          name: this.strategies.bollinger_reversion.name,
          score: 1,
          signal: 'toque na banda inferior',
          assertivity: this.strategies.bollinger_reversion.assertivity
        };
      } else if (currentPrice > indicators.bollinger.upper) {
        scores.bollinger_reversion = {
          name: this.strategies.bollinger_reversion.name,
          score: -1,
          signal: 'toque na banda superior',
          assertivity: this.strategies.bollinger_reversion.assertivity
        };
      }
    }

    // Pivot Levels
    if (indicators.pivots) {
      if (currentPrice > indicators.pivots.r1) {
        scores.pivot_levels = { name: this.strategies.pivot_levels.name, score: 1, level: 'R1', assertivity: this.strategies.pivot_levels.assertivity };
      } else if (currentPrice < indicators.pivots.s1) {
        scores.pivot_levels = { name: this.strategies.pivot_levels.name, score: -1, level: 'S1', assertivity: this.strategies.pivot_levels.assertivity };
      }
    }

    return scores;
  }

  /**
   * Calcular confluência (quantas estratégias concordam)
   */
  calculateConfluence(strategyScores) {
    const buyVotes = Object.values(strategyScores).filter(s => s.score > 0).length;
    const sellVotes = Object.values(strategyScores).filter(s => s.score < 0).length;
    const totalSignals = Object.keys(strategyScores).length;

    return {
      buyVotes,
      sellVotes,
      totalSignals,
      buyConfluence: totalSignals > 0 ? (buyVotes / totalSignals) * 100 : 0,
      sellConfluence: totalSignals > 0 ? (sellVotes / totalSignals) * 100 : 0
    };
  }

  /**
   * Gerar sinal (CALL/PUT/HOLD)
   */
  generateSignal(confluence, indicators, strategyScores) {
    if (confluence.buyVotes > confluence.sellVotes && confluence.buyConfluence >= 50) {
      return 'CALL ↑ (COMPRA)';
    } else if (confluence.sellVotes > confluence.buyVotes && confluence.sellConfluence >= 50) {
      return 'PUT ↓ (VENDA)';
    } else {
      return 'HOLD (ESPERAR)';
    }
  }

  /**
   * Score geral (0-100)
   */
  calculateOverallScore(confluence, strategyScores, indicators) {
    let score = 50; // Base neutra

    // Peso das confluências
    if (confluence.buyVotes > confluence.sellVotes) {
      score += (confluence.buyConfluence - 50) * 1.5;
    } else {
      score -= (confluence.sellConfluence - 50) * 1.5;
    }

    // RSI adiciona confiança
    if (indicators.rsi) {
      if (indicators.rsi < 30 || indicators.rsi > 70) score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Gerar recomendação final
   */
  generateRecommendation(results, bestTimeframe, bestScore) {
    if (!bestTimeframe) {
      return { error: 'Não foi possível analisar nenhum timeframe' };
    }

    const best = results[bestTimeframe];
    const topStrategies = Object.values(best.strategies)
      .sort((a, b) => (b.assertivity || 0) - (a.assertivity || 0))
      .slice(0, 2);

    return {
      bestTimeframe: `${bestTimeframe.toUpperCase()} (${this.timeframeLabel(bestTimeframe)})`,
      confidence: bestScore.toFixed(1),
      signal: best.signal,
      price: best.currentPrice.toFixed(2),
      topStrategies: topStrategies.map(s => ({
        name: s.name,
        assertivity: (s.assertivity * 100).toFixed(0) + '%'
      })),
      explanation: best.explanation,
      reasoning: `Os ${topStrategies.length} estratégias mais assertivas (${topStrategies.map(s => s.assertivity * 100).reduce((a, b) => a + b) / topStrategies.length / 100 * 100 | 0}% em média) estão gerando sinal de ${best.signal} no timeframe ${bestTimeframe.toUpperCase()}.`
    };
  }

  timeframeLabel(tf) {
    const labels = { '1m': '1 minuto', '5m': '5 minutos', '15m': '15 minutos' };
    return labels[tf] || tf;
  }

  /**
   * Explicação detalhada
   */
  generateExplanation(strategyScores, indicators, confluence) {
    const parts = [];

    // Estratégias ativas
    const activeStrategies = Object.entries(strategyScores).filter(([_, s]) => s.score !== 0);
    if (activeStrategies.length > 0) {
      parts.push(`✓ Estratégias gerando sinal: ${activeStrategies.length}`);
      activeStrategies.forEach(([_, s]) => {
        const direction = s.score > 0 ? '↑' : '↓';
        parts.push(`  ${direction} ${s.name} (assertividade: ${(s.assertivity * 100).toFixed(0)}%)`);
      });
    }

    // Confluência
    parts.push(`\n✓ Confluência: ${confluence.buyVotes} COMPRA vs ${confluence.sellVotes} VENDA`);

    return parts.join('\n');
  }

  /**
   * Análise completa com MACRO + MICRO + Estratégias
   */
  async analyzeWithMacroMicro(pair, timeframe, timeSeriesAnalyzer) {
    console.log(`\n[ANÁLISE COMPLETA] ${pair} em ${timeframe} com Macro + Micro`);

    try {
      // Buscar dados
      const candles = await this.fetchCandles(pair, timeframe, 100);
      if (!candles || candles.length < 20) {
        throw new Error(`Insufficient data for ${timeframe}`);
      }

      // ANÁLISE DE TENDÊNCIA CURTA (últimas 2-3 horas)
      console.log(`  [TENDÊNCIA CURTA] Analisando últimas 2-3 horas...`);
      const shortTerm = await timeSeriesAnalyzer.analyzeShortTermTrend(pair, timeframe);

      if (!shortTerm) {
        throw new Error('Short-term trend analysis failed');
      }
      console.log(`  [TENDÊNCIA CURTA] ✓ Completa`);

      // ANÁLISE MICRO (momento atual)
      console.log(`  [MICRO] Iniciando análise de momento...`);
      const micro = timeSeriesAnalyzer.analyzeMicroDynamics(candles);

      if (!micro) {
        throw new Error('Micro analysis failed');
      }
      console.log(`  [MICRO] ✓ Completa`);

      // ANÁLISE TRADICIONAL (estratégias e indicadores)
      const closes = candles.map(c => c.close);
      const volumes = candles.map(c => c.volume);
      const latest = candles[candles.length - 1];

      console.log(`  [INDICADORES] Calculando para ${timeframe}...`);
      const indicators = {
        rsi: this.calculateRSI(closes),
        macd: this.calculateMACD(closes),
        bollinger: this.calculateBollingerBands(closes),
        pivots: this.calculatePivots(latest.high, latest.low, latest.close),
        volumeSMA: this.calculateVolumeSMA(volumes)
      };

      console.log(`  [ESTRATÉGIAS] Testando estratégias...`);
      const strategyScores = this.testStrategies(indicators, closes);
      const confluence = this.calculateConfluence(strategyScores, indicators);

      // COMBINAÇÃO: TENDÊNCIA CURTA + MICRO + ESTRATÉGIAS
      console.log(`  [COMBINAÇÃO] Focando na análise do MOMENTO ATUAL...`);
      const combinedAnalysis = timeSeriesAnalyzer.combinedSignalAnalysis(
        shortTerm,
        micro,
        strategyScores,
        confluence
      );

      // Gerar sinal final (considerando todas as análises)
      const finalSignal = this.generateFinalSignal(combinedAnalysis, confluence, indicators);
      const overallScore = this.calculateCombinedScore(combinedAnalysis, confluence, indicators);

      console.log(`  [RESULTADO] Análise completa finalizada`);

      return {
        timeframe,
        timestamp: new Date(latest.timestamp).toISOString(),
        currentPrice: latest.close.toFixed(2),
        shortTerm,
        micro,
        indicators,
        strategies: strategyScores,
        confluence,
        combined: combinedAnalysis,
        finalSignal,
        overallScore,
        explanation: this.generateCombinedExplanation(combinedAnalysis, shortTerm, micro, confluence)
      };
    } catch (err) {
      console.error(`  [ERRO] ${err.message}`);
      console.error(err.stack);
      throw err;
    }
  }

  /**
   * Gerar sinal final combinado
   */
  generateFinalSignal(combinedAnalysis, confluence, indicators) {
    if (!combinedAnalysis || !combinedAnalysis.recommendedAction) {
      return 'HOLD (Análise insuficiente)';
    }

    return combinedAnalysis.recommendedAction.signal;
  }

  /**
   * Calcular score combinado
   */
  calculateCombinedScore(combinedAnalysis, confluence, indicators) {
    let score = 50;

    if (combinedAnalysis.buyScore > combinedAnalysis.sellScore) {
      const diff = combinedAnalysis.buyScore - combinedAnalysis.sellScore;
      score = Math.min(100, 50 + diff / 2);
    } else if (combinedAnalysis.sellScore > combinedAnalysis.buyScore) {
      const diff = combinedAnalysis.sellScore - combinedAnalysis.buyScore;
      score = Math.max(0, 50 - diff / 2);
    }

    return Math.round(score);
  }

  /**
   * Explicação combinada detalhada
   */
  generateCombinedExplanation(combinedAnalysis, shortTerm, micro, confluence) {
    const parts = [];

    // Contexto de curto prazo
    if (shortTerm && shortTerm.trend) {
      parts.push(`📈 Tendência curta: ${shortTerm.trend.direction}`);
      if (shortTerm.timeRange) {
        parts.push(`   (${shortTerm.timeRange})`);
      }
    }

    // Padrão micro
    if (micro && micro.lastCandlePattern) {
      const pattern = micro.lastCandlePattern;
      parts.push(`🕯️ Padrão AGORA: ${pattern.type} (${pattern.bodyPercentage}% do corpo)`);
    }

    // Movimento recente
    if (micro && micro.recentMovement) {
      parts.push(`📊 Movimento: ${micro.recentMovement.dominantDirection} (${micro.recentMovement.upMoves}↑ vs ${micro.recentMovement.downMoves}↓)`);
    }

    // Sinais de reversão
    if (micro && micro.reversalSignals && micro.reversalSignals.count > 0) {
      parts.push(`⚠️ Reversão potencial: ${micro.reversalSignals.signals.join(', ')}`);
    }

    // Reasoning
    if (combinedAnalysis.reasoning && combinedAnalysis.reasoning.length > 0) {
      parts.push(`\n🎯 Raciocínio da análise:`);
      combinedAnalysis.reasoning.forEach(r => {
        parts.push(`  • ${r}`);
      });
    }

    return parts.join('\n');
  }
}

module.exports = AnalysisEngine;
