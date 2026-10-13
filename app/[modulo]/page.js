'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

export default function ModuloPagina() {
  const params = useParams();
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const titulos = {
    funcionarios: 'Funcionários',
    ponto: 'Controle de Ponto',
    folha: 'Folha de Pagamento',
    holerites: 'Holerites',
    relatorio: 'Relatório de Pagamento',
    configuracoes: 'Configurações',
  };
  const titulo = titulos[params?.modulo] || 'Módulo';

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

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{titulo}</h1>
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
          <div className="text-4xl mb-2">🚧</div>
          <p className="text-gray-600 font-medium">Módulo {titulo} em construção</p>
          <p className="text-sm text-gray-400 mt-1">Ele chega no próximo bloco — continue colando os arquivos.</p>
        </div>
      </main>
    </div>
  );
}
