---
title: 'Checklist pós-reboot de uma VPS com múltiplos serviços'
description: 'Depois de queda ou reboot: o que checar, em que ordem, antes de considerar tudo normalizado.'
pubDate: 'Oct 09 2026'
category: 'Monitoramento'
---

- `uptime` — confirma há quanto tempo o servidor está de pé.
- `pm2 list` — compara com o que deveria estar rodando. Qualquer serviço ausente da lista precisa
  ser investigado (não aparece nem como "stopped" — some mesmo).
- `systemctl is-active postgresql mysql nginx` — bancos e proxy reverso voltaram?
- `df -h` e `free -h` — descarta causa de disco cheio ou falta de memória.
- Testar cada domínio com `curl -I` (não só `ping`) — um 502 do Nginx geralmente indica que o
  processo de backend daquele domínio não subiu.
- Abrir no navegador de verdade pelo menos a tela de login de cada sistema — um 200 do curl não
  garante que o front-end carregou os assets certos.

Depois de corrigir: rodar `pm2 save` de novo para o estado atual não se perder no próximo reboot.
