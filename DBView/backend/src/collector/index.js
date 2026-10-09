// Loop de coleta: percorre todas as instâncias do runtime (carregadas do
// banco), alimentando o histórico e o motor de alertas de cada uma.

const config = require('../config');
const registry = require('../instances');

const EXTRAS_INTERVAL_MS = 60 * 1000;

async function tickInstance(inst) {
  if (inst.collecting) return;
  inst.collecting = true;
  try {
    const sample = await inst.source.collectSample();
    inst.store.addSample(sample);

    if (!inst.lastExtrasAt || Date.now() - inst.lastExtrasAt > EXTRAS_INTERVAL_MS) {
      const extras = await inst.source.collectExtras();
      inst.store.setExtras(extras);
      inst.lastExtrasAt = Date.now();
    }

    inst.alerts.evaluate(sample, inst.store.getExtras(), inst.store.getBaseline());
    inst.lastError = null;
  } catch (err) {
    inst.lastError = err.message;
    console.error(`[collector:${inst.id}] erro na coleta: ${err.message}`);
  } finally {
    inst.collecting = false;
  }
}

function tick() {
  for (const inst of registry.all()) tickInstance(inst);
}

function start() {
  console.log(`[collector] ${registry.count()} instância(s) — intervalo: ${config.collectInterval}s`);
  tick();
  setInterval(tick, config.collectInterval * 1000);
}

module.exports = { start };
