const express = require('express');
const cors = require('cors');
const config = require('./config');
const registry = require('./instances');
const collector = require('./collector');
const api = require('./routes/api');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const myRoutes = require('./routes/my');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/my', myRoutes);
app.use('/api', api);

app.get('/', (req, res) => res.json({ name: 'DBView API', version: '0.2.0' }));

// Handler de erros: evita derrubar o processo em falhas de rota
app.use((err, req, res, next) => {
  console.error('[api]', err.message);
  res.status(500).json({ error: 'Erro interno' });
});

async function boot() {
  try {
    await registry.loadFromDb();
  } catch (err) {
    console.error(`[boot] não foi possível carregar instâncias do MySQL: ${err.message}`);
    console.error('[boot] o servidor sobe mesmo assim — verifique o .env (DB_HOST/DB_USER/DB_PASSWORD/DB_NAME)');
  }
  collector.start();
  app.listen(config.port, () => {
    console.log(`DBView backend rodando em http://localhost:${config.port}`);
  });
}

boot();
