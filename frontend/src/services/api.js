import axios from 'axios';

// Use relative URL to use same origin (HTTP or HTTPS)
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (nome, email, role, senha) =>
    api.post('/auth/register', { nome, email, role, senha }),
  login: (email, password) =>
    api.post('/auth/login', null, { params: { email, password } }),
  me: () => api.get('/usuarios/me'),
};

export const produtoAPI = {
  listar: () => api.get('/produtos'),
  // Telas de venda: nunca oferecer produto desativado ao cliente.
  listarAtivos: () => api.get('/produtos', { params: { apenas_ativos: true } }),
  criar: (nome, preco, descricao, estoque, categoria) =>
    api.post('/produtos', {
      nome,
      preco: parseFloat(preco),
      descricao: descricao || null,
      estoque: estoque ? parseInt(estoque) : 0,
      categoria: categoria || 'Laranja'
    }),
  atualizar: (id, dados) =>
    api.patch(`/produtos/${id}`, dados),
  deletar: (id) =>
    api.delete(`/produtos/${id}`),
};

export const vendaAPI = {
  listar: () => api.get('/vendas'),
  criar: (itens) => api.post('/vendas', { itens }),
  criarComCliente: (itens, clienteNome, metodoPagamento = 'dinheiro') =>
    api.post('/vendas', {
      itens,
      cliente_nome: clienteNome,
      metodo_pagamento: metodoPagamento
    }),
  getDia: () => api.get('/vendas/dia/vendas'),
  get: (id) => api.get(`/vendas/${id}`),
  marcarPronto: (itemId) =>
    api.patch(`/vendas/itens/${itemId}`, { pronto: true }),
};

export default api;
