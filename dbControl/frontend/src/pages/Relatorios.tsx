import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProdutoMaisVendido {
  produto_id: number;
  nome: string;
  quantidade_vendida: number;
  total_vendido: number;
}

interface EstoqueRelatorio {
  id: number;
  nome: string;
  sku: string;
  estoque_atual: number;
  estoque_minimo: number;
  preco_venda: number;
  valor_estoque: number;
  status: string;
}

export default function Relatorios() {
  const [maisVendidos, setMaisVendidos] = useState<ProdutoMaisVendido[]>([]);
  const [estoque, setEstoque] = useState<EstoqueRelatorio[]>([]);
  const [dias, setDias] = useState(30);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarRelatorios();
  }, [dias]);

  const carregarRelatorios = async () => {
    try {
      const [maisVendidosRes, estoqueRes] = await Promise.all([
        axios.get(`http://localhost:4600/api/relatorios/produtos-mais-vendidos?dias=${dias}`),
        axios.get('http://localhost:4600/api/relatorios/estoque'),
      ]);
      setMaisVendidos(maisVendidosRes.data);
      setEstoque(estoqueRes.data);
    } catch (erro) {
      console.error('Erro ao carregar relatórios:', erro);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) return <div className="loading">Carregando relatórios...</div>;

  const valorTotalEstoque = estoque.reduce((acc, p) => acc + p.valor_estoque, 0);

  return (
    <div>
      <h1>Relatórios</h1>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="card-title">Produtos Mais Vendidos</h2>
          <div>
            <label style={{ marginRight: '1rem' }}>Período:</label>
            <select
              value={dias}
              onChange={(e) => setDias(parseInt(e.target.value))}
              style={{ padding: '0.5rem' }}
            >
              <option value={7}>Últimos 7 dias</option>
              <option value={30}>Últimos 30 dias</option>
              <option value={90}>Últimos 90 dias</option>
            </select>
          </div>
        </div>

        {maisVendidos.length > 0 ? (
          <div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={maisVendidos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="quantidade_vendida" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>

            <table className="table" style={{ marginTop: '1.5rem' }}>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade Vendida</th>
                  <th>Faturamento</th>
                </tr>
              </thead>
              <tbody>
                {maisVendidos.map((produto) => (
                  <tr key={produto.produto_id}>
                    <td><strong>{produto.nome}</strong></td>
                    <td>{produto.quantidade_vendida} unidades</td>
                    <td>R$ {produto.total_vendido.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#999', padding: '2rem' }}>
            Nenhuma venda registrada neste período
          </p>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Resumo de Estoque</h2>

        <div className="grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-box">
            <div className="stat-value">R$ {valorTotalEstoque.toFixed(2)}</div>
            <div className="stat-label">Valor Total em Estoque</div>
          </div>
          <div className="stat-box">
            <div className="stat-value">{estoque.length}</div>
            <div className="stat-label">Total de Produtos</div>
          </div>
          <div className="stat-box">
            <div className="stat-value" style={{ color: '#ff9800' }}>
              {estoque.filter((e) => e.status === 'Crítico').length}
            </div>
            <div className="stat-label">Produtos Críticos</div>
          </div>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>SKU</th>
              <th>Estoque</th>
              <th>Preço Unit.</th>
              <th>Valor Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {estoque.map((produto) => (
              <tr key={produto.id}>
                <td><strong>{produto.nome}</strong></td>
                <td>{produto.sku}</td>
                <td>
                  {produto.estoque_atual} / {produto.estoque_minimo}
                </td>
                <td>R$ {produto.preco_venda.toFixed(2)}</td>
                <td>R$ {produto.valor_estoque.toFixed(2)}</td>
                <td>
                  {produto.status === 'Crítico' ? (
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>⚠️ Crítico</span>
                  ) : (
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ Normal</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
