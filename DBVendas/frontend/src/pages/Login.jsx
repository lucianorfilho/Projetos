import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import '../styles/Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const response = await authAPI.login(email, senha);
      localStorage.setItem('access_token', response.data.access_token);
      const user = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(user.data));

      await new Promise(resolve => setTimeout(resolve, 500));

      switch (user.data.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'ponto_venda':
          navigate('/vendas');
          break;
        case 'cozinha':
          navigate('/cozinha');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      setErro(err.response?.data?.detail || 'Email ou senha incorretos');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>DBVendas</h1>

        <form onSubmit={handleLogin}>
          <h2>Login</h2>
          {erro && <div className="erro">{erro}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
          <button type="submit" disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="info-text">
          Solicite acesso ao administrador
        </p>
      </div>
    </div>
  );
}
