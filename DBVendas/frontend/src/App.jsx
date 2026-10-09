import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import Landing from './pages/Landing';
import AdminDashboard from './pages/AdminDashboard';
import Vendas from './pages/Vendas';
import Cozinha from './pages/Cozinha';
import Menu from './pages/Menu';
import Relatorios from './pages/Relatorios';
import './styles/index.css';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  return token ? children : <Navigate to="/" />;
}

export default function App() {
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'access_token' || e.key === 'user') {
        window.location.reload();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/vendas" element={<ProtectedRoute><Vendas /></ProtectedRoute>} />
        <Route path="/cozinha" element={<ProtectedRoute><Cozinha /></ProtectedRoute>} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
