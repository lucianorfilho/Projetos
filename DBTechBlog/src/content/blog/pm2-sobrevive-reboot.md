---
title: 'Fazer processos PM2 sobreviverem a um reboot da VPS'
description: 'pm2 start sozinho não é suficiente — sem "pm2 save", o processo some depois do próximo reboot.'
pubDate: 'Oct 09 2026'
category: 'Monitoramento'
---

O PM2 só re-inicia automaticamente, depois de um reboot do servidor, os processos que estavam
salvos na última chamada de `pm2 save`. Se você rodou `pm2 start` manualmente e nunca salvou, o
processo volta a não existir após o próximo boot — mesmo que ele estivesse "online" havia meses.

```bash
# depois de iniciar (ou reiniciar) qualquer processo:
pm2 start ecosystem.config.js
pm2 save

# conferir o que está salvo para resurrect automático:
cat ~/.pm2/dump.pm2 | grep -o '"name":"[^"]*"'

# garantir que o pm2 tem um serviço systemd registrado no boot (só 1x por servidor):
pm2 startup systemd
```

Sintoma típico desse problema: a VPS caiu ou foi desligada por um tempo, voltou, e só *parte* das
aplicações está no ar — exatamente as que foram salvas por último.
