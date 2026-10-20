// ============================================
// KORVO RH — Biblioteca central de cálculos
// Fonte única da verdade das regras de negócio.
// A página de Testes valida estas funções.
// ============================================

export const HORAS_PADRAO_DIA = 8;
export const PERCENTUAL_DEPOSITO = 8;

export function paraNumero(v) {
  const p = parseFloat(String(v ?? '').replace(',', '.'));
  return isNaN(p) ? null : p;
}

export function formatarBRL(v) {
  if (v == null || isNaN(v)) return 'R$ 0,00';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function mascaraCPF(v) {
  const d = String(v || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function detectarTipoPix(chave) {
  const c = String(chave || '').trim();
  if (!c) return null;
  if (c.includes('@')) return 'email';
  if (/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/.test(c)) return 'telefone';
  const d = c.replace(/\D/g, '');
  if (d.length === 11) return 'cpf';
  if (d.length === 14) return 'cnpj';
  return 'aleatoria';
}

export function calcularFolha({ forma_pagamento, valor, modo_calculo, dias, faltas, horasExtras, pctExtra }) {
  const qtd = paraNumero(dias) ?? 0;
  const f = paraNumero(faltas) ?? 0;
  const e = paraNumero(horasExtras) ?? 0;
  const v = paraNumero(valor) ?? 0;
  const pct = paraNumero(pctExtra) ?? 50;

  const base = qtd * v;
  const valorHora = forma_pagamento === 'diaria' ? v / HORAS_PADRAO_DIA : v;
  const desconto = f * (forma_pagamento === 'diaria' ? v : v * HORAS_PADRAO_DIA);
  const valorExtra = e * valorHora * (1 + pct / 100);

  const decimo = base / 12;
  const ferias = (base / 12) * 1.3333;
  const deposito = base * (PERCENTUAL_DEPOSITO / 100);
  const direitos = modo_calculo === 'direitos_fora' ? decimo + ferias + deposito : 0;

  const total = base + valorExtra + direitos - desconto;
  return { base, valorHora, desconto, valorExtra, decimo, ferias, deposito, direitos, total };
}

export function diasDoMes(mesStr, qtd, pularDom) {
  const [y, m] = String(mesStr || '').split('-').map(Number);
  if (!y || !m) return [];
  const total = new Date(y, m, 0).getDate();
  const datas = [];
  for (let d = 1; d <= total && datas.length < qtd; d++) {
    const diaSemana = new Date(y, m - 1, d).getDay();
    if (pularDom && diaSemana === 0) continue;
    datas.push(`${mesStr}-${String(d).padStart(2, '0')}`);
  }
  return datas;
}

export function diasIntervalo(inicio, fim, pularDom) {
  if (!inicio || !fim) return [];
  const cur = new Date(inicio + 'T00:00:00');
  const fimD = new Date(fim + 'T00:00:00');
  if (isNaN(cur.getTime()) || isNaN(fimD.getTime())) return [];
  const datas = [];
  while (cur <= fimD) {
    if (!(pularDom && cur.getDay() === 0)) {
      datas.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`);
    }
    cur.setDate(cur.getDate() + 1);
  }
  return datas;
}
