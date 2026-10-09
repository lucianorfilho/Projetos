const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./catalog');
const api = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

// Seed: em modo demo garante um database de demonstração cadastrado
if (config.mode === 'demo') {
  const existing = db.prepare("SELECT id FROM databases WHERE name = 'ERP Demo'").get();
  if (!existing) {
    db.prepare(
      "INSERT INTO databases (name, vendor, connect_string, target_schema) VALUES ('ERP Demo','oracle','demo','ERP_DEMO')"
    ).run();
  }
}

app.listen(config.port, () => {
  console.log(`DBScanner backend rodando na porta ${config.port} (modo ${config.mode})`);
});
