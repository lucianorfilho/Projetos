const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Motores de análise
const AnalysisEngine = require('./analysis-engine');
const TimeSeriesAnalyzer = require('./time-series-analyzer');
const TradingBot = require('./trading-bot');
const BinanceDataClient = require('./binance-data-client');
const ForexDataClient = require('./forex-data-client');
const AvalonClient = require('./avalon-client');

// Inicializar cliente Avalon com credenciais
const avalonEmail = 'lucianocrfilho@outlook.com';
const avalonPassword = 'alg0r1tm0';
const avalon = new AvalonClient(avalonEmail, avalonPassword);

// Passar avalon aos engines
const engine = new AnalysisEngine(avalon);
const timeSeriesAnalyzer = new TimeSeriesAnalyzer(avalon);
const bot = new TradingBot();

console.log(`\n[SERVER] Avalon Client inicializado para ${avalonEmail}`);
console.log('[SERVER] Use ?type=avalon para dados reais da Avalon\n');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Análise completa - Motor profundo (método anterior)
app.post('/api/analyze', async (req, res) => {
  try {
    const { pair, timeframes = ['1m', '5m', '15m'] } = req.body;

    if (!pair) {
      return res.status(400).json({ error: 'Pair required' });
    }

    console.log(`\n[ANÁLISE] Iniciando análise profunda para ${pair}...`);

    // Buscar dados do Coinbase para cada timeframe
    const analysis = await engine.analyzeAllTimeframes(pair, timeframes);

    res.json({
      status: 'success',
      pair,
      timestamp: new Date().toISOString(),
      analysis
    });
  } catch (err) {
    console.error('[ERRO]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Análise PROFUNDA - Macro + Micro + Estratégias
app.post('/api/analyze-deep', async (req, res) => {
  try {
    const { pair, timeframe = '5m' } = req.body;

    if (!pair) {
      return res.status(400).json({ error: 'Pair required' });
    }

    console.log(`\n[ANÁLISE PROFUNDA] Iniciando para ${pair} em ${timeframe}...`);

    // Análise completa com Macro + Micro
    const analysisResult = await engine.analyzeWithMacroMicro(pair, timeframe, timeSeriesAnalyzer);

    res.json({
      status: 'success',
      pair,
      timeframe,
      timestamp: new Date().toISOString(),
      analysis: analysisResult
    });
  } catch (err) {
    console.error('[ERRO PROFUNDO]', err.message);
    console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

// Lista de pares suportados
app.get('/api/pairs', (req, res) => {
  res.json({
    pairs: [
      'BTC-USD', 'ETH-USD', 'SOL-USD', 'XRP-USD', 'ADA-USD',
      'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'XRP-USDT', 'ADA-USDT'
    ]
  });
});

// Timeframes suportados
app.get('/api/timeframes', (req, res) => {
  res.json({
    timeframes: [
      { value: '1m', label: 'M1 (1 minuto)' },
      { value: '5m', label: 'M5 (5 minutos)' },
      { value: '15m', label: 'M15 (15 minutos)' }
    ]
  });
});

// ===== ENDPOINTS DO BOT AUTOMÁTICO =====

// Iniciar bot automático
app.post('/api/bot/start', (req, res) => {
  try {
    const { pair, tradeAmount = 1 } = req.body;

    if (!pair) {
      return res.status(400).json({ error: 'Par de moeda obrigatório' });
    }

    console.log(`\n[API] Iniciando bot para ${pair} com valor $${tradeAmount}`);
    const result = bot.startBot(pair, engine, timeSeriesAnalyzer, tradeAmount);

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    console.error('[API] Erro ao iniciar bot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Parar bot automático
app.post('/api/bot/stop', (req, res) => {
  try {
    console.log(`\n[API] Parando bot`);
    const result = bot.stopBot();

    res.json({
      status: 'success',
      ...result
    });
  } catch (err) {
    console.error('[API] Erro ao parar bot:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obter status do bot + fila de sinais
app.get('/api/bot/status', (req, res) => {
  try {
    const status = bot.getStatus();
    res.json({
      status: 'success',
      bot: status,
      signalQueue: bot.signalQueue || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter histórico de trades
app.get('/api/bot/history', async (req, res) => {
  try {
    console.log('[SERVER] /api/bot/history called');
    const limit = req.query.limit || 50;
    console.log('[SERVER] Calling bot.getHistory with limit:', limit);
    const history = await bot.getHistory(limit);
    console.log('[SERVER] Got history, length:', history?.length);
    const stats = await bot.getStats();

    res.json({
      status: 'success',
      trades: history,
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter estatísticas do bot
app.get('/api/bot/stats', async (req, res) => {
  try {
    const stats = await bot.getStats();
    res.json({
      status: 'success',
      stats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Validar sinal específico (comparar com análise atual)
app.post('/api/bot/validate', async (req, res) => {
  try {
    const { pair, timeframe = '1m' } = req.body;

    if (!pair) {
      return res.status(400).json({ error: 'Par obrigatório' });
    }

    console.log(`\n[VALIDAÇÃO] Gerando análise para validação de ${pair}...`);

    // Fazer análise profunda AGORA
    const analysis = await engine.analyzeWithMacroMicro(pair, timeframe, timeSeriesAnalyzer);
    const signal = analysis.combined.recommendedAction.signal;

    res.json({
      status: 'success',
      validation: {
        pair,
        timeframe,
        timestamp: new Date().toISOString(),
        signal,
        confidence: analysis.combined.recommendedAction.confidence,
        riskLevel: analysis.combined.recommendedAction.riskLevel,
        analysis: {
          shortTerm: analysis.shortTerm,
          micro: analysis.micro,
          combined: analysis.combined
        }
      }
    });
  } catch (err) {
    console.error('[VALIDAÇÃO] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Limpar histórico de trades
app.post('/api/bot/clear-history', async (req, res) => {
  try {
    console.log(`\n[LIMPEZA] Limpando histórico de trades...`);

    const deletedCount = await bot.clearHistory();

    // Resetar lucro do bot
    if (bot.activeBot) {
      bot.activeBot.profit = 0;
      bot.activeBot.tradeCount = 0;
    }

    res.json({
      status: 'success',
      message: 'Histórico limpo com sucesso',
      deletedTrades: deletedCount
    });
  } catch (err) {
    console.error('[LIMPEZA] Erro:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Obter velas M5 (gráfico de dados reais)
// Foco: EURUSD via MT5
app.get('/api/chart/candles', async (req, res) => {
  try {
    const { symbol = 'EURUSD', limit = 60, type = 'avalon', timeframe = '5m' } = req.query;

    console.log(`[CHART] Obtendo velas ${timeframe} de ${symbol} (${type})...`);

    let candles;
    let source = type;

    if (type === 'avalon') {
      console.log('[CHART] Conectando na Avalon para dados REAIS...');
      candles = await avalon.getCandles(symbol, timeframe, parseInt(limit));
      source = 'Avalon - DADOS REAIS';
    } else if (type === 'forex') {
      candles = await ForexDataClient.getCandles(symbol, parseInt(limit));
      source = 'Forex Simulado';
    } else {
      candles = await BinanceDataClient.getCandles(symbol, parseInt(limit));
      source = 'Binance';
    }

    res.json({
      status: 'success',
      symbol,
      type,
      source,
      candles,
      count: candles.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[CHART] Erro:', err.message);
    const queryType = req.query.type || 'crypto';
    res.status(500).json({
      error: err.message,
      hint: queryType === 'avalon' ? 'Verifique a URL da Avalon e se as credenciais estão corretas' : undefined
    });
  }
});

const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   DBTrader - Motor de Análise      ║
║   Porta: ${PORT.toString().padEnd(24)} ║
║   Status: Pronto                   ║
╚════════════════════════════════════╝

Acesse: http://localhost:${PORT}
  `);

  // Iniciar bot automático no startup (par padrão: EURUSD via Avalon, valor: $10)
  console.log(`\n[STARTUP] Iniciando bot automático...`);
  const autoStartResult = bot.startBot('EURUSD', engine, timeSeriesAnalyzer, 10);
  console.log('[STARTUP]', autoStartResult);
});
