import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Shell from '../components/Shell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'DBSpeaker — Conversação em inglês com IA',
  description: 'Converse, seja corrigido e evolua de nível — do básico ao avançado',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-gray-950 text-gray-100 antialiased`}>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
