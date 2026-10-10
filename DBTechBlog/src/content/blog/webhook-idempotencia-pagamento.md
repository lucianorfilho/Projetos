---
title: 'Webhook de pagamento: sempre tratar reentrega (idempotência)'
description: 'Provedores de pagamento reenviam o mesmo evento de webhook em caso de timeout — sem controle de idempotência, isso duplica cobrança ou liberação.'
pubDate: 'Oct 09 2026'
category: 'Banco de Dados'
---

Provedores como Asaas reenviam um evento de webhook se não receberem uma resposta 200 a tempo — o
que significa que o mesmo evento (ex.: "pagamento confirmado") pode chegar mais de uma vez.
Processar duas vezes sem controle pode liberar espaço em dobro, mandar e-mail duplicado, etc.

```sql
-- tabela de controle, com unique constraint no id do evento
CREATE TABLE webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50),
  event_id VARCHAR(255) UNIQUE,
  event_type VARCHAR(100),
  payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```js
// no handler: tenta inserir o evento ANTES de processar.
// se der erro de duplicado, já foi processado — responde 200 e não reprocessa.
try {
  await execute(
    'INSERT INTO webhook_events (provider, event_id, event_type, payload) VALUES (?, ?, ?, ?)',
    [provider, eventId, eventType, JSON.stringify(body)]
  );
} catch (err) {
  if (err.code === 'ER_DUP_ENTRY') return res.status(200).json({ message: 'Evento já processado' });
  throw err;
}
```

Outra prática importante: sempre validar um token/assinatura do provedor no header antes de
processar qualquer coisa (ex. `asaas-access-token`), e responder 200 mesmo quando o processamento
interno falha — para o provedor não entrar num loop de retentativas por um erro que já ficou
registrado para investigação manual.
