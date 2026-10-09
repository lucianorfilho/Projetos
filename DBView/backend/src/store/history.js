// Histórico em memória por instância (ring buffer) + buffer ASH.
// createStore() devolve um armazenamento independente para cada banco.

const MAX_SAMPLES = 4 * 60 * 12; // 4h @ 5s
const MAX_MINUTES = 24 * 60;
const MAX_ASH = 4 * 60 * 12; // 4h de ticks ASH

function createStore() {
  const samples = [];
  const minutes = [];
  const ashTicks = []; // { ts, cpuCores, byClass, sql, sessions }

  let latest = null;
  let latestExtras = null;

  // Baseline: média móvel exponencial — detecta comportamento fora do padrão
  const baseline = { aas: null, cpuPct: null, activeSessions: null, avgWaitMs: null };
  const ALPHA = 0.02;

  function updateBaseline(key, value) {
    if (value == null || Number.isNaN(value)) return;
    baseline[key] = baseline[key] == null ? value : baseline[key] * (1 - ALPHA) + value * ALPHA;
  }

  function addSample(sample) {
    latest = sample;
    samples.push(sample);
    if (samples.length > MAX_SAMPLES) samples.shift();

    if (sample.ash) {
      ashTicks.push({ ts: sample.ts, ...sample.ash });
      if (ashTicks.length > MAX_ASH) ashTicks.shift();
    }

    updateBaseline('aas', sample.load.aas);
    updateBaseline('cpuPct', sample.load.cpuPct);
    updateBaseline('activeSessions', sample.sessions.active);
    updateBaseline('avgWaitMs', sample.load.avgWaitMs);

    const minuteTs = Math.floor(sample.ts / 60000) * 60000;
    const last = minutes[minutes.length - 1];
    if (last && last.ts === minuteTs) {
      last.n += 1;
      last.aas += (sample.load.aas - last.aas) / last.n;
      last.cpuPct += (sample.load.cpuPct - last.cpuPct) / last.n;
      last.activeSessions = Math.max(last.activeSessions, sample.sessions.active);
      last.totalSessions = Math.max(last.totalSessions, sample.sessions.total);
      last.execPerSec += (sample.load.execPerSec - last.execPerSec) / last.n;
      last.avgWaitMs += (sample.load.avgWaitMs - last.avgWaitMs) / last.n;
    } else {
      minutes.push({
        ts: minuteTs, n: 1,
        aas: sample.load.aas, cpuPct: sample.load.cpuPct,
        activeSessions: sample.sessions.active, totalSessions: sample.sessions.total,
        execPerSec: sample.load.execPerSec, avgWaitMs: sample.load.avgWaitMs,
      });
      if (minutes.length > MAX_MINUTES) minutes.shift();
    }
  }

  return {
    addSample,
    setExtras: (extras) => { latestExtras = { ...latestExtras, ...extras, ts: Date.now() }; },
    getLatest: () => latest,
    getExtras: () => latestExtras,
    getBaseline: () => ({ ...baseline }),
    getRecentSamples: (n = 360) => samples.slice(-n),
    getMinuteSeries: (n = 180) => minutes.slice(-n),
    getAshWindow: (minutesBack = 30) => {
      const cutoff = Date.now() - minutesBack * 60000;
      return ashTicks.filter((t) => t.ts >= cutoff);
    },
  };
}

module.exports = { createStore };
