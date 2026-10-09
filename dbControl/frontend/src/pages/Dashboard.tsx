import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface DashboardData {
  total_produtos: number;
  produtos_baixo_estoque: number;
  vendas_hoje: number;
  alertas_pendentes: number;
}

export default function Dashboard() {
  const [dados, setDados] = useState<DashboardData | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const response = await axios.get('http://localhost:4600/api/relatorios/dashboard');
      setDados(response.data);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
    } finally {
      setCarregando(false);
    }
  };

  if (carregando) return <div className="loading">Carregando...</div>;

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="grid">
        <div className="stat-box">
          <div className="stat-value">{dados?.total_produtos || 0}</div>
          <div className="stat-label">Total de Produtos</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: '#ff9800' }}>
            {dados?.produtos_baixo_estoque || 0}
          </div>
          <div className="stat-label">Produtos com Baixo Estoque</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: '#4caf50' }}>
            R$ {dados?.vendas_hoje?.toFixed(2) || '0.00'}
          </div>
          <div className="stat-label">Vendas de Hoje</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: '#f44336' }}>
            {dados?.alertas_pendentes || 0}
          </div>
          <div className="stat-label">Alertas Pendentes</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '2rem' }}>
        <h2 className="card-title">Bem-vindo ao dbControl</h2>
        <p>
          Sistema de gestão completo para pequenos mercados e comércios.
          Otimize seu negócio com controle de estoque, gestão de vendas e relatórios estratégicos.
        </p>
        <ul style={{ marginTop: '1rem', paddingLeft: '2rem' }}>
          <li>📦 Controle inteligente de estoque</li>
          <li>🛍️ Registro e acompanhamento de vendas</li>
          <li>⚠️ Alertas automáticos de baixo estoque</li>
          <li>📊 Relatórios detalhados de desempenho</li>
          <li>🎯 Gestão de promoções e preços</li>
        </ul>
      </div>
    </div>
  );
}
