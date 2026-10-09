'use client';

import { useEffect, useState } from 'react';
import { Download, Copy, Check, Terminal, Monitor, Server } from 'lucide-react';
import api from '@/lib/api';

export default function DownloadPage() {
  const [token, setToken] = useState<string>('');
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>('debian');

  useEffect(() => {
    api.get('/servers/token').then(res => setToken(res.data.token));
  }, []);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const tokenDisplay = token || 'carregando...';

  const commands = {
    debian: `curl -fsSL ${apiUrl}/api/agent/download/linux-debian -o install.sh && bash install.sh --token ${tokenDisplay} --server ${apiUrl}`,
    redhat: `curl -fsSL ${apiUrl}/api/agent/download/linux-redhat -o install.sh && bash install.sh --token ${tokenDisplay} --server ${apiUrl}`,
    windows: `Invoke-WebRequest -Uri "${apiUrl}/api/agent/download/windows" -OutFile install.ps1; .\\install.ps1 -Token "${tokenDisplay}" -Server "${apiUrl}"`
  };

  const platforms = [
    {
      key: 'debian',
      icon: Terminal,
      title: 'Linux â€” Debian / Ubuntu',
      description: 'Ubuntu 20.04+, Debian 10+',
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      command: commands.debian,
      downloadUrl: `${apiUrl}/api/agent/download/linux-debian`,
      filename: 'dbvault-agent-debian.sh'
    },
    {
      key: 'redhat',
      icon: Server,
      title: 'Linux â€” RedHat / CentOS / Rocky',
      description: 'RHEL 8+, CentOS 8+, Rocky Linux 8+',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
      command: commands.redhat,
      downloadUrl: `${apiUrl}/api/agent/download/linux-redhat`,
      filename: 'dbvault-agent-redhat.sh'
    },
    {
      key: 'windows',
      icon: Monitor,
      title: 'Windows',
      description: 'Windows 10, 11, Server 2019+',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      command: commands.windows,
      downloadUrl: `${apiUrl}/api/agent/download/windows`,
      filename: 'dbvault-agent-windows.ps1'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Agentes</h1>
        <p className="text-gray-400 text-sm mt-1">
          Instale o agente DBVault e envie seus arquivos para a nuvem
        </p>
      </div>

      {/* Como funciona */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Baixe e instale', desc: 'Escolha a versÃ£o do seu sistema operacional e execute o comando abaixo' },
            { step: '2', title: 'Envie um arquivo', desc: 'No terminal, rode: dbvault-sendfile <nome-do-arquivo>' },
            { step: '3', title: 'Pronto!', desc: 'O arquivo Ã© enviado direto para o seu espaÃ§o na nuvem' },
          ].map(item => (
            <div key={item.step} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-white text-sm font-medium">{item.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Download dos agentes */}
      <div className="space-y-4">
        {platforms.map(platform => {
          const isExpanded = expandedPlatform === platform.key;
          return (
            <div key={platform.key} className={`bg-gray-900 border rounded-2xl overflow-hidden ${platform.bg}`}>
              <button
                onClick={() => setExpandedPlatform(isExpanded ? null : platform.key)}
                className="w-full flex items-start justify-between p-5 hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${platform.bg}`}>
                    <platform.icon className={`w-5 h-5 ${platform.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">{platform.title}</p>
                    <p className="text-gray-500 text-xs">{platform.description}</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-700">
                  <div className="flex items-center gap-2 pt-4">
                    <a href={platform.downloadUrl} download={platform.filename}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition">
                      <Download className="w-4 h-4" />
                      Baixar
                    </a>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-2 font-medium">
                      {platform.key === 'windows' ? 'Execute no PowerShell como Administrador:' : 'Execute no terminal como root:'}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-green-400 bg-gray-950 rounded-lg px-4 py-3 overflow-x-auto whitespace-nowrap">
                        {platform.command}
                      </code>
                      <button
                        onClick={() => copy(platform.command, platform.key)}
                        className="p-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                      >
                        {copied === platform.key
                          ? <Check className="w-4 h-4 text-green-400" />
                          : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enviar arquivo */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">Enviando um arquivo</h2>
        <p className="text-gray-400 text-xs mb-2">
          Depois de instalado, use este comando para enviar qualquer arquivo para o seu espaÃ§o na nuvem:
        </p>
        <code className="block text-xs text-green-400 bg-gray-950 rounded-lg px-4 py-3">
          dbvault-sendfile /caminho/do/arquivo.sql
        </code>
      </div>

      {/* Token atual */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-3">Seu token de acesso</h2>
        <p className="text-gray-400 text-xs mb-2">
          Este token identifica sua conta na plataforma e jÃ¡ vem embutido nos comandos de instalaÃ§Ã£o acima. NÃ£o compartilhe.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-yellow-400 bg-gray-950 rounded-lg px-4 py-3 break-all">
            {tokenDisplay}
          </code>
          <button
            onClick={() => copy(token, 'token')}
            disabled={!token}
            className="p-2.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition flex-shrink-0"
          >
            {copied === 'token' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
