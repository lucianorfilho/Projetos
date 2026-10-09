import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function Landing() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setErro('');
    try {
      const response = await authAPI.login(email, senha);
      localStorage.setItem('access_token', response.data.access_token);
      const user = await authAPI.me();
      localStorage.setItem('user', JSON.stringify(user.data));
      navigate(user.data.role === 'admin' ? '/admin' : user.data.role === 'ponto_venda' ? '/vendas' : '/cozinha');
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setCarregando(false);
    }
  };

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    card: { background: 'white', borderRadius: '12px', padding: '60px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center', maxWidth: '400px', width: '100%' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' },
    button: { padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    erro: { background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>👨‍💼</div>
        <h1 style={{ marginBottom: '10px', color: '#333' }}>Administração</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Acesso para Admin, PDV e Cozinha</p>

        <form onSubmit={handleLogin} style={styles.form}>
          {erro && <div style={styles.erro}>{erro}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
            required
          />
          <button type="submit" style={styles.button} disabled={carregando}>
            {carregando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
