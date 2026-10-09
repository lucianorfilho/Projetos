'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Mic, MicOff, Volume2, RefreshCw } from 'lucide-react';
import { useLearner } from '../../components/Shell';
import { dbspeaker, PronunciationExercise, PronunciationResult } from '../../lib/api';
import { speak, stopSpeaking, createRecognizer } from '../../lib/speech';

export default function PronunciationPage() {
  const { learner, setBalance } = useLearner();
  const [noCredits, setNoCredits] = useState(false);
  const [exercise, setExercise] = useState<PronunciationExercise | null>(null);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const loadExercise = async () => {
    if (!learner) return;
    setResult(null);
    setTranscript('');
    setError('');
    const ex = await dbspeaker.pronunciationExercise(learner.id);
    setExercise(ex);
  };

  useEffect(() => {
    if (learner) loadExercise();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learner]);

  const record = () => {
    if (!exercise || !learner) return;
    setError('');
    setResult(null);
    stopSpeaking();
    const rec = createRecognizer(
      async (text) => {
        setListening(false);
        setTranscript(text);
        if (text) {
          try {
            const r = await dbspeaker.pronunciationAttempt(learner.id, exercise.text, text);
            setResult(r);
            if (r.wallet) setBalance(r.wallet.balance);
          } catch (err) {
            if (err instanceof AxiosError && err.response?.status === 402) {
              setNoCredits(true);
              setBalance(err.response.data.balance ?? 0);
            } else {
              setError('Não consegui avaliar — verifique o backend.');
            }
          }
        }
      },
      () => setListening(false),
      (err) => {
        setError(err);
        setListening(false);
      }
    );
    if (rec) {
      rec.start();
      setListening(true);
    }
  };

  if (!learner) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Treino de Pronúncia</h1>
          <p className="text-sm text-gray-500">
            Ouça a frase, repita em voz alta e receba nota palavra por palavra — com dicas para brasileiros.
          </p>
        </div>
        <button
          onClick={loadExercise}
          className="flex items-center gap-2 text-sm bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2"
        >
          <RefreshCw size={14} /> Nova frase
        </button>
      </div>

      {noCredits && (
        <div className="mb-4 bg-rose-950 border border-rose-700 text-rose-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-4">
          <span>💸 Seus créditos acabaram! Recarregue para continuar treinando.</span>
          <Link href="/creditos" className="bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 font-semibold whitespace-nowrap">
            Recarregar
          </Link>
        </div>
      )}

      {exercise && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">Frase nível {exercise.level}</span>
            {exercise.focusSounds.map((s) => (
              <span key={s.id} className="text-[10px] bg-gray-800 text-gray-400 rounded-full px-2 py-0.5" title={s.tip}>
                {s.label}
              </span>
            ))}
          </div>

          <p className="text-2xl font-semibold leading-relaxed my-4">
            {result
              ? result.words.map((w, i) => (
                  <span
                    key={i}
                    title={w.heard ? `ouvi: "${w.heard}"` : 'não ouvi esta palavra'}
                    className={
                      w.ok ? 'text-emerald-400' : w.close ? 'text-amber-400 underline decoration-dotted' : 'text-rose-400 underline'
                    }
                  >
                    {w.word}{' '}
                  </span>
                ))
              : exercise.text}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => speak(exercise.text, 0.85)}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2.5 text-sm"
            >
              <Volume2 size={16} className="text-sky-400" /> Ouvir
            </button>
            <button
              onClick={record}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                listening ? 'bg-rose-600 animate-pulse' : 'bg-sky-600 hover:bg-sky-500'
              }`}
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
              {listening ? 'Ouvindo… fale agora!' : 'Repetir a frase'}
            </button>
          </div>

          {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
          {transcript && !result && <p className="text-gray-500 text-sm mt-3">Ouvi: “{transcript}”</p>}
        </div>
      )}

      {result && (
        <div className="mt-6 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center gap-6">
            <div
              className={`text-4xl font-black ${
                result.score >= 90 ? 'text-emerald-400' : result.score >= 75 ? 'text-sky-400' : result.score >= 55 ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {result.score}
            </div>
            <div>
              <p className="font-semibold">{result.verdict}</p>
              <p className="text-sm text-gray-500 mt-0.5">O que eu ouvi: “{transcript}”</p>
            </div>
          </div>

          {result.tips.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-amber-300 mb-3">🎯 Dicas de pronúncia para você</h2>
              <div className="space-y-3">
                {result.tips.map((t) => (
                  <div key={t.id}>
                    <p className="text-sm font-semibold text-amber-200">{t.label}</p>
                    <p className="text-sm text-gray-300">{t.tip}</p>
                    <div className="flex gap-2 mt-1.5 flex-wrap">
                      {t.practiceWords.map((w) => (
                        <button
                          key={w}
                          onClick={() => speak(w, 0.8)}
                          className="text-xs bg-gray-800 hover:bg-gray-700 rounded-full px-2.5 py-1 flex items-center gap-1"
                        >
                          <Volume2 size={10} /> {w}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
