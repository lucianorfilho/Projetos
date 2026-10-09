import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { garantirAutenticacao } from '../utils/auth';
import '../styles/Cozinha.css';

export default function Cozinha() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState([]);
  const [aba, setAba] = useState('pendentes');
  const [loading, setLoading] = useState(false);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 25;

  useEffect(() => {
    const verificar = async () => {
      if (!await garantirAutenticacao(navigate)) return;

      carregarVendas();
      const intervalo = setInterval(carregarVendas, 5000);
      return () => clearInterval(intervalo);
    };
    verificar();
  }, [navigate]);

  const carregarVendas = async () => {
    try {
      const res = await api.get('/pre-vendas');
      console.log('Pré-vendas carregadas:', res.data);
      setVendas(res.data);
    } catch (err) {
      console.error('Erro ao carregar pré-vendas:', err);
    }
  };

  // Nao apaga a venda: so tira o card da tela da cozinha. O faturamento do dia
  // continua o mesmo, por isso o texto do aviso fala em "remover da tela".
  const ocultarPedido = async (vendaId) => {
    const ok = window.confirm(
      `Remover o pedido #${vendaId} da tela da cozinha?

` +
      `O pedido some daqui, mas a venda continua registrada: ` +
      `o faturamento do dia nao muda.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      await api.patch(`/pre-vendas/${vendaId}/ocultar`, {});
      carregarVendas();
    } catch (err) {
      console.error('Erro ao remover pedido da tela:', err);
      alert(err.response?.data?.detail || 'Erro ao remover pedido da tela');
    } finally {
      setLoading(false);
    }
  };

  const marcarPronto = async (vendaId) => {
    setLoading(true);
    try {
      await api.patch(`/pre-vendas/${vendaId}/entregue`, {});
      carregarVendas();
    } catch (err) {
      console.error('Erro ao marcar como pronto:', err);
      alert(err.response?.data?.detail || 'Erro ao marcar como pronto');
    } finally {
      setLoading(false);
    }
  };

  const vendaPendente = (venda) => {
    return !venda.entregue;
  };

  const vendasFiltradas = aba === 'pendentes'
    ? vendas.filter(vendaPendente)
    // Entregues em ordem inversa: o pedido mais recente aparece primeiro.
    // Quem confere uma entrega procura o ultimo pedido, que na ordem crescente
    // caia sempre na ultima pagina da lista.
    : vendas.filter((v) => !vendaPendente(v)).sort((a, b) => b.id - a.id);

  const totalPaginas = Math.ceil(vendasFiltradas.length / ITENS_POR_PAGINA);
  const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const fim = inicio + ITENS_POR_PAGINA;
  const vendasPaginadas = vendasFiltradas.slice(inicio, fim);

  const mudarAba = (novaAba) => {
    setAba(novaAba);
    setPaginaAtual(1);
  };

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
          onClick={() => mudarAba('pendentes')}
        >
          Pendentes ({vendas.filter(vendaPendente).length})
        </button>
        <button
          className={aba === 'entregues' ? 'ativo' : ''}
          onClick={() => mudarAba('entregues')}
        >
          Entregues ({vendas.filter((v) => !vendaPendente(v)).length})
        </button>
      </nav>

      <main className="cozinha-content">
        <div className="kds-grid">
          {vendasPaginadas.map((venda) => (
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
                    className="item pendente"
                  >
                    <div className="item-info">
                      <h4>{item.produto_nome || `Produto #${item.produto_id}`}</h4>
                      <p className="qtd">Quantidade: {item.quantidade}</p>
                      {aba === 'pendentes' && (
                        <p className="status">⏳ Pendente</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {!venda.entregue && (
                <button
                  onClick={() => marcarPronto(venda.id)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginTop: '12px',
                    background: 'linear-gradient(135deg, #ff9800 0%, #fb8c00 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  Marcar Pronto
                </button>
              )}

              {venda.entregue && (
                <button
                  onClick={() => ocultarPedido(venda.id)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginTop: '12px',
                    background: 'transparent',
                    color: '#c62828',
                    border: '1px solid #ef9a9a',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Remover da tela
                </button>
              )}
            </div>
          ))}
        </div>

        {vendasPaginadas.length === 0 && (
          <div className="vazio">
            <p>
              {aba === 'pendentes'
                ? 'Nenhum pedido pendente'
                : 'Nenhum pedido entregue'}
            </p>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="paginacao">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
              <button
                key={pagina}
                className={paginaAtual === pagina ? 'ativo' : ''}
                onClick={() => setPaginaAtual(pagina)}
              >
                {pagina}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
