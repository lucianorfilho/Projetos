'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { Insight } from '@/lib/api';
import { Card, SeverityBadge, CategoryBadge, fmtNum } from '@/components/ui';

type Evolution = {
  scans: number;
  baseline?: { scanId: number; at: string };
  compared?: {
    current: { scanId: number; at: string };
    previous: { scanId: number; at: string };
  };
  schema?: {
    addedTables: string[];
    removedTables: string[];
    addedColumns: string[];
    removedColumns: string[];
    growth: { table: string; before: number; after: number; delta: number }[];
  };
  insights?: {
    new: Insight[];
    resolved: Insight[];
    recurringCount: number;
  };
  history: { scanId: number; at: string; tables: number | null; insights: number; knowledgeIndex: number | null }[];
};

export default function EvolutionPage() {
  const [evo, setEvo] = useState<Evolution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: dbs } = await api.get('/api/databases');
        if (dbs.length) {
          const { data } = await api.get<Evolution>(`/api/databases/${dbs[0].id}/evolution`);
          setEvo(data);
        }
      } catch { /* backend fora */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-gray-500">Carregando…</div>;
  if (!evo || evo.scans === 0) return <div className="text-gray-500">Nenhum scan executado ainda.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Evolução</h1>
        <p className="mt-1 text-sm text-gray-500">
          {evo.compared
            ? <>Comparando o scan #{evo.compared.current.scanId} ({evo.compared.current.at}) com o anterior #{evo.compared.previous.scanId} ({evo.compared.previous.at}).</>
            : 'Apenas um scan até agora — rode um novo scan no Dashboard para o DBScanner começar a comparar snapshots.'}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">Histórico de scans</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2">Scan</th>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2 text-right">Tabelas</th>
                <th className="px-3 py-2 text-right">Insights</th>
                <th className="px-3 py-2 text-right">Índice de conhecimento</th>
              </tr>
            </thead>
            <tbody>
              {[...evo.history].reverse().map((h) => (
                <tr key={h.scanId} className="border-b border-gray-800/50">
                  <td className="px-3 py-2 font-mono">#{h.scanId}</td>
                  <td className="px-3 py-2 text-gray-400">{h.at}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(h.tables)}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtNum(h.insights)}</td>
                  <td className="px-3 py-2 text-right font-mono">
                    {h.knowledgeIndex != null ? `${h.knowledgeIndex}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {evo.compared && evo.schema && evo.insights && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Mudanças no schema</h2>
              {evo.schema.addedTables.length === 0 && evo.schema.removedTables.length === 0 &&
               evo.schema.addedColumns.length === 0 && evo.schema.removedColumns.length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma mudança estrutural entre os dois últimos scans.</p>
              )}
              <div className="space-y-1.5 text-sm font-mono">
                {evo.schema.addedTables.map((t) => (
                  <div key={t} className="text-emerald-400">+ tabela {t}</div>
                ))}
                {evo.schema.removedTables.map((t) => (
                  <div key={t} className="text-red-400">− tabela {t}</div>
                ))}
                {evo.schema.addedColumns.map((c) => (
                  <div key={c} className="text-emerald-400/80">+ coluna {c}</div>
                ))}
                {evo.schema.removedColumns.map((c) => (
                  <div key={c} className="text-red-400/80">− coluna {c}</div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Crescimento das tabelas</h2>
              {evo.schema.growth.length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma variação de volume registrada (estatísticas iguais).</p>
              )}
              <div className="space-y-2 text-sm">
                {evo.schema.growth.map((g) => (
                  <div key={g.table} className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2">
                    <Link href={`/tables/${g.table}`} className="font-mono text-emerald-400 hover:underline">{g.table}</Link>
                    <span className="font-mono text-xs text-gray-400">
                      {fmtNum(g.before)} → {fmtNum(g.after)}{' '}
                      <span className={g.delta > 0 ? 'text-amber-400' : 'text-sky-400'}>
                        ({g.delta > 0 ? '+' : ''}{fmtNum(g.delta)})
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">
                Insights novos <span className="text-sm font-normal text-gray-500">({evo.insights.new.length} · {evo.insights.recurringCount} recorrentes)</span>
              </h2>
              {evo.insights.new.length === 0 && <p className="text-sm text-gray-500">Nenhum problema novo — bom sinal.</p>}
              <div className="space-y-2">
                {evo.insights.new.map((i) => (
                  <div key={i.id} className="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={i.severity} />
                      <CategoryBadge category={i.category} />
                      <span>{i.title}</span>
                    </div>
                    {i.object_name && (
                      <div className="mt-1 font-mono text-xs text-gray-500">
                        {i.object_name}{i.column_name ? `.${i.column_name}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">
                Insights resolvidos <span className="text-sm font-normal text-gray-500">({evo.insights.resolved.length})</span>
              </h2>
              {evo.insights.resolved.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum insight do scan anterior foi resolvido ainda.</p>
              )}
              <div className="space-y-2">
                {evo.insights.resolved.map((i) => (
                  <div key={i.id} className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-emerald-400">✓</span>
                      <CategoryBadge category={i.category} />
                      <span className="text-gray-300">{i.title}</span>
                    </div>
                    {i.object_name && (
                      <div className="mt-1 font-mono text-xs text-gray-500">
                        {i.object_name}{i.column_name ? `.${i.column_name}` : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
