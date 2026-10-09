import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { vendaAPI, produtoAPI } from '../services/api';
import '../styles/Dashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [aba, setAba] = useState('dashboard');

  const [novoNome, setNovoNome] = useState('');
  const [novoPreco, setNovoPreco] = useState('');
  const [novoEstoque, setNovoEstoque] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  const [editando, setEditando] = useState(null);
  const [loading, setLoading] = useState(false);

  const [novoUsuarioNome, setNovoUsuarioNome] = useState('');
  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioRole, setNovoUsuarioRole] = useState('ponto_venda');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [editandoUsuario, setEditandoUsuario] = useState(null);

  const [caixa, setCaixa] = useState(null);
  const [valorInicial, setValorInicial] = useState('');
  const [valorFinal, setValorFinal] = useState('');

  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [novoCodigoAcesso, setNovoCodigoAcesso] = useState('');

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.error('Nenhum token encontrado');
        return;
      }

      const resVendas = await vendaAPI.getDia();
      setVendas(resVendas.data);

      const resProdutos = await produtoAPI.listar();
      setProdutos(resProdutos.data);

      const resUsuarios = await api.get('/usuarios');
      console.log('Usuários carregados:', resUsuarios.data);
      setUsuarios(resUsuarios.data || []);

      try {
        const resCaixa = await api.get('/caixa/status');
        setCaixa(resCaixa.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setCaixa(null);
        }
      }

      const resConfig = await api.get('/evento/config');
      setCodigoAcesso(resConfig.data.codigo_acesso_ativo);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
      setProdutos([]);
      setUsuarios([]);
    }
  };

  const atualizarCodigoAcesso = async () => {
    if (!novoCodigoAcesso.trim()) {
      alert('Digite um novo código de acesso');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/evento/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          codigo_acesso_ativo: novoCodigoAcesso
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCodigoAcesso(data.codigo_acesso_ativo);
        setNovoCodigoAcesso('');
        alert('Código de acesso atualizado com sucesso!');
      } else {
        alert('Erro ao atualizar código de acesso');
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao atualizar código de acesso');
    } finally {
      setLoading(false);
    }
  };

  const adicionarProduto = async (e) => {
    e.preventDefault();
    if (!novoNome || !novoPreco) return;

    setLoading(true);
    try {
      await produtoAPI.criar(
        novoNome,
        novoPreco,
        novaDescricao,
        novoEstoque
      );
      setNovoNome('');
      setNovoPreco('');
      setNovoEstoque('');
      setNovaDescricao('');
      carregarDados();
      alert('Produto adicionado com sucesso!');
    } catch (err) {
      console.error('Erro ao criar produto:', err);
      alert('Erro ao criar produto: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const editarProduto = async (id) => {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    setEditando({
      id,
      nome: produto.nome,
      preco: produto.preco,
      estoque: produto.estoque,
      descricao: produto.descricao || ''
    });
  };

  const salvarEdicao = async () => {
    if (!editando || !editando.nome || !editando.preco) return;

    setLoading(true);
    try {
      await produtoAPI.atualizar(editando.id, {
        nome: editando.nome,
        preco: parseFloat(editando.preco),
        estoque: parseInt(editando.estoque) || 0,
        descricao: editando.descricao || null
      });
      setEditando(null);
      carregarDados();
    } catch (err) {
      console.error('Erro ao editar produto:', err);
      alert('Erro ao editar produto');
    } finally {
      setLoading(false);
    }
  };

  const deletarProduto = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este produto?')) return;

    setLoading(true);
    try {
      await produtoAPI.deletar(id);
      carregarDados();
    } catch (err) {
      console.error('Erro ao deletar produto:', err);
      alert('Erro ao deletar produto');
    } finally {
      setLoading(false);
    }
  };

  const criarUsuario = async (e) => {
    e.preventDefault();
    if (!novoUsuarioNome || !novoUsuarioEmail || !novoUsuarioSenha) return;

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          nome: novoUsuarioNome,
          email: novoUsuarioEmail,
          role: novoUsuarioRole,
          senha: novoUsuarioSenha
        })
      });

      if (response.ok) {
        setNovoUsuarioNome('');
        setNovoUsuarioEmail('');
        setNovoUsuarioSenha('');
        setNovoUsuarioRole('ponto_venda');
        alert('Usuário criado com sucesso!');
        carregarDados();
      } else {
        const errorData = await response.json();
        alert(`Erro ao criar usuário: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = (usuario) => {
    setEditandoUsuario({
      id: usuario.id,
      nome: usuario.nome,
      role: usuario.role,
      ativo: usuario.ativo,
      senha: ''
    });
  };

  const salvarEdicaoUsuario = async () => {
    if (!editandoUsuario || !editandoUsuario.nome) return;

    setLoading(true);
    try {
      const updateData = {
        nome: editandoUsuario.nome,
        role: editandoUsuario.role,
        ativo: editandoUsuario.ativo
      };

      if (editandoUsuario.senha) {
        updateData.senha = editandoUsuario.senha;
      }

      const response = await fetch(`http://localhost:8000/usuarios/${editandoUsuario.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setEditandoUsuario(null);
        alert('Usuário atualizado com sucesso!');
        carregarDados();
      } else {
        const errorData = await response.json();
        alert(`Erro ao atualizar usuário: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao atualizar usuário');
    } finally {
      setLoading(false);
    }
  };

  const deletarUsuario = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este usuário?')) return;

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/usuarios/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });

      if (response.ok) {
        alert('Usuário deletado com sucesso!');
        carregarDados();
      } else {
        alert('Erro ao deletar usuário');
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao deletar usuário');
    } finally {
      setLoading(false);
    }
  };

  const abrirCaixa = async () => {
    if (!valorInicial) {
      alert('Digite o valor inicial');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/caixa/abrir', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          valor_inicial: parseFloat(valorInicial)
        })
      });

      if (response.ok) {
        const caixaData = await response.json();
        setCaixa(caixaData);
        setValorInicial('');
        alert('Caixa aberto com sucesso!');
      } else {
        const errorData = await response.json();
        alert(`Erro ao abrir caixa: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao abrir caixa');
    } finally {
      setLoading(false);
    }
  };

  const fecharCaixa = async () => {
    if (!valorFinal) {
      alert('Digite o valor final');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/caixa/fechar', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({
          valor_final: parseFloat(valorFinal)
        })
      });

      if (response.ok) {
        const caixaData = await response.json();
        setCaixa(null);
        setValorFinal('');
        alert('Caixa fechado com sucesso!');
        carregarDados();
      } else {
        const errorData = await response.json();
        alert(`Erro ao fechar caixa: ${errorData.detail || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao fechar caixa');
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
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>DBVendas - Admin</h1>
        <button onClick={logout} className="logout-btn">
          Sair
        </button>
      </header>

      <nav className="abas">
        <button
          className={aba === 'dashboard' ? 'ativo' : ''}
          onClick={() => setAba('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={aba === 'produtos' ? 'ativo' : ''}
          onClick={() => setAba('produtos')}
        >
          Produtos
        </button>
        <button
          className={aba === 'usuarios' ? 'ativo' : ''}
          onClick={() => setAba('usuarios')}
        >
          Usuários
        </button>
        <button
          className={aba === 'caixa' ? 'ativo' : ''}
          onClick={() => { setAba('caixa'); carregarDados(); }}
        >
          Caixa
        </button>
        <button
          className={aba === 'relatorios' ? 'ativo' : ''}
          onClick={() => navigate('/relatorios')}
        >
          📊 Relatórios
        </button>
        <button
          className={aba === 'configuracao' ? 'ativo' : ''}
          onClick={() => setAba('configuracao')}
        >
          ⚙️ Configuração
        </button>
      </nav>

      <main className="conteudo">
        {aba === 'dashboard' && vendas && (
          <section className="dashboard-section">
            <h2>Vendas de Hoje</h2>
            <div className="stats">
              <div className="stat-card">
                <h3>Total de Vendas</h3>
                <p className="numero">{vendas.total_vendas}</p>
              </div>
              <div className="stat-card">
                <h3>Total Faturado</h3>
                <p className="numero">R$ {vendas.total_faturado.toFixed(2)}</p>
              </div>
            </div>

            <h3>Detalhamento</h3>
            <div className="tabela">
              <table>
                <thead>
                  <tr>
                    <th>ID Venda</th>
                    <th>Usuário</th>
                    <th>Total</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.vendas.map((v) => (
                    <tr key={v.id}>
                      <td>#{v.id}</td>
                      <td>{v.usuario_id}</td>
                      <td>R$ {v.total.toFixed(2)}</td>
                      <td>
                        {new Date(v.criado_em).toLocaleTimeString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {aba === 'produtos' && (
          <section className="produtos-section">
            <h2>Gerenciar Produtos</h2>

            {editando ? (
              <div className="form-produto-edit">
                <h3>Editar Produto</h3>
                <div className="form-group">
                  <label>Nome do Produto</label>
                  <input
                    type="text"
                    placeholder="Ex: Pizza Calabresa"
                    value={editando.nome}
                    onChange={(e) => setEditando({...editando, nome: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Preço (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 45.00"
                    step="0.01"
                    value={editando.preco}
                    onChange={(e) => setEditando({...editando, preco: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Estoque (Quantidade)</label>
                  <input
                    type="number"
                    placeholder="Ex: 50"
                    value={editando.estoque}
                    onChange={(e) => setEditando({...editando, estoque: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Doação, Consignado, Comprado"
                    value={editando.descricao}
                    onChange={(e) => setEditando({...editando, descricao: e.target.value})}
                  />
                </div>
                <div className="form-acoes">
                  <button onClick={salvarEdicao} disabled={loading} className="btn-salvar">
                    Salvar
                  </button>
                  <button onClick={() => setEditando(null)} className="btn-cancelar">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={adicionarProduto} className="form-produto">
                <input
                  type="text"
                  placeholder="Nome do produto"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Preço"
                  step="0.01"
                  value={novoPreco}
                  onChange={(e) => setNovoPreco(e.target.value)}
                  required
                />
                <input
                  type="number"
                  placeholder="Estoque"
                  value={novoEstoque}
                  onChange={(e) => setNovoEstoque(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Descrição (Doação, Consignado, etc)"
                  value={novaDescricao}
                  onChange={(e) => setNovaDescricao(e.target.value)}
                />
                <button type="submit" disabled={loading}>
                  Adicionar Produto
                </button>
              </form>
            )}

            <div className="lista-produtos">
              {produtos.map((p) => (
                <div key={p.id} className="produto-card">
                  <h4>{p.nome}</h4>
                  {p.descricao && <p className="descricao">{p.descricao}</p>}
                  <p className="preco">R$ {p.preco.toFixed(2)}</p>
                  <p className="estoque">Estoque: {p.estoque}</p>
                  <p className="status">{p.ativo ? '✓ Ativo' : '✗ Inativo'}</p>
                  <div className="produto-acoes">
                    <button onClick={() => editarProduto(p.id)} className="btn-editar">
                      Editar
                    </button>
                    <button onClick={() => deletarProduto(p.id)} className="btn-deletar" disabled={loading}>
                      Deletar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {aba === 'usuarios' && (
          <section className="usuarios-section">
            <h2>Gerenciar Usuários</h2>

            {editandoUsuario ? (
              <div className="form-usuario-edit">
                <h3>Editar Usuário</h3>
                <div className="form-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    value={editandoUsuario.nome}
                    onChange={(e) => setEditandoUsuario({...editandoUsuario, nome: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Função</label>
                  <select
                    value={editandoUsuario.role}
                    onChange={(e) => setEditandoUsuario({...editandoUsuario, role: e.target.value})}
                  >
                    <option value="ponto_venda">Ponto de Venda</option>
                    <option value="cozinha">Cozinha</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Nova Senha (deixe em branco para manter a atual)</label>
                  <input
                    type="password"
                    placeholder="Deixe em branco para manter a atual"
                    value={editandoUsuario.senha}
                    onChange={(e) => setEditandoUsuario({...editandoUsuario, senha: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editandoUsuario.ativo}
                      onChange={(e) => setEditandoUsuario({...editandoUsuario, ativo: e.target.checked})}
                    />
                    Ativo
                  </label>
                </div>
                <div className="form-acoes">
                  <button onClick={salvarEdicaoUsuario} disabled={loading} className="btn-salvar">
                    Salvar
                  </button>
                  <button onClick={() => setEditandoUsuario(null)} className="btn-cancelar">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={criarUsuario} className="form-usuario">
                <input
                  type="text"
                  placeholder="Nome"
                  value={novoUsuarioNome}
                  onChange={(e) => setNovoUsuarioNome(e.target.value)}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={novoUsuarioEmail}
                  onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={novoUsuarioSenha}
                  onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                  required
                />
                <select
                  value={novoUsuarioRole}
                  onChange={(e) => setNovoUsuarioRole(e.target.value)}
                >
                  <option value="ponto_venda">Ponto de Venda</option>
                  <option value="cozinha">Cozinha</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" disabled={loading}>
                  Criar Usuário
                </button>
              </form>
            )}

            <p className="info-usuarios">
              ℹ️ Apenas administradores podem criar novos usuários. Os usuários receberão as credenciais (email e senha) para fazer login.
            </p>

            <h3>Lista de Usuários</h3>
            <div className="tabela">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Email</th>
                    <th>Função</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td>{u.nome}</td>
                      <td>{u.email}</td>
                      <td>{u.role === 'ponto_venda' ? 'Ponto de Venda' : u.role === 'cozinha' ? 'Cozinha' : 'Admin'}</td>
                      <td>{u.ativo ? '✓ Ativo' : '✗ Inativo'}</td>
                      <td>
                        <button onClick={() => editarUsuario(u)} className="btn-editar">
                          Editar
                        </button>
                        <button onClick={() => deletarUsuario(u.id)} className="btn-deletar" disabled={loading}>
                          Deletar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {aba === 'caixa' && (
          <section className="caixa-section">
            <h2>Controle de Caixa</h2>

            {caixa ? (
              <div className="caixa-aberto">
                <div className="info-caixa">
                  <h3>✓ Caixa Aberto</h3>
                  <p><strong>Aberto em:</strong> {new Date(caixa.aberto_em).toLocaleString('pt-BR')}</p>
                  <p><strong>Valor Inicial:</strong> R$ {caixa.valor_inicial.toFixed(2)}</p>
                </div>

                <div className="fechar-caixa">
                  <h3>Fechar Caixa</h3>
                  <div className="form-group">
                    <label>Valor Final:</label>
                    <input
                      type="number"
                      placeholder="Digite o valor final"
                      step="0.01"
                      value={valorFinal}
                      onChange={(e) => setValorFinal(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={fecharCaixa}
                    disabled={loading}
                    className="btn-fechar"
                  >
                    Fechar Caixa
                  </button>
                </div>
              </div>
            ) : (
              <div className="caixa-fechado">
                <h3>Abrir Caixa</h3>
                <div className="form-group">
                  <label>Valor Inicial:</label>
                  <input
                    type="number"
                    placeholder="Digite o valor inicial"
                    step="0.01"
                    value={valorInicial}
                    onChange={(e) => setValorInicial(e.target.value)}
                  />
                </div>
                <button
                  onClick={abrirCaixa}
                  disabled={loading}
                  className="btn-abrir"
                >
                  Abrir Caixa
                </button>
              </div>
            )}
          </section>
        )}

        {aba === 'configuracao' && (
          <section className="configuracao-section">
            <h2>⚙️ Configurações</h2>

            <div className="configuracao-card">
              <h3>Código de Acesso do Evento</h3>
              <p className="info-config">
                O código de acesso é usado por clientes para acessar o cardápio e fazer pré-vendas. Você pode alterar este código a qualquer momento (ex: ao iniciar o segundo dia do evento).
              </p>

              <div className="codigo-atual">
                <p><strong>Código Ativo:</strong></p>
                <div className="codigo-display">
                  <span>{codigoAcesso}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codigoAcesso);
                      alert('Código copiado para a área de transferência!');
                    }}
                    className="btn-copiar"
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>

              <div className="atualizar-codigo">
                <h4>Atualizar Código</h4>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Novo código de acesso"
                    value={novoCodigoAcesso}
                    onChange={(e) => setNovoCodigoAcesso(e.target.value)}
                    className="input-codigo"
                  />
                </div>
                <button
                  onClick={atualizarCodigoAcesso}
                  disabled={loading || !novoCodigoAcesso.trim()}
                  className="btn-atualizar"
                >
                  Atualizar Código
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
