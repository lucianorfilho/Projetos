import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Alerta {
  id: number;
  produto_nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  data_alerta: string;
}

export default function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    carregarAlertas();
    const intervalo = setInterval(carregarAlertas, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const carregarAlertas = async () => {
    try {
      const response = await axios.get('http://localhost:4600/api/alertas');
      setAlertas(response.data);
    } catch (erro) {
      console.error('Erro ao carregar alertas:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const resolverAlerta = async (id: number) => {
    try {
      await axios.put(`http://localhost:4600/api/alertas/${id}/resolver`);
      setMensagem('Alerta resolvido com sucesso!');
      carregarAlertas();
      setTimeout(() => setMensagem(''), 3000);
    } catch (erro) {
      setMensagem('Erro ao resolver alerta');
    }
  };

  if (carregando) return <div className="loading">Carregando alertas...</div>;

  return (
    <div>
      <h1>Alertas de Estoque</h1>

      {mensagem && (
        <div className={`alert ${mensagem.includes('sucesso') ? 'alert-success' : 'alert-danger'}`}>
          {mensagem}
        </div>
      )}

      {alertas.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div className="alert alert-warning">
            <strong>⚠️ {alertas.length} produto(s) com estoque baixo!</strong>
            <p>Revise os alertas abaixo e reabastecimento conforme necessário.</p>
          </div>
        </div>
      )}

      <div className="card">
        {alertas.length > 0 ? (
          <div>
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  borderLeft: '4px solid #ff9800',
                  backgroundColor: '#fff3e0',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{alerta.produto_nome}</h3>
                  <p style={{ margin: 0, marginBottom: '0.25rem', fontSize: '0.9rem', color: '#666' }}>
                    Estoque atual: <strong>{alerta.estoque_atual}</strong> unidades
                  </p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                    Mínimo necessário: <strong>{alerta.estoque_minimo}</strong> unidades
                  </p>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#999' }}>
                    Alertado em: {new Date(alerta.data_alerta).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(alerta.data_alerta).toLocaleTimeString('pt-BR')}
                  </p>
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => resolverAlerta(alerta.id)}
                >
                  ✓ Resolvido
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</p>
            <p style={{ color: '#4caf50', fontWeight: 'bold', fontSize: '1.2rem' }}>
              Todos os produtos estão com estoque adequado!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
