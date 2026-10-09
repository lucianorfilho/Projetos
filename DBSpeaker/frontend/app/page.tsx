'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { Mic, MicOff, Send, Volume2, VolumeX, RefreshCw, Sparkles } from 'lucide-react';
import { useLearner, CefrBadge } from '../components/Shell';
import { dbspeaker, Correction, VocabSuggestion, brl } from '../lib/api';
import { speak, stopSpeaking, createRecognizer, speechSupported } from '../lib/speech';

interface ChatMsg {
  role: 'user' | 'assistant';
  text: string;
  corrections?: Correction[];
}

export default function ChatPage() {
  const { learner, refreshLearner, balance, setBalance } = useLearner();
  const [noCredits, setNoCredits] = useState(false);
  const [lastCharge, setLastCharge] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const [vocabTip, setVocabTip] = useState<VocabSuggestion | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [micError, setMicError] = useState('');
  const [engine, setEngine] = useState('');
  const recognizerRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const ttsRef = useRef(true);
  ttsRef.current = ttsOn;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    dbspeaker.engine().then((e) => setEngine(e.engine)).catch(() => {});
  }, []);

  // Recarregou? Libera o chat de novo
  useEffect(() => {
    if (balance !== null && balance > 0) setNoCredits(false);
  }, [balance]);

  const startSession = async () => {
    if (!learner) return;
    stopSpeaking();
    const res = await dbspeaker.chatStart(learner.id);
    setSessionId(res.sessionId);
    setMessages([{ role: 'assistant', text: res.message }]);
    setVocabTip(null);
    setLevelUp(null);
    if (ttsRef.current) setTimeout(() => speak(res.message), 300);
  };

  useEffect(() => {
    if (learner && !sessionId) startSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learner]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !learner || !sessionId || sending) return;
    setInput('');
    setSending(true);
    setMessages((m) => [...m, { role: 'user', text: msg }]);

    try {
      const res = await dbspeaker.chatMessage(learner.id, sessionId, msg);
      setMessages((m) => {
        const copy = [...m];
        // Anexa correções à mensagem do usuário
        copy[copy.length - 1] = { ...copy[copy.length - 1], corrections: res.corrections };
        return [...copy, { role: 'assistant', text: res.reply }];
      });
      if (res.vocabSuggestion) setVocabTip(res.vocabSuggestion);
      if (res.level.leveledUp) {
        setLevelUp(res.level.cefr);
        setTimeout(() => setLevelUp(null), 6000);
      }
      if (res.wallet) {
        setBalance(res.wallet.balance);
        setLastCharge(res.wallet.charged);
        if (res.wallet.balance <= 0) setNoCredits(true);
      }
      refreshLearner();
      if (ttsRef.current) speak(res.reply);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 402) {
        setNoCredits(true);
        setBalance(err.response.data.balance ?? 0);
        setMessages((m) => m.slice(0, -1)); // devolve a mensagem não processada
        setInput(msg);
      } else {
        setMessages((m) => [...m, { role: 'assistant', text: '⚠️ Não consegui responder — verifique o backend.' }]);
      }
    } finally {
      setSending(false);
    }
  };

  const toggleMic = () => {
    setMicError('');
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }
    stopSpeaking();
    const rec = createRecognizer(
      (transcript) => {
        setListening(false);
        if (transcript) send(transcript);
      },
      () => setListening(false),
      (err) => {
        setMicError(err);
        setListening(false);
      }
    );
    if (rec) {
      recognizerRef.current = rec;
      rec.start();
      setListening(true);
    }
  };

  if (!learner) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col h-[calc(100vh-180px)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">Conversação</h1>
            {engine && (
              <span className="text-xs text-gray-500 border border-gray-800 rounded-full px-2 py-0.5">
                motor: {engine === 'claude' ? '✨ Claude' : '🧠 local'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTtsOn(!ttsOn); if (ttsOn) stopSpeaking(); }}
              title={ttsOn ? 'Desativar voz do tutor' : 'Ativar voz do tutor'}
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600"
            >
              {ttsOn ? <Volume2 size={16} className="text-sky-400" /> : <VolumeX size={16} className="text-gray-500" />}
            </button>
            <button
              onClick={startSession}
              title="Nova conversa"
              className="p-2 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-600"
            >
              <RefreshCw size={16} className="text-gray-400" />
            </button>
          </div>
        </div>

        {levelUp && (
          <div className="mb-3 bg-emerald-950 border border-emerald-700 text-emerald-200 rounded-lg px-4 py-2 text-sm animate-pulse">
            🎉 Você subiu de nível! Agora você está no <b>{levelUp}</b> — as conversas vão ficar mais profundas.
          </div>
        )}

        {noCredits && (
          <div className="mb-3 bg-rose-950 border border-rose-700 text-rose-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between gap-4">
            <span>💸 Seus créditos acabaram! Recarregue para continuar conversando com o Alex.</span>
            <Link href="/creditos" className="bg-rose-600 hover:bg-rose-500 rounded-lg px-4 py-2 font-semibold whitespace-nowrap">
              Recarregar
            </Link>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, i) => (
            <div key={i}>
              <div className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user' ? 'bg-sky-700 text-white rounded-br-sm' : 'bg-gray-900 border border-gray-800 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                  {m.role === 'assistant' && (
                    <button onClick={() => speak(m.text)} title="Ouvir" className="ml-2 text-gray-500 hover:text-sky-400 align-middle">
                      <Volume2 size={13} className="inline" />
                    </button>
                  )}
                </div>
              </div>
              {m.corrections && m.corrections.length > 0 && (
                <div className="flex justify-end mt-1.5">
                  <div className="max-w-[85%] space-y-1.5">
                    {m.corrections.map((c, j) => (
                      <div key={j} className="bg-amber-950/60 border border-amber-800/60 rounded-lg px-3 py-2 text-xs">
                        <div>
                          <span className="line-through text-rose-300">{c.original}</span>
                          <span className="mx-1.5 text-gray-500">→</span>
                          <span className="text-emerald-300 font-semibold">{c.corrected}</span>
                        </div>
                        <p className="text-amber-200/80 mt-1">{c.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          {sending && <p className="text-gray-500 text-sm animate-pulse">Alex está digitando…</p>}
          <div ref={bottomRef} />
        </div>

        {micError && <p className="text-rose-400 text-xs mt-2">{micError}</p>}

        <div className="mt-3 flex gap-2">
          <button
            onClick={toggleMic}
            disabled={!speechSupported() && typeof window !== 'undefined'}
            title="Falar em inglês (reconhecimento de voz)"
            className={`p-3 rounded-xl border transition-colors ${
              listening
                ? 'bg-rose-600 border-rose-500 animate-pulse'
                : 'bg-gray-900 border-gray-700 hover:border-sky-500'
            }`}
          >
            {listening ? <MicOff size={20} /> : <Mic size={20} className="text-sky-400" />}
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder={listening ? 'Ouvindo… fale em inglês!' : 'Type in English… or use the mic 🎤'}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={() => send()}
            disabled={sending}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl px-5 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">Seu nível agora</h2>
          <div className="flex items-center gap-3">
            <CefrBadge cefr={learner.cefr} />
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-600 to-emerald-500 transition-all duration-700"
                style={{ width: `${Math.min(((learner.level_score - 1) / 5.99) * 100, 100)}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            O nível é recalculado a cada mensagem: vocabulário, gramática, complexidade e erros.
          </p>
        </div>

        {balance !== null && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-2">💰 Consumo</h2>
            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-black ${balance <= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>{brl(balance)}</span>
              {lastCharge !== null && lastCharge > 0 && (
                <span className="text-xs text-gray-500">última mensagem: −{brl(lastCharge)}</span>
              )}
            </div>
            <Link href="/creditos" className="text-xs text-sky-400 hover:text-sky-300 mt-2 inline-block">
              ver extrato / recarregar →
            </Link>
          </div>
        )}

        {vocabTip && (
          <div className="bg-violet-950/50 border border-violet-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-violet-300 mb-1 flex items-center gap-1.5">
              <Sparkles size={14} /> Palavra nova para você
            </h2>
            <p className="text-lg font-bold">
              {vocabTip.word} <span className="text-xs font-normal text-violet-400">({vocabTip.level})</span>
            </p>
            <p className="text-sm text-gray-400">{vocabTip.pt}</p>
            <p className="text-sm text-gray-300 italic mt-1">“{vocabTip.example}”</p>
            <button onClick={() => speak(vocabTip.example)} className="text-xs text-violet-300 hover:text-violet-200 mt-2 flex items-center gap-1">
              <Volume2 size={12} /> ouvir exemplo
            </button>
            <p className="text-xs text-gray-500 mt-2">Tente usar essa palavra na conversa! 😉</p>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-xs text-gray-500 space-y-1.5">
          <p>💬 <b className="text-gray-400">Fale ou digite em inglês.</b> O Alex responde no seu nível e vai aprofundando.</p>
          <p>✍️ Erros aparecem em cards amarelos com explicação em português.</p>
          <p>🎤 Use o microfone para praticar speaking (Chrome/Edge).</p>
          <p>🔊 O alto-falante liga/desliga a voz do tutor.</p>
        </div>
      </aside>
    </div>
  );
}
