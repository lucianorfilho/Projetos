'use client';

// Raio-X detalhado de um banco: medidor de saúde, cards, gráfico ASH
// (Top Activity) e abas de Sessões / Alertas / Segurança / Tablespaces /
// Parâmetros.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Cpu, Layers, Timer, Server, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { formatUptime, formatTime } from '@/lib/utils';
import { Card, StatCard, UsageBar, AlertItem, Spinner, SPEED_STYLES } from '@/components/ui';
import AshPanel from '@/components/ash';
import SessionsPanel from '@/components/panels/SessionsPanel';
import AlertsPanel from '@/components/panels/AlertsPanel';
import SecurityPanel from '@/components/panels/SecurityPanel';
import StoragePanel from '@/components/panels/StoragePanel';
import ParamsPanel from '@/components/panels/ParamsPanel';

const TABS = [
  { key: 'overview', label: 'Visão Geral' },
  { key: 'sessions', label: 'Sessões' },
  { key: 'alerts', label: 'Alertas' },
  { key: 'security', label: 'Segurança' },
  { key: 'storage', label: 'Tablespaces' },
  { key: 'params', label: 'Parâmetros' },
];

function HealthGauge({ health }: { health: any }) {
  const speed = SPEED_STYLES[health?.speed] ?? SPEED_STYLES['NORMAL'];
  const score = health?.score ?? 0;
  const R = 84;
  const C = 2 * Math.PI * R;
  const filled = (score / 100) * C * 0.75;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-[135deg]">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#1f2937" strokeWidth="14"
            strokeDasharray={`${C * 0.75} ${C}`} strokeLinecap="round" />
          <circle cx="100" cy="100" r={R} fill="none" stroke={speed.ring} strokeWidth="14"
            strokeDasharray={`${filled} ${C}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.8s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-white">{score}</span>
          <span className="text-xs text-gray-500 mt-1">ÍNDICE DE SAÚDE</span>
          <span className={`mt-2 text-lg font-bold ${speed.color}`}>{speed.label}</span>
        </div>
      </div>
      {health?.reasons?.length > 0 && (
        <p className="text-xs text-gray-500 text-center max-w-[220px] -mt-1">
          {health.reasons.slice(0, 3).join(' · ')}
        </p>
      )}
    </div>
  );
}

function OverviewTab({ instanceId, ov }: { instanceId: string; ov: any }) {
  const { health, sessions, cursors, load: ld, alerts } = ov;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center justify-center">
          <HealthGauge health={health} />
        </Card>
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard icon={Users} label="Sessões" color="bg-cyan-500/10 text-cyan-400"
            alert={health.usage.sessionsPct >= 90}
            value={<>{sessions.total} <span className="text-base font-normal text-gray-500">/ {sessions.limit}</span></>}
            sub={<><span>{sessions.active} ativas · {health.usage.sessionsPct}% do limite</span><UsageBar pct={health.usage.sessionsPct} className="mt-2" /></>} />
          <StatCard icon={Cpu} label="CPU do Servidor" color="bg-purple-500/10 text-purple-400"
            alert={ld.cpuPct >= 90}
            value={`${ld.cpuPct}%`}
            sub={<><span>{ld.aas} sessões ativas em média (AAS)</span><UsageBar pct={ld.cpuPct} className="mt-2" /></>} />
          <StatCard icon={Layers} label="Cursores Abertos" color="bg-blue-500/10 text-blue-400"
            alert={health.usage.cursorsPct >= 85}
            value={<>{cursors.maxPerSession} <span className="text-base font-normal text-gray-500">/ {cursors.limit}</span></>}
            sub={<><span>pico por sessão · {cursors.open} no total</span><UsageBar pct={health.usage.cursorsPct} className="mt-2" /></>} />
          <StatCard icon={Timer} label="Latência média I/O" color="bg-green-500/10 text-green-400"
            alert={health.deviation.latencyFactor >= 2}
            value={`${ld.avgWaitMs} ms`}
            sub={health.deviation.latencyFactor >= 2
              ? <span className="text-yellow-400">{health.deviation.latencyFactor}x acima do padrão histórico</span>
              : `${ld.execPerSec} exec/s · ${ld.commitsPerSec} commits/s`} />
        </div>
      </div>

      <AshPanel instanceId={instanceId} />

      {alerts.length > 0 && (
        <Card title={`Alertas ativos (${alerts.length})`}>
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {alerts.map((a: any) => <AlertItem key={a.key} alert={a} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function InstanceDetailPage() {
  const params = useParams<{ id: string }>();
  const instanceId = params.id;
  const [ov, setOv] = useState<any>(null);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await api.get(`/api/instances/${instanceId}/overview`);
        if (mounted) setOv(res.data);
      } catch { /* backend subindo */ }
    }
    load();
    const iv = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(iv); };
  }, [instanceId]);

  if (!ov) return <Spinner />;

  const speed = SPEED_STYLES[ov.health?.speed] ?? SPEED_STYLES['NORMAL'];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition mb-1">
            <ArrowLeft className="w-3 h-3" /> Meus Bancos
          </Link>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            {ov.instance.name}
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800 ${speed.color}`}>
              {speed.label}
            </span>
          </h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2 flex-wrap">
            <Server className="w-4 h-4" />
            {ov.env} — {ov.instance.host} · {ov.instance.version.replace('Oracle Database ', '')} · up há {formatUptime(ov.instance.uptimeSeconds)}
          </p>
        </div>
        <div className="text-right text-xs text-gray-500">
          Atualizado às {formatTime(ov.ts)}
          <span className="ml-2 inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-gray-800 pb-3">
        {TABS.map((t) => {
          const badge = t.key === 'alerts' && ov.alertCounts.critical + ov.alertCounts.warning > 0
            ? ov.alertCounts.critical + ov.alertCounts.warning : null;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-sm font-medium transition inline-flex items-center gap-2 ${
                tab === t.key ? 'bg-cyan-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}>
              {t.label}
              {badge != null && (
                <span className="px-1.5 py-0 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400">{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab instanceId={instanceId} ov={ov} />}
      {tab === 'sessions' && <SessionsPanel instanceId={instanceId} />}
      {tab === 'alerts' && <AlertsPanel instanceId={instanceId} />}
      {tab === 'security' && <SecurityPanel instanceId={instanceId} />}
      {tab === 'storage' && <StoragePanel instanceId={instanceId} />}
      {tab === 'params' && <ParamsPanel instanceId={instanceId} />}
    </div>
  );
}
