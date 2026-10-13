'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const pad = (n) => String(n).padStart(2, '0');
const hoje = new Date();
const hojeISO = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
const mesAtual = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}`;
const hojeBR = hoje.toLocaleDateString('pt-BR');

const tipos = {
  entrada: { label: 'Entrada', cor: 'bg-green-100 text-green-700' },
  saida: { label: 'Saída', cor: 'bg-blue-100 text-blue-700' },
  falta: { label: 'Falta', cor: 'bg-red-100 text-red-700' },
  hora_extra: { label: 'Hora extra', cor: 'bg-amber-100 text-amber-700' },
};

const fmtH = (v) => String(v ?? 0).replace('.', ',');

export default function PontoPage() {
  const router = useRouter();
  const formRef = useRef(null);
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [marcacoes, setMarcacoes] = useState([]);
  const [mes, setMes] = useState(mesAtual);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    funcionario_id: '',
    data: hojeISO,
    tipo: 'entrada',
    horas: '',
    observacao: '',
  });

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) carregarMarcacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, empresaId]);

  async function carregarTudo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    setEmpresaId(prof?.empresa_id || null);

    const { data: funcs } = await supabase.from('funcionarios').select('id, nome, status').order('nome');
    setFuncionarios(funcs || []);

    if (prof?.empresa_id) await carregarMarcacoes();
    setCarregando(false);
  }

  async function carregarMarcacoes() {
    if (!empresaId) return;
    const { data } = await supabase
      .from('ponto')
      .select('id, funcionario_id, data, tipo, horas, observacao, funcionarios(nome)')
      .gte('data', `${mes}-01`)
      .lte('data', `${mes}-31`)
      .order('data', { ascending: false });
    setMarcacoes(data || []);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    if (!form.funcionario_id) { setErro('Selecione um funcionário.'); return; }
    if (!form.data) { setErro('Informe a data.'); return; }
    if (form.tipo === 'hora_extra' && (!form.horas || parseFloat(String(form.horas).replace(',', '.')) <= 0)) {
      setErro('Informe a quantidade de horas extras.');
      return;
    }
    if (form.tipo !== 'hora_extra') {
      const { data: dup } = await supabase
        .from('ponto')
        .select('id')
        .eq('funcionario_id', form.funcionario_id)
        .eq('data', form.data)
        .eq('tipo', form.tipo)
        .maybeSingle();
      if (dup) {
        setErro(`Já existe um registro de ${tipos[form.tipo].label.toLowerCase()} para esse funcionário nessa data.`);
        return;
      }
    }

    const payload = {
      empresa_id: empresaId,
      funcionario_id: form.funcionario_id,
      data: form.data,
      tipo: form.tipo,
      horas: form.tipo === 'hora_extra' ? parseFloat(String(form.horas).replace(',', '.')) : 0,
      observacao: form.observacao || null,
    };

    setSalvando(true);
    const { error } = await supabase.from('ponto').insert(payload);
    setSalvando(false);
    if (error) { setErro('Erro ao salvar: ' + error.message); return; }

    setForm((f) => ({ ...f, horas: '', observacao: '' }));
    carregarMarcacoes();
  }

  async function marcarFalta(f) {
    if (!window.confirm(`Registrar FALTA de ${f.nome} para hoje (${hojeBR})?`)) return;
    const { data: dup } = await supabase
      .from('ponto').select('id')
      .eq('funcionario_id', f.id).eq('data', hojeISO).eq('tipo', 'falta')
      .maybeSingle();
    if (dup) { alert('Falta já registrada hoje para este funcionário.'); return; }
    const { error } = await supabase.from('ponto').insert({
      empresa_id: empresaId, funcionario_id: f.id, data: hojeISO, tipo: 'falta', horas: 0, observacao: null,
    });
    if (error) { alert('Erro: ' + error.message); return; }
    carregarMarcacoes();
  }

  function prefillExtra(f) {
    setForm({ funcionario_id: f.id, data: hojeISO, tipo: 'hora_extra', horas: '', observacao: '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  async function excluir(m) {
    if (!window.confirm('Excluir este registro?')) return;
    const { error } = await supabase.from('ponto').delete().eq('id', m.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    carregarMarcacoes();
  }

  const ativos = funcionarios.filter((f) => f.status === 'ativo');
  const totalFaltas = marcacoes.filter((m) => m.tipo === 'falta').length;
  const totalExtra = marcacoes.filter((m) => m.tipo === 'hora_extra').reduce((s, m) => s + Number(m.horas || 0), 0);

  const resumoMap = new Map();
  for (const m of marcacoes) {
    const nome = m.funcionarios?.nome || 'Funcionário';
    if (!resumoMap.has(m.funcionario_id)) {
      resumoMap.set(m.funcionario_id, { id: m.funcionario_id, nome, registros: 0, faltas: 0, horasExtras: 0, dias: new Set() });
    }
    const r = resumoMap.get(m.funcionario_id);
    r.registros++;
    if (m.tipo === 'falta') r.faltas++;
    if (m.tipo === 'hora_extra') r.horasExtras += Number(m.horas || 0);
    if (m.tipo === 'entrada' || m.tipo === 'saida') r.dias.add(m.data);
  }
  const resumo = [...resumoMap.values()]
    .map((r) => ({ ...r, diasTrabalhados: r.dias.size }))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  const [anoSel, mesSel] = mes.split('-');
  const mesLabel = new Date(Number(anoSel), Number(mesSel) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
  }

  const card = 'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm';
  const campo = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const rotulo = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Ponto</h1>
            <p className="text-sm text-gray-500">Registre entradas, saídas, faltas e horas extras</p>
          </div>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value || mesAtual)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Registros no mês</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{marcacoes.length}</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Faltas no mês</div>
            <div className="text-2xl font-extrabold text-red-600 mt-1">{totalFaltas}</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Horas extras no mês</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{fmtH(totalExtra)}h</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Funcionários ativos</div>
            <div className="text-2xl font-extrabold text-green-700 mt-1">{ativos.length}</div>
          </div>
        </div>

        {ativos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-2">⏱️</div>
            <p className="text-gray-600 font-medium">Nenhum funcionário ativo cadastrado</p>
            <p className="text-sm text-gray-400 mt-1">Cadastre funcionários no módulo Funcionários antes de registrar o ponto.</p>
          </div>
        ) : (
          <>
            <div ref={formRef} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Registrar marcação</h2>
              <form onSubmit={salvar} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className={rotulo}>Funcionário *</label>
                  <select
                    className={campo}
                    value={form.funcionario_id}
                    onChange={(e) => setForm({ ...form, funcionario_id: e.target.value })}
                  >
                    <option value="">Selecione...</option>
                    {ativos.map((f) => (
                      <option key={f.id} value={f.id}>{f.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Data *</label>
                  <input type="date" className={campo} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
                <div>
                  <label className={rotulo}>Tipo *</label>
                  <select className={campo} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                    <option value="falta">Falta</option>
                    <option value="hora_extra">Hora extra</option>
                  </select>
                </div>
                {form.tipo === 'hora_extra' ? (
                  <div>
                    <label className={rotulo}>Horas extras *</label>
                    <input
                      className={campo}
                      inputMode="decimal"
                      placeholder="Ex.: 2,5"
                      value={form.horas}
                      onChange={(e) => setForm({ ...form, horas: e.target.value })}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={rotulo}>Observação</label>
                    <input
                      className={campo}
                      placeholder="Opcional"
                      value={form.observacao}
                      onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                    />
                  </div>
                )}
                {erro && <div className="md:col-span-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
                <div className="md:col-span-5">
                  <button
                    type="submit"
                    disabled={salvando}
                    className="w-full md:w-auto bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {salvando ? 'Salvando...' : 'Registrar marcação'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Resumo de {mesLabel}</h2>
                <p className="text-xs text-gray-500 mt-0.5">Dias trabalhados e horas extras por funcionário — a folha usa estes números.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3">Funcionário</th>
                      <th className="px-4 py-3">Registros</th>
                      <th className="px-4 py-3">Dias trabalhados</th>
                      <th className="px-4 py-3">Faltas</th>
                      <th className="px-4 py-3">Horas extras</th>
                      <th className="px-4 py-3 text-right">Atalhos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                          Nenhuma marcação neste mês ainda.
                        </td>
                      </tr>
                    ) : (
                      resumo.map((r) => (
                        <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">{r.nome}</td>
                          <td className="px-4 py-3 text-gray-600">{r.registros}</td>
                          <td className="px-4 py-3 text-gray-600">{r.diasTrabalhados} dia(s)</td>
                          <td className="px-4 py-3">
                            {r.faltas > 0 ? <span className="text-red-600 font-semibold">{r.faltas}</span> : <span className="text-gray-400">0</span>}
                          </td>
                          <td className="px-4 py-3">
                            {r.horasExtras > 0 ? <span className="text-amber-600 font-semibold">{fmtH(r.horasExtras)}h</span> : <span className="text-gray-400">0h</span>}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button onClick={() => marcarFalta(r)} className="text-red-600 hover:underline text-xs font-semibold mr-3">
                              Falta hoje
                            </button>
                            <button onClick={() => prefillExtra(r)} className="text-amber-600 hover:underline text-xs font-semibold">
                              + Hora extra
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Registros de {mesLabel}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Funcionário</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Horas</th>
                      <th className="px-4 py-3">Observação</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marcacoes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                          Nenhum registro neste mês.
                        </td>
                      </tr>
                    ) : (
                      marcacoes.map((m) => (
                        <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600">
                            {new Date(m.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{m.funcionarios?.nome || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${tipos[m.tipo]?.cor || 'bg-gray-100 text-gray-600'}`}>
                              {tipos[m.tipo]?.label || m.tipo}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{m.tipo === 'hora_extra' ? `${fmtH(m.horas)}h` : '—'}</td>
                          <td className="px-4 py-3 text-gray-500">{m.observacao || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <button onClick={() => excluir(m)} className="text-red-600 hover:underline text-xs font-semibold">Excluir</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
