'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useLearner, CefrBadge } from '../../components/Shell';
import { dbspeaker, Correction } from '../../lib/api';

interface Profile {
  learner: { name: string; cefr: string; level_score: number; created_at: string };
  levelHistory: { score: number; cefr: string; created_at: string }[];
  weakPoints: { category: string; n: number }[];
  totals: {
    messages: number;
    corrections: number;
    pronunciationAttempts: number;
    pronunciationAvg: number | null;
    wordsLearned: number;
    wordsSeen: number;
  };
}

const CEFR_LINES = [
  { y: 2, label: 'A2' },
  { y: 3, label: 'B1' },
  { y: 4, label: 'B2' },
  { y: 5, label: 'C1' },
  { y: 6, label: 'C2' },
];

export default function ProfilePage() {
  const { learner } = useLearner();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [corrections, setCorrections] = useState<(Correction & { created_at: string })[]>([]);

  useEffect(() => {
    if (!learner) return;
    dbspeaker.profile(learner.id).then(setProfile);
    dbspeaker.correctionsLog(learner.id).then(setCorrections);
  }, [learner]);

  if (!learner || !profile) return <p className="text-gray-500">Carregando…</p>;

  const chartData = profile.levelHistory.map((h, i) => ({ i: i + 1, score: Number(h.score.toFixed(2)), cefr: h.cefr }));

  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Perfil de {profile.learner.name}</h1>
          <p className="text-sm text-gray-500">O DBSpeaker acompanha sua evolução mensagem a mensagem.</p>
        </div>
        <CefrBadge cefr={profile.learner.cefr} score={profile.learner.level_score} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="mensagens trocadas" value={profile.totals.messages} />
        <Stat label="correções recebidas" value={profile.totals.corrections} />
        <Stat label="treinos de pronúncia" value={profile.totals.pronunciationAttempts} />
        <Stat label="nota média pronúncia" value={profile.totals.pronunciationAvg ?? '—'} />
        <Stat label="palavras dominadas" value={`${profile.totals.wordsLearned}/${profile.totals.wordsSeen}`} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-4">📈 Evolução do nível</h2>
        {chartData.length < 2 ? (
          <p className="text-sm text-gray-600">Converse mais para ver sua curva de evolução!</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <XAxis dataKey="i" stroke="#4b5563" fontSize={11} label={{ value: 'mensagens', position: 'insideBottom', dy: 8, fontSize: 11, fill: '#6b7280' }} />
              <YAxis domain={[1, 7]} stroke="#4b5563" fontSize={11} ticks={[1, 2, 3, 4, 5, 6, 7]} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8 }}
                formatter={(value, _name, item) => {
                  const cefr = (item as { payload?: { cefr?: string } })?.payload?.cefr ?? '';
                  return [`${value} (${cefr})`, 'nível'];
                }}
              />
              {CEFR_LINES.map((l) => (
                <ReferenceLine key={l.label} y={l.y} stroke="#1f2937" strokeDasharray="4 4" label={{ value: l.label, position: 'right', fontSize: 10, fill: '#4b5563' }} />
              ))}
              <Line type="monotone" dataKey="score" stroke="#38bdf8" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">🎯 Pontos a melhorar</h2>
          {profile.weakPoints.length === 0 ? (
            <p className="text-sm text-gray-600">Nenhum erro registrado ainda. Impressionante! 👏</p>
          ) : (
            <div className="space-y-2">
              {profile.weakPoints.map((w) => (
                <div key={w.category} className="flex items-center gap-3">
                  <span className="text-sm capitalize flex-1">{w.category}</span>
                  <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${Math.min((w.n / (profile.weakPoints[0]?.n || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{w.n}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold mb-3">📝 Últimas correções</h2>
          {corrections.length === 0 ? (
            <p className="text-sm text-gray-600">Nada por aqui ainda.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {corrections.slice(0, 12).map((c, i) => (
                <div key={i} className="text-xs bg-gray-950 border border-gray-800 rounded-lg px-3 py-2">
                  <span className="line-through text-rose-300">{c.original}</span>
                  <span className="mx-1.5 text-gray-600">→</span>
                  <span className="text-emerald-300">{c.corrected}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
