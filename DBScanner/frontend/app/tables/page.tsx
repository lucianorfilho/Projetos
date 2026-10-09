'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api, { Scan, TableRow } from '@/lib/api';
import { Card, fmtNum } from '@/components/ui';

export default function TablesPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [scanId, setScanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: scan } = await api.get<Scan>('/api/scans/latest');
        setScanId(scan.id);
        const { data } = await api.get<TableRow[]>(`/api/scans/${scan.id}/tables`);
        setTables(data);
      } catch { /* sem scan ainda */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-gray-500">Carregando…</div>;
  if (!scanId) return <div className="text-gray-500">Nenhum scan executado. Rode um scan no Dashboard.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tabelas <span className="text-base font-normal text-gray-500">({tables.length})</span></h1>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Tabela</th>
              <th className="px-4 py-3 text-right">Linhas</th>
              <th className="px-4 py-3 text-right">Colunas</th>
              <th className="px-4 py-3 text-center">PK</th>
              <th className="px-4 py-3 text-right">Insights</th>
              <th className="px-4 py-3">Comentário</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2.5">
                  <Link href={`/tables/${t.name}`} className="font-mono text-emerald-400 hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-300">{fmtNum(t.num_rows)}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-300">{t.column_count}</td>
                <td className="px-4 py-2.5 text-center">{t.has_pk ? '✓' : <span className="text-red-400">✗</span>}</td>
                <td className="px-4 py-2.5 text-right">
                  {t.insight_count > 0
                    ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">{t.insight_count}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="max-w-xs truncate px-4 py-2.5 text-gray-400">{t.comments || <span className="text-gray-600 italic">sem documentação</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
