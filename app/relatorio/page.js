'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const pad = (n) => String(n).padStart(2, '0');
const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;

const brl = (v) => (v == null || isNaN(v) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));

const tiposPix = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };

export default function RelatorioPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [mes, setMes] = useState(mesAtual);
  const [diaFiltro, setDiaFiltro] = useState('todos');
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) carregarLinhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, empresaId]);

  async function carregarTudo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    setEmpresaId(prof?.empresa_id || null);
    if (prof?.empresa_id) await carregarLinhas();
    setCarregando(false);
  }

  async function carregarLinhas() {
    if (!empresaId) return;
    const { data } = await supabase
      .from('folhas')
      .select(`
        id, funcionario_id, mes_ano, dias_trabalhados, horas_extras,
        valor_base, valor_hora_extra, desconto_faltas, direitos_por_fora, total, pago, incluido,
        funcionarios(nome, cargo, chave_pix, tipo_chave_pix, forma_pagamento, valor, dia_pagamento, modo_calculo)
      `)
      .eq('mes_ano', mes)
      .eq('incluido', true);

    const lista = (data || []).sort((a, b) => {
      const na = (a.funcionarios?.nome || '').toLowerCase();
      const nb = (b.funcionarios?.nome || '').toLowerCase();
      if (a.pago !== b.pago) return a.pago ? 1 : -1; // pendentes primeiro
      return na.localeCompare(nb);
    });
    setLinhas(lista);
  }

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  async function marcarPago(folha) {
    setSalvando(true);
    const { error } = await supabase.from('folhas').update({ pago: true }).eq('id', folha.id);
    setSalvando(false);
    if (error) { alert('Erro ao marcar como pago: ' + error.message); return; }
    setAvisoA('ok', `${folha.funcionarios?.nome || 'Funcionário'} marcado como pago ✅`);
    carregarLinhas();
  }

  async function marcarTodos() {
    const pendentes = filtradas.filter((l) => !l.pago);
    if (pendentes.length === 0) return;
    if (!window.confirm(`Marcar ${pendentes.length} pagamento(s) como pagos?`)) return;
    setSalvando(true);
    const ids = pendentes.map((l) => l.id);
    const { error } = await supabase.from('folhas').update({ pago: true }).in('id', ids);
    setSalvando(false);
    if (error) { alert('Erro: ' + error.message); return; }
    setAvisoA('ok', `${pendentes.length} pagamento(s) marcados como pagos ✅`);
    carregarLinhas();
  }

  const diasDisponiveis = [...new Set(linhas.map((l) => l.funcionarios?.dia_pagamento).filter((d) => d != null))].sort((a, b) => a - b);

  const filtradas = diaFiltro === 'todos'
    ? linhas
    : linhas.filter((l) => Number(l.funcionarios?.dia_pagamento) === Number(diaFiltro));

  const pendentes = filtradas.filter((l) => !l.pago);
  const pagos = filtradas.filter((l) => l.pago);
  const totalPendente = pendentes.reduce((s, l) => s + Number(l.total || 0), 0);
  const totalPago = pagos.reduce((s, l) => s + Number(l.total || 0), 0);

  const [anoSel, mesSel] = mes.split('-');
  const mesLabel = new Date(Number(anoSel), Number(mesSel) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
  }

  const card = 'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm';

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatório de Pagamento</h1>
            <p className="text-sm text-gray-500">{mesLabel} — pague um por um, conferindo a chave PIX</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value || mesAtual)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <select
              value={diaFiltro}
              onChange={(e) => setDiaFiltro(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="todos">Todos os dias de pagamento</option>
              {diasDisponiveis.map((d) => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
            <button
              onClick={marcarTodos}
              disabled={salvando || pendentes.length === 0}
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {salvando ? 'Aguarde...' : `Marcar todos (${pendentes.length})`}
            </button>
          </div>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
          <div className="text-sm font-semibold text-amber-800">💳 Lista para o dia de pagamento</div>
          <p className="text-xs text-amber-700 mt-0.5">
            Confira a <b>chave PIX</b> de cada funcionário antes de transferir. Ao pagar, clique em "Marcar como pago" — a linha fica esmaecida e o valor sai dos pendentes.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${card} border-amber-200`}>
            <div className="text-sm text-gray-500 font-medium">A pagar</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{brl(totalPendente)}</div>
            <div className="text-xs text-gray-400 mt-1">{pendentes.length} pendente(s)</div>
          </div>
          <div className={`${card} border-green-200`}>
            <div className="text-sm text-gray-500 font-medium">Pago</div>
            <div className="text-2xl font-extrabold text-green-700 mt-1">{brl(totalPago)}</div>
            <div className="text-xs text-gray-400 mt-1">{pagos.length} pago(s)</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Total da lista</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">{brl(totalPendente + totalPago)}</div>
            <div className="text-xs text-gray-400 mt-1">{filtradas.length} funcionário(s)</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Situação</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">
              {filtradas.length === 0 ? '—' : `${Math.round((pagos.length / filtradas.length) * 100)}%`}
            </div>
            <div className="text-xs text-gray-400 mt-1">da lista pago</div>
          </div>
        </div>

        {filtradas.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-2">💳</div>
            <p className="text-gray-600 font-medium">
              {linhas.length === 0 ? 'Nenhuma folha para este mês ainda' : 'Nenhum funcionário neste dia de pagamento'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {linhas.length === 0
                ? 'Gere a folha no módulo Folha de Pagamento primeiro — os valores aparecem aqui automaticamente.'
                : 'Escolha "Todos os dias de pagamento" ou outro dia no filtro.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Lista de pagamento — {mesLabel}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {pendentes.length} pendente(s) • {pagos.length} pago(s)
                </p>
              </div>
              <span className="text-xs text-gray-400">Valores em R$</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Funcionário</th>
                    <th className="px-4 py-3">Base do mês</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Chave PIX</th>
                    <th className="px-4 py-3">Dia pgto</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((l) => {
                    const f = l.funcionarios || {};
                    const porDiaria = f.forma_pagamento === 'diaria';
                    return (
                      <tr key={l.id} className={`border-t border-gray-100 hover:bg-gray-50 ${l.pago ? 'opacity-45' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">{f.nome || '—'}</div>
                          <div className="text-xs text-gray-500">
                            {f.cargo || '—'}
                            {f.modo_calculo === 'direitos_fora' && (
                              <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">dir. por fora</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <div>
                            {porDiaria
                              ? `${String(l.dias_trabalhados || 0).replace('.', ',')} dia(s) × ${brl(f.valor)}`
                              : `${String(l.dias_trabalhados || 0).replace('.', ',')}h × ${brl(f.valor)}`}
                          </div>
                          <div className="text-xs text-gray-400">
                            {porDiaria ? `${brl(f.valor)}/dia` : `${brl(f.valor)}/hora`}
                            {Number(l.horas_extras || 0) > 0 && (
                              <span className="text-amber-600"> • +{String(l.horas_extras).replace('.', ',')}h extra</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-extrabold text-gray-900">{brl(l.total)}</td>
                        <td className="px-4 py-3">
                          {f.chave_pix ? (
                            <div>
                              <div className="text-gray-800 font-medium text-xs break-all max-w-xs">{f.chave_pix}</div>
                              <div className="text-xs text-gray-400">{tiposPix[f.tipo_chave_pix] || ''}</div>
                            </div>
                          ) : (
                            <span className="text-red-500 text-xs font-semibold">Sem chave PIX</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">Dia {f.dia_pagamento ?? '—'}</td>
                        <td className="px-4 py-3">
                          {l.pago ? (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Pago</span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Pendente</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {l.pago ? (
                            <span className="text-xs text-gray-300">✓</span>
                          ) : (
                            <button
                              onClick={() => marcarPago(l)}
                              disabled={salvando}
                              className="bg-green-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Marcar como pago
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900" colSpan="2">Totais</td>
                    <td className="px-4 py-3 font-extrabold text-green-700">{brl(totalPendente + totalPago)}</td>
                    <td colSpan="4" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          💡 Confira a chave PIX antes de transferir. Sistema de controle interno — sem integração com bancos, INSS ou Receita Federal.
        </p>
      </main>
    </div>
  );
}
