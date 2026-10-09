'use client';

import { useEffect, useState } from 'react';
import { Database, HardDrive, AlertTriangle } from 'lucide-react';
import api from '@/lib/api';
import { formatMB } from '@/lib/utils';
import { Card, StatCard, Spinner } from '@/components/ui';

function barColor(pct: number) {
  if (pct >= 95) return 'bg-red-500';
  if (pct >= 85) return 'bg-yellow-500';
  return 'bg-cyan-500';
}

export default function StoragePanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/storage`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 15000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!data) return <Spinner />;

  const ts = data.tablespaces ?? [];
  const totalMB = ts.reduce((s: number, t: any) => s + t.sizeMB, 0);
  const usedMB = ts.reduce((s: number, t: any) => s + t.usedMB, 0);
  const critical = ts.filter((t: any) => t.pct >= 85).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Database} label="Espaço total" color="bg-cyan-500/10 text-cyan-400"
          value={formatMB(totalMB)} sub={`${ts.length} tablespaces`} />
        <StatCard icon={HardDrive} label="Em uso" color="bg-purple-500/10 text-purple-400"
          value={formatMB(usedMB)} sub={`${((usedMB / totalMB) * 100 || 0).toFixed(1)}% do total`} />
        <StatCard icon={AlertTriangle} label="Acima de 85%" color="bg-yellow-500/10 text-yellow-400"
          alert={critical > 0} value={critical} sub="precisam de atenção" />
      </div>

      <Card title="Ocupação por tablespace">
        <div className="space-y-4">
          {[...ts].sort((a: any, b: any) => b.pct - a.pct).map((t: any) => (
            <div key={t.name}>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{t.name}</span>
                  {!t.autoextend && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                      SEM AUTOEXTEND
                    </span>
                  )}
                </div>
                <span className="text-gray-400">
                  {formatMB(t.usedMB)} / {formatMB(t.sizeMB)}
                  <span className={`ml-2 font-semibold ${t.pct >= 95 ? 'text-red-400' : t.pct >= 85 ? 'text-yellow-400' : 'text-gray-300'}`}>
                    {t.pct}%
                  </span>
                </span>
              </div>
              <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${barColor(t.pct)}`}
                  style={{ width: `${Math.min(100, t.pct)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
