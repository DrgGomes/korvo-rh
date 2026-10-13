'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

export default function UsuariosPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', perfil: 'gerente', senha: '' });

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    if (prof?.perfil !== 'master') { router.push('/dashboard'); return; }
    if (prof?.empresa_id) {
      const { data: lista } = await supabase.from('profiles').select('id, nome, email, perfil').eq('empresa_id', prof.empresa_id).order('nome');
      setUsuarios(lista || []);
    }
    setCarregando(false);
  }

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  async function convidar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim() || !form.email.trim() || !form.senha || form.senha.length < 6) {
      setErro('Preencha nome, e-mail e uma senha com pelo menos 6 caracteres.');
      return;
    }
    setSalvando(true);
    const { error } = await supabase.rpc('convidar_usuario', {
      p_nome: form.nome.trim(),
      p_email: form.email.trim(),
      p_perfil: form.perfil,
      p_senha: form.senha,
    });
    setSalvando(false);
    if (error) { setErro('Erro: ' + error.message); return; }
    setModal(false);
    setForm({ nome: '', email: '', perfil: 'gerente', senha: '' });
    setAvisoA('ok', 'Usuário criado! Avise a pessoa para entrar com o e-mail e a senha que você definiu.');
    carregar();
  }

  async function remover(u) {
    if (!window.confirm(`Remover o acesso de ${u.nome}?`)) return;
    const { error } = await supabase.rpc('remover_usuario', { p_uid: u.id });
    if (error) { alert('Erro: ' + error.message); return; }
    setAvisoA('ok', `Acesso de ${u.nome} removido.`);
    carregar();
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
  }

  const campo = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const rotulo = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários e perfis</h1>
            <p className="text-sm text-gray-500">Crie acessos de Gerente e Financeiro — cada um vê só o que pode</p>
          </div>
          <button onClick={() => { setErro(''); setModal(true); }} className="bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700">
            + Convidar usuário
          </button>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Acessos da empresa ({usuarios.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {u.perfil === 'master' ? (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">Master (CEO)</span>
                      ) : u.perfil === 'gerente' ? (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Gerente</span>
                      ) : (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Financeiro</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.perfil !== 'master' && (
                        <button onClick={() => remover(u)} className="text-red-600 hover:underline text-xs font-semibold">Remover</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
          <b>O que cada perfil vê:</b>
          <ul className="list-disc list-inside mt-1 text-xs text-gray-500 space-y-1">
            <li><b className="text-purple-700">Master (CEO):</b> tudo — funcionários, ponto, folha, holerites, relatório, usuários e configurações</li>
            <li><b className="text-blue-700">Gerente:</b> funcionários, ponto, folha, holerites e relatório — sem usuários e sem configurações</li>
            <li><b className="text-gray-700">Financeiro:</b> ponto, folha e relatório de pagamento — vê apenas o necessário para pagar</li>
          </ul>
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Convidar usuário</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <form onSubmit={convidar} className="p-6 space-y-4">
              <div>
                <label className={rotulo}>Nome completo *</label>
                <input className={campo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Ana Souza" required />
              </div>
              <div>
                <label className={rotulo}>E-mail *</label>
                <input type="email" className={campo} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ana@empresa.com" required />
              </div>
              <div>
                <label className={rotulo}>Perfil de acesso</label>
                <select className={campo} value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
                  <option value="gerente">Gerente</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div>
                <label className={rotulo}>Senha temporária (avise a pessoa) *</label>
                <input type="text" className={campo} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 6 caracteres" required />
                <p className="text-xs text-gray-400 mt-1">Ex.: korvo123 — a pessoa troca depois (recurso que adicionaremos em um próximo bloco).</p>
              </div>
              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50">Cancelar</button>
                <button type="submit" disabled={salvando} className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50">
                  {salvando ? 'Criando...' : 'Criar acesso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
