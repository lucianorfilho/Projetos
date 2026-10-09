import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Venda {
  id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
  desconto_aplicado: number;
  data_venda: string;
}

interface Produto {
  id: number;
  nome: string;
  preco_venda: number;
  estoque_atual: number;
}

export default function Vendas() {
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [formularioVisivel, setFormularioVisivel] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    preco_unitario: '',
    desconto_aplicado: '0',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [vendasRes, produtosRes] = await Promise.all([
        axios.get('http://localhost:4600/api/vendas'),
        axios.get('http://localhost:4600/api/produtos'),
      ]);
      setVendas(vendasRes.data);
      setProdutos(produtosRes.data);
    } catch (erro) {
      console.error('Erro ao carregar dados:', erro);
      setMensagem('Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4600/api/vendas', {
        produto_id: parseInt(formData.produto_id),
        quantidade: parseInt(formData.quantidade),
        preco_unitario: parseFloat(formData.preco_unitario),
        desconto_aplicado: parseFloat(formData.desconto_aplicado),
      });
      setMensagem('Venda registrada com sucesso!');
      setFormData({
        produto_id: '',
        quantidade: '',
        preco_unitario: '',
        desconto_aplicado: '0',
      });
      setFormularioVisivel(false);
      carregarDados();
      setTimeout(() => setMensagem(''), 3000);
    } catch (erro: any) {
      setMensagem(erro.response?.data?.erro || 'Erro ao registrar venda');
    }
  };

  if (carregando) return <div className="loading">Carregando vendas...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Registro de Vendas</h1>
        <button
          className="btn btn-primary"
          onClick={() => setFormularioVisivel(!formularioVisivel)}
        >
          {formularioVisivel ? '✕ Cancelar' : '+ Nova Venda'}
        </button>
      </div>

      {mensagem && (
        <div className={`alert ${mensagem.includes('sucesso') ? 'alert-success' : 'alert-danger'}`}>
          {mensagem}
        </div>
      )}

      {formularioVisivel && (
        <div className="card">
          <h2 className="card-title">Registrar Nova Venda</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Produto *</label>
                <select
                  required
                  value={formData.produto_id}
                  onChange={(e) => {
                    const produto = produtos.find(p => p.id === parseInt(e.target.value));
                    setFormData({
                      ...formData,
                      produto_id: e.target.value,
                      preco_unitario: produto?.preco_venda.toString() || '',
                    });
                  }}
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} (Est: {p.estoque_atual})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Quantidade *</label>
                <input
                  type="number"
                  required
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Preço Unitário *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.preco_unitario}
                  onChange={(e) => setFormData({ ...formData, preco_unitario: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.desconto_aplicado}
                  onChange={(e) => setFormData({ ...formData, desconto_aplicado: e.target.value })}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              Registrar Venda
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2 className="card-title">Histórico de Vendas</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Preço Unit.</th>
              <th>Desconto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {vendas.slice().reverse().map((venda) => (
              <tr key={venda.id}>
                <td>{new Date(venda.data_venda).toLocaleDateString('pt-BR')}</td>
                <td>{venda.produto_nome}</td>
                <td>{venda.quantidade}</td>
                <td>R$ {venda.preco_unitario.toFixed(2)}</td>
                <td>R$ {venda.desconto_aplicado.toFixed(2)}</td>
                <td><strong>R$ {venda.total.toFixed(2)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendas.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            Nenhuma venda registrada
          </p>
        )}
      </div>
    </div>
  );
}
