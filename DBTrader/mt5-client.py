#!/usr/bin/env python3
"""
Cliente MetaTrader5 para extrair velas REAIS do Avalon
Captura dados diretamente do terminal MT5 rodando localmente

⚠️ IMPORTANTE - TIMEZONE:
   - Servidor MT5 (Avalon): UTC+3 (6 horas à frente)
   - Brasília Local: GMT-3
   - Diferença: +6 horas

   Todos os timestamps são capturados conforme servidor MT5 (UTC+3)
"""

import MetaTrader5 as mt5
import json
import sys
from datetime import datetime, timedelta

# Foco inicial: apenas EURUSD
MAIN_PAIRS = ["EURUSD"]

class MT5Client:
    def __init__(self):
        """Inicializar cliente MT5"""
        self.initialized = False
        self.init_mt5()

    def init_mt5(self):
        """Conectar ao MetaTrader5"""
        if not mt5.initialize():
            print(json.dumps({
                "error": "Não conseguiu inicializar MT5. Certifique-se que o MT5 está aberto.",
                "code": "MT5_INIT_FAILED"
            }))
            sys.exit(1)

        self.initialized = True
        print(json.dumps({
            "status": "success",
            "message": "MT5 inicializado com sucesso",
            "version": mt5.version()
        }), file=sys.stderr)

    def get_candles(self, symbol, timeframe_minutes=1, limit=60):
        """
        Extrair velas REAIS do MT5

        Args:
            symbol: Par de moedas (ex: EURUSD)
            timeframe_minutes: Timeframe em minutos (1 = M1)
            limit: Número de velas a retornar

        Returns:
            Lista de velas no formato: [time, open, high, low, close, volume]
        """

        if not self.initialized:
            return {
                "error": "MT5 não inicializado",
                "symbol": symbol
            }

        try:
            # Definir timeframe (MT5.TIMEFRAME_M1 = 1 minuto)
            if timeframe_minutes == 1:
                timeframe = mt5.TIMEFRAME_M1
            elif timeframe_minutes == 5:
                timeframe = mt5.TIMEFRAME_M5
            elif timeframe_minutes == 15:
                timeframe = mt5.TIMEFRAME_M15
            elif timeframe_minutes == 60:
                timeframe = mt5.TIMEFRAME_H1
            elif timeframe_minutes == 240:
                timeframe = mt5.TIMEFRAME_H4
            elif timeframe_minutes == 1440:
                timeframe = mt5.TIMEFRAME_D1
            else:
                timeframe = mt5.TIMEFRAME_M1

            # Buscar velas (a partir do final, voltando para trás)
            rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, limit)

            if rates is None:
                return {
                    "error": f"Não conseguiu buscar velas para {symbol}",
                    "symbol": symbol,
                    "hint": "Verifique se o símbolo existe no Avalon"
                }

            if len(rates) == 0:
                return {
                    "error": f"Nenhuma vela encontrada para {symbol}",
                    "symbol": symbol
                }

            # Converter para formato JSON
            candles = []
            for rate in rates:
                candles.append({
                    "time": int(rate['time']),
                    "open": float(rate['open']),
                    "high": float(rate['high']),
                    "low": float(rate['low']),
                    "close": float(rate['close']),
                    "volume": float(rate['tick_volume'])
                })

            return {
                "status": "success",
                "symbol": symbol,
                "timeframe": timeframe_minutes,
                "candles": candles,
                "count": len(candles),
                "timestamp": datetime.now().isoformat()
            }

        except Exception as err:
            return {
                "error": str(err),
                "symbol": symbol
            }

    def get_symbol_info(self, symbol):
        """Obter informações do símbolo (preço atual, spread, etc)"""
        try:
            info = mt5.symbol_info(symbol)
            if info is None:
                return {"error": f"Símbolo {symbol} não encontrado"}

            return {
                "symbol": symbol,
                "bid": float(info.bid),
                "ask": float(info.ask),
                "spread_points": int(info.ask - info.bid) * 10000,
                "digits": info.digits
            }
        except Exception as err:
            return {"error": str(err)}

    def get_all_main_pairs(self, limit=60):
        """Extrair candles de todos os 10 principais pares"""
        results = {}

        for pair in MAIN_PAIRS:
            candle_data = self.get_candles(pair, 1, limit)
            results[pair] = candle_data

        return {
            "status": "success",
            "pairs": results,
            "total_pairs": len(MAIN_PAIRS),
            "timestamp": datetime.now().isoformat()
        }


def main():
    """Script principal"""
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: mt5-client.py <comando> [args]"}))
        sys.exit(1)

    comando = sys.argv[1]
    client = MT5Client()

    if comando == "candles":
        # mt5-client.py candles EURUSD [limit]
        symbol = sys.argv[2] if len(sys.argv) > 2 else "EURUSD"
        limit = int(sys.argv[3]) if len(sys.argv) > 3 else 60
        result = client.get_candles(symbol, 1, limit)

    elif comando == "info":
        # mt5-client.py info EURUSD
        symbol = sys.argv[2] if len(sys.argv) > 2 else "EURUSD"
        result = client.get_symbol_info(symbol)

    elif comando == "all":
        # mt5-client.py all [limit]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 60
        result = client.get_all_main_pairs(limit)

    else:
        result = {"error": f"Comando desconhecido: {comando}"}

    print(json.dumps(result, indent=2))
    mt5.shutdown()


if __name__ == "__main__":
    main()
