'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, RefreshCw, Check } from 'lucide-react';
import api from '@/lib/api';

export default function PlansPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [cpfCnpj, setCpfCnpj] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<number | null>(null);

  const [docModalPlan, setDocModalPlan] = useState<{ id: number; name: string } | null>(null);
  const [docInput, setDocInput] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [quotaRes, plansRes, meRes] = await Promise.all([
        api.get('/storage/quota'),
        api.get('/plans'),
        api.get('/auth/me')
      ]);
      setCurrentPlan(quotaRes.data.plan);
      setPlans(plansRes.data);
      setCpfCnpj(meRes.data.cpf_cnpj || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function requestChange(planId: number, planName: string, price: number, document?: string) {
    if (price > 0 && !document && !cpfCnpj) {
      setDocInput('');
      setDocModalPlan({ id: planId, name: planName });
      return;
    }
    if (price === 0 && !confirm(`Solicitar troca para o plano ${planName}? Nossa equipe vai analisar e entrar em contato.`)) return;
    if (price > 0 && !document && !confirm(`Assinar o plano ${planName} por R$ ${price.toFixed(2)}/mÃªs? VocÃª vai receber o boleto e o cÃ³digo Pix da primeira fatura por email.`)) return;

    setRequesting(planId);
    try {
      const res = await api.post('/plans/request', {
        plan_id: planId,
        cpf_cnpj: document || undefined
      });
      setDocModalPlan(null);
      if (document) setCpfCnpj(document);

      if (res.data.payment_status === 'awaiting_payment') {
        alert('Assinatura criada! Verifique seu email para o boleto e o cÃ³digo Pix. VocÃª tambÃ©m pode acompanhar em Faturas em Aberto.');
        router.push('/faturas');
      } else {
        alert(res.data.message || 'SolicitaÃ§Ã£o enviada!');
      }
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.requires_document) {
        setDocInput('');
        setDocModalPlan({ id: planId, name: planName });
      } else {
        alert(data?.error || 'Erro ao enviar solicitaÃ§Ã£o');
      }
    } finally {
      setRequesting(null);
    }
  }

  function validateCPF(cpf: string): boolean {
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    return true;
  }

  function validateCNPJ(cnpj: string): boolean {
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let remainder = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (remainder !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;

    for (let i = size; i >= 1; i--) {
      sum += parseInt(numbers.charAt(size - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    remainder = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (remainder !== parseInt(digits.charAt(1))) return false;
    return true;
  }

  function confirmDocModal() {
    const digits = docInput.replace(/\D/g, '');
    if (digits.length === 11) {
      if (!validateCPF(digits)) {
        alert('CPF invÃ¡lido. Verifique os nÃºmeros e tente novamente.');
        return;
      }
    } else if (digits.length === 14) {
      if (!validateCNPJ(digits)) {
        alert('CNPJ invÃ¡lido. Verifique os nÃºmeros e tente novamente.');
        return;
      }
    } else {
      alert('Informe um CPF (11 dÃ­gitos) ou CNPJ (14 dÃ­gitos) vÃ¡lido');
      return;
    }
    if (!docModalPlan) return;
    const plan = plans.find(p => p.id === docModalPlan.id);
    requestChange(docModalPlan.id, docModalPlan.name, Number(plan?.price || 0), digits);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Planos</h1>
          <p className="text-gray-400 text-sm mt-1">Veja seu plano atual e solicite mudanÃ§as</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
          <RefreshCw className="w-4 h-4" />Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan: any) => {
            const isCurrent = currentPlan?.name === plan.name;
            return (
              <div key={plan.id}
                className={`bg-gray-900 border rounded-2xl p-5 ${isCurrent ? 'border-blue-500' : 'border-gray-800'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <p className="text-white font-semibold">{plan.name}</p>
                  </div>
                  {isCurrent && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Check className="w-3 h-3" />Atual
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-white mb-3">
                  R$ {Number(plan.price).toFixed(2)}<span className="text-sm text-gray-500 font-normal">/mÃªs</span>
                </p>
                <div className="space-y-1.5 text-sm text-gray-400 mb-4">
                  <p>{plan.storage_limit_gb} GB de armazenamento</p>
                  {plan.name === 'Free' && <p>{plan.backup_retention_days} dias de retenÃ§Ã£o</p>}
                </div>
                {!isCurrent && (
                  <button onClick={() => requestChange(plan.id, plan.name, Number(plan.price))} disabled={requesting === plan.id}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm transition">
                    {requesting === plan.id ? 'Enviando...' : Number(plan.price) > 0 ? 'Assinar / trocar' : 'Solicitar troca'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {docModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDocModalPlan(null)} />
          <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <div>
              <h2 className="text-white font-semibold text-lg">CPF ou CNPJ</h2>
              <p className="text-gray-400 text-sm mt-1">
                Precisamos desse dado pra gerar o boleto/Pix do plano {docModalPlan.name}.
              </p>
            </div>
            <input
              type="text"
              autoFocus
              value={docInput}
              onChange={e => setDocInput(e.target.value)}
              placeholder="Somente nÃºmeros"
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDocModalPlan(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                Cancelar
              </button>
              <button onClick={confirmDocModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
