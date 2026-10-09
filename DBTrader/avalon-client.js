const { execFile } = require('child_process');
const path = require('path');
const util = require('util');
const execFilePromise = util.promisify(execFile);

class AvalonClient {
  constructor(email, password) {
    this.email = email;
    this.password = password;
    this.baseUrl = 'https://trade.avalonbroker.com';
    this.pythonScript = path.join(__dirname, 'mt5-client.py');
    console.log('[AVALON-CLIENT] 📊 Inicializado com MetaTrader5 (MT5)');
  }

  /**
   * Executar comando Python do MT5
   */
  async executeMT5Command(command, ...args) {
    try {
      const { stdout, stderr } = await execFilePromise('python', [
        this.pythonScript,
        command,
        ...args
      ]);

      // stderr pode conter logs, stdout é o JSON
      const result = JSON.parse(stdout);

      if (stderr) {
        console.log('[MT5]', stderr.trim());
      }

      return result;
    } catch (err) {
      console.error('[MT5] Erro ao executar:', err.message);
      throw new Error(`MT5 Error: ${err.message}`);
    }
  }

  /**
   * Obter velas REAIS do MT5
   * Foco: EURUSD
   */
  async getCandles(symbol = 'EURUSD', timeframe = '5m', limit = 60) {
    try {
      console.log(`[AVALON] 📊 Extraindo ${limit} velas REAIS de ${symbol} via MT5...`);

      // Chamar script Python
      const result = await this.executeMT5Command('candles', symbol, limit);

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.candles || result.candles.length === 0) {
        throw new Error(`Nenhuma vela encontrada para ${symbol}`);
      }

      console.log(`[AVALON] ✅ ${result.candles.length} velas REAIS extraídas!`);
      return result.candles;
    } catch (err) {
      console.error(`[AVALON] Erro ao obter velas de ${symbol}:`, err.message);
      throw err;
    }
  }

  /**
   * Obter velas de todos os 10 principais pares
   */
  async getAllMainPairs(limit = 60) {
    try {
      console.log(`[AVALON] 📊 Extraindo velas dos 10 principais pares via MT5...`);

      const result = await this.executeMT5Command('all', limit);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (err) {
      console.error('[AVALON] Erro ao obter pares principais:', err.message);
      throw err;
    }
  }

  /**
   * Obter informações do símbolo (preço atual, spread)
   */
  async getPrice(symbol) {
    try {
      console.log(`[AVALON] 💰 Obtendo preço de ${symbol}...`);

      const result = await this.executeMT5Command('info', symbol);

      if (result.error) {
        throw new Error(result.error);
      }

      return {
        symbol: symbol,
        bid: result.bid,
        ask: result.ask,
        price: (result.bid + result.ask) / 2,
        spread: result.spread_points,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error(`[AVALON] Erro ao obter preço de ${symbol}:`, err.message);
      throw err;
    }
  }

  /**
   * Login (não necessário para MT5)
   */
  async login() {
    console.log('[AVALON] ✅ Usando MT5 (não requer login)');
    return true;
  }

  /**
   * Close (MT5 gerencia automaticamente)
   */
  async close() {
    console.log('[AVALON] ✅ Conexão MT5 finalizada');
  }
}

module.exports = AvalonClient;
