'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const pad = (n) => String(n).padStart(2, '0');
const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
const HORAS_PADRAO_DIA = 8;        // base para calcular valor/hora de quem paga por diária
const PERCENTUAL_DEPOSITO = 8;     // depósito mensal sugerido (estilo FGTS, 8%)

const brl = (v) => (v == null || isNaN(v) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const n = (v) => { const p = parseFloat(String(v).replace(',', '.')); return isNaN(p) || p < 0 ? 0 : p; };

function calcularLinha(r, pctExtra) {
  const qtd = n(r.dias_s); // dias (diária) ou horas (hora)
  const faltas = n(r.faltas_s);
  const extra = n(r.extra_s);

  const base = qtd * r.valor;
  const vrHora = r.forma_pagamento === 'diaria' ? r.valor / HORAS_PADRAO_DIA : r.valor;
  const desconto = faltas * (r.forma_pagamento === 'diaria' ? r.valor : r.valor * HORAS_PADRAO_DIA);
  const valorExtra = extra * vrHora * (1 + (pctExtra || 50) / 100);

  const decimo = base / 12;
  const ferias = (base / 12) * 1.3333;
  const deposito = base * (PERCENTUAL_DEPOSITO / 100);
  const direitos = r.modo_calculo === 'direitos_fora' ? decimo + ferias + deposito : 0;

  const total = base + valorExtra + direitos - desconto;
  return { base, vrHora, desconto, valorExtra, decimo, ferias, deposito, direitos, total };
}

export default function FolhaPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [pctExtra, setPctExtra] = useState(50);
  const [linhas, setLinhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState('');
  const [mes, setMes] = useState(mesAtual);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) montarFolha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, empresaId]);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    setEmpresaId(prof?.empresa_id || null);

    if (prof?.empresa_id) {
      const { data: emp } = await supabase.from('empresas').select('percentual_hora_extra').eq('id', prof.empresa_id).single();
      setPctExtra(emp?.percentual_hora_extra ?? 50);
      await montarFolha(prof.empresa_id);
    }
    setCarregando(false);
  }

  async function montarFolha(empId = empresaId) {
    if (!empId) return;

    const { data: funcs } = await supabase.from('funcionarios').select('*').eq('status', 'ativo').order('nome');
    const { data: pts } = await supabase
      .from('ponto')
      .select('funcionario_id, data, tipo, horas')
      .gte('data', `${mes}-01`)
      .lte('data', `${mes}-31`);
    const { data: folhasExistentes } = await supabase
      .from('folhas')
      .select('*')
      .eq('mes_ano', mes);

    const folhaMap = new Map((folhasExistentes || []).map((f) => [f.funcionario_id, f]));

    const novas = (funcs || []).map((f) => {
      const doFunc = (pts || []).filter((p) => p.funcionario_id === f.id);
      const diasTrab = new Set(doFunc.filter((p) => p.tipo === 'entrada' || p.tipo === 'saida').map((p) => p.data)).size;
      const faltasDefault = doFunc.filter((p) => p.tipo === 'falta').length;
      const extraDefault = doFunc.filter((p) => p.tipo === 'hora_extra').reduce((s, p) => s + Number(p.horas || 0), 0);

      const salvo = folhaMap.get(f.id);
      const qtdDefault = f.forma_pagamento === 'diaria' ? diasTrab : 0;

      return {
        funcionario_id: f.id,
        nome: f.nome,
        cargo: f.cargo || '',
        valor: Number(f.valor || 0),
        forma_pagamento: f.forma_pagamento || 'diaria',
        modo_calculo: f.modo_calculo || 'somente_valor',
        dias_s: salvo ? String(salvo.dias_trabalhados).replace('.', ',') : String(qtdDefault),
        faltas_s: salvo ? String(salvo.faltas).replace('.', ',') : String(faltasDefault),
        extra_s: salvo ? String(salvo.horas_extras).replace('.', ',') : String(extraDefault),
        incluido: salvo ? salvo.incluido : true,
        pago: salvo ? salvo.pago : false,
      };
    });

    setLinhas(novas);
  }

  function atualizar(id, campo, valor) {
    setLinhas((ls) => ls.map((l) => (l.funcionario_id === id ? { ...l, [campo]: valor } : l)));
  }

  async function gerarFolha() {
    setAviso('');
    setSalvando(true);
    const erros = [];
    for (const l of linhas) {
      const calc = calcularLinha(l, pctExtra);
      const { error } = await supabase.from('folhas').upsert(
        {
          empresa_id: empresaId,
          funcionario_id: l.funcionario_id,
          mes_ano: mes,
          dias_trabalhados: n(l.dias_s),
          faltas: n(l.faltas_s),
          horas_extras: n(l.extra_s),
          valor_base: calc.base,
          valor_hora_extra: calc.valorExtra,
          desconto_faltas: calc.desconto,
          direitos_por_fora: calc.direitos,
          total: calc.total,
          incluido: l.incluido,
          pago: l.pago || false,
        },
        { onConflict: 'funcionario_id,mes_ano' }
      );
      if (error) erros.push(`${l.nome}: ${error.message}`);
    }
    setSalvando(false);

    if (erros.length > 0) {
      setAvisoA('erro', 'Alguns funcionários não foram salvos: ' + erros.join(' | '));
      return;
    }
    setAvisoA('ok', `Folha de ${mes} gerada e salva com sucesso!`);
    montarFolha();
  }

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  const tabela = linhas.map((l) => ({ ...l, calc: calcularLinha(l, pctExtra) }));
  const totalGeral = tabela.filter((l) => l.incluido).reduce((s, l) => s + l.calc.total, 0);
  const naFolha = tabela.filter((l) => l.incluido).length;
  const totalFaltas = tabela.reduce((s, l) => s + n(l.faltas_s), 0);
  const totalExtras = tabela.reduce((s, l) => s + n(l.extra_s), 0);

  const [anoSel, mesSel] = mes.split('-');
  const mesLabel = new Date(Number(anoSel), Number(mesSel) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>;
  }

  const campo = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const rotulo = 'block text-xs font-semibold text-gray-600 mb-1';
  const card = 'bg-white rounded-2xl border border-gray-200 p-5 shadow-sm';

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Folha de Pagamento</h1>
            <p className="text-sm text-gray-500">
              {mesLabel} — hora extra em {pctExtra}% • depósito mensal sugerido {PERCENTUAL_DEPOSITO}%
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value || mesAtual)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={gerarFolha}
              disabled={salvando || tabela.length === 0}
              className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Gerar folha do mês'}
            </button>
          </div>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${card} border-green-200`}>
            <div className="text-sm text-gray-500 font-medium">Total da folha</div>
            <div className="text-2xl font-extrabold text-green-700 mt-1">{brl(totalGeral)}</div>
            <div className="text-xs text-gray-400 mt-1">{naFolha} funcionário(s) na folha</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Faltas no mês</div>
            <div className="text-2xl font-extrabold text-red-600 mt-1">{String(totalFaltas).replace('.', ',')}</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Horas extras no mês</div>
            <div className="text-2xl font-extrabold text-amber-600 mt-1">{String(totalExtras).replace('.', ',')}h</div>
          </div>
          <div className={card}>
            <div className="text-sm text-gray-500 font-medium">Holerites</div>
            <div className="text-2xl font-extrabold text-gray-900 mt-1">—</div>
            <div className="text-xs text-gray-400 mt-1">Disponível no módulo Holerites</div>
          </div>
        </div>

        {tabela.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-2">📄</div>
            <p className="text-gray-600 font-medium">Nenhum funcionário ativo para montar a folha</p>
            <p className="text-sm text-gray-400 mt-1">Cadastre funcionários no módulo Funcionários e registre o ponto no módulo Ponto.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Lançamentos de {mesLabel}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Dias/horas, faltas e horas extras vêm do Ponto — você pode ajustar aqui. Edições não salvas são perdidas ao trocar o mês.
                </p>
              </div>
              <span className="text-xs text-gray-400">Valores em R$</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Funcionário</th>
                    <th className="px-4 py-3">Dias/Horas</th>
                    <th className="px-4 py-3">Faltas</th>
                    <th className="px-4 py-3">H.E.</th>
                    <th className="px-4 py-3">Valor base</th>
                    <th className="px-4 py-3">Hora extra</th>
                    <th className="px-4 py-3">Desconto</th>
                    <th className="px-4 py-3">Dir. por fora</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3 text-center">Incluir</th>
                    <th className="px-4 py-3 text-center">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {tabela.map((l) => (
                    <tr key={l.funcionario_id} className={`border-t border-gray-100 hover:bg-gray-50 ${l.incluido ? '' : 'opacity-40'}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{l.nome}</div>
                        <div className="text-xs text-gray-500">
                          {l.cargo || '—'}
                          {l.modo_calculo === 'direitos_fora' && (
                            <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">dir. por fora</span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {l.forma_pagamento === 'diaria' ? `${brl(l.valor)}/dia` : `${brl(l.valor)}/hora`}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          inputMode="decimal"
                          value={l.dias_s}
                          onChange={(e) => atualizar(l.funcionario_id, 'dias_s', e.target.value)}
                          title={l.forma_pagamento === 'diaria' ? 'Dias trabalhados' : 'Horas trabalhadas'}
                        />
                        <div className="text-[10px] text-gray-400">{l.forma_pagamento === 'diaria' ? 'dias' : 'horas'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          inputMode="decimal"
                          value={l.faltas_s}
                          onChange={(e) => atualizar(l.funcionario_id, 'faltas_s', e.target.value)}
                          title={l.forma_pagamento === 'diaria' ? 'Dias de falta' : 'Horas de falta'}
                        />
                        <div className="text-[10px] text-gray-400">{l.forma_pagamento === 'diaria' ? 'dias' : 'horas'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input
                          className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          inputMode="decimal"
                          value={l.extra_s}
                          onChange={(e) => atualizar(l.funcionario_id, 'extra_s', e.target.value)}
                        />
                        <div className="text-[10px] text-gray-400">horas</div>
                      </td>
                      <td className="px-4 py-3 text-gray-800 font-medium">{brl(l.calc.base)}</td>
                      <td className="px-4 py-3 text-amber-700">{brl(l.calc.valorExtra)}</td>
                      <td className="px-4 py-3 text-red-600">- {brl(l.calc.desconto)}</td>
                      <td className="px-4 py-3 text-blue-700" title={`13º: ${brl(l.calc.decimo)}\nFérias +1/3: ${brl(l.calc.ferias)}\nDepósito ${PERCENTUAL_DEPOSITO}%: ${brl(l.calc.deposito)}`}>
                        {l.modo_calculo === 'direitos_fora' ? brl(l.calc.direitos) : '—'}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-gray-900">{brl(l.calc.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={l.incluido}
                          onChange={(e) => atualizar(l.funcionario_id, 'incluido', e.target.checked)}
                          className="w-4 h-4 accent-green-600"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {l.pago ? (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Pago</span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Pendente</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 font-bold text-gray-900" colSpan="8">Total da folha ({naFolha} funcionário(s))</td>
                    <td className="px-4 py-3 font-extrabold text-green-700">{brl(totalGeral)}</td>
                    <td colSpan="2" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          💡 Valores de controle interno — conferência final com contador é responsabilidade da empresa. O sistema não envia dados a órgãos oficiais.
        </p>
      </main>
    </div>
  );
}
