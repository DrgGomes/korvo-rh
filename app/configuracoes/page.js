'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [form, setForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    dia_pagamento_padrao: 5,
    percentual_hora_extra: 50,
  });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    setEmpresaId(prof?.empresa_id || null);

    if (prof?.empresa_id) {
      const { data: emp } = await supabase.from('empresas').select('*').eq('id', prof.empresa_id).single();
      if (emp) {
        setForm({
          nome: emp.nome || '',
          cnpj: emp.cnpj || '',
          telefone: emp.telefone || '',
          endereco: emp.endereco || '',
          dia_pagamento_padrao: emp.dia_pagamento_padrao ?? 5,
          percentual_hora_extra: emp.percentual_hora_extra ?? 50,
        });
      }
    }
    setCarregando(false);
  }

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) { setErro('Informe o nome da empresa.'); return; }
    const dia = Math.min(31, Math.max(1, parseInt(form.dia_pagamento_padrao, 10) || 5));
    const pct = Math.min(200, Math.max(0, parseFloat(String(form.percentual_hora_extra).replace(',', '.')) || 50));

    setSalvando(true);
    const { error } = await supabase.from('empresas').update({
      nome: form.nome.trim(),
      cnpj: form.cnpj || null,
      telefone: form.telefone || null,
      endereco: form.endereco || null,
      dia_pagamento_padrao: dia,
      percentual_hora_extra: pct,
    }).eq('id', empresaId);
    setSalvando(false);

    if (error) { setErro('Erro ao salvar: ' + error.message); return; }
    setAvisoA('ok', 'Configurações salvas com sucesso ✅');
  }

  const campo = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const rotulo = 'block text-xs font-semibold text-gray-600 mb-1';

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
  }

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Dados da empresa, preferências de pagamento e segurança</p>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        <form onSubmit={salvar} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🏢 Dados da empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className={rotulo}>Nome da empresa *</label>
                <input className={campo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Mercadinho do João" required />
              </div>
              <div>
                <label className={rotulo}>CNPJ (opcional)</label>
                <input className={campo} value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div>
                <label className={rotulo}>Telefone (opcional)</label>
                <input className={campo} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000" />
              </div>
              <div className="md:col-span-2">
                <label className={rotulo}>Endereço (opcional)</label>
                <input className={campo} value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ Preferências de pagamento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={rotulo}>Dia padrão de pagamento</label>
                <input type="number" min="1" max="31" className={campo} value={form.dia_pagamento_padrao} onChange={(e) => setForm({ ...form, dia_pagamento_padrao: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">Usado como sugestão ao cadastrar funcionários.</p>
              </div>
              <div>
                <label className={rotulo}>Percentual de hora extra (%)</label>
                <input className={campo} inputMode="decimal" value={form.percentual_hora_extra} onChange={(e) => setForm({ ...form, percentual_hora_extra: e.target.value })} />
                <p className="text-xs text-gray-400 mt-1">Padrão: 50% (adicional sobre o valor da hora).</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-amber-900 mb-2">⚠️ Aviso importante</h2>
            <p className="text-sm text-amber-800">
              O Korvo RH é um <b>sistema de controle interno</b> e não possui integração com INSS, Receita Federal ou bancos.
              Os direitos trabalhistas pagos por fora devem ser conferidos com um contador ou profissional de confiança.
              A conferência final dos cálculos é responsabilidade da empresa.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="bg-green-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
