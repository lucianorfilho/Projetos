import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4100',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('dbview_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined'
        && !window.location.pathname.startsWith('/login')) {
      localStorage.removeItem('dbview_token');
      localStorage.removeItem('dbview_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
