'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, Lock, Snail } from 'lucide-react';
import api from '@/lib/api';
import { formatDuration } from '@/lib/utils';
import { Card, StatCard, Spinner } from '@/components/ui';

export default function SessionsPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/sessions`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!data) return <Spinner />;

  const { summary, slowSessions, blocking } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total de Sessões" color="bg-cyan-500/10 text-cyan-400"
          value={summary.total} sub={`limite: ${summary.limit}`} />
        <StatCard icon={Activity} label="Sessões Ativas" color="bg-green-500/10 text-green-400"
          value={summary.active} sub="executando agora" />
        <StatCard icon={Snail} label="Sessões Lentas" color="bg-yellow-500/10 text-yellow-400"
          alert={slowSessions.length >= 3} value={slowSessions.length} sub="ativas há muito tempo" />
        <StatCard icon={Lock} label="Bloqueadas" color="bg-red-500/10 text-red-400"
          alert={blocking.length > 0} value={blocking.length} sub="esperando outra sessão" />
      </div>

      <Card title="Sessões executando há mais tempo que o normal">
        {slowSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhuma sessão lenta no momento ✅</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">SID</th>
                  <th className="text-left pb-3 font-medium">Usuário</th>
                  <th className="text-left pb-3 font-medium">Origem</th>
                  <th className="text-left pb-3 font-medium">Programa</th>
                  <th className="text-left pb-3 font-medium">Tempo ativo</th>
                  <th className="text-left pb-3 font-medium">Evento</th>
                  <th className="text-left pb-3 font-medium">SQL_ID</th>
                  <th className="text-left pb-3 font-medium">SQL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {slowSessions.map((s: any) => (
                  <tr key={`${s.sid}-${s.serial}`} className="hover:bg-gray-800/50 transition">
                    <td className="py-3 text-white font-medium">{s.sid},{s.serial}</td>
                    <td className="py-3 text-gray-300">{s.username}</td>
                    <td className="py-3 text-gray-400">{s.machine}</td>
                    <td className="py-3 text-gray-400">{s.program}</td>
                    <td className="py-3 text-yellow-400 font-medium whitespace-nowrap">{formatDuration(s.elapsedSec)}</td>
                    <td className="py-3 text-gray-400">{s.event}</td>
                    <td className="py-3 text-cyan-400 font-mono text-xs">{s.sqlId}</td>
                    <td className="py-3 text-gray-500 font-mono text-xs max-w-xs truncate">{s.sqlText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Cadeia de bloqueios">
        {blocking.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhuma sessão bloqueada ✅</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Bloqueador</th>
                  <th className="text-left pb-3 font-medium">Bloqueado</th>
                  <th className="text-left pb-3 font-medium">Esperando há</th>
                  <th className="text-left pb-3 font-medium">Evento</th>
                  <th className="text-left pb-3 font-medium">Objeto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {blocking.map((b: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition">
                    <td className="py-3">
                      <span className="text-red-400 font-medium">{b.blockerUser}</span>
                      <span className="text-gray-500 text-xs ml-2">SID {b.blockerSid}</span>
                    </td>
                    <td className="py-3">
                      <span className="text-gray-300">{b.blockedUser}</span>
                      <span className="text-gray-500 text-xs ml-2">SID {b.blockedSid}</span>
                    </td>
                    <td className="py-3 text-yellow-400 font-medium">{formatDuration(b.waitSec)}</td>
                    <td className="py-3 text-gray-400">{b.event}</td>
                    <td className="py-3 text-gray-400 font-mono text-xs">{b.object}</td>
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
