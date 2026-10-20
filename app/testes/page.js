'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import Sidebar from '../../components/Sidebar';
import {
  paraNumero,
  formatarBRL,
  mascaraCPF,
  detectarTipoPix,
  calcularFolha,
  diasDoMes,
  diasIntervalo,
} from '../../lib/calculos';

const pad = (n) => String(n).padStart(2, '0');
const agora = new Date();
const mesAtual = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}`;
const hojeISO = `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}`;

const aprox = (a, b, tol = 0.02) => Math.abs(Number(a) - Number(b)) < tol;

export default function TestesPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [resultados, setResultados] = useState(null);
  const [e2e, setE2e] = useState(null);
  const [rodandoE2e, setRodandoE2e] = useState(false);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: prof } = await supabase.from('profiles').select('nome, perfil, empresa_id').eq('id', user.id).single();
    if (!prof || prof.perfil !== 'master') { router.push('/dashboard'); return; }
    setPerfil(prof);

    const rs = [];
    const esperar = (cond, msg) => { if (!cond) throw new Error(msg); };
    const F = (extra) => calcularFolha({ forma_pagamento: 'diaria', valor: 80, modo_calculo: 'somente_valor', dias: 0, faltas: 0, horasExtras: 0, pctExtra: 50, ...extra });

    const defs = [
      // ===== FOLHA DE PAGAMENTO =====
      { grupo: 'Folha de Pagamento', nome: 'Diária simples: 22 dias × R$ 80 = R$ 1.760,00', fn: async () => {
        const r = F({ dias: 22 });
        esperar(aprox(r.base, 1760), `base: esperado 1760, veio ${r.base}`);
        esperar(aprox(r.total, 1760), `total: esperado 1760, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Por hora: 160h × R$ 12 = R$ 1.920,00', fn: async () => {
        const r = calcularFolha({ forma_pagamento: 'hora', valor: 12, modo_calculo: 'somente_valor', dias: 160, faltas: 0, horasExtras: 0, pctExtra: 50 });
        esperar(aprox(r.base, 1920), `base: esperado 1920, veio ${r.base}`);
        esperar(aprox(r.total, 1920), `total: esperado 1920, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Hora extra +50%: 20 dias + 2h extra = R$ 1.630,00', fn: async () => {
        const r = F({ dias: 20, horasExtras: 2 });
        esperar(aprox(r.valorHora, 10), `valor/hora: esperado 10, veio ${r.valorHora}`);
        esperar(aprox(r.valorExtra, 30), `hora extra: esperado 30, veio ${r.valorExtra}`);
        esperar(aprox(r.total, 1630), `total: esperado 1630, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Hora extra +100%: 2h extra = R$ 40,00', fn: async () => {
        const r = F({ horasExtras: 2, pctExtra: 100 });
        esperar(aprox(r.valorExtra, 40), `hora extra: esperado 40, veio ${r.valorExtra}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Falta (diária): 22 dias − 2 faltas = R$ 1.600,00', fn: async () => {
        const r = F({ dias: 22, faltas: 2 });
        esperar(aprox(r.desconto, 160), `desconto: esperado 160, veio ${r.desconto}`);
        esperar(aprox(r.total, 1600), `total: esperado 1600, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Falta (hora): 160h − 2 faltas = R$ 1.728,00', fn: async () => {
        const r = calcularFolha({ forma_pagamento: 'hora', valor: 12, modo_calculo: 'somente_valor', dias: 160, faltas: 2, horasExtras: 0, pctExtra: 50 });
        esperar(aprox(r.desconto, 192), `desconto: esperado 192 (2 × 12 × 8h), veio ${r.desconto}`);
        esperar(aprox(r.total, 1728), `total: esperado 1728, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Direitos por fora: 22 dias × 80 → 13º + férias +1/3 + depósito = R$ 483,02', fn: async () => {
        const r = F({ dias: 22, modo_calculo: 'direitos_fora' });
        esperar(aprox(r.decimo, 146.67), `13º: esperado 146,67, veio ${r.decimo}`);
        esperar(aprox(r.ferias, 195.55), `férias: esperado 195,55, veio ${r.ferias}`);
        esperar(aprox(r.deposito, 140.80), `depósito: esperado 140,80, veio ${r.deposito}`);
        esperar(aprox(r.direitos, 483.02), `direitos: esperado 483,02, veio ${r.direitos}`);
        esperar(aprox(r.total, 2243.02), `total: esperado 2243,02, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Completo: 20 dias, 1 falta, 2h extra, direitos por fora = R$ 1.989,11', fn: async () => {
        const r = F({ dias: 20, faltas: 1, horasExtras: 2, modo_calculo: 'direitos_fora' });
        esperar(aprox(r.total, 1989.11), `total: esperado 1989,11, veio ${r.total}`);
      }},
      { grupo: 'Folha de Pagamento', nome: 'Somente valor NÃO soma direitos por fora', fn: async () => {
        const r = F({ dias: 22, modo_calculo: 'somente_valor' });
        esperar(r.direitos === 0, `direitos: esperado 0, veio ${r.direitos}`);
      }},

      // ===== CHAVE PIX =====
      { grupo: 'Chave PIX', nome: 'E-mail detectado como e-mail', fn: async () => {
        esperar(detectarTipoPix('joao@email.com') === 'email', `veio: ${detectarTipoPix('joao@email.com')}`);
      }},
      { grupo: 'Chave PIX', nome: 'Telefone detectado como telefone', fn: async () => {
        esperar(detectarTipoPix('(11) 99999-0000') === 'telefone', `veio: ${detectarTipoPix('(11) 99999-0000')}`);
      }},
      { grupo: 'Chave PIX', nome: 'CPF (11 dígitos) detectado como CPF', fn: async () => {
        esperar(detectarTipoPix('123.456.789-00') === 'cpf', `veio: ${detectarTipoPix('123.456.789-00')}`);
      }},
      { grupo: 'Chave PIX', nome: 'CNPJ (14 dígitos) detectado como CNPJ', fn: async () => {
        esperar(detectarTipoPix('12.345.678/0001-00') === 'cnpj', `veio: ${detectarTipoPix('12.345.678/0001-00')}`);
      }},
      { grupo: 'Chave PIX', nome: 'Chave aleatória detectada como aleatória', fn: async () => {
        esperar(detectarTipoPix('f4a9c2e1-8b3d-4c5d') === 'aleatoria', `veio: ${detectarTipoPix('f4a9c2e1-8b3d-4c5d')}`);
      }},
      { grupo: 'Chave PIX', nome: 'Chave vazia retorna nulo', fn: async () => {
        esperar(detectarTipoPix('') === null, `veio: ${detectarTipoPix('')}`);
      }},

      // ===== DIAS DE PONTO =====
      { grupo: 'Dias de Ponto', nome: '22 dias em out/2026 pulando domingos (termina dia 26)', fn: async () => {
        const d = diasDoMes('2026-10', 22, true);
        esperar(d.length === 22, `quantidade: esperado 22, veio ${d.length}`);
        esperar(d[0] === '2026-10-01', `primeiro dia: esperado 2026-10-01, veio ${d[0]}`);
        esperar(d[d.length - 1] === '2026-10-26', `último dia: esperado 2026-10-26, veio ${d[d.length - 1]}`);
      }},
      { grupo: 'Dias de Ponto', nome: '22 dias sem pular domingos (termina dia 22)', fn: async () => {
        const d = diasDoMes('2026-10', 22, false);
        esperar(d.length === 22 && d[d.length - 1] === '2026-10-22', `veio ${d.length} dias, último ${d[d.length - 1]}`);
      }},
      { grupo: 'Dias de Ponto', nome: 'Quantidade maior que o mês limita a 31', fn: async () => {
        const d = diasDoMes('2026-10', 40, false);
        esperar(d.length === 31, `esperado 31, veio ${d.length}`);
      }},
      { grupo: 'Dias de Ponto', nome: 'Intervalo 01–07 pulando domingo = 6 dias', fn: async () => {
        const d = diasIntervalo('2026-10-01', '2026-10-07', true);
        esperar(d.length === 6, `esperado 6, veio ${d.length}`);
      }},
      { grupo: 'Dias de Ponto', nome: 'Intervalo 01–07 com domingo = 7 dias', fn: async () => {
        const d = diasIntervalo('2026-10-01', '2026-10-07', false);
        esperar(d.length === 7, `esperado 7, veio ${d.length}`);
      }},
      { grupo: 'Dias de Ponto', nome: 'Intervalo inválido retorna 0 dias', fn: async () => {
        esperar(diasIntervalo('', '2026-10-07', false).length === 0, 'deveria retornar lista vazia');
      }},

      // ===== FORMATAÇÃO =====
      { grupo: 'Formatação', nome: 'Máscara de CPF: 12345678901 → 123.456.789-01', fn: async () => {
        esperar(mascaraCPF('12345678901') === '123.456.789-01', `veio: ${mascaraCPF('12345678901')}`);
      }},
      { grupo: 'Formatação', nome: 'Moeda: 1760 → R$ 1.760,00', fn: async () => {
        esperar(formatarBRL(1760) === 'R$ 1.760,00', `veio: ${formatarBRL(1760)}`);
      }},
      { grupo: 'Formatação', nome: 'Número: "80,00" → 80', fn: async () => {
        esperar(paraNumero('80,00') === 80, `veio: ${paraNumero('80,00')}`);
      }},
      { grupo: 'Formatação', nome: 'Número: "12,5" → 12,5', fn: async () => {
        esperar(paraNumero('12,5') === 12.5, `veio: ${paraNumero('12,5')}`);
      }},
      { grupo: 'Formatação', nome: 'Número inválido ("abc") retorna nulo', fn: async () => {
        esperar(paraNumero('abc') === null, `veio: ${paraNumero('abc')}`);
      }},

      // ===== BANCO DE DADOS E SEGURANÇA =====
      { grupo: 'Banco e Segurança', nome: 'Conexão com o Supabase (empresas legível)', fn: async () => {
        const { error } = await supabase.from('empresas').select('id').limit(1);
        esperar(!error, error?.message || 'erro desconhecido');
      }},
      { grupo: 'Banco e Segurança', nome: 'Seu perfil está vinculado a uma empresa', fn: async () => {
        esperar(!!prof.empresa_id, 'empresa_id vazio — refaça o conserto do vínculo empresa/usuário');
      }},
      { grupo: 'Banco e Segurança', nome: 'Plano da empresa é válido', fn: async () => {
        const { data, error } = await supabase.from('empresas').select('plano').eq('id', prof.empresa_id).single();
        esperar(!error && ['gratis', 'essencial', 'ilimitado'].includes(data?.plano), `plano: ${data?.plano} / ${error?.message || ''}`);
      }},
      { grupo: 'Banco e Segurança', nome: 'Funcionários legíveis (RLS ativa)', fn: async () => {
        const { data, error } = await supabase.from('funcionarios').select('id').limit(5);
        esperar(!error && Array.isArray(data), error?.message || 'resposta não é lista');
      }},
      { grupo: 'Banco e Segurança', nome: 'Ponto legível', fn: async () => {
        const { data, error } = await supabase.from('ponto').select('id').limit(5);
        esperar(!error && Array.isArray(data), error?.message || 'resposta não é lista');
      }},
      { grupo: 'Banco e Segurança', nome: 'Folhas legíveis', fn: async () => {
        const { data, error } = await supabase.from('folhas').select('id').limit(5);
        esperar(!error && Array.isArray(data), error?.message || 'resposta não é lista');
      }},
      { grupo: 'Banco e Segurança', nome: 'Holerites legíveis', fn: async () => {
        const { data, error } = await supabase.from('holerites').select('id').limit(5);
        esperar(!error && Array.isArray(data), error?.message || 'resposta não é lista');
      }},
    ];

    for (const d of defs) {
      try {
        await d.fn();
        rs.push({ grupo: d.grupo, nome: d.nome, ok: true });
      } catch (e) {
        rs.push({ grupo: d.grupo, nome: d.nome, ok: false, erro: e?.message || 'falhou' });
      }
    }
    setResultados(rs);
    setCarregando(false);
  }

  async function rodarFluxoCompleto() {
    if (!window.confirm('Isto cria e apaga dados de teste (funcionário "TESTE AUTOMATICO"). Continuar?')) return;
    setRodandoE2e(true);
    setE2e(null);
    const passos = [];
    const registrar = (nome, ok, detalhe) => passos.push({ nome, ok, detalhe });
    let funcId = null;

    try {
      const { data: f, error: e1 } = await supabase.from('funcionarios').insert({
        empresa_id: perfil.empresa_id,
        nome: 'TESTE AUTOMATICO (apagar)',
        forma_pagamento: 'diaria',
        valor: 80,
        modo_calculo: 'somente_valor',
        tipo_chave_pix: 'cpf',
        status: 'ativo',
        dia_pagamento: 5,
      }).select('id').single();
      if (e1 || !f) {
        registrar('1. Criar funcionário de teste', false, e1?.message || 'não retornou id');
        setE2e(passos); setRodandoE2e(false); return;
      }
      funcId = f.id;
      registrar('1. Criar funcionário de teste', true, 'R$ 80/dia, somente valor');

      const { error: e2 } = await supabase.from('ponto').insert({
        empresa_id: perfil.empresa_id,
        funcionario_id: funcId,
        data: hojeISO,
        tipo: 'entrada',
        horas: 0,
        observacao: 'registro de teste automático',
      });
      registrar('2. Registrar ponto (entrada hoje)', !e2, e2 ? e2.message : 'ok');

      const calc = calcularFolha({ forma_pagamento: 'diaria', valor: 80, modo_calculo: 'somente_valor', dias: 22, faltas: 0, horasExtras: 0, pctExtra: 50 });
      const { error: e3 } = await supabase.from('folhas').upsert({
        empresa_id: perfil.empresa_id,
        funcionario_id: funcId,
        mes_ano: mesAtual,
        dias_trabalhados: 22,
        faltas: 0,
        horas_extras: 0,
        valor_base: calc.base,
        valor_hora_extra: calc.valorExtra,
        desconto_faltas: calc.desconto,
        direitos_por_fora: calc.direitos,
        total: calc.total,
        incluido: true,
        pago: false,
      }, { onConflict: 'funcionario_id,mes_ano' });
      registrar('3. Gerar folha do mês', !e3, e3 ? e3.message : `total calculado ${formatarBRL(calc.total)}`);

      const { data: fl, error: e4 } = await supabase.from('folhas').select('total').eq('funcionario_id', funcId).eq('mes_ano', mesAtual).maybeSingle();
      const ok4 = !e4 && fl && aprox(fl.total, 1760);
      registrar('4. Conferir total salvo no banco', !!ok4, e4 ? e4.message : `total salvo: ${fl ? formatarBRL(fl.total) : 'não encontrado'}`);
    } catch (e) {
      registrar('Erro inesperado', false, e?.message || '');
    } finally {
      if (funcId) {
        await supabase.from('folhas').delete().eq('funcionario_id', funcId);
        await supabase.from('ponto').delete().eq('funcionario_id', funcId);
        const { error: eDel } = await supabase.from('funcionarios').delete().eq('id', funcId);
        registrar('5. Limpeza dos dados de teste', !eDel, eDel ? eDel.message : 'folha, ponto e funcionário apagados');
      }
      setE2e(passos);
      setRodandoE2e(false);
    }
  }

  if (carregando) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Rodando testes...</div>;
  }

  const total = resultados?.length || 0;
  const passou = resultados?.filter((r) => r.ok).length || 0;
  const falhou = total - passou;
  const grupos = resultados ? [...new Set(resultados.map((r) => r.grupo))] : [];
  const e2eOk = e2e ? e2e.filter((p) => p.ok).length : 0;

  return (
    <div className="md:flex">
      <Sidebar nome={perfil?.nome} perfil={perfil?.perfil} />
      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🧪 Testes do Sistema</h1>
          <p className="text-sm text-gray-500">Verificação automática das regras do Korvo RH — roda no navegador, sem alterar seus dados.</p>
        </div>

        <div className={`rounded-2xl border p-6 mb-6 ${falhou === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-sm font-semibold text-gray-600">Resumo</div>
          <div className={`text-4xl font-extrabold mt-1 ${falhou === 0 ? 'text-green-700' : 'text-red-600'}`}>
            {passou} de {total} testes passaram
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {falhou === 0 ? '✅ Tudo certo! As regras do sistema estão funcionando.' : `❌ ${falhou} teste(s) falharam — veja os detalhes abaixo.`}
          </div>
        </div>

        {grupos.map((g) => {
          const itens = resultados.filter((r) => r.grupo === g);
          const okG = itens.filter((i) => i.ok).length;
          return (
            <div key={g} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-5">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">{g}</h2>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${okG === itens.length ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {okG}/{itens.length}
                </span>
              </div>
              <div className="divide-y divide-gray-50">
                {itens.map((t) => (
                  <div key={t.nome} className="px-5 py-2.5 text-sm">
                    <div className="flex items-start gap-2">
                      <span>{t.ok ? '✅' : '❌'}</span>
                      <span className={t.ok ? 'text-gray-700' : 'text-gray-900 font-semibold'}>{t.nome}</span>
                    </div>
                    {!t.ok && <div className="ml-6 mt-1 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">{t.erro}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 mb-5">
          <h2 className="font-bold text-gray-900">🔁 Teste do fluxo completo</h2>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Simula o uso real: cria um funcionário de teste, registra ponto, gera a folha, confere o total no banco
            e <b>apaga tudo</b> no final. Use quando quiser validar o sistema de ponta a ponta.
          </p>
          <button
            onClick={rodarFluxoCompleto}
            disabled={rodandoE2e}
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {rodandoE2e ? 'Rodando teste completo...' : 'Rodar teste do fluxo completo'}
          </button>

          {e2e && (
            <div className="mt-4">
              <div className={`text-sm font-semibold mb-2 ${e2eOk === e2e.length ? 'text-green-700' : 'text-red-600'}`}>
                {e2eOk}/{e2e.length} etapas OK
              </div>
              <div className="divide-y divide-gray-50 border border-gray-100 rounded-xl">
                {e2e.map((p, i) => (
                  <div key={i} className="px-4 py-2.5 text-sm">
                    <div className="flex items-start gap-2">
                      <span>{p.ok ? '✅' : '❌'}</span>
                      <span className={p.ok ? 'text-gray-700' : 'text-gray-900 font-semibold'}>{p.nome}</span>
                    </div>
                    {p.detalhe && <div className="ml-6 mt-0.5 text-xs text-gray-500">{p.detalhe}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">
          💡 Os testes automáticos rodam toda vez que você abre esta página e não alteram seus dados.
          O teste do fluxo completo cria e apaga apenas dados de teste (nome "TESTE AUTOMATICO").
        </p>
      </main>
    </div>
  );
}
