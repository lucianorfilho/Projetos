import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { produtoAPI } from '../services/api';
import '../styles/Menu.css';

export default function Menu() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [nomeAcesso, setNomeAcesso] = useState('');
  const [erroAcesso, setErroAcesso] = useState('');

  useEffect(() => {
    const acessoSalvo = localStorage.getItem('acessoLiberado');
    const nomeSalvo = localStorage.getItem('nomeVisitante');

    if (acessoSalvo === 'true' && nomeSalvo) {
      setAcessoLiberado(true);
      setNomeCliente(nomeSalvo);
      carregarProdutos();
    }
  }, []);

  const carregarProdutos = async () => {
    try {
      const response = await fetch('/api/cardapio');
      const data = await response.json();
      setProdutos(data);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    }
  };

  const validarAcesso = async (e) => {
    e.preventDefault();
    setErroAcesso('');

    if (!nomeAcesso.trim()) {
      setErroAcesso('Por favor, digite seu nome');
      return;
    }

    if (!codigoAcesso.trim()) {
      setErroAcesso('Por favor, digite o código de acesso');
      return;
    }

    try {
      const response = await fetch('/evento/config');
      const config = await response.json();

      if (config.codigo_acesso_ativo !== codigoAcesso) {
        setErroAcesso('Código de acesso inválido');
        return;
      }

      localStorage.setItem('acessoLiberado', 'true');
      localStorage.setItem('nomeVisitante', nomeAcesso);
      localStorage.setItem('codigoAcesso', codigoAcesso);

      setAcessoLiberado(true);
      setNomeCliente(nomeAcesso);
      carregarProdutos();
    } catch (err) {
      console.error('Erro na validação:', err);
      setErroAcesso('Erro ao validar código');
    }
  };

  const adicionarAoCarrinho = (produto) => {
    const existente = carrinho.find(item => item.id === produto.id);
    if (existente) {
      setCarrinho(carrinho.map(item => item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item));
    } else {
      setCarrinho([...carrinho, { ...produto, quantidade: 1 }]);
    }
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho(carrinho.filter(item => item.id !== produtoId));
  };

  const alterarQuantidade = (produtoId, novaQuantidade) => {
    if (novaQuantidade <= 0) {
      removerDoCarrinho(produtoId);
    } else {
      setCarrinho(carrinho.map(item => item.id === produtoId ? { ...item, quantidade: novaQuantidade } : item));
    }
  };

  const finalizarPreCompra = async () => {
    if (!nomeCliente.trim()) {
      alert('Por favor, digite seu nome');
      return;
    }
    if (carrinho.length === 0) {
      alert('Adicione produtos ao carrinho');
      return;
    }

    try {
      const itens = carrinho.map(item => ({
        produto_id: item.id,
        quantidade: item.quantidade
      }));

      const codigoAcesso = localStorage.getItem('codigoAcesso');
      const response = await fetch(`/pre-vendas?codigo_acesso=${encodeURIComponent(codigoAcesso)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: nomeCliente,
          itens: itens
        })
      });

      if (response.ok) {
        alert('✅ Pré-compra salva! Você será atendido em breve.');
        setCarrinho([]);
        setNomeCliente('');
        navigate('/');
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.detail || 'Erro ao salvar pré-compra'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao salvar pré-compra');
    }
  };

  const totalCarrinho = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  if (!acessoLiberado) {
    return (
      <div className="menu-container">
        <header className="menu-header">
          <h1>🍽️ Cardápio</h1>
          <button className="btn-voltar" onClick={() => navigate('/')}>← Voltar</button>
        </header>

        <div className="acesso-container">
          <form className="acesso-form" onSubmit={validarAcesso}>
            <h2>Bem-vindo! 👋</h2>
            <p>Digite seu nome e o código de acesso para acessar o cardápio</p>

            <div className="form-group">
              <label>Nome:</label>
              <input
                type="text"
                placeholder="Seu nome completo"
                value={nomeAcesso}
                onChange={(e) => setNomeAcesso(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>Código de Acesso:</label>
              <input
                type="text"
                placeholder="Digite o código"
                value={codigoAcesso}
                onChange={(e) => setCodigoAcesso(e.target.value)}
                className="input-field"
              />
            </div>

            {erroAcesso && <p className="erro-message">{erroAcesso}</p>}

            <button type="submit" className="btn-entrar">
              ✅ Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-container">
      <header className="menu-header">
        <h1>🍽️ Cardápio</h1>
        <button className="btn-voltar" onClick={() => navigate('/')}>← Voltar</button>
      </header>

      <div className="menu-content">
        <div className="produtos-grid">
          {produtos.map(produto => (
            <div key={produto.id} className="produto-card">
              <div className="produto-info">
                <h3>{produto.nome}</h3>
                <p className="produto-descricao">{produto.descricao}</p>
                <p className="produto-estoque">Estoque: {produto.estoque}</p>
                <p className="produto-preco">R$ {produto.preco.toFixed(2)}</p>
              </div>
              <button
                className="btn-adicionar"
                onClick={() => adicionarAoCarrinho(produto)}
                disabled={produto.estoque === 0}
              >
                + Adicionar
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Carrinho Desktop (Sidebar) */}
      <aside className="carrinho-sidebar">
        <div className="carrinho-header">
          <h2>🛒 Carrinho</h2>
          <p className="item-count">{carrinho.length} itens</p>
        </div>

        {carrinho.length > 0 ? (
          <>
            <div className="carrinho-items">
              {carrinho.map(item => (
                <div key={item.id} className="carrinho-item">
                  <div className="item-info">
                    <p className="item-nome">{item.nome}</p>
                    <p className="item-preco">R$ {item.preco.toFixed(2)}</p>
                  </div>
                  <div className="item-qty">
                    <button onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}>−</button>
                    <span>{item.quantidade}</span>
                    <button onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}>+</button>
                  </div>
                  <button className="btn-remover" onClick={() => removerDoCarrinho(item.id)}>🗑️</button>
                </div>
              ))}
            </div>

            <div className="carrinho-form">
              <input
                type="text"
                placeholder="Seu nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="input-nome"
              />
              <div className="carrinho-total">
                <strong>Total:</strong>
                <span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>
              <button className="btn-finalizar" onClick={finalizarPreCompra}>
                ✅ Finalizar Pré-compra
              </button>
            </div>
          </>
        ) : (
          <div className="carrinho-vazio">
            <p>Seu carrinho está vazio</p>
            <p className="txt-pequeno">Adicione produtos para começar</p>
          </div>
        )}
      </aside>

      {/* Carrinho Mobile (Float Button + Modal) */}
      {carrinho.length > 0 && (
        <>
          <button className="carrinho-float-btn" onClick={() => setCarrinhoAberto(!carrinhoAberto)}>
            🛒 {carrinho.length}
          </button>

          {carrinhoAberto && (
            <div className="carrinho-modal">
              <button className="modal-close" onClick={() => setCarrinhoAberto(false)}>✕</button>
              <h2>🛒 Carrinho</h2>
              {carrinho.map(item => (
                <div key={item.id} className="carrinho-item">
                  <div className="item-info">
                    <p className="item-nome">{item.nome}</p>
                    <p className="item-preco">R$ {item.preco.toFixed(2)}</p>
                  </div>
                  <div className="item-qty">
                    <button onClick={() => alterarQuantidade(item.id, item.quantidade - 1)}>−</button>
                    <span>{item.quantidade}</span>
                    <button onClick={() => alterarQuantidade(item.id, item.quantidade + 1)}>+</button>
                  </div>
                </div>
              ))}
              <div className="carrinho-total">
                <strong>Total:</strong>
                <span>R$ {totalCarrinho.toFixed(2)}</span>
              </div>
              <input
                type="text"
                placeholder="Seu nome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                className="input-nome"
              />
              <button className="btn-finalizar" onClick={finalizarPreCompra}>
                ✅ Finalizar Pré-compra
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
