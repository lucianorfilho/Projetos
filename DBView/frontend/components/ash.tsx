'use client';

// Gráfico Top Activity (estilo Enterprise Manager / ASH): sessões ativas
// empilhadas por classe de espera, linha de CPU máxima, e painéis de
// Top SQL / Top Sessions com barras segmentadas por classe.

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import api from '@/lib/api';
import { formatTime } from '@/lib/utils';
import { Card, Spinner } from '@/components/ui';

// Paleta inspirada no Enterprise Manager
export const ASH_COLORS: Record<string, string> = {
  'CPU': '#16a34a',
  'Scheduler': '#86efac',
  'User I/O': '#2563eb',
  'System I/O': '#38bdf8',
  'Concurrency': '#881337',
  'Application': '#dc2626',
  'Commit': '#f97316',
  'Configuration': '#78350f',
  'Administrative': '#57534e',
  'Network': '#a8a29e',
  'Queueing': '#6b7280',
  'Cluster': '#e5e7eb',
  'Other': '#ec4899',
};

function SegmentedBar({ byClassPct, widthPct }: { byClassPct: Record<string, number>; widthPct: number }) {
  return (
    <div className="h-4 bg-gray-800/60 rounded-sm overflow-hidden w-36 flex-shrink-0">
      <div className="h-full flex" style={{ width: `${Math.max(2, widthPct)}%` }}>
        {Object.entries(byClassPct).map(([cls, pct]) => (
          <div key={cls} title={`${cls}: ${pct}%`} className="h-full"
            style={{ width: `${pct}%`, background: ASH_COLORS[cls] ?? ASH_COLORS.Other }} />
        ))}
      </div>
    </div>
  );
}

function SolidBar({ widthPct, color = '#06b6d4' }: { widthPct: number; color?: string }) {
  return (
    <div className="h-4 bg-gray-800/60 rounded-sm overflow-hidden w-36 flex-shrink-0">
      <div className="h-full" style={{ width: `${Math.max(2, widthPct)}%`, background: color }} />
    </div>
  );
}

const RANGES = [
  { minutes: 15, label: '15 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 h' },
  { minutes: 240, label: '4 h' },
];

export default function AshPanel({ instanceId }: { instanceId: string }) {
  const [data, setData] = useState<any>(null);
  const [minutes, setMinutes] = useState(30);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/ash?minutes=${minutes}`);
        if (mounted) setData(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId, minutes]);

  if (!data) return <Card title="Top Activity (ASH)"><Spinner /></Card>;

  const series = data.series.map((p: any) => ({ ...p, time: formatTime(p.ts) }));
  const maxSqlPct = Math.max(1, ...data.topSql.map((s: any) => s.activityPct));
  const maxSessPct = Math.max(1, ...data.topSessions.map((s: any) => s.activityPct));

  return (
    <div className="space-y-4">
      <Card
        title="Top Activity — sessões ativas por classe de espera"
        action={
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button key={r.minutes} onClick={() => setMinutes(r.minutes)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                  minutes === r.minutes ? 'bg-cyan-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        }>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} minTickGap={50} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }}
                  label={{ value: 'Sessões Ativas', angle: -90, position: 'insideLeft', fill: '#6b7280', fontSize: 11 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '8px', fontSize: 12 }} />
                {data.classes.map((cls: string) => (
                  <Area key={cls} type="monotone" dataKey={cls} stackId="ash"
                    stroke={ASH_COLORS[cls] ?? ASH_COLORS.Other}
                    fill={ASH_COLORS[cls] ?? ASH_COLORS.Other}
                    fillOpacity={0.85} strokeWidth={0.5} dot={false} isAnimationActive={false} />
                ))}
                {data.cpuCores && (
                  <ReferenceLine y={data.cpuCores} stroke="#f87171" strokeDasharray="6 3"
                    label={{ value: `CPU máx (${data.cpuCores} cores)`, fill: '#f87171', fontSize: 11, position: 'insideTopRight' }} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex lg:flex-col flex-wrap gap-x-4 gap-y-1.5 lg:w-36 flex-shrink-0 lg:justify-center">
            {[...data.classes].reverse().map((cls: string) => (
              <div key={cls} className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: ASH_COLORS[cls] ?? ASH_COLORS.Other }} />
                {cls}
              </div>
            ))}
            {data.cpuCores && (
              <div className="flex items-center gap-2 text-xs text-red-400">
                <span className="w-3 h-0.5 flex-shrink-0 border-t-2 border-dashed border-red-400" />
                CPU máx
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Top SQL">
          {data.topSql.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Sem atividade no período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Atividade %</th>
                    <th className="text-left pb-2 font-medium">SQL ID</th>
                    <th className="text-left pb-2 font-medium">Tipo</th>
                    <th className="text-left pb-2 font-medium">SQL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.topSql.map((s: any) => (
                    <tr key={s.sqlId} className="hover:bg-gray-800/50 transition">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <SegmentedBar byClassPct={s.byClassPct} widthPct={(s.activityPct / maxSqlPct) * 100} />
                          <span className="text-gray-300 text-xs whitespace-nowrap">{s.activityPct}%</span>
                        </div>
                      </td>
                      <td className="py-2 text-cyan-400 font-mono text-xs">{s.sqlId}</td>
                      <td className="py-2 text-gray-400 text-xs">{s.type ?? '—'}</td>
                      <td className="py-2 text-gray-500 font-mono text-[11px] max-w-[240px] truncate" title={s.text}>{s.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Top Sessões">
          {data.topSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Sem atividade no período</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="text-left pb-2 font-medium">Atividade %</th>
                    <th className="text-left pb-2 font-medium">SID</th>
                    <th className="text-left pb-2 font-medium">Usuário</th>
                    <th className="text-left pb-2 font-medium">Programa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {data.topSessions.map((s: any) => (
                    <tr key={s.sid} className="hover:bg-gray-800/50 transition">
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <SolidBar widthPct={(s.activityPct / maxSessPct) * 100} />
                          <span className="text-gray-300 text-xs whitespace-nowrap">{s.activityPct}%</span>
                        </div>
                      </td>
                      <td className="py-2 text-white font-medium">{s.sid}</td>
                      <td className="py-2 text-gray-300">{s.username}</td>
                      <td className="py-2 text-gray-400 text-xs">{s.program}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
