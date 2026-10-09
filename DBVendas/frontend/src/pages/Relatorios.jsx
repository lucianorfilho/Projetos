import { useState, useEffect } from 'react';
import { vendaAPI } from '../services/api';
import { garantirAutenticacao } from '../utils/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Relatorios.css';

export default function Relatorios() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [filtroAtivo, setFiltroAtivo] = useState('hoje');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const verificar = async () => {
      if (!await garantirAutenticacao(navigate)) return;
      carregarVendas();
    };
    verificar();
  }, [navigate]);

  const carregarVendas = async () => {
    try {
      const response = await vendaAPI.getDia();
      setVendas(response.data.vendas || []);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    }
  };

  const obterDataFiltrada = () => {
    const hoje = new Date();
    const dataAtual = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    switch (filtroAtivo) {
      case 'hoje':
        return { inicio: dataAtual, fim: new Date(dataAtual.getTime() + 86400000) };
      case 'semana':
        const primeiroDiaSemana = new Date(dataAtual);
        primeiroDiaSemana.setDate(primeiroDiaSemana.getDate() - primeiroDiaSemana.getDay());
        return { inicio: primeiroDiaSemana, fim: new Date(primeiroDiaSemana.getTime() + 7 * 86400000) };
      case 'mes':
        const primeiroDiasMes = new Date(dataAtual.getFullYear(), dataAtual.getMonth(), 1);
        return { inicio: primeiroDiasMes, fim: new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1) };
      case 'personalizado':
        return { inicio: new Date(dataInicio), fim: new Date(dataFim) };
      default:
        return { inicio: dataAtual, fim: new Date(dataAtual.getTime() + 86400000) };
    }
  };

  const filtrarVendas = () => {
    const { inicio, fim } = obterDataFiltrada();
    return vendas.filter(venda => {
      const dataCriacao = new Date(venda.criado_em);
      return dataCriacao >= inicio && dataCriacao < fim;
    });
  };

  const vendaFiltradas = filtrarVendas();
  const totalVendas = vendaFiltradas.length;
  const totalFaturado = vendaFiltradas.reduce((sum, venda) => sum + venda.total, 0);

  const formatarData = (data) => {
    return new Date(data).toLocaleString('pt-BR');
  };

  const obterPeriodo = () => {
    if (filtroAtivo === 'hoje') return 'Hoje';
    if (filtroAtivo === 'semana') return 'Última Semana';
    if (filtroAtivo === 'mes') return 'Último Mês';
    if (filtroAtivo === 'personalizado') return `${dataInicio} até ${dataFim}`;
  };

  const exportarCSV = () => {
    if (vendaFiltradas.length === 0) {
      alert('Nenhuma venda para exportar');
      return;
    }

    const headers = ['ID', 'Cliente', 'Data/Hora', 'Tipo de Pagamento', 'Total'];
    const rows = vendaFiltradas.map(venda => [
      venda.id,
      venda.cliente_nome || 'Sem nome',
      formatarData(venda.criado_em),
      venda.metodo_pagamento || 'dinheiro',
      `R$ ${venda.total.toFixed(2)}`
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `vendas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relatorios-container">
      <h1>📊 Relatórios de Vendas</h1>

      <div className="filtros">
        <button
          className={`filtro-btn ${filtroAtivo === 'hoje' ? 'ativo' : ''}`}
          onClick={() => setFiltroAtivo('hoje')}
        >
          📅 Hoje
        </button>
        <button
          className={`filtro-btn ${filtroAtivo === 'semana' ? 'ativo' : ''}`}
          onClick={() => setFiltroAtivo('semana')}
        >
          📆 Última Semana
        </button>
        <button
          className={`filtro-btn ${filtroAtivo === 'mes' ? 'ativo' : ''}`}
          onClick={() => setFiltroAtivo('mes')}
        >
          📅 Último Mês
        </button>
        <button
          className={`filtro-btn ${filtroAtivo === 'personalizado' ? 'ativo' : ''}`}
          onClick={() => setFiltroAtivo('personalizado')}
        >
          🔧 Personalizado
        </button>
      </div>

      {filtroAtivo === 'personalizado' && (
        <div className="datas-personalizadas">
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="input-data"
          />
          <span>até</span>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="input-data"
          />
        </div>
      )}

      <div className="resumo">
        <div className="resumo-item">
          <p className="resumo-label">Período</p>
          <p className="resumo-valor">{obterPeriodo()}</p>
        </div>
        <div className="resumo-item">
          <p className="resumo-label">Vendas</p>
          <p className="resumo-valor">{totalVendas}</p>
        </div>
        <div className="resumo-item">
          <p className="resumo-label">Faturado</p>
          <p className="resumo-valor">R$ {totalFaturado.toFixed(2)}</p>
        </div>
      </div>

      <div className="btn-exportar-container">
        <button className="btn-exportar" onClick={exportarCSV}>
          📥 Exportar CSV
        </button>
      </div>

      <div className="tabela-vendas">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>Data/Hora</th>
              <th>Tipo de Pagamento</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {vendaFiltradas.map(venda => (
              <tr key={venda.id}>
                <td>#{venda.id}</td>
                <td>{venda.cliente_nome || 'Sem nome'}</td>
                <td>{formatarData(venda.criado_em)}</td>
                <td>{venda.metodo_pagamento || 'dinheiro'}</td>
                <td>R$ {venda.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendaFiltradas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            Nenhuma venda encontrada para este período
          </div>
        )}
      </div>
    </div>
  );
}
