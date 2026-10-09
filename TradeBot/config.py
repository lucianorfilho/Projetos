# Configuração do TradeBot

# Indicadores
INDICATORS_CONFIG = {
    'rci_period': 9,
    'ma_period_short': 5,
    'ma_period_long': 20,
    'bollinger_period': 20,
    'bollinger_std_dev': 2,
}

# Sensibilidade dos Padrões (0.0 a 1.0)
PATTERNS_CONFIG = {
    'torres_gemeas_tolerance': 0.15,  # Tolerância de tamanho entre velas
    'pattern_min_score': 0.5,  # Score mínimo para confirmar padrão
}

# Thresholds de Sinais
SIGNAL_CONFIG = {
    'confluence_buy_threshold': 0.75,   # Mínimo para sinal COMPRA FORTE
    'confluence_sell_threshold': 0.75,  # Mínimo para sinal VENDA FORTE
    'confluence_moderate_threshold': 0.50,  # Mínimo para sinal MODERADO
    'rci_overbought': 70,
    'rci_oversold': 30,
    'rci_neutral_range': 40,  # 40-60 é neutro
}

# Configuração de Análise
ANALYSIS_CONFIG = {
    'min_candles_for_analysis': 20,  # Mínimo de velas para análise
    'screenshot_interval': 60,  # Segundos entre screenshots
    'enable_logging': True,
    'log_file': 'screenshots/signals_log.json',
    'screenshots_folder': 'screenshots',
}

# Pares para Monitorar (quando integrado com API)
PAIRS_TO_MONITOR = [
    'EUR/USD',
    'GBP/USD',
    'GBP/CHF',
    'EUR/GBP',
    'USD/JPY',
]

# Timeframes
TIMEFRAMES = {
    '1m': 60,      # 1 minuto
    '5m': 300,     # 5 minutos
    '15m': 900,    # 15 minutos
    '1h': 3600,    # 1 hora
}

# Configuração de Conta Demo
DEMO_ACCOUNT = {
    'enabled': True,
    'initial_balance': 10000.00,
    'risk_per_trade': 0.02,  # 2% do saldo por operação
    'max_trades_per_day': 10,
}

# Configuração de Notificações
NOTIFICATIONS_CONFIG = {
    'enable_notifications': False,
    'notification_type': 'console',  # 'console', 'email', 'telegram', 'webhook'
    'webhook_url': None,  # Para notificações via webhook
    'telegram_token': None,
    'telegram_chat_id': None,
}

# Configuração de Relatórios
REPORTS_CONFIG = {
    'generate_daily_report': True,
    'report_time': '18:00',  # Hora para gerar relatório diário
    'save_reports_folder': 'reports',
}
