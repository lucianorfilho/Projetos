'use client';

import { useEffect, useState } from 'react';
import { Archive, RefreshCw, ChevronDown, File } from 'lucide-react';
import api from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils';

interface LastFile {
  id: number;
  file_name: string;
  file_size_mb: number;
  created_at: string;
}

interface ClientOverview {
  id: number;
  name: string;
  email: string;
  company: string | null;
  status: string;
  plan_name: string;
  storage_limit_gb: number;
  used_mb: number;
  used_pct: number;
  file_count: number;
  last_files: LastFile[];
}

function barColor(pct: number) {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-yellow-500';
  return 'bg-blue-500';
}

export default function BackupsPage() {
  const [clients, setClients] = useState<ClientOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/admin/backups-overview');
      setClients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Backups</h1>
          <p className="text-gray-400 text-sm mt-1">Armazenamento usado por cliente</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col items-center justify-center h-48 text-gray-500">
          <Archive className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">Nenhum cliente cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((c) => {
            const isOpen = expanded === c.id;
            return (
              <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-800/40 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">{c.name}</p>
                      <span className="text-xs text-gray-500">{c.plan_name}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">{c.email}</p>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor(c.used_pct)}`}
                          style={{ width: `${Math.max(c.used_pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatBytes(c.used_mb)} / {c.storage_limit_gb} GB
                        {' · '}{c.used_pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-gray-800 p-5 pt-4">
                    <p className="text-xs text-gray-500 mb-3">
                      Últimos arquivos ({c.file_count} no total)
                    </p>
                    {c.last_files.length === 0 ? (
                      <p className="text-gray-500 text-sm">Nenhum arquivo enviado ainda</p>
                    ) : (
                      <div className="space-y-2">
                        {c.last_files.map((f) => (
                          <div
                            key={f.id}
                            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <span className="text-white text-sm truncate">{f.file_name}</span>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-gray-400 text-xs">{formatBytes(f.file_size_mb)}</span>
                              <span className="text-gray-500 text-xs">{formatDate(f.created_at)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
