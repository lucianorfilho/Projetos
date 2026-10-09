'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { dbspeaker, Learner, brl } from '../lib/api';

const NAV = [
  { href: '/', label: 'Conversação' },
  { href: '/pronuncia', label: 'Pronúncia' },
  { href: '/vocabulario', label: 'Vocabulário' },
  { href: '/perfil', label: 'Meu Perfil' },
  { href: '/creditos', label: 'Créditos' },
];

interface LearnerCtx {
  learner: Learner | null;
  setLearner: (l: Learner | null) => void;
  refreshLearner: () => void;
  balance: number | null;
  setBalance: (b: number) => void;
}

const Ctx = createContext<LearnerCtx>({
  learner: null,
  setLearner: () => {},
  refreshLearner: () => {},
  balance: null,
  setBalance: () => {},
});
export const useLearner = () => useContext(Ctx);

export function CefrBadge({ cefr, score }: { cefr: string; score?: number }) {
  const colors: Record<string, string> = {
    A1: 'bg-gray-700 text-gray-200',
    A2: 'bg-sky-900 text-sky-200',
    B1: 'bg-emerald-900 text-emerald-200',
    B2: 'bg-violet-900 text-violet-200',
    C1: 'bg-amber-900 text-amber-200',
    C2: 'bg-rose-900 text-rose-200',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${colors[cefr] || colors.A1}`}>
      {cefr}
      {score !== undefined && <span className="ml-1 font-normal opacity-70">{score.toFixed(1)}</span>}
    </span>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshLearner = () => {
    if (!learner) return;
    dbspeaker.learner(learner.name).then(setLearner).catch(() => {});
  };

  useEffect(() => {
    if (learner) dbspeaker.wallet(learner.id).then((w) => setBalance(w.balance)).catch(() => {});
  }, [learner]);

  useEffect(() => {
    const saved = localStorage.getItem('dbspeaker_name');
    if (saved) {
      dbspeaker
        .learner(saved)
        .then((l) => setLearner(l))
        .catch(() => setError('Backend indisponível — inicie o servidor na porta 4300.'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const enter = async () => {
    if (!name.trim()) return;
    setError('');
    try {
      const l = await dbspeaker.learner(name.trim());
      localStorage.setItem('dbspeaker_name', l.name);
      setLearner(l);
    } catch {
      setError('Não consegui falar com o backend (porta 4300). Ele está rodando?');
    }
  };

  return (
    <Ctx.Provider value={{ learner, setLearner, refreshLearner, balance, setBalance }}>
      <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-8">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-sky-400">DBSpeaker</span>
            <span className="text-xs text-gray-500">by dbtech solutions</span>
          </div>
          <nav className="flex gap-1 text-sm">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  pathname === n.href ? 'bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          {learner && (
            <div className="ml-auto flex items-center gap-3">
              <span className="text-sm text-gray-400">{learner.name}</span>
              <CefrBadge cefr={learner.cefr} score={learner.level_score} />
              {balance !== null && (
                <Link
                  href="/creditos"
                  title="Seus créditos — clique para recarregar"
                  className={`text-xs font-bold rounded-full px-2.5 py-1 border transition-colors ${
                    balance <= 50
                      ? 'bg-rose-950 border-rose-700 text-rose-300 animate-pulse'
                      : 'bg-emerald-950 border-emerald-800 text-emerald-300 hover:border-emerald-600'
                  }`}
                >
                  💰 {brl(balance)}
                </Link>
              )}
              <button
                onClick={() => {
                  localStorage.removeItem('dbspeaker_name');
                  setLearner(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                sair
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <p className="text-gray-500">Carregando…</p>
        ) : learner ? (
          children
        ) : (
          <div className="max-w-md mx-auto mt-20 text-center">
            <h1 className="text-3xl font-bold mb-2">
              Welcome to <span className="text-sky-400">DBSpeaker</span>! 👋
            </h1>
            <p className="text-gray-400 mb-8">
              Converse em inglês com uma IA que corrige você, percebe o seu nível e aprofunda a conversa conforme você evolui.
            </p>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enter()}
                placeholder="Como você se chama?"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={enter}
                className="bg-sky-600 hover:bg-sky-500 rounded-lg px-6 py-3 font-semibold transition-colors"
              >
                Começar
              </button>
            </div>
            {error && <p className="text-rose-400 text-sm mt-4">{error}</p>}
          </div>
        )}
      </main>
    </Ctx.Provider>
  );
}
