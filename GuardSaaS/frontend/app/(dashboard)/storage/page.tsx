'use client';

import { useEffect, useState, useRef } from 'react';
import { HardDrive, Trash2, Download, RefreshCw, FileArchive, AlertTriangle, Upload } from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatBytes } from '@/lib/utils';

export default function StoragePage() {
  const [quota, setQuota]   = useState<any>(null);
  const [files, setFiles]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [savingRetention, setSavingRetention] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadETA, setUploadETA] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTimeRef = useRef<number>(0);
  const uploadBytesRef = useRef<number>(0);

  async function load() {
    setLoading(true);
    try {
      const [quotaRes, filesRes, retentionRes] = await Promise.all([
        api.get('/storage/quota'),
        api.get('/storage/files'),
        api.get('/storage/retention').catch(() => ({ data: { retention_days: 30 } }))
      ]);
      setQuota(quotaRes.data);
      setFiles(filesRes.data);
      setRetentionDays(retentionRes.data.retention_days || 30);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB por chunk

  async function uploadFileChunked(file: File) {
    setUploading(true);
    setUploadProgress(0);
    uploadStartTimeRef.current = Date.now();
    uploadBytesRef.current = 0;

    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileHash = await calculateFileHash(file);

      // Fazer upload de cada chunk
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunk_index', i.toString());
        formData.append('total_chunks', totalChunks.toString());
        formData.append('file_name', file.name);
        formData.append('file_hash', fileHash);
        formData.append('chunk_size_mb', (chunk.size / (1024 * 1024)).toString());

        const startChunkTime = Date.now();
        await api.post('/agent/upload/chunked', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt: any) => {
            const chunkProgress = evt.loaded;
            uploadBytesRef.current = start + chunkProgress;
            const totalProgress = (uploadBytesRef.current / file.size) * 100;
            setUploadProgress(Math.min(totalProgress, 99));

            // Calcular velocidade (bytes/segundo)
            const elapsedMs = Date.now() - uploadStartTimeRef.current;
            const speedMBps = (uploadBytesRef.current / (1024 * 1024)) / (elapsedMs / 1000);
            setUploadSpeed(speedMBps);

            // Calcular ETA
            const remainingBytes = file.size - uploadBytesRef.current;
            const etaSeconds = remainingBytes / (uploadBytesRef.current / (elapsedMs / 1000));
            setUploadETA(etaSeconds);
          }
        });
      }

      setUploadProgress(100);
      await load(); // Recarregar lista de arquivos
      alert('Arquivo enviado com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadFileChunked(file);
  }

  async function handleRetentionChange(days: number) {
    setSavingRetention(true);
    try {
      await api.post('/storage/retention', { retention_days: days });
      setRetentionDays(days);
      alert('RetenÃ§Ã£o atualizada com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao atualizar retenÃ§Ã£o');
    } finally {
      setSavingRetention(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDownload(id: number, fileName: string) {
    setDownloading(id);
    try {
      const res = await api.get(`/storage/files/${id}/download`);
      window.open(res.data.url, '_blank');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao gerar link de download');
    } finally {
      setDownloading(null);
    }
  }

  async function handleDelete(id: number, fileName: string) {
    if (!confirm(`Remover o arquivo "${fileName}"? Esta aÃ§Ã£o nÃ£o pode ser desfeita.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/storage/files/${id}`);
      await load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover arquivo');
    } finally {
      setDeleting(null);
    }
  }

  const usedPct = parseFloat(quota?.limits?.used_pct || '0');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Storage</h1>
          <p className="text-gray-400 text-sm mt-1">Gerencie seus arquivos de backup</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm transition disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />Upload
          </button>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
            <RefreshCw className="w-4 h-4" />Atualizar
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Card de quota */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <HardDrive className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">Storage</p>
                  <p className="text-gray-500 text-xs">Plano: {quota?.plan?.name || 'Free'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">
                  {formatBytes(quota?.usage?.totalMB || 0)}
                </p>
                <p className="text-gray-500 text-xs">
                  de {quota?.limits?.storage_gb}GB ({quota?.limits?.used_pct}% usado)
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  usedPct >= 90 ? 'bg-red-500' :
                  usedPct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usedPct, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500">
              <span>{files.length} arquivo(s) em armazenamento</span>
              <span>{formatBytes((quota?.limits?.storage_gb * 1024) - (quota?.usage?.totalMB || 0))} disponÃ­vel</span>
            </div>

            {usedPct >= 90 && (
              <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">
                  Storage quase cheio ({quota?.limits?.used_pct}%). Considere fazer upgrade do plano.
                </p>
              </div>
            )}
          </div>

          {/* Card de progresso de upload */}
          {uploading && (
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 border border-blue-800 rounded-2xl p-5">
              <h3 className="text-base font-semibold text-white mb-4">Fazendo upload...</h3>

              {/* Barra de progresso */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">{uploadProgress.toFixed(1)}%</span>
                  <span className="text-gray-400 text-xs">{formatBytes(uploadBytesRef.current)} enviados</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>

              {/* Informações de velocidade e ETA */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 text-xs mb-1">Velocidade</p>
                  <p className="text-white font-medium">{uploadSpeed.toFixed(2)} MB/s</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Tempo restante</p>
                  <p className="text-white font-medium">
                    {uploadETA > 3600
                      ? `${Math.floor(uploadETA / 3600)}h ${Math.floor((uploadETA % 3600) / 60)}m`
                      : uploadETA > 60
                      ? `${Math.floor(uploadETA / 60)}m ${Math.floor(uploadETA % 60)}s`
                      : `${Math.floor(uploadETA)}s`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de arquivos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-4">Arquivos de Backup</h2>

            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <FileArchive className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhum arquivo de backup ainda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file: any) => (
                  <div key={file.id} className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <FileArchive className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{file.file_name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-gray-500 text-xs">{formatBytes(file.file_size_mb)}</span>
                        <span className="text-gray-600 text-xs">â€¢</span>
                        <span className="text-gray-500 text-xs">{formatDate(file.created_at)}</span>
                        {file.job_name && (
                          <>
                            <span className="text-gray-600 text-xs">â€¢</span>
                            <span className="text-gray-500 text-xs">{file.job_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(file.id, file.file_name)}
                        disabled={downloading === file.id}
                        title="Baixar arquivo"
                        className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(file.id, file.file_name)}
                        disabled={deleting === file.id}
                        title="Excluir arquivo"
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info do plano */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-white mb-3">Detalhes do Plano</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-6">
              <div>
                <p className="text-gray-500 text-xs mb-1">Plano atual</p>
                <p className="text-white font-medium">{quota?.plan?.name}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Storage total</p>
                <p className="text-white font-medium">{quota?.limits?.storage_gb} GB</p>
              </div>
            </div>

            {/* ConfiguraÃ§Ã£o de retenÃ§Ã£o */}
            <div className="border-t border-gray-800 pt-4">
              <p className="text-gray-500 text-xs mb-3">Dias de RetenÃ§Ã£o de Backups</p>
              <div className="flex gap-2">
                {[3, 7, 30].map((days) => (
                  <button
                    key={days}
                    onClick={() => handleRetentionChange(days)}
                    disabled={savingRetention}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      retentionDays === days
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    } disabled:opacity-50`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Arquivos mais antigos que {retentionDays} dias serÃ£o automaticamente removidos.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
