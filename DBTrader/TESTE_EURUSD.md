# 🧪 Teste EURUSD - Validação

## 🎯 Objetivo
Validar se os dados do EURUSD capturados do MT5 correspondem exatamente aos dados vistos no Avalon.

---

## 📋 Checklist de Teste

### ✅ **Passo 1: Preparação**
- [ ] MT5 do Avalon aberto e rodando
- [ ] Servidor DBTrader rodando (`npm start`)
- [ ] Navegador acessando http://localhost:4500

### ✅ **Passo 2: Visualizar EURUSD no DBTrader**
1. Abra http://localhost:4500
2. Verifique que está selecionado:
   - **Tipo:** 🟢 Avalon (REAL)
   - **Símbolo:** EURUSD
   - **Timeframe:** M5 (5 minutos)
3. Clique em **"Atualizar"**

### ✅ **Passo 3: Comparar com MT5**

**No MT5:**
- Abra o gráfico EURUSD M5
- Observe as últimas 5 velas
- Anote os valores: Open, High, Low, Close

**No DBTrader:**
- Observe as mesmas 5 velas
- Compare os valores OHLC

### ✅ **Passo 4: Validação**

| Vela | MT5 Open | DBTrader Open | ✅ Match? |
|------|----------|---------------|----------|
| -1   |   ?      |      ?        |    ?     |
| -2   |   ?      |      ?        |    ?     |
| -3   |   ?      |      ?        |    ?     |
| -4   |   ?      |      ?        |    ?     |
| -5   |   ?      |      ?        |    ?     |

### ✅ **Passo 5: Horários**

**Verifique os horários:**
- ⚠️ MT5 mostra: UTC+3 (6 horas à frente)
- ℹ️ DBTrader mostra: Mesmo horário do MT5
- 📝 Diferença esperada: +6 horas de Brasília

---

## 🔍 **O Que Validar**

### **Preços OHLC**
- [ ] Open matches MT5
- [ ] High matches MT5
- [ ] Low matches MT5
- [ ] Close matches MT5

### **Volume**
- [ ] Volume matches MT5

### **Timestamps**
- [ ] Horários estão em UTC+3
- [ ] Sequência cronológica correta
- [ ] Intervalo de 5 minutos entre velas

### **Sincronização**
- [ ] Dados atualizam a cada refresh
- [ ] Auto-refresh a cada 60 segundos funciona
- [ ] Sem delay notável

---

## 📊 **Exemplo de Teste Bem-Sucedido**

```
MT5 EURUSD M5 (últimas 3 velas):
- 20:50 O:1.1234 H:1.1245 L:1.1220 C:1.1240
- 20:55 O:1.1240 H:1.1250 L:1.1235 C:1.1248
- 21:00 O:1.1248 H:1.1260 L:1.1246 C:1.1255

DBTrader EURUSD M5 (mesmas velas):
- 20:50 O:1.1234 H:1.1245 L:1.1220 C:1.1240 ✅
- 20:55 O:1.1240 H:1.1250 L:1.1235 C:1.1248 ✅
- 21:00 O:1.1248 H:1.1260 L:1.1246 C:1.1255 ✅
```

---

## 🚀 **Se Teste Passar**

✅ Avançar para os outros 9 pares de moedas:
1. GBPUSD
2. USDJPY
3. USDCHF
4. AUDUSD
5. USDCAD
6. NZDUSD
7. EURGBP
8. EURJPY
9. GBPJPY

---

## 🐛 **Se Teste Falhar**

❌ Verificar:
1. MT5 está conectado ao servidor Avalon correto?
2. EURUSD existe no Avalon?
3. Script Python está rodando sem erros?
4. Timezone está configurado corretamente?
5. Horários correspondem (mesmo que estejam 6 horas à frente)?

---

## 📝 **Notas**

- Foco: Apenas EURUSD por enquanto
- Timeframe: M5 (5 minutos)
- Limite: 60 velas
- Timezone: UTC+3 (conforme servidor MT5 Avalon)
