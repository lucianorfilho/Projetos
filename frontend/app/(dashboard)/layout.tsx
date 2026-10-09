'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Archive, Bell, Users, LogOut, Menu, Shield, Download, HardDrive, CreditCard, Receipt } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedSubmenu, setExpandedSubmenu] = useState<string | null>(null);
  const [alertCount, setAlertCount] = useState(0);

  async function loadAlertCount() {
    try {
      const token = localStorage.getItem('dbvault_token');
      if (!token) return;
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/alerts/count/unread', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAlertCount(data.unread || 0);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('dbvault_token');
    const userData = localStorage.getItem('dbvault_user');
    if (!token) { router.push('/login'); return; }
    if (userData) setUser(JSON.parse(userData));
    loadAlertCount();

    const handleAlertUpdate = () => loadAlertCount();
    window.addEventListener('alertsUpdated', handleAlertUpdate);

    const interval = setInterval(loadAlertCount, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('alertsUpdated', handleAlertUpdate);
    };
  }, []);

  function logout() {
    localStorage.removeItem('dbvault_token');
    localStorage.removeItem('dbvault_user');
    router.push('/login');
  }

  const clientNav = [
    { href: '/dashboard',     label: 'Dashboard',        icon: LayoutDashboard },
    { href: '/storage',       label: 'Storage',           icon: HardDrive },
    {
      label: 'Faturamento',
      icon: CreditCard,
      submenu: [
        { href: '/plans',         label: 'Planos' },
        { href: '/faturas',       label: 'Faturas em Aberto' },
        { href: '/faturas/pagas', label: 'Faturas Pagas' },
      ]
    },
    { href: '/alerts',        label: 'Alertas',           icon: Bell },
    { href: '/download',      label: 'Agentes',           icon: Download },
  ];

  const adminNav = [
    { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
    { href: '/backups',    label: 'Backups',      icon: Archive },
    { href: '/alerts',     label: 'Alertas',      icon: Bell },
    { href: '/admin',      label: 'Usuários',        icon: Users },
  ];

  const navItems = user?.role === 'admin' ? adminNav : clientNav;

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-bold text-lg">DBVault</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item: any) => {
          const isSubmenu = 'submenu' in item;
          if (isSubmenu) {
            const submenuLabel = item.label;
            const Icon = item.icon;
            const isOpen = expandedSubmenu === submenuLabel;
            const isActive = item.submenu.some((sub: any) => pathname === sub.href || pathname.startsWith(sub.href + '/'));
            return (
              <div key={submenuLabel}>
                <button
                  onClick={() => setExpandedSubmenu(isOpen ? null : submenuLabel)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}>
                  <Icon className="w-5 h-5" />
                  {submenuLabel}
                  <svg className={`w-4 h-4 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="ml-2 mt-1 space-y-1 pl-2 border-l border-gray-700">
                    {item.submenu.map((sub: any) => {
                      const subActive = pathname === sub.href || pathname.startsWith(sub.href + '/');
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all block ${
                            subActive ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                          }`}>
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
          const { href, label, icon: Icon } = item;
          const hasMoreSpecificMatch = navItems.some((other: any) => !('submenu' in other) && other.href !== href && other.href.startsWith(href + '/') && (pathname === other.href || pathname.startsWith(other.href + '/')));
          const active = !hasMoreSpecificMatch && (pathname === href || pathname.startsWith(href + '/'));
          return (
            <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              <Icon className="w-5 h-5" />
              {label}
              {href === '/alerts' && alertCount > 0 && (
                <span className="ml-auto flex items-center justify-center w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0) ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
          </div>
        </div>
        <button onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full">
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 border-r border-gray-800 flex-shrink-0">
        <Sidebar />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-gray-900 border-r border-gray-800">
            <Sidebar />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold">DBVault</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
