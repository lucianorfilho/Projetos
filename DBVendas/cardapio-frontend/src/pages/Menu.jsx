import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { produtoAPI } from '../services/api';
import '../styles/Menu.css';

// Pedido em andamento fica guardado no proprio aparelho do cliente, para o caso
// de ele sair do navegador (abrir o app do banco para pagar via Pix) e voltar:
// o celular costuma descartar a pagina da memoria e recarregar do zero.
const PRE_VENDA_KEY = 'preVendaAtual';
const PRE_VENDA_VALIDADE_MS = 12 * 60 * 60 * 1000; // 12h

export default function Menu() {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [nomeCliente, setNomeCliente] = useState('');
  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [nomeAcesso, setNomeAcesso] = useState('');
  const [erroAcesso, setErroAcesso] = useState('');
  const [preVendaConfirmada, setPreVendaConfirmada] = useState(null);
  const [statusPagamento, setStatusPagamento] = useState('pendente');
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const acessoSalvo = localStorage.getItem('acessoLiberado');
    const nomeSalvo = localStorage.getItem('nomeVisitante');

    if (acessoSalvo === 'true' && nomeSalvo) {
      setAcessoLiberado(true);
      setNomeCliente(nomeSalvo);
      carregarProdutos();
    }

    restaurarPreVenda();
  }, []);

  // Traduz o que o servidor diz para o estado exibido na tela.
  const statusDoServidor = (data) =>
    data.cancelada ? 'cancelado'
      : data.entregue ? 'entregue'
      : data.pago ? 'confirmado'
      : 'pendente';

  const mostrarPreVenda = (data) => {
    setPreVendaConfirmada({
      id: data.id,
      cliente_nome: data.cliente_nome,
      itens: data.itens,
      total: data.total,
      criado_em: data.criado_em
    });
    setStatusPagamento(statusDoServidor(data));
  };

  // Ao reabrir o cardapio, remonta a tela do pedido buscando o estado ATUAL no
  // servidor - assim, se o caixa confirmou o Pix enquanto o cliente estava no
  // app do banco, ele ja volta vendo "Pagamento confirmado".
  const restaurarPreVenda = async () => {
    const salvo = localStorage.getItem(PRE_VENDA_KEY);
    if (!salvo) return;

    let registro;
    try {
      registro = JSON.parse(salvo);
    } catch {
      localStorage.removeItem(PRE_VENDA_KEY);
      return;
    }

    // Pedido velho nao deve travar o cardapio de quem volta dias depois.
    if (!registro?.id || Date.now() - (registro.ts || 0) > PRE_VENDA_VALIDADE_MS) {
      localStorage.removeItem(PRE_VENDA_KEY);
      return;
    }

    try {
      const response = await fetch(`/pre-vendas/${registro.id}`);
      if (!response.ok) {
        localStorage.removeItem(PRE_VENDA_KEY);
        return;
      }
      const data = await response.json();

      // Cancelado no caixa: nao remonta a tela do pedido. O cliente volta ao
      // cardapio livre para pedir de novo, em vez de ficar preso ate as 12h.
      if (data.cancelada) {
        localStorage.removeItem(PRE_VENDA_KEY);
        return;
      }

      mostrarPreVenda(data);
      iniciarPolling(data.id);
    } catch (err) {
      console.error('Erro ao restaurar pre-venda:', err);
    }
  };

  const carregarProdutos = async () => {
    try {
      const response = await fetch('/produtos?apenas_ativos=true');
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

      if (config.codigo_acesso_ativo.toLowerCase() !== codigoAcesso.toLowerCase()) {
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
        const preVenda = await response.json();
        localStorage.setItem(
          PRE_VENDA_KEY,
          JSON.stringify({ id: preVenda.id, ts: Date.now(), token: preVenda.token_cliente })
        );
        mostrarPreVenda(preVenda);
        setCarrinho([]);
        setCarrinhoAberto(false);
        iniciarPolling(preVenda.id);
      } else {
        const errorData = await response.json();
        alert(`Erro: ${errorData.detail || 'Erro ao salvar pré-compra'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao salvar pré-compra');
    }
  };

  // Cancelamento feito pelo proprio cliente. Usa o token guardado na criacao:
  // sem ele o servidor recusa, para ninguem cancelar o pedido de outra pessoa.
  const cancelarPeloCliente = async (paraEditar) => {
    let token = null;
    try {
      token = JSON.parse(localStorage.getItem(PRE_VENDA_KEY) || '{}').token;
    } catch {
      token = null;
    }

    if (!token) {
      alert('Nao foi possivel cancelar por aqui. Procure o atendente no caixa.');
      return;
    }

    const pergunta = paraEditar
      ? 'Voltar e editar o pedido?\n\nEle sai da fila do caixa e os itens voltam para o seu carrinho.'
      : 'Cancelar o pedido?\n\nNada sera cobrado e voce voltara para a tela inicial.';
    if (!window.confirm(pergunta)) return;

    try {
      const response = await fetch(
        `/pre-vendas/${preVendaConfirmada.id}/cancelar-cliente?token=${encodeURIComponent(token)}`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }
      );

      if (!response.ok) {
        const erro = await response.json().catch(() => ({}));
        alert(erro.detail || 'Nao foi possivel cancelar. Procure o atendente.');
        // O caixa pode ter confirmado o pagamento nesse exato momento:
        // mostra o estado real em vez de deixar a tela mentindo.
        const atual = await fetch(`/pre-vendas/${preVendaConfirmada.id}`);
        if (atual.ok) setStatusPagamento(statusDoServidor(await atual.json()));
        return;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      localStorage.removeItem(PRE_VENDA_KEY);

      if (paraEditar) {
        // Devolve os itens ao carrinho usando o produto atual do cardapio.
        // Item que saiu do ar nesse meio tempo simplesmente nao volta.
        const itens = (preVendaConfirmada.itens || [])
          .map((it) => {
            const produto = produtos.find((pr) => pr.id === it.produto_id);
            return produto ? { ...produto, quantidade: it.quantidade } : null;
          })
          .filter(Boolean);
        setCarrinho(itens);
        setCarrinhoAberto(true);
        setPreVendaConfirmada(null);
        setStatusPagamento('pendente');
        return;
      }

      // Cancelar de vez: o cliente desistiu da compra, entao encerra a sessao
      // dele e volta para a tela de nome + codigo, e nao para o cardapio.
      localStorage.removeItem('acessoLiberado');
      localStorage.removeItem('nomeVisitante');
      localStorage.removeItem('codigoAcesso');

      setCarrinho([]);
      setCarrinhoAberto(false);
      setPreVendaConfirmada(null);
      setStatusPagamento('pendente');
      setAcessoLiberado(false);
      setNomeCliente('');
      setNomeAcesso('');
      setCodigoAcesso('');

      // Volta para a tela inicial da aplicacao, e nao para o formulario de
      // acesso dentro da rota do cardapio: quem desistiu sai do fluxo todo.
      navigate('/');
    } catch (err) {
      console.error('Erro ao cancelar pedido:', err);
      alert('Erro de conexao. Tente de novo.');
    }
  };

  const iniciarPolling = (preVendaId) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/pre-vendas/${preVendaId}`);
        if (response.ok) {
          const data = await response.json();
          console.log(`Polling: pago=${data.pago}, entregue=${data.entregue}`);

          // Atualiza baseado nos dados do servidor, não no estado local
          if (data.cancelada) {
            console.log('Pedido cancelado no caixa');
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
            localStorage.removeItem(PRE_VENDA_KEY);
            setStatusPagamento('cancelado');
          } else if (data.entregue) {
            console.log('🎉 Pedido entregue!');
            setStatusPagamento('entregue');
            tocarSom();
          } else if (data.pago) {
            console.log('✅ Pagamento confirmado!');
            setStatusPagamento('confirmado');
            tocarSom();
          }
        }
      } catch (err) {
        console.error('Erro ao atualizar status:', err);
      }
    }, 2000);
  };

  // Quando o cliente volta do app do banco, o navegador do celular costuma ter
  // congelado o timer do polling. Ao reexibir a pagina, conferimos na hora e
  // rearmamos o polling, em vez de esperar o proximo ciclo.
  useEffect(() => {
    if (!preVendaConfirmada) return;

    const aoReexibir = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const response = await fetch(`/pre-vendas/${preVendaConfirmada.id}`);
        if (response.ok) {
          const data = await response.json();
          const novoStatus = statusDoServidor(data);
          if (novoStatus !== statusPagamento) {
            setStatusPagamento(novoStatus);
            if (novoStatus === 'confirmado' || novoStatus === 'entregue') tocarSom();
          }
        }
      } catch (err) {
        console.error('Erro ao conferir status ao voltar:', err);
      }

      if (statusPagamento !== 'cancelado') iniciarPolling(preVendaConfirmada.id);
    };

    document.addEventListener('visibilitychange', aoReexibir);
    return () => document.removeEventListener('visibilitychange', aoReexibir);
  }, [preVendaConfirmada, statusPagamento]);

  const tocarSom = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Erro ao tocar som:', err));
    }
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

  const voltarAoInicio = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    localStorage.removeItem(PRE_VENDA_KEY);
    setPreVendaConfirmada(null);
    setStatusPagamento('pendente');
    navigate('/');
  };

  const totalCarrinho = carrinho.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);

  if (preVendaConfirmada) {
    return (
      <div className="menu-container">
        <header className="menu-header">
          <h1>🍔 Pré-Compra Confirmada</h1>
        </header>

        <div style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
          <audio ref={audioRef} src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==" />

          <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <div style={{ marginBottom: '20px' }}>
              {statusPagamento === 'cancelado' && <div style={{ fontSize: '48px' }}>❌</div>}
              {statusPagamento === 'pendente' && <div style={{ fontSize: '48px' }}>💳</div>}
              {statusPagamento === 'confirmado' && <div style={{ fontSize: '48px' }}>✅</div>}
              {statusPagamento === 'entregue' && <div style={{ fontSize: '48px' }}>🎉</div>}
            </div>

            <h2 style={{ color: '#333', marginBottom: '10px' }}>Pedido #{preVendaConfirmada.id}</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Cliente: {preVendaConfirmada.cliente_nome}</p>

            <div style={{ textAlign: 'left', marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '15px' }}>
              {preVendaConfirmada.itens.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span>{item.produto_nome} x{item.quantidade}</span>
                  <span>R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid #333', paddingTop: '15px', textAlign: 'right' }}>
              <h3 style={{ color: '#333' }}>Total: R$ {preVendaConfirmada.total.toFixed(2)}</h3>
            </div>

            <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #eee' }}>
              {statusPagamento === 'cancelado' && (
                <div>
                  <p style={{ fontSize: '18px', color: '#c62828', fontWeight: 'bold' }}>Pedido cancelado</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>
                    Este pedido foi cancelado no caixa. Nada foi cobrado.
                    Fale com o atendente ou faca um novo pedido.
                  </p>
                  <button
                    onClick={voltarAoInicio}
                    style={{
                      marginTop: '20px',
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar ao Cardapio
                  </button>
                </div>
              )}

              {statusPagamento === 'pendente' && (
                <div>
                  <p style={{ fontSize: '18px', color: '#ff9800', fontWeight: 'bold' }}>⏳ Aguardando pagamento...</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>Dirija-se ao caixa para confirmar o pagamento</p>

                  {/* So aparecem enquanto o caixa nao confirmou. Depois de pago
                      o pedido nao pode mais ser mexido pelo cliente. */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                    <button
                      onClick={() => cancelarPeloCliente(true)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'white',
                        color: '#ef6c00',
                        border: '1px solid #ffb74d',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      ← Editar pedido
                    </button>
                    <button
                      onClick={() => cancelarPeloCliente(false)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'white',
                        color: '#c62828',
                        border: '1px solid #ef9a9a',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {statusPagamento === 'confirmado' && (
                <div>
                  <p style={{ fontSize: '18px', color: '#4caf50', fontWeight: 'bold' }}>✅ Pagamento confirmado!</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>Seu pedido está em preparação 🍳</p>
                </div>
              )}

              {statusPagamento === 'entregue' && (
                <div>
                  <p style={{ fontSize: '18px', color: '#4caf50', fontWeight: 'bold' }}>🎉 Pedido Pronto!</p>
                  <p style={{ fontSize: '14px', color: '#666' }}>Seu pedido está pronto para retirada!</p>
                  <button
                    onClick={voltarAoInicio}
                    style={{
                      marginTop: '20px',
                      padding: '12px 30px',
                      background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Voltar ao Início
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {produtosOrdenados.map(produto => (
            <div key={produto.id} className={`produto-card ${getCssCategoria(produto.categoria)}`}>
              <div className="produto-info">
                <h3>{produto.nome}</h3>
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
              <div className="carrinho-modal-content">
                <h2>🛒 Carrinho</h2>
                <div className="carrinho-items-list">
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
                </div>
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
