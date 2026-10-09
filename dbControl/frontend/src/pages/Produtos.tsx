import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Produto {
  id: number;
  nome: string;
  sku: string;
  preco_venda: number;
  preco_custo: number;
  estoque_atual: number;
  estoque_minimo: number;
  categoria: string;
  ativo: boolean;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [formularioVisivel, setFormularioVisivel] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    sku: '',
    preco_custo: '',
    preco_venda: '',
    estoque_atual: '',
    estoque_minimo: '10',
    categoria: 'Sem categoria',
  });

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = async () => {
    try {
      const response = await axios.get('http://localhost:4600/api/produtos');
      setProdutos(response.data);
    } catch (erro) {
      console.error('Erro ao carregar produtos:', erro);
      setMensagem('Erro ao carregar produtos');
    } finally {
      setCarregando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:4600/api/produtos', {
        ...formData,
        preco_custo: parseFloat(formData.preco_custo),
        preco_venda: parseFloat(formData.preco_venda),
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo),
      });
      setMensagem('Produto criado com sucesso!');
      setFormData({
        nome: '',
        sku: '',
        preco_custo: '',
        preco_venda: '',
        estoque_atual: '',
        estoque_minimo: '10',
        categoria: 'Sem categoria',
      });
      setFormularioVisivel(false);
      carregarProdutos();
      setTimeout(() => setMensagem(''), 3000);
    } catch (erro) {
      setMensagem('Erro ao criar produto');
    }
  };

  if (carregando) return <div className="loading">Carregando produtos...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Cadastro de Produtos</h1>
        <button
          className="btn btn-primary"
          onClick={() => setFormularioVisivel(!formularioVisivel)}
        >
          {formularioVisivel ? '✕ Cancelar' : '+ Novo Produto'}
        </button>
      </div>

      {mensagem && (
        <div className={`alert ${mensagem.includes('sucesso') ? 'alert-success' : 'alert-danger'}`}>
          {mensagem}
        </div>
      )}

      {formularioVisivel && (
        <div className="card">
          <h2 className="card-title">Novo Produto</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label>Nome do Produto *</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>SKU *</label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Preço de Custo</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.preco_custo}
                  onChange={(e) => setFormData({ ...formData, preco_custo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Preço de Venda *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.preco_venda}
                  onChange={(e) => setFormData({ ...formData, preco_venda: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Estoque Atual</label>
                <input
                  type="number"
                  value={formData.estoque_atual}
                  onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Estoque Mínimo</label>
                <input
                  type="number"
                  value={formData.estoque_minimo}
                  onChange={(e) => setFormData({ ...formData, estoque_minimo: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Categoria</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                >
                  <option>Eletrônicos</option>
                  <option>Alimentos</option>
                  <option>Bebidas</option>
                  <option>Higiene</option>
                  <option>Limpeza</option>
                  <option>Outros</option>
                  <option>Sem categoria</option>
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-success" style={{ marginTop: '1rem' }}>
              Criar Produto
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Preço Venda</th>
              <th>Estoque</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((produto) => (
              <tr key={produto.id}>
                <td><strong>{produto.nome}</strong></td>
                <td>{produto.sku}</td>
                <td>{produto.categoria}</td>
                <td>R$ {produto.preco_venda.toFixed(2)}</td>
                <td>{produto.estoque_atual}</td>
                <td>
                  {produto.estoque_atual <= produto.estoque_minimo ? (
                    <span style={{ color: '#ff9800', fontWeight: 'bold' }}>⚠️ Baixo</span>
                  ) : (
                    <span style={{ color: '#4caf50', fontWeight: 'bold' }}>✓ OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {produtos.length === 0 && (
          <p style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
            Nenhum produto cadastrado
          </p>
        )}
      </div>
    </div>
  );
}
