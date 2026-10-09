'use client';

import { useEffect, useState } from 'react';
import { KeyRound, UserX, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Card, StatCard, Spinner } from '@/components/ui';

function statusBadge(status: string) {
  if (status === 'OPEN') return 'bg-green-500/10 text-green-400 border border-green-500/20';
  if (status.includes('EXPIRED')) return 'bg-red-500/10 text-red-400 border border-red-500/20';
  if (status === 'LOCKED') return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
  return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
}

function expiryColor(days: number | null) {
  if (days == null) return 'text-gray-500';
  if (days <= 5) return 'text-red-400 font-semibold';
  if (days <= 15) return 'text-yellow-400 font-medium';
  return 'text-gray-400';
}

export default function SecurityPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/security`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!data) return <Spinner />;

  const users = data.users ?? [];
  const expiringSoon = users.filter((u: any) => u.daysToExpiry != null && u.daysToExpiry <= data.warnDays && u.daysToExpiry >= 0);
  const problematic = users.filter((u: any) => u.accountStatus !== 'OPEN');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={KeyRound} label="Senhas expirando" color="bg-yellow-500/10 text-yellow-400"
          alert={expiringSoon.some((u: any) => u.daysToExpiry <= 5)}
          value={expiringSoon.length} sub={`nos próximos ${data.warnDays} dias`} />
        <StatCard icon={UserX} label="Contas com problema" color="bg-red-500/10 text-red-400"
          alert={problematic.length > 0}
          value={problematic.length} sub="expiradas ou bloqueadas" />
        <StatCard icon={ShieldAlert} label="Contas monitoradas" color="bg-cyan-500/10 text-cyan-400"
          value={users.length} sub="usuários não-Oracle" />
      </div>

      <Card title="Usuários do banco">
        {users.length === 0 ? (
          <div className="text-center py-10 text-gray-500 text-sm">Nenhum usuário para exibir</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left pb-3 font-medium">Usuário</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                  <th className="text-left pb-3 font-medium">Profile</th>
                  <th className="text-left pb-3 font-medium">Senha expira em</th>
                  <th className="text-left pb-3 font-medium">Dias restantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {users.map((u: any) => (
                  <tr key={u.username} className="hover:bg-gray-800/50 transition">
                    <td className="py-3 text-white font-medium">{u.username}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(u.accountStatus)}`}>
                        {u.accountStatus}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400">{u.profile}</td>
                    <td className="py-3 text-gray-400">{u.expiryDate ? formatDate(u.expiryDate) : '—'}</td>
                    <td className={`py-3 ${expiryColor(u.daysToExpiry)}`}>
                      {u.daysToExpiry != null ? `${u.daysToExpiry} dia(s)` : '—'}
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
