'use client';

import { useEffect, useState } from 'react';
import { Wallet, Plus, MessageCircle, Mic, Gift } from 'lucide-react';
import { useLearner } from '../../components/Shell';
import { dbspeaker, WalletStatement, brl } from '../../lib/api';

const TOPUP_OPTIONS = [1000, 2000, 5000]; // R$ 10, 20, 50

export default function CreditsPage() {
  const { learner, balance, setBalance } = useLearner();
  const [statement, setStatement] = useState<WalletStatement | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const load = () => {
    if (learner) dbspeaker.wallet(learner.id).then((w) => { setStatement(w); setBalance(w.balance); });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learner]);

  const recharge = async (cents: number) => {
    if (!learner || loading) return;
    setLoading(true);
    setFeedback('');
    try {
      const r = await dbspeaker.topup(learner.id, cents);
      setBalance(r.balance);
      setFeedback(`✅ Recarga de ${brl(cents)} confirmada!`);
      load();
    } catch {
      setFeedback('Não foi possível recarregar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!learner) return null;

  const kindIcon = (kind: string) =>
    kind === 'bonus' ? <Gift size={13} className="text-violet-400" /> :
    kind === 'recarga' ? <Plus size={13} className="text-emerald-400" /> :
    <MessageCircle size={13} className="text-gray-500" />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Wallet size={20} className="text-emerald-400" /> Meus Créditos</h1>
        <p className="text-sm text-gray-500">
          Pague e use: você coloca créditos e consome conforme conversa — sem mensalidade, sem surpresa.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-xs text-gray-500 mb-1">Saldo disponível</p>
          <p className={`text-3xl font-black ${balance !== null && balance <= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {balance !== null ? brl(balance) : '—'}
          </p>
        </div>
        {statement && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><MessageCircle size={12} /> Mensagem de conversa</p>
              <p className="text-xl font-bold">{brl(statement.prices.message)}</p>
              <p className="text-[11px] text-gray-600 mt-1">
                {balance !== null && statement.prices.message > 0
                  ? `≈ ${Math.floor(balance / statement.prices.message)} mensagens restantes`
                  : ''}
              </p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Mic size={12} /> Avaliação de pronúncia</p>
              <p className="text-xl font-bold">{brl(statement.prices.pronunciation)}</p>
              <p className="text-[11px] text-gray-600 mt-1">
                {balance !== null && statement.prices.pronunciation > 0
                  ? `≈ ${Math.floor(balance / statement.prices.pronunciation)} treinos restantes`
                  : ''}
              </p>
            </div>
          </>
        )}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-1">Recarregar</h2>
        <p className="text-xs text-gray-500 mb-4">
          Escolha um valor. <span className="text-amber-400">MVP: crédito imediato para testes — a integração com pagamento (Pix/cartão) entra na próxima fase.</span>
        </p>
        <div className="flex gap-3 flex-wrap">
          {TOPUP_OPTIONS.map((cents) => (
            <button
              key={cents}
              onClick={() => recharge(cents)}
              disabled={loading}
              className="bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 rounded-xl px-6 py-3 font-bold transition-colors"
            >
              + {brl(cents)}
            </button>
          ))}
        </div>
        {feedback && <p className="text-sm mt-3 text-emerald-300">{feedback}</p>}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold mb-3">Extrato</h2>
        {!statement || statement.transactions.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {statement.transactions.map((t, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm bg-gray-950 border border-gray-800 rounded-lg px-3 py-2">
                {kindIcon(t.kind)}
                <span className="flex-1 text-gray-300">{t.description}</span>
                <span className="text-[11px] text-gray-600">{new Date(t.created_at + 'Z').toLocaleString('pt-BR')}</span>
                <span className={`font-semibold ${t.amount_cents > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {t.amount_cents > 0 ? '+' : ''}{brl(t.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
