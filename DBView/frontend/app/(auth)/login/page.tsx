'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', phone: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/login', { email: form.email, password: form.password });
      localStorage.setItem('dbview_token', res.data.token);
      localStorage.setItem('dbview_user', JSON.stringify(res.data.user));
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/api/auth/register', form);
      setSuccess('Cadastro realizado! Aguarde a aprovação do administrador para acessar o plano Free (1 instância).');
      setMode('login');
      setForm({ name: '', email: '', password: '', company: '', phone: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-600 mb-4">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">DBView</h1>
          <p className="text-gray-400 mt-1">Raio-X e monitoramento do seu Oracle</p>
        </div>

        <div className="flex bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
          <button onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'login' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Entrar
          </button>
          <button onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'register' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Criar Conta
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-6 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg px-4 py-3 mb-6 text-sm">{success}</div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="seu@email.com" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
                <input type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="••••••••" required className={inputCls} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold rounded-lg px-4 py-2.5 transition mt-2">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Nome completo</label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  placeholder="Seu nome" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">E-mail</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="seu@email.com" required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Senha</label>
                <input type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="Mínimo 8 caracteres" required minLength={8} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Empresa</label>
                <input type="text" name="company" value={form.company} onChange={handleChange}
                  placeholder="Nome da sua empresa" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Telefone</label>
                <input type="text" name="phone" value={form.phone} onChange={handleChange}
                  placeholder="(00) 00000-0000" className={inputCls} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-800 text-white font-semibold rounded-lg px-4 py-2.5 transition mt-2">
                {loading ? 'Cadastrando...' : 'Criar Conta Grátis'}
              </button>
              <p className="text-xs text-gray-500 text-center">
                Plano Free: 1 instância monitorada. Instâncias adicionais: R$ 30/mês cada.
              </p>
            </form>
          )}
        </div>
        <p className="text-center text-gray-600 text-sm mt-6">DBView © {new Date().getFullYear()} — dbtech solutions</p>
      </div>
    </div>
  );
}
