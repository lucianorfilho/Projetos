'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import api, { Insight, Scan } from '@/lib/api';
import { Card, SeverityBadge, CategoryBadge, fmtNum } from '@/components/ui';

type ColumnRow = {
  name: string; position: number; data_type: string; data_length: number | null;
  nullable: number; num_nulls: number | null; num_distinct: number | null;
  comments: string | null; in_pk: number; in_fk: number;
};

type Relation = { from_table: string; from_column: string; to_table: string; to_column: string; kind: string };

type TableDetail = {
  name: string; num_rows: number | null; last_analyzed: string | null;
  comments: string | null; has_pk: number;
  columns: ColumnRow[];
  indexes: { name: string; uniqueness: string; columns: string }[];
  relations: Relation[];
  insights: Insight[];
  knowledge: { object_name: string; column_name: string | null; business_name: string | null; description: string | null }[];
};

export default function TableDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params);
  const [detail, setDetail] = useState<TableDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: scan } = await api.get<Scan>('/api/scans/latest');
        const { data } = await api.get<TableDetail>(`/api/scans/${scan.id}/tables/${name}`);
        setDetail(data);
      } catch { /* not found */ }
      setLoading(false);
    })();
  }, [name]);

  if (loading) return <div className="text-gray-500">Carregando…</div>;
  if (!detail) return <div className="text-gray-500">Tabela não encontrada.</div>;

  const tableKnowledge = detail.knowledge.find((k) => !k.column_name);
  const colKnowledge = new Map(detail.knowledge.filter((k) => k.column_name).map((k) => [k.column_name, k]));

  return (
    <div className="space-y-6">
      <div>
        <Link href="/tables" className="text-sm text-gray-500 hover:text-gray-300">← Tabelas</Link>
        <h1 className="mt-1 font-mono text-2xl font-bold text-emerald-400">{detail.name}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {fmtNum(detail.num_rows)} linhas · {detail.columns.length} colunas
          {detail.last_analyzed && <> · estatísticas de {detail.last_analyzed}</>}
        </p>
        {(tableKnowledge?.business_name || tableKnowledge?.description || detail.comments) && (
          <p className="mt-2 max-w-3xl text-sm text-gray-300">
            {tableKnowledge?.business_name && <strong>{tableKnowledge.business_name} — </strong>}
            {tableKnowledge?.description || detail.comments}
          </p>
        )}
      </div>

      {detail.insights.length > 0 && (
        <Card>
          <h2 className="mb-3 font-semibold">Insights desta tabela</h2>
          <div className="space-y-3">
            {detail.insights.map((i) => (
              <div key={i.id} className="rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SeverityBadge severity={i.severity} />
                  <CategoryBadge category={i.category} />
                  <span className="font-medium">{i.title}</span>
                  {i.column_name && <span className="font-mono text-xs text-gray-500">{i.column_name}</span>}
                </div>
                <p className="mt-1.5 text-sm text-gray-400">{i.detail}</p>
                <p className="mt-1 text-sm text-emerald-400/80">→ {i.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <div className="border-b border-gray-800 px-4 py-3 font-semibold">Colunas</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Coluna</th>
              <th className="px-4 py-2">Tipo</th>
              <th className="px-4 py-2 text-center">Null</th>
              <th className="px-4 py-2 text-right">Distintos</th>
              <th className="px-4 py-2 text-right">Nulos</th>
              <th className="px-4 py-2">Significado</th>
            </tr>
          </thead>
          <tbody>
            {detail.columns.map((c) => (
              <tr key={c.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-2 text-gray-600">{c.position}</td>
                <td className="px-4 py-2 font-mono">
                  {c.name}
                  {c.in_pk ? <span className="ml-2 rounded bg-emerald-500/15 px-1.5 text-xs text-emerald-400">PK</span> : null}
                  {c.in_fk ? <span className="ml-2 rounded bg-sky-500/15 px-1.5 text-xs text-sky-400">FK</span> : null}
                </td>
                <td className="px-4 py-2 font-mono text-gray-400">
                  {c.data_type}{c.data_length ? `(${c.data_length})` : ''}
                </td>
                <td className="px-4 py-2 text-center text-gray-500">{c.nullable ? 'S' : 'N'}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-400">{fmtNum(c.num_distinct)}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-400">{fmtNum(c.num_nulls)}</td>
                <td className="max-w-xs truncate px-4 py-2 text-gray-400">
                  {colKnowledge.get(c.name)?.description || c.comments ||
                    <span className="italic text-gray-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">Relacionamentos</h2>
          {detail.relations.length === 0 && <p className="text-sm text-gray-500">Nenhum relacionamento encontrado.</p>}
          <div className="space-y-2 text-sm">
            {detail.relations.map((r, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-800/40 px-3 py-2 font-mono text-xs">
                <span>{r.from_table}.{r.from_column}</span>
                <span className="text-gray-500">→</span>
                <span>{r.to_table}.{r.to_column}</span>
                {r.kind === 'inferred' && (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-400">inferido (sem FK)</span>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">Índices</h2>
          {detail.indexes.length === 0 && <p className="text-sm text-red-400/80">Nenhum índice nesta tabela.</p>}
          <div className="space-y-2 text-sm">
            {detail.indexes.map((ix) => (
              <div key={ix.name} className="rounded-lg bg-gray-800/40 px-3 py-2 font-mono text-xs">
                {ix.name} <span className="text-gray-500">({ix.columns})</span>
                {ix.uniqueness === 'UNIQUE' && <span className="ml-2 text-emerald-400">UNIQUE</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
