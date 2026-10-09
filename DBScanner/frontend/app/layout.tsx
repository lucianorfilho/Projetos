import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DBScanner — Conheça o seu banco de dados',
  description: 'Descoberta, catálogo e insights de bancos de dados Oracle',
};

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/tables', label: 'Tabelas' },
  { href: '/insights', label: 'Insights' },
  { href: '/knowledge', label: 'Conhecimento' },
  { href: '/evolution', label: 'Evolução' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <header className="border-b border-gray-800 bg-gray-900/60 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-8">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold tracking-tight text-emerald-400">DBScanner</span>
              <span className="text-xs text-gray-500">by dbtech solutions</span>
            </div>
            <nav className="flex gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href}
                  className="px-3 py-1.5 rounded-md text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
