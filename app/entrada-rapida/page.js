'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';

const pad = (n) => String(n).padStart(2, '0');
const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;

const tiposPix = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Chave aleatória' };

const n = (v) => {
  const p = parseFloat(String(v).replace(',', '.'));
  return isNaN(p) ? null : p;
};

function detectarTipoPix(chave) {
  const c = (chave || '').trim();
  if (!c) return null;
  if (c.includes('@')) return 'email';
  if (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(c)) return 'telefone';
  const soDigitos = c.replace(/\D/g, '');
  if (soDigitos.length === 11) return 'cpf';
  if (soDigitos.length === 14) return 'cnpj';
  return 'aleatoria';
}

function diasDoMes(mesStr, qtd, pularDom) {
  const [y, m] = mesStr.split('-').map(Number);
  const totalDias = new Date(y, m, 0).getDate();
  const datas = [];
  for (let d = 1; d <= totalDias && datas.length < qtd; d++) {
    const diaSemana = new Date(y, m - 1, d).getDay();
    if (pularDom && diaSemana === 0) continue;
    datas.push(`${mesStr}-${pad(d)}`);
  }
  return datas;
}

function diasIntervalo(inicio, fim, pularDom) {
  const datas = [];
  let cur = new Date(inicio + 'T00:00:00');
  const fimD = new Date(fim + 'T00:00:00');
  while (cur <= fimD) {
    if (!(pularDom && cur.getDay() === 0)) {
      datas.push(`${cur.getFullYear()}-${pad(cur.getMonth() + 1)}-${pad(cur.getDate())}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return datas;
}

export default function EntradaRapidaPage() {
  const router = useRouter();
  const nomeRef = useRef(null);
  const [perfil, setPerfil] = useState(null);
  const [empresaId, setEmpresaId] = useState(null);
  const [plano, setPlano] = useState('gratis');
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState('');

  const [aba, setAba] = useState('lote');

  const [padrao, setPadrao] = useState({ forma_pagamento: 'diaria', valor: '', modo_calculo: 'somente_valor', dia_pagamento: 5 });
  const [texto, setTexto] = useState('');
  const [erroLote, setErroLote] = useState('');
  const [processandoLote, setProcessandoLote] = useState(false);
  const [resultadoLote, setResultadoLote] = useState(null);

  const [rapido, setRapido] = useState({ nome: '', valor: '', chave_pix: '', forma_pagamento: 'diaria', modo_calculo: 'somente_valor', dia_pagamento: 5, tipo_chave_pix: 'cpf' });
  const [rapidoCount, setRapidoCount] = useState(0);
  const [erroRapido, setErroRapido] = useState('');
  const [salvandoRapido, setSalvandoRapido] = useState(false);

  const [selFuncs, setSelFuncs] = useState([]);
  const [mes, setMes] = useState(mesAtual);
  const [modoDias, setModoDias] = useState('quantidade');
  const [qtdDias, setQtdDias] = useState(22);
  const [dataInicio, setDataInicio] = useState(`${mesAtual}-01`);
  const [dataFim, setDataFim] = useState(`${mesAtual}-${new Date(Number(mesAtual.split('-')[0]), Number(mesAtual.split('-')[1]), 0).getDate()}`);
  const [tipoMassa, setTipoMassa] = useState('trabalhado');
  const [pularDom, setPularDom] = useState(true);
  const [processandoPonto, setProcessandoPonto] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const [y, m] = mes.split('-').map(Number);
    const ultimo = new Date(y, m, 0).getDate();
    setDataInicio(`${mes}-01`);
    setDataFim(`${mes}-${pad(ultimo)}`);
  }, [mes]);

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

  function setAvisoA(tipo, texto) {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(''), 6000);
  }

  const ativos = funcionarios.filter((f) => f.status === 'ativo').length;
  const limite = plano === 'gratis' ? 3 : Infinity;
  const vagas = Number.isFinite(limite) ? Math.max(0, limite - ativos) : Infinity;

  // ---------- COLABAÇÃO EM LOTE ----------
  async function cadastrarLote() {
    setErroLote('');
    setResultadoLote(null);
    const linhas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
    if (linhas.length === 0) { setErroLote('Cole a lista primeiro.'); return; }

    const valorPadrao = n(padrao.valor);
    const lote = [];
    const invalidas = [];

    for (const linha of linhas) {
      const partes = linha.split(';').map((p) => p.trim());
      const nome = partes[0];
      if (!nome) { invalidas.push(linha); continue; }
      const valor = partes[1] ? n(partes[1]) : valorPadrao;
      if (valor == null || valor < 0) { invalidas.push(linha); continue; }
      const chave = partes[2] || '';
      const tipo = partes[3] || detectarTipoPix(chave);
      lote.push({
        empresa_id: empresaId,
        nome,
        cpf: null,
        telefone: null,
        cargo: null,
        forma_pagamento: padrao.forma_pagamento,
        valor,
        modo_calculo: padrao.modo_calculo,
        chave_pix: chave || null,
        tipo_chave_pix: tipo,
        status: 'ativo',
        dia_pagamento: parseInt(padrao.dia_pagamento, 10) || 5,
      });
    }

    const aceitos = lote.slice(0, vagas);
    const ignorados = lote.length - aceitos.length;
    if (aceitos.length === 0) {
      setErroLote(lote.length > 0 ? 'Plano Grátis permite no máximo 3 funcionários ativos no total.' : 'Nenhuma linha válida (use o formato: nome; valor; chave).');
      return;
    }

    setProcessandoLote(true);
    const CHUNK = 100;
    let okC = 0, falhas = 0, msg = '';
    for (let i = 0; i < aceitos.length; i += CHUNK) {
      const parte = aceitos.slice(i, i + CHUNK);
      const { error } = await supabase.from('funcionarios').insert(parte);
      if (error) { falhas += parte.length; msg = error.message; } else { okC += parte.length; }
    }
    setProcessandoLote(false);

    const { data: lista } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(lista || []);

    setResultadoLote({ ok: okC, invalidas: invalidas.length, ignorados, falhas, msg });
    if (falhas > 0) setAvisoA('erro', `${okC} cadastrado(s). ${falhas} falharam: ${msg}`);
    else setAvisoA('ok', `${okC} funcionário(s) cadastrados com sucesso!`);
    setTexto('');
  }

  // ---------- UM A UM RÁPIDO ----------
  async function salvarRapido(e) {
    e.preventDefault();
    setErroRapido('');
    if (!rapido.nome.trim()) { setErroRapido('Informe o nome.'); return; }
    const valor = n(rapido.valor);
    if (valor == null || valor < 0) { setErroRapido('Informe um valor válido (ex.: 80,00).'); return; }
    if (plano === 'gratis' && ativos >= 3) { setErroRapido('Limite do plano Grátis atingido (3 funcionários ativos).'); return; }

    setSalvandoRapido(true);
    const chave = rapido.chave_pix.trim();
    const { error } = await supabase.from('funcionarios').insert({
      empresa_id: empresaId,
      nome: rapido.nome.trim(),
      cpf: null,
      telefone: null,
      cargo: null,
      forma_pagamento: rapido.forma_pagamento,
      valor,
      modo_calculo: rapido.modo_calculo,
      chave_pix: chave || null,
      tipo_chave_pix: rapido.tipo_chave_pix,
      status: 'ativo',
      dia_pagamento: parseInt(rapido.dia_pagamento, 10) || 5,
    });
    setSalvandoRapido(false);
    if (error) { setErroRapido('Erro: ' + error.message); return; }

    const { data: lista } = await supabase.from('funcionarios').select('*').order('nome');
    setFuncionarios(lista || []);
    const nome = rapido.nome.trim();
    setRapido((r) => ({ ...r, nome: '', valor: '', chave_pix: '' }));
    setRapidoCount((c) => c + 1);
    setAvisoA('ok', `${nome} cadastrado com sucesso!`);
    nomeRef.current?.focus();
  }

  // ---------- MARCAR DIAS EM MASSA ----------
  const datasPreview = modoDias === 'quantidade'
    ? diasDoMes(mes, Math.max(1, parseInt(qtdDias, 10) || 0), pularDom)
    : diasIntervalo(dataInicio, dataFim, pularDom);
  const totalPreview = selFuncs.length * datasPreview.length;

  function alternarTodos() {
    if (selFuncs.length === ativos.length) setSelFuncs([]);
    else setSelFuncs(ativos.map((f) => f.id));
  }

  async function aplicarPonto() {
    if (selFuncs.length === 0) { setAvisoA('erro', 'Selecione pelo menos 1 funcionário.'); return; }
    if (datasPreview.length === 0) { setAvisoA('erro', 'Nenhum dia encontrado. Confira a quantidade ou o intervalo.'); return; }

    const tipoReg = tipoMassa === 'trabalhado' ? 'entrada' : 'falta';

    const { data: existentes } = await supabase
      .from('ponto')
      .select('funcionario_id, data')
      .eq('empresa_id', empresaId)
      .in('funcionario_id', selFuncs)
      .gte('data', `${mes}-01`)
      .lte('data', `${mes}-31`)
      .eq('tipo', tipoReg);

    const setExist = new Set((existentes || []).map((e) => `${e.funcionario_id}|${e.data}`));
    const rows = [];
    for (const fid of selFuncs) {
      for (const d of datasPreview) {
        if (setExist.has(`${fid}|${d}`)) continue;
        rows.push({ empresa_id: empresaId, funcionario_id: fid, data: d, tipo: tipoReg, horas: 0, observacao: 'Marcação em massa' });
      }
    }

    if (rows.length === 0) { setAvisoA('erro', 'Esses registros já existem para todos os dias selecionados.'); return; }

    const rotulo = tipoMassa === 'trabalhado' ? 'dias trabalhados' : 'faltas';
    if (!window.confirm(`Aplicar ${rotulo} para ${selFuncs.length} funcionário(s) em ${datasPreview.length} dia(s) = ${rows.length} novo(s) registro(s)?\n\nRegistros já existentes serão ignorados.`)) return;

    setProcessandoPonto(true);
    const CHUNK = 200;
    let ok = 0, falhas = 0, msg = '';
    for (let i = 0; i < rows.length; i += CHUNK) {
      const parte = rows.slice(i, i + CHUNK);
      const { error } = await supabase.from('ponto').insert(parte);
      if (error) { falhas += parte.length; msg = error.message; } else { ok += parte.length; }
    }
    setProcessandoPonto(false);

    if (falhas > 0) setAvisoA('erro', `${ok} registro(s) criados. ${falhas} falharam: ${msg}`);
    else setAvisoA('ok', `${ok} registro(s) criados com sucesso!`);
  }

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⚡ Entrada rápida</h1>
          <p className="text-sm text-gray-500">
            Cadastre funcionários em massa e marque os dias de ponto de uma vez só.
            Você tem <b className="text-gray-700">{ativos} ativo(s)</b>
            {plano === 'gratis' ? <span> de 3 no plano Grátis</span> : <span> no plano {plano}</span>}.
          </p>
        </div>

        {aviso && (
          <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${aviso.tipo === 'ok' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {aviso.texto}
          </div>
        )}

        {/* ===== CADASTRO DE FUNCIONÁRIOS ===== */}
        <div className={card + ' mb-6'}>
          <h2 className="text-lg font-bold text-gray-900 mb-1">👥 Cadastro rápido de funcionários</h2>
          <p className="text-sm text-gray-500 mb-4">Cole a lista toda de uma vez, ou cadastre um a um sem parar.</p>

          <div className="flex bg-gray-100 rounded-lg p-1 mb-5 max-w-md">
            <button
              onClick={() => { setAba('lote'); setErroRapido(''); setErroLote(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold ${aba === 'lote' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Colar lista
            </button>
            <button
              onClick={() => { setAba('rapido'); setErroRapido(''); setErroLote(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold ${aba === 'rapido' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Um a um rápido
            </button>
          </div>

          {aba === 'lote' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className={rotulo}>Pagamento por</label>
                  <select className={campo} value={padrao.forma_pagamento} onChange={(e) => setPadrao({ ...padrao, forma_pagamento: e.target.value })}>
                    <option value="diaria">Diária</option>
                    <option value="hora">Hora</option>
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Valor padrão (R$)</label>
                  <input className={campo} inputMode="decimal" value={padrao.valor} onChange={(e) => setPadrao({ ...padrao, valor: e.target.value })} placeholder="ex.: 80,00" />
                </div>
                <div>
                  <label className={rotulo}>Modo de cálculo</label>
                  <select className={campo} value={padrao.modo_calculo} onChange={(e) => setPadrao({ ...padrao, modo_calculo: e.target.value })}>
                    <option value="somente_valor">Somente valor</option>
                    <option value="direitos_fora">Com direitos por fora</option>
                  </select>
                </div>
                <div>
                  <label className={rotulo}>Dia de pagamento</label>
                  <input type="number" min="1" max="31" className={campo} value={padrao.dia_pagamento} onChange={(e) => setPadrao({ ...padrao, dia_pagamento: e.target.value })} />
                </div>
              </div>

              <label className={rotulo}>Lista (1 funcionário por linha):</label>
              <textarea
                className="w-full h-44 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={'Formato: nome; valor; chave PIX (opcional)\n\nJoão Silva; 80,00; joao@email.com\nAna Souza; 75,00; (11) 99999-0000\nCarlos Pereira; 90,00; 123.456.789-00\nMariana Lima; 12,00\nPedro Santos; 70,00'}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  O valor vazio usa o valor padrão. A chave PIX é opcional e o tipo é detectado sozinho.
                </p>
                <button
                  onClick={cadastrarLote}
                  disabled={processandoLote}
                  className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processandoLote
                    ? 'Cadastrando...'
                    : `Cadastrar lista (${texto.split('\n').filter((l) => l.trim()).length})`}
                </button>
              </div>

              {erroLote && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroLote}</div>}

              {resultadoLote && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-green-700 font-semibold">Cadastrados</div>
                    <div className="text-2xl font-extrabold text-green-700">{resultadoLote.ok}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-gray-500 font-semibold">Ignorados (limite)</div>
                    <div className="text-2xl font-extrabold text-gray-700">{resultadoLote.ignorados}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-gray-500 font-semibold">Linhas inválidas</div>
                    <div className="text-2xl font-extrabold text-gray-700">{resultadoLote.invalidas}</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <div className="text-xs text-red-600 font-semibold">Falhas</div>
                    <div className="text-2xl font-extrabold text-red-600">{resultadoLote.falhas}</div>
                  </div>
                </div>
              )}

              {resultadoLote && resultadoLote.falhas > 0 && (
                <div className="mt-2 text-xs text-red-500">{resultadoLote.msg}</div>
              )}
            </div>
          )}

          {aba === 'rapido' && (
            <form onSubmit={salvarRapido} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-1">
                  <label className={rotulo}>Nome *</label>
                  <input ref={nomeRef} autoFocus className={campo} value={rapido.nome} onChange={(e) => setRapido({ ...rapido, nome: e.target.value })} placeholder="Nome do funcionário" />
                </div>
                <div>
                  <label className={rotulo}>Valor (R$) *</label>
                  <input className={campo} inputMode="decimal" value={rapido.valor} onChange={(e) => setRapido({ ...rapido, valor: e.target.value })} placeholder="80,00" />
                </div>
                <div>
                  <label className={rotulo}>Chave PIX (opcional)</label>
                  <input className={campo} value={rapido.chave_pix} onChange={(e) => setRapido({ ...rapido, chave_pix: e.target.value })} placeholder="chave do funcionário" />
                </div>
                <div>
                  <label className={rotulo}>Pagamento</label>
                  <select className={campo} value={rapido.forma_pagamento} onChange={(e) => setRapido({ ...rapido, forma_pagamento: e.target.value })}>
                    <option value="diaria">Diária</option>
                    <option value="hora">Hora</option>
                  </select>
                </div>
              </div>

              {erroRapido && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroRapido}</div>}

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={salvandoRapido}
                  className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {salvandoRapido ? 'Salvando...' : 'Salvar e adicionar outro (Enter)'}
                </button>
                <span className="text-sm text-gray-400">
                  {rapidoCount > 0 && <span className="text-green-700 font-semibold">{rapidoCount} cadastrado(s) nesta sessão</span>}
                </span>
              </div>
              <p className="text-xs text-gray-400">Modo estático: o valor padrão, o modo de cálculo e o dia de pagamento usam os padrões acima.</p>
            </form>
          )}
        </div>

        {/* ===== MARCAR DIAS EM MASSA ===== */}
        <div className={card}>
          <h2 className="text-lg font-bold text-gray-900 mb-1">📅 Marcar dias em massa (ponto)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Selecione os funcionários e a quantidade de dias (ou um intervalo) — o sistema cria todos os registros de uma vez.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={rotulo}>1. Funcionários ({selFuncs.length} selecionado(s))</label>
              <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-100">
                {ativos.length === 0 && (
                  <div className="p-3 text-sm text-gray-400">Nenhum funcionário ativo ainda.</div>
                )}
                {ativos.map((f) => (
                  <label key={f.id} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selFuncs.includes(f.id)}
                      onChange={(e) =>
                        setSelFuncs((s) => (e.target.checked ? [...s, f.id] : s.filter((x) => x !== f.id)))
                      }
                      className="w-4 h-4 accent-green-600"
                    />
                    <span className="flex-1">{f.nome}</span>
                  </label>
                ))}
              </div>
              <button onClick={alternarTodos} className="text-xs text-green-700 font-semibold mt-1 hover:underline">
                {selFuncs.length === ativos.length && ativos.length > 0 ? 'Limpar seleção' : 'Selecionar todos'}
              </button>
            </div>

            <div>
              <label className={rotulo}>2. Mês</label>
              <input type="month" className={campo} value={mes} onChange={(e) => setMes(e.target.value || mesAtual)} />

              <label className={rotulo + ' mt-3'}>O que marcar</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoMassa('trabalhado')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${tipoMassa === 'trabalhado' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Dias trabalhados
                </button>
                <button
                  onClick={() => setTipoMassa('falta')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${tipoMassa === 'falta' ? 'bg-red-500 text-white border-red-500' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Faltas
                </button>
              </div>

              <label className={rotulo + ' mt-3'}>3. Quantidade ou intervalo</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => setModoDias('quantidade')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${modoDias === 'quantidade' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Quantidade de dias
                </button>
                <button
                  onClick={() => setModoDias('intervalo')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border ${modoDias === 'intervalo' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Intervalo de datas
                </button>
              </div>

              {modoDias === 'quantidade' ? (
                <div>
                  <input type="number" min="1" max="31" className={campo} value={qtdDias} onChange={(e) => setQtdDias(e.target.value)} />
                  <p className="text-xs text-gray-400 mt-1">Conta os dias a partir do dia 1 do mês.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <input type="date" className={campo} value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  <input type="date" className={campo} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                </div>
              )}

              <label className="flex items-center gap-2 mt-3 text-sm text-gray-600">
                <input type="checkbox" checked={pularDom} onChange={(e) => setPularDom(e.target.checked)} className="w-4 h-4 accent-green-600" />
                Pular domingos
              </label>
            </div>

            <div className="flex flex-col justify-between">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm">
                <div className="text-gray-500">Prévia</div>
                <div className="mt-1 font-bold text-gray-900">{selFuncs.length} funcionário(s)</div>
                <div className="text-gray-600">× {datasPreview.length} dia(s)</div>
                <div className="mt-2 text-2xl font-extrabold text-green-700">{totalPreview} registro(s)</div>
                <div className="text-[11px] text-gray-400 mt-1">Registros já existentes serão ignorados.</div>
              </div>
              <button
                onClick={aplicarPonto}
                disabled={processandoPonto || totalPreview === 0}
                className="mt-3 w-full bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {processandoPonto ? 'Aplicando...' : 'Aplicar em massa'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
