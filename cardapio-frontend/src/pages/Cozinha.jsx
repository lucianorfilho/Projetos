import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendaAPI } from '../services/api';
import { garantirAutenticacao } from '../utils/auth';
import '../styles/Cozinha.css';

export default function Cozinha() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [aba, setAba] = useState('pendentes');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!garantirAutenticacao(navigate)) return;

    carregarVendas();
    const intervalo = setInterval(carregarVendas, 5000);
    return () => clearInterval(intervalo);
  }, [navigate]);

  const carregarVendas = async () => {
    try {
      const token = localStorage.getItem('access_token');
      console.log('Token encontrado:', !!token);
      const res = await vendaAPI.listar();
      console.log('Vendas carregadas:', res.data);
      setVendas(res.data);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
    }
  };

  const marcarPronto = async (itemId) => {
    setLoading(true);
    try {
      await vendaAPI.marcarPronto(itemId);
      carregarVendas();
    } catch (err) {
      console.error('Erro ao marcar como pronto:', err);
      alert('Erro ao marcar como pronto');
    } finally {
      setLoading(false);
    }
  };

  const vendaPendente = (venda) => {
    return venda.itens.some((item) => !item.pronto);
  };

  const vendasFiltradas = aba === 'pendentes'
    ? vendas.filter(vendaPendente)
    : vendas.filter((v) => !vendaPendente(v));

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <div className="cozinha-container">
      <header className="cozinha-header">
        <h1>Kitchen Display System</h1>
        <button onClick={logout} className="logout-btn">
          Sair
        </button>
      </header>

      <nav className="cozinha-abas">
        <button
          className={aba === 'pendentes' ? 'ativo' : ''}
          onClick={() => setAba('pendentes')}
        >
          Pendentes ({vendas.filter(vendaPendente).length})
        </button>
        <button
          className={aba === 'entregues' ? 'ativo' : ''}
          onClick={() => setAba('entregues')}
        >
          Entregues ({vendas.filter((v) => !vendaPendente(v)).length})
        </button>
      </nav>

      <main className="cozinha-content">
        <div className="kds-grid">
          {vendasFiltradas.map((venda) => (
            <div key={venda.id} className="venda-card">
              <div className="venda-header">
                <div>
                  <h3>Pedido #{venda.id}</h3>
                  {venda.cliente_nome && (
                    <p className="cliente-nome">👤 {venda.cliente_nome}</p>
                  )}
                </div>
                <p className="horario">
                  {new Date(venda.criado_em).toLocaleTimeString('pt-BR')}
                </p>
              </div>

              <div className="itens-lista">
                {venda.itens.map((item) => (
                  <div
                    key={item.id}
                    className={`item ${item.pronto ? 'pronto' : 'pendente'}`}
                  >
                    <div className="item-info">
                      <h4>{item.produto_nome || `Produto #${item.produto_id}`}</h4>
                      <p className="qtd">Quantidade: {item.quantidade}</p>
                      <p className="status">
                        {item.pronto ? '✓ Pronto' : '⏳ Pendente'}
                      </p>
                    </div>

                    {!item.pronto && (
                      <button
                        onClick={() => marcarPronto(item.id)}
                        disabled={loading}
                        className="btn-pronto"
                      >
                        Marcar Pronto
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {vendasFiltradas.length === 0 && (
          <div className="vazio">
            <p>
              {aba === 'pendentes'
                ? 'Nenhum pedido pendente'
                : 'Nenhum pedido entregue'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
