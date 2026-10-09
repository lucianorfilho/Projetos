'use client';

import { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { useLearner, CefrBadge } from '../../components/Shell';
import { dbspeaker } from '../../lib/api';
import { speak } from '../../lib/speech';

interface VocabRow {
  word: string;
  level: string;
  times_seen: number;
  times_used: number;
  mastered: boolean;
  last_seen: string;
}

export default function VocabularyPage() {
  const { learner } = useLearner();
  const [rows, setRows] = useState<VocabRow[]>([]);

  useEffect(() => {
    if (learner) dbspeaker.vocabulary(learner.id).then(setRows);
  }, [learner]);

  if (!learner) return null;

  const mastered = rows.filter((r) => r.mastered);
  const learning = rows.filter((r) => !r.mastered && r.times_used > 0);
  const seen = rows.filter((r) => r.times_used === 0);

  const Section = ({ title, subtitle, items, accent }: { title: string; subtitle: string; items: VocabRow[]; accent: string }) => (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className={`font-semibold ${accent}`}>{title} <span className="text-gray-500 font-normal">({items.length})</span></h2>
      <p className="text-xs text-gray-500 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Nada aqui ainda — continue conversando!</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((r) => (
            <button
              key={r.word}
              onClick={() => speak(r.word, 0.8)}
              title={`usada ${r.times_used}x · nível ${r.level} · clique para ouvir`}
              className="group flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 rounded-full px-3 py-1.5 text-sm"
            >
              {r.word}
              <span className="text-[10px] text-gray-500">{r.level}</span>
              <Volume2 size={11} className="text-gray-600 group-hover:text-sky-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Meu Vocabulário</h1>
          <p className="text-sm text-gray-500">Palavras que você encontrou e usou nas conversas. Use 3x para dominar.</p>
        </div>
        <CefrBadge cefr={learner.cefr} score={learner.level_score} />
      </div>
      <Section title="✅ Dominadas" subtitle="Você já usou 3 vezes ou mais" items={mastered} accent="text-emerald-400" />
      <Section title="📈 Em progresso" subtitle="Você já usou, mas ainda está fixando" items={learning} accent="text-sky-400" />
      <Section title="👀 Apresentadas" subtitle="O tutor sugeriu — tente usar na próxima conversa" items={seen} accent="text-violet-400" />
    </div>
  );
}
