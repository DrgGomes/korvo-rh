'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

export default function Dashboard() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('nome, perfil')
        .eq('id', user.id)
        .single();
      setPerfil(data);
      setCarregando(false);
    }
    carregar();
  }, [router]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>
    );
  }

  const cards = [
    { titulo: 'Funcionários ativos', valor: '0', dica: 'Cadastre no módulo Funcionários', href: '/funcionarios' },
    { titulo: 'Folha do mês', valor: 'R$ 0,00', dica: 'Gere a folha no módulo Folha', href: '/folha' },
    { titulo: 'Pendências hoje', valor: '0', dica: 'Confira no Relatório', href: '/relatorio' },
    { titulo: 'Horas extras no mês', valor: '0h', dica: 'Registre no módulo Ponto', href: '/ponto' },
  ];

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Olá, {perfil?.nome || 'usuário'} 👋</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} — plano{' '}
            <span className="font-semibold text-green-700">Grátis</span> (até 3 funcionários)
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <Link key={c.titulo} href={c.href} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
              <div className="text-sm text-gray-500 font-medium">{c.titulo}</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{c.valor}</div>
              <div className="text-xs text-gray-400 mt-2">{c.dica}</div>
            </Link>
          ))}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-green-900">Comece por aqui 🚀</h2>
          <p className="text-sm text-green-800 mt-1">
            Os módulos de Funcionários, Ponto, Folha, Holerites e Relatório estão sendo construídos
            e chegam nos próximos blocos. Já dá para testar o login e a navegação.
          </p>
          <Link href="/funcionarios" className="inline-block mt-4 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700">
            Abrir Funcionários
          </Link>
        </div>
      </main>
    </div>
  );
}
