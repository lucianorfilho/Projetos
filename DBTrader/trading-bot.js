const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const krakenClient = require('./kraken-client');

class TradingBot {
  constructor() {
    this.activeBot = null;
    this.interval = null;
    this.db = null;
    this.krakenClient = krakenClient;
    this.tradeSize = 1; // $1 por operação
    this.useRealAPI = process.env.KRAKEN_USE_REAL_API === 'true';
    this.signalQueue = []; // Fila de sinais com status (EM ESPERA, EM EXECUÇÃO, FINALIZADO)
    this.initDatabase();
  }

  /**
   * Inicializar banco de dados
   */
  initDatabase() {
    this.db = new sqlite3.Database(path.join(__dirname, 'trading_history.db'));

    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS trades (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pair TEXT NOT NULL,
          signal TEXT NOT NULL,
          action TEXT NOT NULL,
          amount REAL NOT NULL,
          entry_price REAL NOT NULL,
          exit_price REAL,
          signal_time DATETIME NOT NULL,
          entry_time DATETIME NOT NULL,
          exit_time DATETIME,
          status TEXT DEFAULT 'open',
          result TEXT,
          profit_loss REAL,
          profit_loss_percent REAL,
          analysis_entry TEXT,
          analysis_exit TEXT,
          kraken_order_id TEXT,
          use_real_api BOOLEAN DEFAULT 0
        )
      `);

      // Adicionar colunas se não existirem (para bancos antigos)
      this.db.run(`
        ALTER TABLE trades ADD COLUMN kraken_order_id TEXT
      `, () => {
        // Ignorar erro se coluna já existe
      });

      this.db.run(`
        ALTER TABLE trades ADD COLUMN use_real_api BOOLEAN DEFAULT 0
      `, () => {
        // Ignorar erro se coluna já existe
      });
    });
  }

  /**
   * Iniciar bot automático
   */
  startBot(pair, engine, timeSeriesAnalyzer, tradeSize = 1) {
    console.log(`\n[BOT] Iniciando trading automático para ${pair} com valor $${tradeSize}...`);

    if (this.activeBot) {
      return { error: 'Bot já está rodando' };
    }

    this.tradeSize = tradeSize; // Atualizar tamanho do trade
    this.activeBot = {
      pair,
      startTime: new Date(),
      tradeCount: 0,
      profit: 0
    };

    // Sincronizar para começar no segundo 00 (início do período)
    this.scheduleNextAnalysis(pair, engine, timeSeriesAnalyzer);

    return {
      status: 'Bot iniciado',
      pair,
      tradeSize: this.tradeSize,
      interval: '5 minutos (M5) - sincronizado no segundo 00'
    };
  }

  /**
   * Agendar próxima análise para começar no segundo 00
   */
  scheduleNextAnalysis(pair, engine, timeSeriesAnalyzer) {
    const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds();

    // Calcula quanto tempo falta para o próximo segundo 00
    const delayMs = secondsUntilNextMinute * 1000 - now.getMilliseconds();

    console.log(`[BOT] ⏰ Próxima análise em ${secondsUntilNextMinute}s (segundo 00)`);

    // Schedule inicial
    setTimeout(() => {
      this.executeTradeAnalysis(pair, engine, timeSeriesAnalyzer);
      this.closeOpenPositions(pair, engine);

      // Depois, executar a cada 5 minutos começando no segundo 00
      this.interval = setInterval(() => {
        this.executeTradeAnalysis(pair, engine, timeSeriesAnalyzer);
        this.closeOpenPositions(pair, engine);
      }, 5 * 60 * 1000); // 5 minutos
    }, delayMs);
  }

  /**
   * Parar bot automático
   */
  stopBot() {
    console.log(`\n[BOT] Parando trading automático...`);

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    const result = this.activeBot;
    this.activeBot = null;

    return {
      status: 'Bot parado',
      summary: result
    };
  }

  /**
   * Executar análise com rastreamento de status de sinais
   *
   * FLUXO:
   * 12:00 → 📊 ANÁLISE + Sinal para 12:05 (EM ESPERA)
   * 12:05 → ⚡ EXECUTA sinal de 12:05 (EM EXECUÇÃO) + Nova análise para 12:10 (EM ESPERA)
   * 12:06 → ✅ Sinal de 12:05 finalizado com resultado (GAIN/LOSS)
   */
  async executeTradeAnalysis(pair, engine, timeSeriesAnalyzer) {
    try {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const now = new Date();

      // ETAPA 1: Fazer análise agora
      console.log(`\n[BOT - ${timestamp}] 📊 ANÁLISE para próxima execução...`);
      const analysis = await engine.analyzeWithMacroMicro(pair, '1m', timeSeriesAnalyzer);

      if (!analysis || !analysis.combined || !analysis.combined.recommendedAction) {
        console.log('[BOT] Análise incompleta - aguardando próximo ciclo');
        return { status: 'erro_analise', error: 'Análise não retornou dados esperados' };
      }

      const signal = analysis.combined.recommendedAction.signal;
      const confidence = analysis.combined.recommendedAction.confidence;

      // Determinar ação
      let action = 'HOLD';
      if (signal.includes('COMPRA')) {
        action = 'BUY';
      } else if (signal.includes('VENDA')) {
        action = 'SELL';
      }

      // ETAPA 2: Executar trade se há sinal EM ESPERA
      let tradeResult = null;
      const waitingSignal = this.signalQueue.find(s => s.status === 'EM ESPERA');

      if (waitingSignal) {
        console.log(`[BOT] ⚡ Executando sinal: ${waitingSignal.signal} (${waitingSignal.executionTime})`);

        // Marcar como EM EXECUÇÃO
        waitingSignal.status = 'EM EXECUÇÃO';
        waitingSignal.executedAt = now;

        // Executar trade
        tradeResult = await this.executeTrade(
          pair,
          waitingSignal.action,
          waitingSignal.price,
          waitingSignal.analysis
        );

        if (this.activeBot) {
          this.activeBot.tradeCount++;
          if (tradeResult.profit_loss > 0) {
            this.activeBot.profit += tradeResult.profit_loss;
          }
        }

        // Marcar como FINALIZADO com resultado
        waitingSignal.status = 'FINALIZADO';
        waitingSignal.result = tradeResult.result;
        waitingSignal.pips = tradeResult.profit_loss;
        waitingSignal.finalizedAt = new Date();

        console.log(`[BOT] ✅ ${waitingSignal.signal} FINALIZADO: ${tradeResult.result} | ${Math.abs(tradeResult.profit_loss).toFixed(0)} pips`);
      }

      // ETAPA 3: Criar novo sinal para próximo ciclo
      if (action !== 'HOLD') {
        const nextExecution = new Date(now.getTime() + 5 * 60 * 1000); // +5 min
        const newSignal = {
          id: Date.now(),
          signal,
          action,
          price: analysis.currentPrice,
          analysis,
          status: 'EM ESPERA',
          createdAt: now,
          executionTime: nextExecution.toLocaleTimeString('pt-BR'),
          confidence
        };

        this.signalQueue.push(newSignal);
        console.log(`[BOT] 📌 Novo sinal: ${signal} (Execução: ${newSignal.executionTime}) | Confiança: ${confidence}%`);
      } else {
        console.log('[BOT] ⏸️  HOLD - próximo ciclo sem trade');
      }

      // Limpar sinais finalizados após 1 minuto
      this.signalQueue = this.signalQueue.filter(s => {
        if (s.status === 'FINALIZADO' && s.finalizedAt) {
          const age = (now - s.finalizedAt) / 1000; // segundos
          return age < 60; // Manter por 60 segundos
        }
        return true;
      });

      return tradeResult || { status: 'analise', signal };
    } catch (err) {
      console.error(`[BOT ERRO] ${err.message}`);
      return {
        status: 'erro',
        error: err.message
      };
    }
  }

  /**
   * Executar trade na corretora (simulado/real)
   */
  async executeTrade(pair, action, price, analysis) {
    const signalTime = new Date();
    const entryTime = new Date();
    const entryPrice = parseFloat(price);

    let orderId = null;
    let krakenOrderData = null;

    // Se usando API real, enviar ordem para Kraken
    if (this.useRealAPI) {
      try {
        const symbol = this.krakenClient.formatProductId(pair);
        const side = action === 'BUY' ? 'buy' : 'sell';

        console.log(`[KRAKEN] Enviando ordem real: ${side} ${this.tradeSize} de ${symbol}`);
        krakenOrderData = await this.krakenClient.createOrder(symbol, side, this.tradeSize, 'market');

        if (krakenOrderData?.txid?.[0]) {
          orderId = krakenOrderData.txid[0];
          console.log(`[KRAKEN] Ordem criada: ${orderId}`);
        }
      } catch (err) {
        console.error(`[BOT] Erro ao enviar ordem para Kraken: ${err.message}`);
        // Continuar mesmo se falhar na API
      }
    }

    const tradeData = {
      pair,
      signal: action === 'BUY' ? 'COMPRA' : action === 'SELL' ? 'VENDA' : 'HOLD',
      action,
      amount: this.tradeSize,
      entry_price: entryPrice,
      exit_price: null,
      signal_time: signalTime,
      entry_time: entryTime,
      exit_time: null,
      status: 'aberto',
      result: 'aguardando',
      profit_loss: 0,
      profit_loss_percent: 0,
      analysis_entry: JSON.stringify(analysis?.combined?.reasoning || []),
      analysis_exit: null,
      kraken_order_id: orderId,
      use_real_api: this.useRealAPI
    };

    // Salvar no banco de dados
    this.saveToHistory(tradeData);

    console.log(`[BOT] Trade #${this.activeBot?.tradeCount} executado: ${action} ${this.tradeSize} de ${pair} a $${price}${orderId ? ` (Kraken: ${orderId})` : ' (simulado)'}`);

    return {
      status: 'executado',
      ...tradeData,
      krakenData: krakenOrderData
    };
  }

  /**
   * Salvar trade no histórico
   */
  saveToHistory(tradeData) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO trades (
          pair, signal, action, amount, entry_price, exit_price,
          signal_time, entry_time, exit_time, status, result,
          profit_loss, profit_loss_percent, analysis_entry, analysis_exit,
          kraken_order_id, use_real_api
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          tradeData.pair,
          tradeData.signal,
          tradeData.action,
          tradeData.amount,
          tradeData.entry_price,
          tradeData.exit_price,
          tradeData.signal_time.toISOString(),
          tradeData.entry_time.toISOString(),
          tradeData.exit_time ? tradeData.exit_time.toISOString() : null,
          tradeData.status,
          tradeData.result,
          tradeData.profit_loss,
          tradeData.profit_loss_percent,
          tradeData.analysis_entry,
          tradeData.analysis_exit,
          tradeData.kraken_order_id || null,
          tradeData.use_real_api ? 1 : 0
        ],
        function(err) {
          if (err) {
            console.error('[BOT] Erro ao salvar no BD:', err);
            reject(err);
          } else {
            console.log(`[BOT] Trade #${this.lastID} salvo no histórico${tradeData.kraken_order_id ? ` (Binance: ${tradeData.kraken_order_id})` : ''}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  /**
   * Obter histórico de trades
   */
  getHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      console.log('[BOT] Calling getHistory with query: SELECT * FROM trades ORDER BY signal_time DESC LIMIT ?');
      this.db.all(
        `SELECT * FROM trades ORDER BY signal_time DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) {
            console.error('[BOT] getHistory error:', err);
            reject(err);
          } else {
            console.log('[BOT] getHistory success, rows:', rows?.length || 0);
            resolve(rows || []);
          }
        }
      );
    });
  }

  /**
   * Obter estatísticas do bot
   */
  getStats() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
          COUNT(*) as totalTrades,
          SUM(CASE WHEN action = 'BUY' THEN 1 ELSE 0 END) as buyTrades,
          SUM(CASE WHEN action = 'SELL' THEN 1 ELSE 0 END) as sellTrades,
          SUM(CASE WHEN result = 'sucesso' THEN 1 ELSE 0 END) as successTrades,
          SUM(profit_loss) as totalProfit
        FROM trades`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows[0] || {});
        }
      );
    });
  }

  /**
   * Obter status do bot ativo
   */
  getStatus() {
    if (!this.activeBot) {
      return { status: 'parado' };
    }

    const uptime = Math.floor((new Date() - this.activeBot.startTime) / 1000);
    return {
      status: 'ativo',
      pair: this.activeBot.pair,
      tradeCount: this.activeBot.tradeCount,
      profit: this.activeBot.profit.toFixed(2),
      uptimeSeconds: uptime,
      uptimeFormatted: this.formatUptime(uptime)
    };
  }

  /**
   * Formatar tempo de funcionamento
   */
  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  /**
   * Fechar posições abertas
   */
  closeOpenPositions(pair, engine) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM trades WHERE status = 'aberto' AND pair = ? LIMIT 5`,
        [pair],
        async (err, trades) => {
          if (err) {
            console.error('[BOT] Erro ao buscar trades abertos:', err);
            reject(err);
            return;
          }

          if (!trades || trades.length === 0) {
            resolve([]);
            return;
          }

          // Simular preço de saída (com pequina variação)
          let exitPrice;
          try {
            const analysis = await engine.analyzeWithMacroMicro(pair, '1m', null);
            exitPrice = analysis.currentPrice;
          } catch (e) {
            // Se não conseguir preço atual, usar preço de entrada +/- 1%
            exitPrice = trades[0].entry_price * (0.99 + Math.random() * 0.02);
          }

          // Fechar cada posição
          trades.forEach(trade => {
            const exitTime = new Date();
            let profitLoss = 0;
            let profitLossPercent = 0;

            if (trade.action === 'BUY') {
              profitLoss = (exitPrice - trade.entry_price) * trade.amount;
              profitLossPercent = ((exitPrice - trade.entry_price) / trade.entry_price) * 100;
            } else if (trade.action === 'SELL') {
              profitLoss = (trade.entry_price - exitPrice) * trade.amount;
              profitLossPercent = ((trade.entry_price - exitPrice) / trade.entry_price) * 100;
            }

            const result = profitLoss > 0 ? 'sucesso' : profitLoss < 0 ? 'erro' : 'empate';

            // Atualizar no banco de dados
            this.db.run(
              `UPDATE trades SET exit_price = ?, exit_time = ?, status = 'fechado', result = ?, profit_loss = ?, profit_loss_percent = ? WHERE id = ?`,
              [
                exitPrice,
                exitTime.toISOString(),
                result,
                parseFloat(profitLoss.toFixed(2)),
                parseFloat(profitLossPercent.toFixed(2)),
                trade.id
              ],
              (updateErr) => {
                if (updateErr) {
                  console.error('[BOT] Erro ao fechar posição:', updateErr);
                } else {
                  console.log(`[BOT] Posição #${trade.id} fechada: ${trade.action} ${trade.pair} ${result} $${profitLoss.toFixed(2)}`);
                  // Atualizar lucro do bot
                  if (this.activeBot) {
                    this.activeBot.profit += profitLoss;
                  }
                }
              }
            );
          });

          resolve(trades);
        }
      );
    });
  }

  /**
   * Limpar histórico de trades
   */
  clearHistory() {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM trades`,
        [],
        function(err) {
          if (err) {
            console.error('[BOT] Erro ao limpar histórico:', err);
            reject(err);
          } else {
            console.log(`[BOT] Histórico limpo: ${this.changes} trades deletados`);
            resolve(this.changes);
          }
        }
      );
    });
  }

  /**
   * Fechar conexão do banco
   */
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = TradingBot;
