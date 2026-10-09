'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, Server } from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, AlertItem, SeverityBadge, Spinner } from '@/components/ui';

const CATEGORIES: Record<string, string> = {
  sessions: 'Sessões', performance: 'Performance', security: 'Segurança',
  storage: 'Armazenamento', config: 'Configuração',
};

export default function GlobalAlertsPage() {
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get('/api/alerts');
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, []);

  if (!data) return <Spinner />;

  const active = filter === 'all' ? data.active : data.active.filter((a: any) => a.severity === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Alertas</h1>
        <p className="text-gray-400 text-sm mt-1">Tudo que está fora do padrão em todos os seus bancos</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: `Todos (${data.active.length})` },
          { key: 'critical', label: `Críticos (${data.active.filter((a: any) => a.severity === 'critical').length})` },
          { key: 'warning', label: `Atenção (${data.active.filter((a: any) => a.severity === 'warning').length})` },
          { key: 'info', label: `Info (${data.active.filter((a: any) => a.severity === 'info').length})` },
        ].map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
              filter === f.key ? 'bg-cyan-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <Card title="Alertas ativos">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm gap-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            Nenhum alerta ativo nesta categoria
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((a: any) => (
              <div key={`${a.instanceId}-${a.key}`}>
                <Link href={`/db/${a.instanceId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400 hover:text-cyan-300 mb-1">
                  <Server className="w-3 h-3" /> {a.instanceName}
                </Link>
                <AlertItem alert={a} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Histórico — alertas resolvidos">
        {data.history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">Nenhum alerta resolvido ainda</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Banco</th>
                  <th className="text-left pb-3 font-medium">Severidade</th>
                  <th className="text-left pb-3 font-medium">Categoria</th>
                  <th className="text-left pb-3 font-medium">Alerta</th>
                  <th className="text-left pb-3 font-medium">Início</th>
                  <th className="text-left pb-3 font-medium">Resolvido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.history.map((a: any) => (
                  <tr key={`${a.instanceId}-${a.key}-${a.firedAt}`} className="hover:bg-gray-800/50 transition">
                    <td className="py-3">
                      <Link href={`/db/${a.instanceId}`} className="text-cyan-400 hover:text-cyan-300 font-medium">
                        {a.instanceName}
                      </Link>
                    </td>
                    <td className="py-3"><SeverityBadge severity={a.severity} /></td>
                    <td className="py-3 text-gray-400">{CATEGORIES[a.category] ?? a.category}</td>
                    <td className="py-3 text-gray-300">{a.title}</td>
                    <td className="py-3 text-gray-500 whitespace-nowrap">{formatDateTime(a.firedAt)}</td>
                    <td className="py-3 text-green-500/80 whitespace-nowrap">{formatDateTime(a.resolvedAt)}</td>
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
