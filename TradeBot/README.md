# TradeBot - Análise Confluente de Gráficos Avalon

Sistema de análise técnica e geração de sinais para operações binárias na plataforma Avalon Broker.

## 🎯 Funcionalidades

### Indicadores Técnicos
- **RCI** (Range Commodity Index) - Identifica oversold/overbought
- **Média Móvel** (5 e 20 períodos) - Tendência geral
- **Bandas de Bollinger** - Volatilidade e níveis extremos
- **Fibonacci** - Níveis de suporte e resistência

### Padrões de Candlestick
- **Torres Gêmeas** - Duas velas de mesmo tamanho e direção
- **C3** - Padrão de três velas com indecisão no meio
- **Padrão 2.3** - Inside bar com breakout
- **Five Flip** - Reversão na quinta vela

### Análise Confluente
Gera sinais quando múltiplos indicadores e padrões se alinham:
- **COMPRA** (Confluência ≥ 75%)
- **VENDA** (Confluência ≥ 75%)
- **MODERADO** (Confluência 50-75%)
- **AGUARDE** (Confluência < 50%)

## 📋 Estrutura do Projeto

```
TradeBot/
├── main.py                 # Arquivo principal e orquestração
├── indicators.py           # Cálculo de indicadores técnicos
├── patterns.py             # Identificação de padrões
├── signals.py              # Geração de sinais confluentes
├── requirements.txt        # Dependências Python
├── screenshots/            # Pasta para armazenar screenshots
└── README.md              # Este arquivo
```

## 🚀 Como Usar

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

### 2. Executar o Bot

#### Teste Inicial (com dados de exemplo):
```bash
python main.py
```

Isso vai executar uma análise com dados de teste e mostrar um exemplo de sinal.

#### Análise Contínua (requer Avalon aberto no Chrome):

```python
from main import AvalonTradeBot

bot = AvalonTradeBot()
bot.run_continuous_analysis(interval=60)  # Análise a cada 60 segundos
```

### 3. Usar com Screenshots Reais

1. Deixe a Avalon aberta no Chrome
2. Salve um screenshot do gráfico como `screenshots/test_chart.png`
3. Execute:
   ```python
   from main import AvalonTradeBot
   bot = AvalonTradeBot()
   bot.analyze_chart("screenshots/test_chart.png", current_price=1.0883)
   ```

## 📊 Interpretando os Sinais

### Força do Sinal

- **FORTE**: Confluência ≥ 75% + múltiplos padrões confirmando
- **MODERADO**: Confluência 50-75% + 1-2 padrões confirmando
- **FRACO**: Confluência < 50%

### Confiança

Percentual que indica o alinhamento de todos os indicadores:
- **90%+**: Sinais muito confiáveis
- **75-90%**: Sinais confiáveis
- **50-75%**: Sinais moderados
- **<50%**: Aguardar confluência maior

## 📈 Exemplo de Saída

```
╔═══════════════════════════════════════════════════════════════╗
║                     SINAL DE TRADING                          ║
╠═══════════════════════════════════════════════════════════════╣
║ Sinal: COMPRA                                    ║
║ Força: FORTE                                    ║
║ Confiança: 82.5%                                ║
╠═══════════════════════════════════════════════════════════════╣
║ INDICADORES:                                                  ║
║  • RCI: 75.3                                    ║
║  • Média Móvel 5: 1.0865                        ║
║  • Média Móvel 20: 1.0860                       ║
║  • Preço Atual: 1.0871                          ║
╠═══════════════════════════════════════════════════════════════╣
║ PADRÕES IDENTIFICADOS:                                        ║
║  • Torres Gêmeas: True                          ║
║  • C3: False                                    ║
║  • Padrão 2.3: True                             ║
║  • Five Flip: False                             ║
╚═══════════════════════════════════════════════════════════════╝
```

## ⚙️ Configuração Avançada

### Modificar Períodos dos Indicadores

Em `indicators.py`, você pode alterar:

```python
'ma_20': TechnicalIndicators.moving_average(close_prices, 20)  # Mudar período
'bollinger': TechnicalIndicators.bollinger_bands(close_prices, 20, 2)  # Mudar desvio padrão
```

### Ajustar Sensibilidade dos Padrões

Em `patterns.py`, modificar os valores de threshold:

```python
size_similar = abs(body1 - body2) < (body1 * 0.15)  # Aumentar 0.15 para menos sensibilidade
```

## 📝 Log de Sinais

Todos os sinais gerados são salvos em `screenshots/signals_log.json`:

```json
{
  "timestamp": "2026-07-10T13:21:00",
  "signal": "COMPRA",
  "confidence": 0.825,
  "price": 1.0871,
  "indicators": {
    "rci": 75.3,
    "ma_5": 1.0865,
    "ma_20": 1.0860
  },
  "patterns": { ... }
}
```

## ⚠️ Aviso Importante

**Este sistema é para análise técnica educacional e análise de padrões.**

- ❌ Não faça operações reais baseado APENAS neste sinal
- ✅ Use em conta DEMO primeiro
- ✅ Valide com análise manual
- ✅ Gerencie o risco adequadamente
- ✅ Nunca coloque mais do que pode perder

A análise técnica não garante resultados. Sempre use gestão de risco!

## 🔧 Suporte e Melhorias

Para melhorias futuras:
- [ ] Integração direta com API da Avalon (quando disponível)
- [ ] Machine Learning para calibrar scores
- [ ] Análise de múltiplos timeframes simultaneamente
- [ ] Alertas por webhook/Telegram
- [ ] Dashboard web em tempo real

## 📧 Contato

Desenvolvido por Claude Code para análise técnica confluente.
