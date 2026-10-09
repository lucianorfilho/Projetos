import { authAPI } from '../services/api';

export const verificarAutenticacao = (navigate) => {
  const token = localStorage.getItem('access_token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
    return false;
  }
  return true;
};

export const garantirAutenticacao = async (navigate) => {
  if (!verificarAutenticacao(navigate)) {
    return false;
  }

  try {
    await authAPI.me();
    return true;
  } catch (err) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
    return false;
  }
};
