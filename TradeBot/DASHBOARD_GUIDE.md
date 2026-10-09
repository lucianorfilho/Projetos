# Dashboard TradeBot - Guia de Uso

## 🎯 O que é o Dashboard?

Dashboard web interativo para visualizar em tempo real:
- Gráficos de preço
- Indicadores técnicos (RCI, RSI, Médias Móveis)
- Padrões de candlestick detectados
- Histórico de sinais de trading
- Métricas da conta (saldo, taxa de vitória, etc)

## 🚀 Como Iniciar

### 1. Instalar Dependências

```bash
pip install -r requirements.txt
```

Isso instala:
- Flask (servidor web)
- OpenCV (análise de gráficos)
- Numpy, Pandas (processamento de dados)
- Todas as outras dependências

### 2. Iniciar o Servidor

```bash
python dashboard_server.py
```

Você verá:
```
========================================================================
DASHBOARD TRADEBOT
========================================================================

Servidor iniciado em: http://localhost:5000
Pressione CTRL+C para parar
```

### 3. Abrir no Navegador

Acesse: **http://localhost:5000**

## 📊 Elementos do Dashboard

### Header
- **Saldo da Conta**: Mostra o saldo atual em demo
- **Lucro Diário**: Lucro/Prejuízo do dia
- **Taxa de Vitória**: Percentual de operações vencedoras
- **Status**: Mostra se está conectado/desconectado

### Gráfico Principal (1 minuto)
- Visualiza as últimas 20 velas
- Linha verde indicando tendência
- Atualiza automaticamente a cada 30 segundos

### Indicadores Técnicos
- **RCI**: Range Commodity Index (0-100)
- **RSI**: Relative Strength Index (0-100)
- **Média Móvel 5**: Tendência de curto prazo
- **Média Móvel 20**: Tendência de longo prazo

### Sinal Atual
Exibe o último sinal gerado:
- **COMPRA** (↑): Confluência de indicadores para comprar
- **VENDA** (↓): Confluência para vender
- **AGUARDE** (→): Sem confluência clara
- Confiança em percentual (0-100%)
- Força do sinal (FRACO/MODERADO/FORTE)

### Padrões Detectados
Mostra quais padrões foram identificados nas últimas 20 velas:
- ✓ **Torres Gêmeas**: Duas velas de tamanho similar
- ✓ **C3**: Padrão de três velas com indecisão
- ✓ **Padrão 2.3**: Inside bar com breakout
- ✓ **Five Flip**: Reversão na quinta vela

### Histórico de Sinais
Lista todos os sinais gerados, com:
- Tipo de sinal (COMPRA/VENDA/AGUARDE)
- Força do sinal
- Preço quando gerado
- Nível de confiança
- Horário

## 🎮 Controles

### Botão "Analisar Agora"
Força uma análise imediata do gráfico e gera um novo sinal.

### Botão "Atualizar"
Recarrega todos os dados do dashboard.

## 📈 Interpretando os Sinais

### Confiança do Sinal
- **90%+**: Sinal muito confiável, múltiplos indicadores alinhados
- **75-90%**: Sinal confiável, a maioria dos indicadores confirma
- **50-75%**: Sinal moderado, alguns indicadores confirmam
- **<50%**: Sinal fraco, aguarde confluência maior

### Força do Sinal
- **FORTE**: Confluência ≥ 75% + padrão confirmado
- **MODERADO**: Confluência 50-75% + alguma confirmação
- **FRACO**: Confluência < 50%

### Taxa de Vitória
Percentual de operações que foram lucrativas.
- **> 60%**: Excelente
- **50-60%**: Bom
- **< 50%**: Precisa melhorar

## 🔄 Fluxo de Operação

1. Dashboard carrega dados a cada 30 segundos
2. Indicadores são recalculados
3. Padrões são analisados
4. Novo sinal é gerado (se houver confluência)
5. Histórico é atualizado
6. Métricas da conta são atualizadas

## ⚙️ Configurações

Para alterar comportamentos, edite `config.py`:

```python
# Intervalo de análise
ANALYSIS_CONFIG = {
    'screenshot_interval': 60,  # Segundos
}

# Sensibilidade dos padrões
PATTERNS_CONFIG = {
    'torres_gemeas_tolerance': 0.15,
}

# Thresholds de sinais
SIGNAL_CONFIG = {
    'confluence_buy_threshold': 0.75,
    'confluence_sell_threshold': 0.75,
}
```

## 📱 Responsivo

O dashboard funciona em:
- Desktop (1920x1080+)
- Tablet (768px+)
- Mobiles (com layout adaptado)

## 🐛 Troubleshooting

### Erro: "Address already in use"
A porta 5000 já está sendo usada. Solução:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

Ou altere em `dashboard_server.py`:
```python
app.run(debug=True, port=5001, host='localhost')
```

### Dados não carregam
1. Verifique se o servidor está rodando
2. Abra o console do navegador (F12)
3. Veja os erros em "Network" e "Console"

### Gráfico vazio
1. Certifique-se que há dados de preço
2. Recarregue a página (F5)
3. Clique em "Atualizar"

## 🚀 Próximas Melhorias

- [ ] Integração direta com API Avalon
- [ ] Múltiplos pares simultâneos
- [ ] Alertas de telegram/email
- [ ] Sistema de ordens automáticas
- [ ] Backtesting de estratégias
- [ ] Machine Learning para otimizar thresholds

## 📧 Support

Para problemas ou sugestões, verifique:
1. O console do navegador (F12)
2. Os logs do servidor Flask
3. Se todos os arquivos estão presentes

## ⚠️ Aviso Importante

**Este é um sistema EDUCACIONAL de análise técnica.**

- Use em conta DEMO primeiro
- Nunca risque mais do que pode perder
- Valide sinais com análise manual
- A IA não garante resultados

Trading é arriscado. Use com responsabilidade! 💪
