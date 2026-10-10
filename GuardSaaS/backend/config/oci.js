const axios = require('axios');
const fs = require('fs');
const common = require('oci-common');
const objectstorage = require('oci-objectstorage');

// PAR (Pre-Authenticated Request) da OCI - NUNCA hardcodear aqui: esse valor
// é uma credencial de acesso completa ao bucket. Fica só em OCI_PAR_BASE no .env.
const PAR_BASE = process.env.OCI_PAR_BASE;
if (!PAR_BASE) {
  throw new Error('OCI_PAR_BASE não configurado no .env');
}

const NAMESPACE   = 'grhztes5ppus';
const BUCKET_NAME = 'dbguard-backups';

// Cliente autenticado via API Key da OCI — usado apenas para deletar objetos,
// já que PARs (Pre-Authenticated Requests) não suportam a operação de delete.
let _osClient = null;
function getObjectStorageClient() {
  if (!_osClient) {
    const provider = new common.ConfigFileAuthenticationDetailsProvider();
    _osClient = new objectstorage.ObjectStorageClient({ authenticationDetailsProvider: provider });
  }
  return _osClient;
}

// Codifica cada segmento do caminho (nome de pasta/arquivo), preservando as barras "/"
function encodeObjectPath(objectName) {
  return objectName.split('/').map(encodeURIComponent).join('/');
}

// Upload de arquivo para OCI — via stream, sem carregar o arquivo inteiro na memória
async function uploadToOCI(filePath, objectName) {
  const fileSize   = fs.statSync(filePath).size;
  const fileSizeMB = fileSize / (1024 * 1024);
  const fileStream = fs.createReadStream(filePath);

  await axios.put(`${PAR_BASE}/${encodeObjectPath(objectName)}`, fileStream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileSize
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 600000 // 10 minutos
  });

  return {
    path: `oci://dbguard-backups/${objectName}`,
    sizeMB: fileSizeMB
  };
}

// Deletar objeto via API autenticada da OCI (PARs não suportam delete).
// Lança erro se o OCI recusar, para nunca dar como sucesso uma exclusão que não aconteceu de verdade.
async function deleteObject(objectName) {
  try {
    const client = getObjectStorageClient();
    await client.deleteObject({
      namespaceName: NAMESPACE,
      bucketName: BUCKET_NAME,
      objectName
    });
    return true;
  } catch (err) {
    const status = err.statusCode || err.status;
    const detail = err.message;
    console.error(`Erro ao deletar ${objectName}: HTTP ${status} - ${detail}`);
    throw new Error(`Falha ao apagar arquivo no armazenamento (HTTP ${status || '?'}): ${detail}`);
  }
}

// Gerar URL de download de um objeto
function getDownloadUrl(objectName) {
  return `${PAR_BASE}/${encodeObjectPath(objectName)}`;
}

module.exports = { uploadToOCI, deleteObject, getDownloadUrl };
