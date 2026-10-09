import clsx from 'clsx';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-gray-800 bg-gray-900/50 p-5', className)}>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint, accent }: {
  label: string; value: React.ReactNode; hint?: string; accent?: string;
}) {
  return (
    <Card>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className={clsx('mt-1 text-3xl font-bold', accent || 'text-gray-100')}>{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
    </Card>
  );
}

const SEVERITY_STYLES: Record<string, string> = {
  alta: 'bg-red-500/15 text-red-400 border-red-500/30',
  media: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  baixa: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  info: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

export const SEVERITY_LABELS: Record<string, string> = {
  alta: 'Alta', media: 'Média', baixa: 'Baixa', info: 'Info',
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span className={clsx('inline-block rounded-full border px-2 py-0.5 text-xs font-medium',
      SEVERITY_STYLES[severity] || SEVERITY_STYLES.info)}>
      {SEVERITY_LABELS[severity] || severity}
    </span>
  );
}

export const CATEGORY_LABELS: Record<string, string> = {
  integridade: 'Integridade',
  lgpd: 'LGPD / Segurança',
  performance: 'Performance',
  documentacao: 'Documentação',
  limpeza: 'Limpeza',
  modelagem: 'Modelagem',
};

export function CategoryBadge({ category }: { category: string }) {
  return (
    <span className="inline-block rounded-full border border-gray-700 bg-gray-800/60 px-2 py-0.5 text-xs text-gray-300">
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function fmtNum(n: number | null | undefined) {
  if (n == null) return '—';
  return n.toLocaleString('pt-BR');
}
