# ⚙️ Configuração do MetaTrader5 (MT5) - DBTrader

## 🕐 **IMPORTANTE: Timezone**

### **Status Atual**
- **Servidor MT5 (Avalon):** UTC+3 (ou 6 horas à frente de Brasília)
- **Brasília Local:** GMT-3
- **Diferença:** +6 horas

### **Sincronização de Horário**

Os timestamps capturados do MT5 estão **6 horas à frente** do horário de Brasília.

**Exemplo:**
- Hora Real em Brasília: 14:00 (2 PM)
- Hora no MT5: 20:00 (8 PM)

### **Como Ajustar nos Gráficos**

Se precisar sincronizar com o horário de Brasília, subtraia 6 horas dos timestamps:

```javascript
// Exemplo de conversão
const mtTime = 1723040400;  // Timestamp do MT5
const brasiliaTime = mtTime - (6 * 3600);  // Subtrai 6 horas
```

### **Arquivos Afetados**

- `mt5-client.py` - Captura timestamps diretos do MT5 (sem conversão)
- `avalon-client.js` - Retorna timestamps conforme recebido do MT5
- `public/index.html` - Exibe horários conforme MT5 (UTC+3)

---

## 🔧 **Configuração do Servidor MT5**

### **Conexão**
- **Servidor:** Avalon (MetaQuotes-Demo ou Avalon-Live)
- **Usuario:** 110710565
- **Timezone:** UTC+3 (6 horas à frente de GMT-3)

### **Dados Capturados**

**M5 Candlesticks (5 minutos):**
- Symbol: EURUSD, GBPUSD, USDJPY, etc.
- Timeframe: M5 (5 minutos)
- Limit: 60 candles padrão
- Timestamp: UTC+3 (conforme servidor MT5)

---

## 📋 **Checklist**

- [x] MT5 instalado e rodando
- [x] Conectado ao servidor Avalon
- [x] Python MetaTrader5 biblioteca instalada
- [x] Script mt5-client.py funcionando
- [x] DBTrader capturando dados M5
- [x] **⚠️ Timezone: +6 horas (UTC+3)**

---

## 📝 **Notas Importantes**

1. **Timestamps:** Todos os horários nos gráficos estão em UTC+3
2. **Auto-refresh:** A cada 60 segundos, os dados são atualizados do MT5
3. **Dados Reais:** Os candlesticks são 100% reais do broker Avalon
4. **Sem Delay:** Os dados são capturados em tempo real (sujeito ao timezone do servidor)

---

## 🚀 **Próximas Ações**

Se precisar sincronizar com horário de Brasília:
1. Adicionar conversão de timezone na função JavaScript
2. Ou adicionar flag `--timezone=Brazil` ao script Python
3. Ou documentar claramente que os horários estão em UTC+3
