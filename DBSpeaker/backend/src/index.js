const express = require('express');
const cors = require('cors');
const config = require('./config');
const api = require('./routes/api');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

app.listen(config.port, () => {
  console.log(`[dbspeaker] backend rodando em http://localhost:${config.port}`);
  console.log(`[dbspeaker] motor de diálogo: ${config.engine}${config.engine === 'claude' ? ` (${config.model})` : ' (adicione ANTHROPIC_API_KEY no .env para ativar o modo Claude)'}`);
});
