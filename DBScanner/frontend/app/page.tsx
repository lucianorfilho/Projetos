'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api, { Scan } from '@/lib/api';
import { Card, Stat, SeverityBadge, CATEGORY_LABELS, fmtNum } from '@/components/ui';

export default function Dashboard() {
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Scan>('/api/scans/latest');
      setScan(data);
    } catch {
      setScan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const { data: dbs } = await api.get('/api/databases');
      if (!dbs.length) throw new Error('Nenhum banco cadastrado');
      await api.post(`/api/databases/${dbs[0].id}/scan`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao executar o scan');
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <div className="text-gray-500">Carregando…</div>;

  const m = scan?.summary?.metrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {scan
              ? <>Último scan: <span className="text-gray-300">{scan.database_name}</span> ({scan.summary?.schema}) em {scan.finished_at} — {scan.summary?.version}</>
              : 'Nenhum scan executado ainda. Rode o primeiro para radiografar o schema.'}
          </p>
        </div>
        <button onClick={runScan} disabled={scanning}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors">
          {scanning ? 'Escaneando…' : 'Executar Scan'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {m && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Tabelas" value={fmtNum(m.totalTables)} hint={`${fmtNum(m.totalColumns)} colunas`} />
            <Stat label="Relacionamentos" value={fmtNum(m.totalRelations)}
              hint={m.inferredRelations > 0 ? `+${m.inferredRelations} inferidos sem FK` : 'todos com constraint'} />
            <Stat label="Índice de conhecimento" value={`${m.knowledgeIndex}%`}
              hint={`documentação: ${m.docCoverage}% · ${m.knowledgeEntries} anotações`}
              accent={m.knowledgeIndex >= 70 ? 'text-emerald-400' : m.knowledgeIndex >= 30 ? 'text-amber-400' : 'text-red-400'} />
            <Stat label="Dados sensíveis (LGPD)" value={fmtNum(m.sensitiveColumns)}
              hint="colunas com dado pessoal" accent={m.sensitiveColumns > 0 ? 'text-red-400' : 'text-emerald-400'} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Insights por severidade</h2>
              <div className="space-y-2">
                {(['alta', 'media', 'baixa', 'info'] as const).map((sev) => (
                  <div key={sev} className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2">
                    <SeverityBadge severity={sev} />
                    <span className="font-mono text-lg">{m.bySeverity[sev] || 0}</span>
                  </div>
                ))}
              </div>
              <Link href="/insights" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
                Ver todos os insights →
              </Link>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold">Insights por categoria</h2>
              <div className="space-y-2">
                {Object.entries(m.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
                  <div key={cat} className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-2">
                    <span className="text-sm text-gray-300">{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-mono text-lg">{count}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {scan?.summary?.otherObjects && (
            <Card>
              <h2 className="mb-3 font-semibold">Outros objetos do schema</h2>
              <div className="flex flex-wrap gap-3 text-sm">
                {Object.entries(scan.summary.otherObjects).map(([type, count]) => (
                  <span key={type} className="rounded-lg bg-gray-800/60 px-3 py-1.5">
                    <span className="text-gray-400">{type}:</span>{' '}
                    <span className="font-mono">{count}</span>
                  </span>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
