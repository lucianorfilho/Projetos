'use client';

import { Fragment, useEffect, useState } from 'react';
import { Receipt, RefreshCw, ExternalLink, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function OpenInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { status: 'open' } });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function daysRemaining(dueDate: string) {
    const diff = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function copyPix(payload: string) {
    navigator.clipboard.writeText(payload);
    alert('CÃ³digo Pix copiado!');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Faturas em Aberto</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe suas cobranÃ§as e histÃ³rico de pagamentos</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
          <RefreshCw className="w-4 h-4" />Atualizar
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Receipt className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">Nenhuma fatura em aberto</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">NÂº Fatura</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Dias</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const days = daysRemaining(inv.due_date);
                const isOverdue = inv.status === 'overdue' || days < 0;
                const isExpanded = expanded === inv.id;
                return (
                  <Fragment key={inv.id}>
                    <tr className="border-b border-gray-800 last:border-0">
                      <td className="px-4 py-3 text-gray-300">#{inv.id}</td>
                      <td className="px-4 py-3 text-white font-medium">{inv.plan_name}</td>
                      <td className="px-4 py-3 text-gray-300">R$ {Number(inv.value).toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-300">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3">
                        <span className={isOverdue ? 'text-red-400' : 'text-green-400'}>
                          {isOverdue ? 'Vencida' : `${days} dia${days === 1 ? '' : 's'} restante${days === 1 ? '' : 's'}`}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          isOverdue ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                     : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {isOverdue ? 'Vencida' : 'Em aberto'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => setExpanded(isExpanded ? null : inv.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition">
                          Pagar agora {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-gray-800 last:border-0">
                        <td colSpan={7} className="px-4 pb-4 pt-0 bg-gray-800/20">
                          <div className="flex flex-wrap gap-2 pt-2">
                            {inv.boleto_url && (
                              <a href={inv.boleto_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition">
                                <ExternalLink className="w-4 h-4" />Ver boleto / pagar
                              </a>
                            )}
                            {inv.pix_payload && (
                              <button onClick={() => copyPix(inv.pix_payload)}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                                <Copy className="w-4 h-4" />Copiar cÃ³digo Pix
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
