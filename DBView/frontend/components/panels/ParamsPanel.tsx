'use client';

import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import api from '@/lib/api';
import { Card, UsageBar, Spinner } from '@/components/ui';

export default function ParamsPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/params`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 10000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!data) return <Spinner />;

  const withUsage = data.params.filter((p: any) => p.pct != null);
  const others = data.params.filter((p: any) => p.pct == null);
  const recommendations = data.params.filter((p: any) => p.recommendation);

  return (
    <div className="space-y-4">
      {recommendations.length > 0 && (
        <Card title="Recomendações">
          <div className="space-y-3">
            {recommendations.map((p: any) => (
              <div key={p.name} className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-4">
                <Lightbulb className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white uppercase">{p.name}</p>
                  <p className="text-sm text-cyan-300/90 mt-0.5">{p.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {withUsage.map((p: any) => (
          <Card key={p.name}>
            <p className="text-sm text-gray-400 uppercase font-medium">{p.name}</p>
            <p className="text-3xl font-bold text-white mt-2">
              {p.usage} <span className="text-base font-normal text-gray-500">/ {p.limit}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">{p.pct}% do limite em uso</p>
            <UsageBar pct={p.pct} className="mt-3" />
          </Card>
        ))}
      </div>

      <Card title="Outros parâmetros relevantes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left pb-3 font-medium">Parâmetro</th>
                <th className="text-left pb-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {others.map((p: any) => (
                <tr key={p.name} className="hover:bg-gray-800/50 transition">
                  <td className="py-3 text-white font-mono text-xs">{p.name}</td>
                  <td className="py-3 text-gray-400">{String(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
