'use client';

import { useEffect, useState } from 'react';
import { Crown, Minus, Plus, Check } from 'lucide-react';
import api from '@/lib/api';
import { Card, Spinner } from '@/components/ui';

export default function PlanPage() {
  const [plan, setPlan] = useState<any>(null);
  const [wanted, setWanted] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const res = await api.get('/api/my/plan');
      setPlan(res.data);
      setWanted((w) => w ?? res.data.maxInstances);
    } catch { /* backend subindo */ }
  }

  useEffect(() => { load(); }, []);

  if (!plan || wanted == null) return <Spinner />;

  const paidWanted = Math.max(0, wanted - plan.freeIncluded);
  const costWanted = paidWanted * plan.pricePerInstance;
  const changed = wanted !== plan.maxInstances;

  async function save() {
    setSaving(true);
    setError('');
    setMsg('');
    try {
      const res = await api.post('/api/my/plan', { maxInstances: wanted });
      setPlan(res.data);
      setMsg('Plano atualizado com sucesso!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao atualizar o plano');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Meu Plano</h1>
        <p className="text-gray-400 text-sm mt-1">
          A 1ª instância é grátis (plano Free). Cada instância adicional custa R$ {plan.pricePerInstance}/mês.
        </p>
      </div>

      {msg && <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 text-sm">{msg}</div>}
      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-400">Plano atual</p>
          <p className="text-2xl font-bold text-white mt-1 flex items-center gap-2">
            <Crown className={`w-5 h-5 ${plan.planName === 'Free' ? 'text-gray-500' : 'text-amber-400'}`} />
            {plan.planName}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">Instâncias contratadas</p>
          <p className="text-2xl font-bold text-white mt-1">{plan.maxInstances}</p>
          <p className="text-xs text-gray-500 mt-0.5">{plan.used} em uso</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-400">Mensalidade</p>
          <p className="text-2xl font-bold text-white mt-1">R$ {plan.monthlyCost}<span className="text-sm font-normal text-gray-500">/mês</span></p>
        </Card>
      </div>

      <Card title="Ajustar quantidade de instâncias">
        <div className="flex items-center justify-center gap-6 py-4">
          <button onClick={() => setWanted(Math.max(1, wanted - 1))}
            className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 text-white hover:border-cyan-500 transition flex items-center justify-center">
            <Minus className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-5xl font-bold text-white">{wanted}</p>
            <p className="text-xs text-gray-500 mt-1">instância(s)</p>
          </div>
          <button onClick={() => setWanted(Math.min(50, wanted + 1))}
            className="w-11 h-11 rounded-xl bg-gray-800 border border-gray-700 text-white hover:border-cyan-500 transition flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 text-sm space-y-1.5">
          <div className="flex justify-between text-gray-400">
            <span>1ª instância (plano Free)</span>
            <span className="text-green-400">grátis</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>{paidWanted} instância(s) adicional(is) × R$ {plan.pricePerInstance}</span>
            <span>R$ {costWanted}</span>
          </div>
          <div className="border-t border-gray-800 pt-1.5 flex justify-between text-white font-semibold">
            <span>Total mensal</span>
            <span>R$ {costWanted}/mês</span>
          </div>
        </div>

        <button onClick={save} disabled={!changed || saving}
          className="w-full mt-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold rounded-lg px-4 py-2.5 transition inline-flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {saving ? 'Salvando...' : changed ? `Contratar ${wanted} instância(s) — R$ ${costWanted}/mês` : 'Plano atual'}
        </button>
        <p className="text-xs text-gray-600 text-center mt-3">
          A cobrança será faturada mensalmente pela dbtech solutions.
        </p>
      </Card>
    </div>
  );
}
