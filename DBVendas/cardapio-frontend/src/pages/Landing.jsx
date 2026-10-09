import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  const [nomeVisitante, setNomeVisitante] = useState('');
  const [codigoEvento, setCodigoEvento] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleContinuarVisitante = async () => {
    setCarregando(true);
    setErro('');

    if (!nomeVisitante.trim()) {
      setErro('Por favor, digite seu nome');
      setCarregando(false);
      return;
    }
    if (!codigoEvento.trim()) {
      setErro('Por favor, digite o código do evento');
      setCarregando(false);
      return;
    }

    try {
      const response = await fetch('/evento/config');
      const config = await response.json();

      if (config.codigo_acesso_ativo.toLowerCase() !== codigoEvento.toLowerCase()) {
        setErro('Código do evento inválido');
        setCarregando(false);
        return;
      }

      localStorage.setItem('nomeVisitante', nomeVisitante);
      localStorage.setItem('codigoAcesso', codigoEvento);
      localStorage.setItem('acessoLiberado', 'true');
      navigate('/menu');
    } catch (err) {
      console.error('Erro:', err);
      setErro('Erro ao validar código');
      setCarregando(false);
    }
  };

  const styles = {
    container: { minHeight: '100vh', background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
    card: { background: 'white', borderRadius: '12px', padding: '60px', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center', maxWidth: '400px', width: '100%' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '16px' },
    button: { padding: '12px', background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' },
    erro: { background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px' }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ fontSize: '80px', marginBottom: '20px' }}>🍔</div>
        <h1 style={{ marginBottom: '10px', color: '#333' }}>Pré-Compra</h1>
        <p style={{ color: '#666', marginBottom: '30px' }}>Faça sua encomenda com antecedência</p>

        <form onSubmit={(e) => { e.preventDefault(); handleContinuarVisitante(); }} style={styles.form}>
          {erro && <div style={styles.erro}>{erro}</div>}
          <input
            type="text"
            placeholder="Seu nome"
            value={nomeVisitante}
            onChange={(e) => setNomeVisitante(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="text"
            placeholder="Código do evento"
            value={codigoEvento}
            onChange={(e) => setCodigoEvento(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            style={styles.button}
            disabled={carregando}
          >
            {carregando ? 'Acessando...' : '✅ Acessar Cardápio'}
          </button>
        </form>
        <p style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>ℹ️ Sem necessidade de criar conta</p>
      </div>
    </div>
  );
}
