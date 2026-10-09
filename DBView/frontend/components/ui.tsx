'use client';

import { AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export function Card({ title, action, children, className = '' }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-2xl p-5 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, sub, color, alert }: {
  icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode; color: string; alert?: boolean;
}) {
  return (
    <div className={`bg-gray-900 border rounded-2xl p-5 transition-colors ${alert ? 'border-red-500/50' : 'border-gray-800'}`}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {sub && <div className="text-sm text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

export function UsageBar({ pct, className = '' }: { pct: number; className?: string }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-cyan-500';
  return (
    <div className={`h-1.5 bg-gray-800 rounded-full overflow-hidden ${className}`}>
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

const SEVERITY_STYLES: Record<string, { badge: string; icon: any; label: string }> = {
  critical: { badge: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: AlertOctagon, label: 'Crítico' },
  warning: { badge: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: AlertTriangle, label: 'Atenção' },
  info: { badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', icon: Info, label: 'Info' },
};

export function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.info;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

export function AlertItem({ alert }: { alert: any }) {
  const border = alert.severity === 'critical' ? 'border-red-500/30' : alert.severity === 'warning' ? 'border-yellow-500/30' : 'border-blue-500/30';
  return (
    <div className={`bg-gray-950/60 border ${border} rounded-xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={alert.severity} />
            <span className="text-sm font-semibold text-white">{alert.title}</span>
          </div>
          <p className="text-sm text-gray-400 mt-1.5">{alert.message}</p>
          {alert.suggestion && (
            <p className="text-sm mt-2 text-cyan-300/90 bg-cyan-500/5 border border-cyan-500/15 rounded-lg px-3 py-2">
              💡 {alert.suggestion}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
          {new Date(alert.firedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export const SPEED_STYLES: Record<string, { color: string; ring: string; label: string }> = {
  'RÁPIDO': { color: 'text-green-400', ring: '#22c55e', label: 'Rápido' },
  'NORMAL': { color: 'text-cyan-400', ring: '#06b6d4', label: 'Normal' },
  'LENTO': { color: 'text-yellow-400', ring: '#eab308', label: 'Lento' },
  'SOBRECARGA': { color: 'text-red-400', ring: '#ef4444', label: 'Sobrecarga' },
};
