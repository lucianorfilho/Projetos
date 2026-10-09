'use client';

import { useCallback, useEffect, useState } from 'react';
import api, { KnowledgeEntry } from '@/lib/api';
import { Card } from '@/components/ui';

type Suggestion = {
  object_name: string;
  column_name: string | null;
  business_name: string | null;
  description: string | null;
  tags: string | null;
  reason: string;
};

export default function KnowledgePage() {
  const [databaseId, setDatabaseId] = useState<number | null>(null);
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [suggestionsList, setSuggestionsList] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    object_name: '', column_name: '', business_name: '', description: '', tags: '',
  });

  const load = useCallback(async (dbId: number) => {
    const [{ data }, { data: sugg }] = await Promise.all([
      api.get<KnowledgeEntry[]>(`/api/databases/${dbId}/knowledge`),
      api.get<Suggestion[]>(`/api/databases/${dbId}/suggestions`),
    ]);
    setEntries(data);
    setSuggestionsList(sugg);
  }, []);

  const accept = async (s: Suggestion) => {
    if (!databaseId) return;
    await api.put(`/api/databases/${databaseId}/knowledge`, {
      object_name: s.object_name,
      column_name: s.column_name,
      business_name: s.business_name,
      description: s.description,
      tags: s.tags,
      author: 'dbscanner-sugestao',
    });
    await load(databaseId);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: dbs } = await api.get('/api/databases');
        if (dbs.length) {
          setDatabaseId(dbs[0].id);
          await load(dbs[0].id);
        }
      } catch { /* backend fora */ }
      setLoading(false);
    })();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!databaseId || !form.object_name) return;
    await api.put(`/api/databases/${databaseId}/knowledge`, {
      object_name: form.object_name,
      column_name: form.column_name || null,
      business_name: form.business_name || null,
      description: form.description || null,
      tags: form.tags || null,
    });
    setForm({ object_name: '', column_name: '', business_name: '', description: '', tags: '' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load(databaseId);
  };

  const remove = async (id: number) => {
    await api.delete(`/api/knowledge/${id}`);
    if (databaseId) await load(databaseId);
  };

  if (loading) return <div className="text-gray-500">Carregando…</div>;

  const input = 'w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Base de Conhecimento</h1>
        <p className="mt-1 max-w-3xl text-sm text-gray-500">
          Registre o significado de negócio de tabelas e colunas. Essas anotações sobrevivem entre
          scans, aumentam o índice de conhecimento do banco e aparecem na tela de cada tabela.
        </p>
      </div>

      {suggestionsList.length > 0 && (
        <Card className="border-emerald-500/30">
          <h2 className="font-semibold text-emerald-400">
            Sugestões do DBScanner ({suggestionsList.length})
          </h2>
          <p className="mt-1 mb-4 text-sm text-gray-500">
            Aprendidas a partir das suas anotações, dos relacionamentos e dos scans anteriores.
            Aceite para incorporar à base de conhecimento — cada aceite gera novas sugestões.
          </p>
          <div className="space-y-3">
            {suggestionsList.map((s, i) => (
              <div key={i} className="flex items-start justify-between gap-4 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                <div>
                  <span className="font-mono text-sm text-emerald-400">
                    {s.object_name}{s.column_name ? `.${s.column_name}` : ''}
                  </span>
                  {s.business_name && <span className="ml-2 font-medium">{s.business_name}</span>}
                  {s.description && <p className="mt-1 text-sm text-gray-300">{s.description}</p>}
                  <p className="mt-1 text-xs text-gray-500">💡 {s.reason}</p>
                </div>
                <button onClick={() => accept(s)}
                  className="shrink-0 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-colors">
                  Aceitar
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="mb-4 font-semibold">Nova anotação</h2>
        <form onSubmit={save} className="grid gap-3 lg:grid-cols-2">
          <input className={input} placeholder="Tabela (ex.: CLIENTES) *" required
            value={form.object_name} onChange={(e) => setForm({ ...form, object_name: e.target.value })} />
          <input className={input} placeholder="Coluna (opcional — vazio = tabela inteira)"
            value={form.column_name} onChange={(e) => setForm({ ...form, column_name: e.target.value })} />
          <input className={input} placeholder="Nome de negócio (ex.: Cadastro de Clientes)"
            value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          <input className={input} placeholder="Tags (ex.: financeiro,critico,lgpd)"
            value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <textarea className={`${input} lg:col-span-2`} rows={3}
            placeholder="Descrição: o que significa, regras de negócio, cuidados…"
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex items-center gap-3 lg:col-span-2">
            <button type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 font-semibold text-white hover:bg-emerald-500 transition-colors">
              Salvar
            </button>
            {saved && <span className="text-sm text-emerald-400">Anotação salva ✓</span>}
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold">Anotações ({entries.length})</h2>
        {entries.length === 0 && <p className="text-sm text-gray-500">Nenhuma anotação ainda.</p>}
        {entries.map((k) => (
          <Card key={k.id} className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-emerald-400">
                  {k.object_name}{k.column_name ? `.${k.column_name}` : ''}
                </span>
                {k.business_name && <span className="font-medium">{k.business_name}</span>}
                {k.tags && k.tags.split(',').map((t) => (
                  <span key={t} className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{t.trim()}</span>
                ))}
              </div>
              {k.description && <p className="mt-1 text-sm text-gray-400">{k.description}</p>}
              <p className="mt-1 text-xs text-gray-600">Atualizado em {k.updated_at}</p>
            </div>
            <button onClick={() => remove(k.id)}
              className="shrink-0 text-xs text-gray-600 hover:text-red-400 transition-colors">
              remover
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
