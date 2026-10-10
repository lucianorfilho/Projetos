'use client';

import { useEffect, useState } from 'react';
import { Users, RefreshCw, CheckCircle, XCircle, Clock, ChevronRight, Trash2, Zap, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function AdminPage() {
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState<number | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHealth() {
    setHealthLoading(true);
    try {
      const res = await api.get('/admin/system-health');
      setHealth(res.data);
    } catch (err) {
      setHealth({ status: 'down', asaas_reachable: false, asaas_error: 'Não foi possível consultar o status' });
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadHealth();
    const interval = setInterval(loadHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  async function approve(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setActing(id);
    try {
      await api.post(`/clients/${id}/approve`);
      await load();
    } finally { setActing(null); }
  }

  async function suspend(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setActing(id);
    try {
      await api.post(`/clients/${id}/suspend`);
      await load();
    } finally { setActing(null); }
  }

  async function reactivate(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setActing(id);
    try {
      await api.post(`/clients/${id}/reactivate`);
      await load();
    } finally { setActing(null); }
  }

  async function remove(e: React.MouseEvent, id: number, name: string) {
    e.stopPropagation();
    if (!confirm(`Excluir permanentemente "${name}"? Todos os arquivos no armazenamento serÃ£o apagados. Esta aÃ§Ã£o nÃ£o pode ser desfeita.`)) return;
    setActing(id);
    try {
      await api.delete(`/clients/${id}`);
      await load();
    } finally { setActing(null); }
  }

  const filtered  = filter === 'all' ? clients : clients.filter(c => c.status === filter);
  const pending   = clients.filter(c => c.status === 'pending').length;
  const active    = clients.filter(c => c.status === 'active').length;
  const inactive  = clients.filter(c => c.status === 'inactive').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AdministraÃ§Ã£o</h1>
          <p className="text-gray-400 text-sm mt-1">GestÃ£o de clientes e aprovaÃ§Ãµes</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {!healthLoading && health && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
          health.asaas_reachable
            ? 'bg-green-500/5 border-green-500/20'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          {health.asaas_reachable ? (
            <Zap className="w-5 h-5 text-green-400 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${health.asaas_reachable ? 'text-green-400' : 'text-red-400'}`}>
              Integração Asaas {health.asaas_reachable ? 'OK' : 'fora do ar'}
            </p>
            <p className="text-xs text-gray-500">
              {health.asaas_reachable
                ? `Respondendo normalmente (${health.asaas_latency_ms}ms) · ${health.total_pending} fatura(s) aguardando`
                : health.asaas_error}
            </p>
          </div>
          {health.last_webhook && (
            <p className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
              Último webhook: {formatDate(health.last_webhook)}
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Aguardando AprovaÃ§Ã£o</p>
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-3xl font-bold text-yellow-400">{pending}</p>
        </div>
        <div className="bg-gray-900 border border-green-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Clientes Ativos</p>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-3xl font-bold text-green-400">{active}</p>
        </div>
        <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-sm">Suspensos</p>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-3xl font-bold text-red-400">{inactive}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'pending', label: 'Pendentes' },
          { key: 'active', label: 'Ativos' },
          { key: 'inactive', label: 'Suspensos' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Users className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhum cliente encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {filtered.map((client: any) => (
              <div key={client.id}
                onClick={() => router.push(`/admin/${client.id}`)}
                className="flex items-center gap-4 p-4 hover:bg-gray-800/50 transition cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {client.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{client.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-gray-500 text-xs">{client.email}</p>
                    {client.phone && <p className="text-gray-600 text-xs">{client.phone}</p>}
                    {client.company && <p className="text-gray-600 text-xs">{client.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">{client.server_count ?? 0} servidores</p>
                    <p className="text-xs text-gray-600">{formatDate(client.created_at)}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                    client.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    client.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {client.status === 'active' ? 'Ativo' : client.status === 'pending' ? 'Pendente' : 'Suspenso'}
                  </span>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {client.status === 'pending' && (
                      <button onClick={e => approve(e, client.id)} disabled={acting === client.id}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs rounded-lg transition">
                        {acting === client.id ? '...' : 'Aprovar'}
                      </button>
                    )}
                    {client.status === 'active' && (
                      <button onClick={e => suspend(e, client.id)} disabled={acting === client.id}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded-lg transition">
                        {acting === client.id ? '...' : 'Suspender'}
                      </button>
                    )}
                    {client.status === 'inactive' && (
                      <button onClick={e => reactivate(e, client.id)} disabled={acting === client.id}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs rounded-lg transition">
                        {acting === client.id ? '...' : 'Reativar'}
                      </button>
                    )}
                    <button onClick={e => remove(e, client.id, client.name)} disabled={acting === client.id}
                      title="Excluir cliente"
                      className="p-1.5 bg-gray-800 hover:bg-red-900/50 disabled:opacity-50 text-gray-400 hover:text-red-400 text-xs rounded-lg transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
