import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Produtos from './pages/Produtos';
import Vendas from './pages/Vendas';
import Alertas from './pages/Alertas';
import Relatorios from './pages/Relatorios';
import './App.css';

function App() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="logo">
              <span className="logo-icon">📊</span> dbControl
            </Link>
            <button
              className="menu-toggle"
              onClick={() => setMenuAberto(!menuAberto)}
            >
              ☰
            </button>
            <ul className={`nav-menu ${menuAberto ? 'ativo' : ''}`}>
              <li><Link to="/" onClick={() => setMenuAberto(false)}>Dashboard</Link></li>
              <li><Link to="/produtos" onClick={() => setMenuAberto(false)}>Produtos</Link></li>
              <li><Link to="/vendas" onClick={() => setMenuAberto(false)}>Vendas</Link></li>
              <li><Link to="/alertas" onClick={() => setMenuAberto(false)}>Alertas</Link></li>
              <li><Link to="/relatorios" onClick={() => setMenuAberto(false)}>Relatórios</Link></li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/relatorios" element={<Relatorios />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
