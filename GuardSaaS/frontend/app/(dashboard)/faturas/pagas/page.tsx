'use client';

import { useEffect, useState } from 'react';
import { Receipt, RefreshCw, Check } from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';

export default function PaidInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get('/invoices', { params: { status: 'paid' } });
      setInvoices(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Faturas Pagas</h1>
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
            <p className="text-sm">Nenhuma fatura paga ainda</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="px-4 py-3 font-medium">NÂº Fatura</th>
                <th className="px-4 py-3 font-medium">Plano</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Vencimento</th>
                <th className="px-4 py-3 font-medium">Pagamento</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr key={inv.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-300">#{inv.id}</td>
                  <td className="px-4 py-3 text-white font-medium">{inv.plan_name}</td>
                  <td className="px-4 py-3 text-gray-300">R$ {Number(inv.value).toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-300">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.paid_at ? formatDate(inv.paid_at) : 'â€”'}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                      <Check className="w-3 h-3" />Pago
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
