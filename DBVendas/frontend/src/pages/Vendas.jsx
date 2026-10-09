import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { produtoAPI, vendaAPI } from '../services/api';
import api from '../services/api';
import { garantirAutenticacao } from '../utils/auth';
import '../styles/Vendas.css';

export default function Vendas() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [clienteNome, setClienteNome] = useState('');
  const [metodoPagamentoMap, setMetodoPagamentoMap] = useState({});
  const [metodoPagamentoVenda, setMetodoPagamentoVenda] = useState('dinheiro');
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState('produtos');
  const [preVendas, setPreVendas] = useState([]);

  useEffect(() => {
    let intervalo;

    const verificar = async () => {
      if (!await garantirAutenticacao(navigate)) {
        return;
      }
      carregarProdutos();
      carregarPreVendas();

      // O cliente pode cancelar pelo celular a qualquer momento. Sem este
      // refresh o card so sumiria com F5, e o operador poderia confirmar um
      // pedido ja cancelado.
      intervalo = setInterval(carregarPreVendas, 5000);
    };

    verificar();
    return () => { if (intervalo) clearInterval(intervalo); };
  }, [navigate]);

  const carregarPreVendas = async () => {
    try {
      const res = await api.get('/pre-vendas');
      setPreVendas(res.data || []);
      // Preserva a escolha do operador: como isso agora roda a cada 5s, montar
      // o mapa do zero jogaria a selecao de volta para "dinheiro" sozinho.
      setMetodoPagamentoMap(anterior => {
        const mapa = {};
        (res.data || []).forEach(pv => {
          mapa[pv.id] = anterior[pv.id] || 'dinheiro';
        });
        return mapa;
      });
    } catch (err) {
      console.error('Erro ao carregar pré-vendas:', err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await produtoAPI.listarAtivos();
      setProdutos(res.data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const adicionarAoCarrinho = (produto) => {
    if (produto.estoque <= 0) {
      alert('Produto sem estoque');
      return;
    }

    const existe = carrinho.find((p) => p.id === produto.id);
    if (existe) {
      const novaQtd = existe.quantidade + 1;
      if (novaQtd <= produto.estoque) {
        setCarrinho(
          carrinho.map((p) =>
            p.id === produto.id ? { ...p, quantidade: novaQtd } : p
          )
        );
      } else {
        alert(`Máximo disponível: ${produto.estoque}`);
      }
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter((p) => p.id !== produtoId));
  };

  const diminuirQuantidade = (produtoId) => {
    setCarrinho(
      carrinho
        .map((p) =>
          p.id === produtoId ? { ...p, quantidade: p.quantidade - 1 } : p
        )
        .filter((p) => p.quantidade > 0)
    );
  };

  const calcularTotal = () => {
    return carrinho.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  };

  const finalizarVenda = async () => {
    if (carrinho.length === 0) {
      alert('Carrinho vazio');
      return;
    }

    if (!clienteNome.trim()) {
      alert('Por favor, digite o nome do cliente');
      return;
    }

    setLoading(true);
    try {
      const itens = carrinho.map((item) => ({
        produto_id: item.id,
        quantidade: item.quantidade,
      }));
      await vendaAPI.criarComCliente(itens, clienteNome, metodoPagamentoVenda);
      setCarrinho([]);
      setClienteNome('');
      setMetodoPagamentoVenda('dinheiro');
      alert('Venda realizada com sucesso!');
      carregarProdutos();
    } catch (err) {
      console.error('Erro ao finalizar venda:', err);
      alert('Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar so vale antes do pagamento. Nao devolve estoque porque a pre-venda
  // ainda nao baixou nada: a baixa acontece no "Marcar Pago".
  const cancelarPreVenda = async (preVendaId, clienteNome) => {
    const ok = window.confirm(
      `Cancelar a pre-venda #${preVendaId} de ${clienteNome || 'cliente'}?

` +
      `O pedido sai desta lista e a tela do cliente e liberada. ` +
      `Nada e cobrado e o estoque nao muda.`
    );
    if (!ok) return;

    setLoading(true);
    try {
      await api.patch(`/pre-vendas/${preVendaId}/cancelar`, {});
      carregarPreVendas();
    } catch (err) {
      console.error('Erro ao cancelar pre-venda:', err);
      alert(err.response?.data?.detail || 'Erro ao cancelar pre-venda');
    } finally {
      setLoading(false);
    }
  };

  const confirmarPreVenda = async (preVendaId) => {
    const metodo = metodoPagamentoMap[preVendaId];
    if (!metodo) {
      alert('Selecione um método de pagamento');
      return;
    }

    setLoading(true);
    try {
      await api.patch(`/pre-vendas/${preVendaId}/confirmar`, {
        metodo_pagamento: metodo
      });

      alert('✅ Pagamento confirmado! Cliente notificado.');
      setMetodoPagamentoMap(prev => {
        const novo = {...prev};
        delete novo[preVendaId];
        return novo;
      });
      carregarPreVendas();
      carregarProdutos();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao confirmar pré-venda');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const getCssCategoria = (categoria) => {
    if (!categoria) return 'laranja';
    const mapa = {
      'Laranja': 'laranja',
      'Amarela': 'amarela',
      'Verde Claro': 'verde-claro',
      'Azul Claro': 'azul-claro',
      'Lilás Claro': 'lilas-claro'
    };
    return mapa[categoria] || 'laranja';
  };

  const produtosOrdenados = [...produtos].sort((a, b) => {
    const categoriaA = (a.categoria || 'Sem categoria').toUpperCase();
    const categoriaB = (b.categoria || 'Sem categoria').toUpperCase();
    if (categoriaA !== categoriaB) {
      return categoriaA.localeCompare(categoriaB, 'pt-BR');
    }
    return a.nome.toUpperCase().localeCompare(b.nome.toUpperCase(), 'pt-BR');
  });

  return (
    <div className="vendas-container">
      <header className="vendas-header">
        <h1>DBVendas - Ponto de Venda</h1>
        <button onClick={logout} className="logout-btn">
          Sair
        </button>
      </header>

      <nav className="vendas-abas">
        <button
          className={aba === 'produtos' ? 'ativo' : ''}
          onClick={() => setAba('produtos')}
        >
          🛒 Produtos
        </button>
        <button
          className={aba === 'pre-vendas' ? 'ativo' : ''}
          onClick={() => { setAba('pre-vendas'); carregarPreVendas(); }}
        >
          📋 Pré-vendas ({preVendas.length})
        </button>
      </nav>

      {aba === 'produtos' && (
      <div className="vendas-content">
        <section className="produtos-grid">
          <h2>Produtos</h2>
          <div className="grid">
            {produtosOrdenados.map((p) => (
              <div key={p.id} className={`produto-btn ${getCssCategoria(p.categoria)} ${p.estoque <= 0 ? 'sem-estoque' : ''}`} onClick={() => p.estoque > 0 && adicionarAoCarrinho(p)}>
                <h3>{p.nome}</h3>
                <p className="preco">R$ {p.preco.toFixed(2)}</p>
                <p className="estoque-disponivel">Estoque: {p.estoque}</p>
                <button className="adicionar" disabled={p.estoque <= 0}>
                  {p.estoque <= 0 ? 'Sem Estoque' : '+ Adicionar'}
                </button>
              </div>
            ))}
          </div>
        </section>

        <aside className="carrinho-section">
          <h2>Carrinho</h2>
          <div className="cliente-input">
            <input
              type="text"
              placeholder="Nome do cliente"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
            />
          </div>

          <div className="pagamento-input">
            <label>Forma de Pagamento:</label>
            <select
              value={metodoPagamentoVenda}
              onChange={(e) => setMetodoPagamentoVenda(e.target.value)}
            >
              <option value="dinheiro">💵 Dinheiro</option>
              <option value="cartao">💳 Cartão</option>
              <option value="pix">📱 Pix</option>
            </select>
          </div>
          <div className="carrinho-itens">
            {carrinho.length === 0 ? (
              <p className="vazio">Carrinho vazio</p>
            ) : (
              carrinho.map((item) => (
                <div key={item.id} className="carrinho-item">
                  <div className="info">
                    <h4>{item.nome}</h4>
                    <p>R$ {item.preco.toFixed(2)} x {item.quantidade}</p>
                  </div>
                  <div className="subtotal">
                    <p>R$ {(item.preco * item.quantidade).toFixed(2)}</p>
                  </div>
                  <div className="acoes">
                    <button onClick={() => diminuirQuantidade(item.id)}>−</button>
                    <span>{item.quantidade}</span>
                    <button onClick={() => adicionarAoCarrinho(item)}>+</button>
                    <button onClick={() => removerDoCarrinho(item.id)} className="remover">
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="carrinho-resumo">
            <div className="total">
              <span>Total:</span>
              <span className="valor">R$ {calcularTotal().toFixed(2)}</span>
            </div>
            <button
              onClick={finalizarVenda}
              disabled={carrinho.length === 0 || loading}
              className="finalizar-btn"
            >
              {loading ? 'Processando...' : 'Finalizar Venda'}
            </button>
          </div>
        </aside>
      </div>
      )}

      {aba === 'pre-vendas' && (
      <div className="pre-vendas-section">
        <h2>📋 Pré-vendas Pendentes</h2>

        {preVendas.length === 0 ? (
          <div className="vazio-pre-vendas">
            <p>Nenhuma pré-venda pendente</p>
          </div>
        ) : (
          <div className="lista-pre-vendas">
            {preVendas.map((pv) => (
              <div key={pv.id} className="pre-venda-card">
                <div className="pv-cabecalho">
                  <h3>{pv.cliente_nome}</h3>
                  <span className="pv-id">#{pv.id}</span>
                </div>

                <div className="pv-itens">
                  {pv.itens.map((item) => (
                    <div key={item.id} className="pv-item">
                      <span className="item-nome">{item.produto_nome}</span>
                      <span className="item-qtd">x{item.quantidade}</span>
                      <span className="item-valor">R$ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="pv-footer">
                  <div className="pv-total">
                    <strong>Total:</strong>
                    <strong>R$ {pv.total.toFixed(2)}</strong>
                  </div>

                  <div className="pv-pagamento">
                    <select
                      value={metodoPagamentoMap[pv.id] || 'dinheiro'}
                      onChange={(e) => setMetodoPagamentoMap({...metodoPagamentoMap, [pv.id]: e.target.value})}
                      className="pagamento-select"
                    >
                      <option value="">Selecione...</option>
                      <option value="dinheiro">💵 Dinheiro</option>
                      <option value="cartao">💳 Cartão</option>
                      <option value="pix">📱 Pix</option>
                    </select>
                  </div>

                  <button
                    onClick={() => confirmarPreVenda(pv.id)}
                    disabled={loading}
                    className="btn-confirmar-pv"
                  >
                    ✅ Marcar Pago
                  </button>

                  <button
                    onClick={() => cancelarPreVenda(pv.id, pv.cliente_nome)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '10px',
                      marginTop: '8px',
                      background: 'transparent',
                      color: '#c62828',
                      border: '1px solid #ef9a9a',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Cancelar pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
