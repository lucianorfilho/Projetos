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

export const garantirAutenticacao = (navigate) => {
  if (!verificarAutenticacao(navigate)) {
    return false;
  }
  return true;
};
