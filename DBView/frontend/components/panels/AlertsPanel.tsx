'use client';

import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Card, AlertItem, SeverityBadge, Spinner } from '@/components/ui';

const CATEGORIES: Record<string, string> = {
  sessions: 'Sessões', performance: 'Performance', security: 'Segurança',
  storage: 'Armazenamento', config: 'Configuração',
};

export default function AlertsPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/alerts`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card title={`Alertas ativos (${data.active.length})`}>
        {data.active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm gap-2">
            <CheckCircle className="w-8 h-8 text-green-500" />
            Nenhum alerta ativo neste banco
          </div>
        ) : (
          <div className="space-y-3">
            {data.active.map((a: any) => <AlertItem key={a.key} alert={a} />)}
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
                  <th className="text-left pb-3 font-medium">Severidade</th>
                  <th className="text-left pb-3 font-medium">Categoria</th>
                  <th className="text-left pb-3 font-medium">Alerta</th>
                  <th className="text-left pb-3 font-medium">Início</th>
                  <th className="text-left pb-3 font-medium">Resolvido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {data.history.map((a: any) => (
                  <tr key={`${a.key}-${a.firedAt}`} className="hover:bg-gray-800/50 transition">
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
