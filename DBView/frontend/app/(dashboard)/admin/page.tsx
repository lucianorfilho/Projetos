'use client';

import { useEffect, useState } from 'react';
import { UserCheck, UserX, Clock, Server } from 'lucide-react';
import api from '@/lib/api';
import { Card, StatCard, Spinner } from '@/components/ui';
import { formatDate } from '@/lib/utils';

function statusBadge(status: string) {
  const map: Record<string, string> = {
    approved: 'bg-green-500/10 text-green-400 border border-green-500/20',
    pending: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    blocked: 'bg-red-500/10 text-red-400 border border-red-500/20',
  };
  return map[status] ?? 'bg-gray-500/10 text-gray-400';
}

const STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado', pending: 'Pendente', blocked: 'Bloqueado',
};

export default function AdminPage() {
  const [data, setData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    try {
      const [c, s] = await Promise.all([api.get('/api/admin/clients'), api.get('/api/admin/summary')]);
      setData(c.data);
      setSummary(s.data);
    } catch { /* sem permissão ou backend subindo */ }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, []);

  async function act(id: number, action: 'approve' | 'block') {
    setBusy(id);
    try {
      await api.post(`/api/admin/clients/${id}/${action}`);
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!data || !summary) return <Spinner />;

  const clients = data.clients;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clientes</h1>
        <p className="text-gray-400 text-sm mt-1">Aprove novos cadastros e gerencie o acesso dos clientes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Aguardando aprovação" color="bg-yellow-500/10 text-yellow-400"
          alert={(summary.clients.pending ?? 0) > 0}
          value={summary.clients.pending ?? 0} sub="novos cadastros" />
        <StatCard icon={UserCheck} label="Clientes ativos" color="bg-green-500/10 text-green-400"
          value={summary.clients.approved ?? 0} sub="aprovados" />
        <StatCard icon={UserX} label="Bloqueados" color="bg-red-500/10 text-red-400"
          value={summary.clients.blocked ?? 0} sub="sem acesso" />
        <StatCard icon={Server} label="Instâncias monitoradas" color="bg-cyan-500/10 text-cyan-400"
          value={summary.instances.total} sub={`${summary.instances.running} coletando agora`} />
      </div>

      <Card title="Todos os clientes">
        {clients.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhum cliente cadastrado ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Cliente</th>
                  <th className="text-left pb-3 font-medium">Empresa</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Instâncias</th>
                  <th className="text-left pb-3 font-medium">Cadastro</th>
                  <th className="text-left pb-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {clients.map((c: any) => (
                  <tr key={c.id} className="hover:bg-gray-800/50 transition">
                    <td className="py-3">
                      <p className="text-white font-medium">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                    </td>
                    <td className="py-3 text-gray-400">{c.company ?? '—'}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(c.status)}`}>
                        {STATUS_LABELS[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{c.instance_count} / {c.max_instances}</td>
                    <td className="py-3 text-gray-500">{formatDate(c.created_at)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {c.status !== 'approved' && (
                          <button onClick={() => act(c.id, 'approve')} disabled={busy === c.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition disabled:opacity-50">
                            Aprovar
                          </button>
                        )}
                        {c.status !== 'blocked' && (
                          <button onClick={() => act(c.id, 'block')} disabled={busy === c.id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition disabled:opacity-50">
                            Bloquear
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
