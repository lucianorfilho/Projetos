'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Server, Plus, AlertOctagon, AlertTriangle, Crown, Trash2, X } from 'lucide-react';
import api from '@/lib/api';
import { Spinner, UsageBar, SPEED_STYLES } from '@/components/ui';
import { formatTime } from '@/lib/utils';

const INCIDENT_LABELS: Record<string, string> = {
  session_storm: 'pico de sessões',
  slow_sql: 'SQL lenta',
  blocking: 'bloqueios',
  cpu_spike: 'pico de CPU',
  etl: 'carga ETL pesada',
};

function MiniGauge({ health }: { health: any }) {
  const speed = SPEED_STYLES[health?.speed] ?? SPEED_STYLES['NORMAL'];
  const score = health?.score ?? 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative w-16 h-16 flex-shrink-0">
      <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="#1f2937" strokeWidth="6" />
        <circle cx="32" cy="32" r={R} fill="none" stroke={speed.ring} strokeWidth="6"
          strokeDasharray={`${(score / 100) * C} ${C}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{score}</span>
      </div>
    </div>
  );
}

function InstanceCard({ inst, onDelete }: { inst: any; onDelete: (inst: any) => void }) {
  const h = inst.health;
  const speed = SPEED_STYLES[h?.speed] ?? SPEED_STYLES['NORMAL'];
  const borderClass = !h ? 'border-gray-800'
    : h.status === 'critical' ? 'border-red-500/50 hover:border-red-400'
    : h.status === 'attention' ? 'border-yellow-500/40 hover:border-yellow-400'
    : 'border-gray-800 hover:border-cyan-500/50';

  return (
    <Link href={`/db/${inst.id}`}
      className={`group relative block bg-gray-900 border ${borderClass} rounded-2xl p-5 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-black/40`}>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(inst); }}
        title="Remover instância"
        className="absolute bottom-3 right-3 p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition">
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-white font-bold truncate">{inst.name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{inst.env}{inst.host ? ` · ${inst.host}` : ''}</p>
        </div>
        {h && <MiniGauge health={h} />}
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${speed.color} bg-gray-950/60 border border-gray-800`}>
          {h ? speed.label : 'coletando...'}
        </span>
        {inst.incident && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            ⚡ {INCIDENT_LABELS[inst.incident] ?? inst.incident}
          </span>
        )}
        {inst.collectError && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"
            title={inst.collectError}>
            falha na coleta
          </span>
        )}
        {inst.alertCounts.critical > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertOctagon className="w-3 h-3" /> {inst.alertCounts.critical}
          </span>
        )}
        {inst.alertCounts.warning > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            <AlertTriangle className="w-3 h-3" /> {inst.alertCounts.warning}
          </span>
        )}
      </div>

      {inst.sessions && (
        <div className="mt-4 space-y-2.5">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Sessões</span>
              <span>{inst.sessions.total} / {inst.sessions.limit}</span>
            </div>
            <UsageBar pct={(inst.sessions.total / inst.sessions.limit) * 100} />
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>CPU</span>
              <span>{inst.load.cpuPct}% · {inst.load.aas} AAS</span>
            </div>
            <UsageBar pct={inst.load.cpuPct} />
          </div>
        </div>
      )}
    </Link>
  );
}

function AddInstanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', envLabel: '', mode: 'demo', oracleUser: '', oraclePassword: '', oracleConnect: '' });
  const [error, setError] = useState('');
  const [planLimit, setPlanLimit] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-sm';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPlanLimit(false);
    try {
      await api.post('/api/my/instances', form);
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao adicionar instância');
      setPlanLimit(!!err.response?.data?.planLimit);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Adicionar banco</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
            {planLimit && (
              <Link href="/plan" className="block mt-2 font-semibold text-cyan-400 hover:text-cyan-300">
                → Contratar mais instâncias
              </Link>
            )}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Nome da instância</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="ex.: ORCLPRD" required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Ambiente</label>
            <input value={form.envLabel} onChange={(e) => setForm({ ...form, envLabel: e.target.value })}
              placeholder="ex.: Produção · ERP" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Modo</label>
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
              <button type="button" onClick={() => setForm({ ...form, mode: 'demo' })}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${form.mode === 'demo' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>
                Demonstração
              </button>
              <button type="button" onClick={() => setForm({ ...form, mode: 'oracle' })}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${form.mode === 'oracle' ? 'bg-cyan-600 text-white' : 'text-gray-400'}`}>
                Oracle real
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              {form.mode === 'demo'
                ? 'Simula um banco de produção — ideal para conhecer o DBView.'
                : 'Conecta no seu Oracle via driver thin (não precisa de Instant Client).'}
            </p>
          </div>

          {form.mode === 'oracle' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Usuário de monitoramento</label>
                <input value={form.oracleUser} onChange={(e) => setForm({ ...form, oracleUser: e.target.value })}
                  placeholder="dbview_mon" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
                <input type="password" value={form.oraclePassword} onChange={(e) => setForm({ ...form, oraclePassword: e.target.value })}
                  required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">String de conexão</label>
                <input value={form.oracleConnect} onChange={(e) => setForm({ ...form, oracleConnect: e.target.value })}
                  placeholder="host:1521/SERVICE_NAME" required className={inputCls} />
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold rounded-lg px-4 py-2.5 transition">
            {loading ? 'Adicionando...' : 'Adicionar instância'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function FleetDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    try {
      const res = await api.get('/api/instances');
      setData(res.data);
    } catch { /* backend subindo ou sem login (redireciona) */ }
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  async function handleDelete(inst: any) {
    if (!confirm(`Remover a instância ${inst.name} do monitoramento?`)) return;
    try {
      await api.delete(`/api/my/instances/${inst.id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao remover');
    }
  }

  if (!data) return <Spinner />;

  const { instances, plan } = data;
  const atLimit = plan.used >= plan.maxInstances;
  const healthy = instances.filter((i: any) => i.health?.status === 'healthy').length;
  const attention = instances.filter((i: any) => i.health?.status === 'attention').length;
  const critical = instances.filter((i: any) => i.health?.status === 'critical').length;
  const lastTs = Math.max(0, ...instances.map((i: any) => i.ts ?? 0));

  return (
    <div className="space-y-6">
      {showAdd && <AddInstanceModal onClose={() => setShowAdd(false)} onCreated={load} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Meus Bancos</h1>
          <p className="text-gray-400 text-sm mt-1">
            {instances.length} banco(s) monitorado(s)
            {instances.length > 0 && (
              <>
                {' — '}
                <span className="text-green-400">{healthy} saudável(is)</span>
                {attention > 0 && <span className="text-yellow-400">, {attention} em atenção</span>}
                {critical > 0 && <span className="text-red-400">, {critical} crítico(s)</span>}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/plan" className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition hover:brightness-125 ${
            plan.id === 'free'
              ? 'bg-gray-800/60 text-gray-300 border-gray-700'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Crown className="w-3.5 h-3.5" />
            Plano {plan.name} · {plan.used}/{plan.maxInstances} instância(s)
            {plan.monthlyCost > 0 && <span className="text-gray-500">· R$ {plan.monthlyCost}/mês</span>}
          </Link>
          {lastTs > 0 && (
            <span className="text-xs text-gray-500">
              {formatTime(lastTs)}
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {instances.map((inst: any) => <InstanceCard key={inst.id} inst={inst} onDelete={handleDelete} />)}

        <button
          onClick={() => atLimit ? router.push('/plan') : setShowAdd(true)}
          className="border border-dashed border-gray-800 hover:border-cyan-500/40 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 min-h-[180px] cursor-pointer transition-colors">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-cyan-400" />
          </div>
          <p className="text-sm text-gray-400 font-medium">Adicionar banco</p>
          <p className="text-xs text-gray-600 max-w-[220px]">
            {atLimit
              ? `Limite do plano atingido — contrate mais instâncias por R$ ${plan.pricePerInstance}/mês cada`
              : `Você pode adicionar mais ${plan.maxInstances - plan.used} instância(s)`}
          </p>
        </button>
      </div>
    </div>
  );
}
