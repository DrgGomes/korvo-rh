'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const pad = (n) => String(n).padStart(2, '0');
const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
const HORAS_PADRAO_DIA = 8;
const PERCENTUAL_DEPOSITO = 8;

const brl = (v) => (v == null || isNaN(v) ? 'R$ 0,00' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const n = (v) => { const p = parseFloat(String(v).replace(',', '.')); return isNaN(p) || p < 0 ? 0 : p; };

function calcular(f, folha, pctExtra) {
  const qtd = n(folha?.dias_trabalhados ?? 0);
  const faltas = n(folha?.faltas ?? 0);
  const extra = n(folha?.horas_extras ?? 0);
  const base = qtd * f.valor;
  const vrHora = f.forma_pagamento === 'diaria' ? f.valor / HORAS_PADRAO_DIA : f.valor;
  const desconto = faltas * (f.forma_pagamento === 'diaria' ? f.valor : f.valor * HORAS_PADRAO_DIA);
  const valorExtra = extra * vrHora * (1 + (pctExtra || 50) / 100);
  const decimo = base / 12;
  const ferias = (base / 12) * 1.3333;
  const deposito = base * (PERCENTUAL_DEPOSITO / 100);
  const direitos = f.modo_calculo === 'direitos_fora' ? decimo + ferias + deposito : 0;
  const total = base + valorExtra + direitos - desconto;
  return { base, vrHora, desconto, valorExtra, decimo, ferias, deposito, direitos, total };
}

export default function HoleritesPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [empresa, setEmpresa] = useState(null);
  const [funcionarios, setFuncionarios] = useState([]);
  const [folhas, setFolhas] = useState([]);
  const [mes, setMes] = useState(mesAtual);
  const [funcId, setFuncId] = useState('');
  const [vias, setVias] = useState(1);
  const [pctExtra, setPctExtra] = useState(50);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (empresaId) carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, empresaId]);

  async function carregarTudo() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    setPerfil(prof);
    setEmpresaId(prof?.empresa_id || null);
    if (prof?.empresa_id) await carregarDados();
    setCarregando(false);
  }

  async function carregarDados() {
    if (!empresaId) return;
    const { data: emp } = await supabase.from('empresas').select('*').eq('id', empresaId).single();
    setEmpresa(emp);
    setPctExtra(emp?.percentual_hora_extra ?? 50);

    const { data: funcs } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(funcs || []);

    const { data: fls } = await supabase
      .from('folhas')
      .select('*')
      .eq('mes_ano', mes)
      .eq('incluido', true);
    setFolhas(fls || []);
  }

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  const folhaSelecionada = folhas.find((fl) => fl.funcionario_id === funcId);
  const funcSelecionado = funcionarios.find((f) => f.id === funcId);

  const calc = funcSelecionado && folhaSelecionada ? calcular(funcSelecionado, folhaSelecionada, pctExtra) : null;

  const [anoSel, mesSel] = mes.split('-');
  const mesLabel = new Date(Number(anoSel), Number(mesSel) - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  function imprimir() {
    window.print();
  }

  function baixarPdf() {
    setAvisoA('ok', 'No sistema final, este botão gera o PDF real. Por enquanto, use "Imprimir" e escolha "Salvar como PDF".');
  }

  function HoleriteDoc({ via }) {
    if (!funcSelecionado || !folhaSelecionada || !calc) return null;
    return (
      <div className="holerite bg-white border border-gray-300 rounded-lg p-6 text-sm">
        <div className="flex items-start justify-between border-b-2 border-gray-800 pb-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">{empresa?.nome || 'Minha Empresa'}</div>
            <div className="text-xs text-gray-500">CNPJ: {empresa?.cnpj || '—'}</div>
            <div className="text-xs text-gray-500">Controle interno de pagamentos</div>
          </div>
          <div className="text-right">
            <div className="text-base font-bold text-gray-900">HOLERITE</div>
            <div className="text-xs text-gray-500">{mesLabel}</div>
            {via === 2 && <div className="text-xs font-semibold text-green-700 mt-1">2ª VIA — RECIBO</div>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 py-3 border-b border-gray-200">
          <div><span className="text-gray-500">Funcionário:</span> <b>{funcSelecionado.nome}</b></div>
          <div><span className="text-gray-500">Cargo:</span> {funcSelecionado.cargo || '—'}</div>
          <div><span className="text-gray-500">CPF:</span> {funcSelecionado.cpf || '—'}</div>
          <div><span className="text-gray-500">Forma de pagamento:</span> {funcSelecionado.forma_pagamento === 'diaria' ? 'Por diária' : 'Por hora'}</div>
        </div>

        <div className="grid grid-cols-2 gap-6 py-3">
          <div>
            <div className="text-xs font-bold text-gray-700 uppercase mb-2">Proventos</div>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Valor base ({funcSelecionado.forma_pagamento === 'diaria' ? `${String(folhaSelecionada.dias_trabalhados).replace('.', ',')} dia(s)` : `${String(folhaSelecionada.dias_trabalhados).replace('.', ',')}h`})</span><b>{brl(calc.base)}</b></div>
              {Number(folhaSelecionada.horas_extras || 0) > 0 && (
                <div className="flex justify-between"><span>Horas extras ({String(folhaSelecionada.horas_extras).replace('.', ',')}h × {pctExtra}%)</span><b>{brl(calc.valorExtra)}</b></div>
              )}
              {funcSelecionado.modo_calculo === 'direitos_fora' && (
                <>
                  <div className="flex justify-between"><span>13º proporcional (÷12)</span><b>{brl(calc.decimo)}</b></div>
                  <div className="flex justify-between"><span>Férias + 1/3 provisionadas</span><b>{brl(calc.ferias)}</b></div>
                  <div className="flex justify-between"><span>Depósito mensal ({PERCENTUAL_DEPOSITO}%)</span><b>{brl(calc.deposito)}</b></div>
                </>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-700 uppercase mb-2">Descontos</div>
            <div className="space-y-1">
              {Number(folhaSelecionada.faltas || 0) > 0 ? (
                <div className="flex justify-between"><span>Faltas ({String(folhaSelecionada.faltas).replace('.', ',')})</span><b className="text-red-600">- {brl(calc.desconto)}</b></div>
              ) : (
                <div className="text-gray-400">—</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center border-t-2 border-gray-800 pt-3">
          <div className="text-sm font-bold text-gray-900">TOTAL LÍQUIDO</div>
          <div className="text-xl font-extrabold text-green-700">{brl(calc.total)}</div>
        </div>

        <div className="mt-6 pt-4 border-t border-dashed border-gray-300">
          <div className="text-xs text-gray-500 mb-1">Assinatura do funcionário</div>
          <div className="h-10 border-b border-gray-400" />
        </div>

        <div className="mt-4 text-[10px] text-gray-400 text-center">
          Documento interno sem vínculo empregatício registrado. Sistema de controle interno — não possui integração com INSS, Receita Federal ou bancos.
        </div>
      </div>
    );
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
            <h1 className="text-2xl font-bold text-gray-900">Holerites</h1>
            <p className="text-sm text-gray-500">Gere o holerite em 1 via ou 2 vias (recibo)</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={mes}
              onChange={(e) => setMes(e.target.value || mesAtual)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={imprimir}
              disabled={!calc}
              className="bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              🖨️ Imprimir
            </button>
            <button
              onClick={baixarPdf}
              disabled={!calc}
              className="border border-green-600 text-green-700 text-sm font-semibold px-4 py-2.5 rounded-lg hover:bg-green-50 disabled:opacity-50"
            >
              Baixar PDF
            </button>
          </div>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={rotulo}>Funcionário</label>
              <select className={campo} value={funcId} onChange={(e) => setFuncId(e.target.value)}>
                <option value="">Selecione...</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={rotulo}>Mês</label>
              <input type="month" className={campo} value={mes} onChange={(e) => setMes(e.target.value || mesAtual)} />
            </div>
            <div>
              <label className={rotulo}>Vias</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVias(1)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${vias === 1 ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  1 via
                </button>
                <button
                  onClick={() => setVias(2)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${vias === 2 ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  2 vias (recibo)
                </button>
              </div>
            </div>
          </div>
        </div>

        {!calc ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center">
            <div className="text-4xl mb-2">🧾</div>
            <p className="text-gray-600 font-medium">
              {funcionarios.length === 0
                ? 'Cadastre funcionários primeiro'
                : folhas.length === 0
                ? 'Nenhuma folha gerada para este mês'
                : 'Selecione um funcionário para gerar o holerite'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {folhas.length === 0
                ? 'Gere a folha no módulo Folha de Pagamento — o holerite usa os valores dela.'
                : 'Escolha o funcionário acima.'}
            </p>
          </div>
        ) : (
          <div className="holerite-area space-y-6">
            <HoleriteDoc via={1} />
            {vias === 2 && <HoleriteDoc via={2} />}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          💡 No sistema final, o botão "Baixar PDF" gera o arquivo real. Por enquanto, use "Imprimir" e escolha "Salvar como PDF" na janela de impressão.
        </p>

        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .holerite-area, .holerite-area * { visibility: visible; }
            .holerite-area { position: absolute; left: 0; top: 0; width: 100%; }
            .holerite { box-shadow: none !important; border: 1px solid #000 !important; }
          }
        `}</style>
      </main>
    </div>
  );
}
