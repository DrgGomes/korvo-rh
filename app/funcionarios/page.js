'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const brl = (v) =>
  v == null || isNaN(v) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const mascaraCPF = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const tiposPix = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };

const vazio = {
  nome: '', cpf: '', telefone: '', cargo: '', forma_pagamento: 'diaria', valor: '',
  modo_calculo: 'somente_valor', chave_pix: '', tipo_chave_pix: 'cpf', dia_pagamento: 5, status: 'ativo',
};

export default function FuncionariosPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [plano, setPlano] = useState('gratis');
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(vazio);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState('');

  const limiteGratis = 3;
  const ativos = funcionarios.filter((f) => f.status === 'ativo').length;
  const podeAdicionar = plano !== 'gratis' || ativos < limiteGratis;
  const atingiuLimite = plano === 'gratis' && ativos >= limiteGratis;

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

    let planoAtual = 'gratis';
    if (prof?.empresa_id) {
      const { data: emp } = await supabase.from('empresas').select('plano').eq('id', prof.empresa_id).single();
      planoAtual = emp?.plano || 'gratis';
    }
    setPlano(planoAtual);

    const { data: lista } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(lista || []);
    setCarregando(false);
  }

  function abrirNovo() {
    setErro('');
    if (!podeAdicionar) {
      alert('Limite do plano grátis atingido (3 funcionários). Para adicionar mais, assine o plano Essencial por R$ 14,90/mês.');
      return;
    }
    setEditandoId(null);
    setForm(vazio);
    setModal(true);
  }

  function abrirEdicao(f) {
    setErro('');
    setEditandoId(f.id);
    setForm({
      nome: f.nome || '',
      cpf: f.cpf || '',
      telefone: f.telefone || '',
      cargo: f.cargo || '',
      forma_pagamento: f.forma_pagamento || 'diaria',
      valor: f.valor != null ? String(f.valor).replace('.', ',') : '',
      modo_calculo: f.modo_calculo || 'somente_valor',
      chave_pix: f.chave_pix || '',
      tipo_chave_pix: f.tipo_chave_pix || 'cpf',
      dia_pagamento: f.dia_pagamento || 5,
      status: f.status || 'ativo',
    });
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.nome.trim()) { setErro('Informe o nome do funcionário.'); return; }
    const valorNum = parseFloat(String(form.valor).replace(',', '.')) || 0;
    const diaPag = Math.min(31, Math.max(1, parseInt(form.dia_pagamento, 10) || 5));

    const payload = {
      nome: form.nome.trim(),
      cpf: form.cpf || null,
      telefone: form.telefone || null,
      cargo: form.cargo || null,
      forma_pagamento: form.forma_pagamento,
      valor: valorNum,
      modo_calculo: form.modo_calculo,
      chave_pix: form.chave_pix || null,
      tipo_chave_pix: form.tipo_chave_pix,
      dia_pagamento: diaPag,
      status: form.status,
      empresa_id: empresaId,
    };

    setSalvando(true);
    let erroSalvar = null;
    if (editandoId) {
      const { error } = await supabase.from('funcionarios').update(payload).eq('id', editandoId);
      erroSalvar = error;
    } else {
      const { error } = await supabase.from('funcionarios').insert(payload);
      erroSalvar = error;
    }
    setSalvando(false);

    if (erroSalvar) {
      setErro('Erro ao salvar: ' + erroSalvar.message);
      return;
    }
    setModal(false);
    setForm(vazio);
    const { data: lista } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(lista || []);
  }

  async function excluir(f) {
    if (!window.confirm(`Excluir ${f.nome}? Os registros de ponto e folha dele também serão apagados.`)) return;
    const { error } = await supabase.from('funcionarios').delete().eq('id', f.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    const { data: lista } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(lista || []);
  }

  const filtrados = funcionarios.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase()));

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
            <h1 className="text-2xl font-bold text-gray-900">Funcionários</h1>
            <p className="text-sm text-gray-500">{ativos} ativos • {funcionarios.length} cadastrados</p>
          </div>
          <button
            onClick={abrirNovo}
            disabled={atingiuLimite}
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            + Novo Funcionário
          </button>
        </div>

        {atingiuLimite && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <span>🔒</span> Limite do plano Grátis atingido
            </div>
            <p className="text-sm text-amber-700 mt-1">
              Você cadastrou {ativos} de 3 funcionários permitidos. Assine o <b>Essencial (R$ 14,90/mês)</b> para adicionar
              até 10 funcionários, ou o <b>Ilimitado (R$ 29,90/mês)</b> sem limite.
            </p>
            <div className="mt-3 h-2 bg-amber-200 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (ativos / limiteGratis) * 100)}%` }} />
            </div>
          </div>
        )}

        {!atingiuLimite && plano === 'gratis' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-sm text-green-800">
            🌱 <b>Plano Grátis:</b> {ativos} de {limiteGratis} funcionários. Quando precisar crescer, o sistema te mostra como assinar.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <input
              className="w-full md:w-72 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Buscar por nome..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          {filtrados.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <div className="text-4xl mb-2">👥</div>
              <p className="font-medium">Nenhum funcionário cadastrado</p>
              <p className="text-sm mt-1">Clique em "+ Novo Funcionário" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Modo de cálculo</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="px-4 py-3">Dia</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((f) => (
                    <tr key={f.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{f.nome}</div>
                        <div className="text-xs text-gray-500">{f.cargo || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-800">{f.forma_pagamento === 'diaria' ? 'Por diária' : 'Por hora'}</div>
                        <div className="font-semibold text-green-700">{brl(f.valor)}<span className="font-normal text-gray-400">/{f.forma_pagamento === 'diaria' ? 'dia' : 'hora'}</span></div>
                      </td>
                      <td className="px-4 py-3">
                        {f.modo_calculo === 'direitos_fora' ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                            Com direitos por fora
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            Somente valor
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {f.chave_pix ? (
                          <div>
                            <div className="text-gray-800 font-medium text-xs">{f.chave_pix}</div>
                            <div className="text-xs text-gray-400">{tiposPix[f.tipo_chave_pix] || ''}</div>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">Dia {f.dia_pagamento}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${f.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {f.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => abrirEdicao(f)} className="text-blue-600 hover:underline text-xs font-semibold mr-3">Editar</button>
                        <button onClick={() => excluir(f)} className="text-red-600 hover:underline text-xs font-semibold">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editandoId ? 'Editar funcionário' : 'Novo funcionário'}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <form onSubmit={salvar} className="p-6 space-y-4">
              <div>
                <label className={rotulo}>Nome completo *</label>
                <input className={campo} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: João Silva" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>CPF (opcional)</label>
                  <input className={campo} value={form.cpf} onChange={(e) => setForm({ ...form, cpf: mascaraCPF(e.target.value) })} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className={rotulo}>Telefone (opcional)</label>
                  <input className={campo} value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-0000" />
                </div>
              </div>

              <div>
                <label className={rotulo}>Cargo (opcional)</label>
                <input className={campo} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} placeholder="Ex.: Vendedor" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Pagamento por</label>
                  <select className={campo} value={form.forma_pagamento} onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}>
                    <option value="diaria">Diária</option>
                    <option value="hora">Hora</option>
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Valor (R$ por {form.forma_pagamento === 'diaria' ? 'dia' : 'hora'}) *</label>
                  <input className={campo} inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Ex.: 80,00" required />
                </div>
              </div>

              <div>
                <label className={rotulo}>Modo de cálculo</label>
                <select className={campo} value={form.modo_calculo} onChange={(e) => setForm({ ...form, modo_calculo: e.target.value })}>
                  <option value="somente_valor">Somente valor combinado</option>
                  <option value="direitos_fora">Com direitos por fora (13º, férias +1/3, depósito)</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {form.modo_calculo === 'direitos_fora'
                    ? 'Na folha, soma 13º proporcional, férias +1/3 e depósito mensal sugerido.'
                    : 'Na folha, entra apenas o valor de dias/horas trabalhados.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Chave PIX</label>
                  <input className={campo} value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} placeholder="chave do funcionário" />
                </div>
                <div>
                  <label className={rotulo}>Tipo da chave</label>
                  <select className={campo} value={form.tipo_chave_pix} onChange={(e) => setForm({ ...form, tipo_chave_pix: e.target.value })}>
                    {Object.entries(tiposPix).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={rotulo}>Dia de pagamento</label>
                  <input type="number" min="1" max="31" className={campo} value={form.dia_pagamento} onChange={(e) => setForm({ ...form, dia_pagamento: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Status</label>
                  <select className={campo} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2.5 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 bg-green-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar funcionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
