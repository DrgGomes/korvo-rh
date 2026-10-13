'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const itens = [
  { nome: 'Dashboard', href: '/dashboard', icone: '🏠' },
  { nome: 'Funcionários', href: '/funcionarios', icone: '👥' },
  { nome: 'Ponto', href: '/ponto', icone: '⏱️' },
  { nome: 'Folha', href: '/folha', icone: '📄' },
  { nome: 'Holerites', href: '/holerites', icone: '🧾' },
  { nome: 'Relatório', href: '/relatorio', icone: '💳' },
  { nome: 'Config.', href: '/configuracoes', icone: '⚙️' },
];

export default function Sidebar({ nome, perfil }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-gray-200 min-h-screen flex-col sticky top-0 h-screen">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-xl font-extrabold text-green-700">Korvo RH</div>
          <div className="text-xs text-gray-500">Controle interno de pagamentos</div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                pathname === item.href ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icone}</span> {item.nome}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-200">
          <div className="px-3 py-1 text-sm font-semibold truncate">{nome || 'Usuário'}</div>
          <div className="px-3 pb-2 text-xs text-gray-500 capitalize">Perfil: {perfil || '—'}</div>
          <button
            onClick={sair}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 font-medium"
          >
            Sair da conta
          </button>
        </div>
      </aside>

      <div className="md:hidden w-full bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-lg font-extrabold text-green-700">Korvo RH</div>
          <button onClick={sair} className="text-sm text-red-600 font-medium">Sair</button>
        </div>
        <nav className="flex gap-1 px-3 pb-3 overflow-x-auto">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium ${
                pathname === item.href ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {item.icone} {item.nome}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
