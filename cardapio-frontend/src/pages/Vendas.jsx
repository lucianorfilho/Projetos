import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { produtoAPI, vendaAPI } from '../services/api';
import api from '../services/api';
import '../styles/Vendas.css';

export default function Vendas() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [clienteNome, setClienteNome] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState('produtos');
  const [preVendas, setPreVendas] = useState([]);

  useEffect(() => {
    carregarProdutos();
    carregarPreVendas();
  }, []);

  const carregarPreVendas = async () => {
    try {
      const res = await api.get('/pre-vendas');
      setPreVendas(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar pré-vendas:', err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const res = await produtoAPI.listar();
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
      await vendaAPI.criarComCliente(itens, clienteNome, metodoPagamento);
      setCarrinho([]);
      setClienteNome('');
      setMetodoPagamento('dinheiro');
      alert('Venda realizada com sucesso!');
      carregarProdutos();
    } catch (err) {
      console.error('Erro ao finalizar venda:', err);
      alert('Erro ao finalizar venda');
    } finally {
      setLoading(false);
    }
  };

  const confirmarPreVenda = async (preVendaId) => {
    if (!metodoPagamento) {
      alert('Selecione um método de pagamento');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/pre-vendas/${preVendaId}/confirmar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          metodo_pagamento: metodoPagamento
        })
      });

      if (response.ok) {
        alert('Pré-venda confirmada com sucesso!');
        carregarPreVendas();
        carregarProdutos();
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.detail || 'Erro ao confirmar pré-venda'}`);
      }
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
            {produtos.map((p) => (
              <div key={p.id} className={`produto-btn ${p.estoque <= 0 ? 'sem-estoque' : ''}`} onClick={() => p.estoque > 0 && adicionarAoCarrinho(p)}>
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
              value={metodoPagamento}
              onChange={(e) => setMetodoPagamento(e.target.value)}
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
                      value={metodoPagamento}
                      onChange={(e) => setMetodoPagamento(e.target.value)}
                      className="pagamento-select"
                    >
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
