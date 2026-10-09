'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import api, { Insight, Scan } from '@/lib/api';
import { Card, SeverityBadge, CategoryBadge, SEVERITY_LABELS, CATEGORY_LABELS } from '@/components/ui';

export default function InsightsPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: scan } = await api.get<Scan>('/api/scans/latest');
        const { data } = await api.get<Insight[]>(`/api/scans/${scan.id}/insights`);
        setInsights(data);
      } catch { /* sem scan */ }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () => insights.filter((i) => (!severity || i.severity === severity) && (!category || i.category === category)),
    [insights, severity, category]);

  const categories = useMemo(() => [...new Set(insights.map((i) => i.category))], [insights]);

  if (loading) return <div className="text-gray-500">Carregando…</div>;
  if (!insights.length) return <div className="text-gray-500">Nenhum insight. Rode um scan no Dashboard.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Insights <span className="text-base font-normal text-gray-500">({filtered.length})</span></h1>

      <div className="flex flex-wrap gap-2 text-sm">
        {(['alta', 'media', 'baixa', 'info'] as const).map((sev) => (
          <button key={sev} onClick={() => setSeverity(severity === sev ? null : sev)}
            className={clsx('rounded-full border px-3 py-1 transition-colors',
              severity === sev ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-gray-700 text-gray-400 hover:border-gray-500')}>
            {SEVERITY_LABELS[sev]}
          </button>
        ))}
        <span className="mx-2 border-l border-gray-800" />
        {categories.map((cat) => (
          <button key={cat} onClick={() => setCategory(category === cat ? null : cat)}
            className={clsx('rounded-full border px-3 py-1 transition-colors',
              category === cat ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-gray-700 text-gray-400 hover:border-gray-500')}>
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((i) => (
          <Card key={i.id}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={i.severity} />
              <CategoryBadge category={i.category} />
              <span className="font-semibold">{i.title}</span>
              {i.object_name && (
                <Link href={`/tables/${i.object_name}`} className="font-mono text-xs text-emerald-400 hover:underline">
                  {i.object_name}{i.column_name ? `.${i.column_name}` : ''}
                </Link>
              )}
            </div>
            <p className="mt-2 text-sm text-gray-400">{i.detail}</p>
            <p className="mt-1 text-sm text-emerald-400/80">→ {i.recommendation}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
