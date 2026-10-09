require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '4100', 10),
  mode: process.env.DBVIEW_MODE || 'demo',
  plan: process.env.DBVIEW_PLAN || 'pro', // free = 1 instância, pro = várias
  collectInterval: parseInt(process.env.COLLECT_INTERVAL || '5', 10),
  oracle: {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  },
  passwordExpiryWarnDays: parseInt(process.env.PASSWORD_EXPIRY_WARN_DAYS || '15', 10),
  // Limiares dos alertas (percentual de uso sobre o limite do parâmetro)
  thresholds: {
    sessionsWarnPct: 75,
    sessionsCritPct: 90,
    processesWarnPct: 75,
    processesCritPct: 90,
    cursorsWarnPct: 70,
    cursorsCritPct: 85,
    tablespaceWarnPct: 85,
    tablespaceCritPct: 95,
    cpuWarnPct: 80,
    cpuCritPct: 92,
    slowSessionSec: 120,
    // Anomalia: valor atual acima de N vezes a média histórica (baseline)
    anomalyFactor: 2.0,
  },
};
