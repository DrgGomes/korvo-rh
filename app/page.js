import Link from 'next/link';

const paraQuem = [
  { icone: '🏪', titulo: 'MEI e pequenas empresas', texto: 'Que não registram em carteira, mas querem pagar os direitos por fora com organização.' },
  { icone: '🛒', titulo: 'Comércios e prestadores', texto: 'Que precisam controlar diárias, horas e faltas no dia a dia corrido.' },
  { icone: '📒', titulo: 'Quem paga por fora', texto: 'Que querem largar o caderno e a planilha e ter tudo registrado, conferido e automático.' },
];

const passos = [
  { num: '1', titulo: 'Cadastre seus funcionários', texto: 'Nome, valor por dia ou por hora, chave PIX e o modo de cálculo de cada um.' },
  { num: '2', titulo: 'Registre o ponto', texto: 'Entradas, saídas, faltas e horas extras em poucos cliques — até pelo celular.' },
  { num: '3', titulo: 'Gere a folha', texto: 'O sistema calcula sozinho: dias × valor, horas extras +50%, faltas descontando e os direitos por fora.' },
  { num: '4', titulo: 'Pague pelo relatório', texto: 'A lista pronta com nome, valor e chave PIX de cada um — para pagar um por um no dia certo.' },
];

const recursos = [
  { icone: '⏱️', titulo: 'Controle de ponto', texto: 'Entradas, saídas, faltas e horas extras, com resumo por mês e por funcionário.' },
  { icone: '🧮', titulo: 'Folha automática', texto: 'Cálculo por dia ou por hora, com direitos por fora: 13º, férias +1/3 e depósito mensal.' },
  { icone: '🧾', titulo: 'Holerite em PDF', texto: '1 via ou 2 vias (recibo), pronto para imprimir ou salvar.' },
  { icone: '💳', titulo: 'Relatório com chave PIX', texto: 'A lista de pagamento com nome, valor e chave na frente — pague um por um, sem errar.' },
  { icone: '🔐', titulo: 'Perfis de acesso', texto: 'Master, Gerente e Financeiro — cada um enxerga só o que precisa.' },
  { icone: '🏢', titulo: 'Uma conta por empresa', texto: 'Cada empresa só vê os dados dela. Simples e seguro.' },
];

const planos = [
  {
    nome: 'Grátis',
    preco: 'R$ 0',
    periodo: 'para sempre',
    destaque: false,
    itens: ['Até 3 funcionários', 'Holerite com marca d\'água', 'Perfil Master', 'Sem cartão de crédito'],
    botao: 'Começar grátis',
    href: '/login',
  },
  {
    nome: 'Essencial',
    preco: 'R$ 14,90',
    periodo: '/mês',
    destaque: true,
    itens: ['Até 10 funcionários', 'Holerite limpo, 1 ou 2 vias', 'Master + 1 perfil', 'Exportar relatório', 'Backup automático'],
    botao: 'Assinar',
    href: '/login',
    emBreve: true,
  },
  {
    nome: 'Ilimitado',
    preco: 'R$ 29,90',
    periodo: '/mês',
    destaque: false,
    itens: ['Sem limite de funcionários', 'Holerite com logo da empresa', 'Perfis ilimitados', 'Importação por Excel'],
    botao: 'Assinar',
    href: '/login',
    emBreve: true,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-white text-gray-900">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="text-xl font-extrabold text-green-700">Korvo RH</div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#para-quem" className="hover:text-green-700">Para quem é</a>
            <a href="#como-funciona" className="hover:text-green-700">Como funciona</a>
            <a href="#recursos" className="hover:text-green-700">Recursos</a>
            <a href="#planos" className="hover:text-green-700">Planos</a>
          </nav>
          <Link href="/login" className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700 transition">
            Criar conta grátis
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-4 pt-16 md:pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight max-w-3xl mx-auto">
          Pague seus funcionários do <span className="text-green-600">jeito certo</span>, sem burocracia
        </h1>
        <p className="text-lg text-gray-600 mt-6 max-w-2xl mx-auto">
          O Korvo RH organiza a folha de pagamento de quem trabalha por fora: dias trabalhados, horas extras,
          faltas, holerite e a lista de pagamento com a chave PIX — tudo simples e automático.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/login" className="bg-green-600 text-white font-semibold px-8 py-3 rounded-xl hover:bg-green-700 transition text-lg">
            Criar conta grátis
          </Link>
          <a href="#como-funciona" className="border border-gray-300 text-gray-700 font-semibold px-8 py-3 rounded-xl hover:bg-gray-50 transition text-lg">
            Ver como funciona
          </a>
        </div>
        <p className="text-sm text-gray-400 mt-4">
          Grátis para começar • até 3 funcionários • sem cartão de crédito
        </p>

        {/* Mock do dashboard */}
        <div className="mt-14 bg-gray-50 border border-gray-200 rounded-2xl p-6 md:p-10 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-3 h-3 rounded-full bg-red-300" />
            <span className="w-3 h-3 rounded-full bg-yellow-300" />
            <span className="w-3 h-3 rounded-full bg-green-300" />
            <span className="text-xs text-gray-400 ml-2">dashboard.korvo • Lista de pagamento do dia</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {['Funcionários ativos — 12', 'Folha do mês — R$ 18.450', 'Pendências hoje — 3', 'Horas extras — 87h'].map((t) => (
              <div key={t} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xs text-gray-500">{t.split(' — ')[0]}</div>
                <div className="text-lg font-extrabold text-gray-900 mt-1">{t.split(' — ')[1]}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-bold text-gray-900">Pagamentos de hoje</div>
            <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-400 uppercase">
              <div className="col-span-3">Nome</div>
              <div className="col-span-2">Dias</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-3">Chave PIX</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {[
              ['João Silva', '22', 'R$ 1.760,00', 'joao@email.com', true],
              ['Ana Souza', '21', 'R$ 1.680,00', '(11) 99999-0000', true],
              ['Carlos Pereira', '20', 'R$ 1.600,00', '123.456.789-00', false],
              ['Mariana Lima', '22', 'R$ 1.980,00', 'f4a9c2e1-8b3d', false],
            ].map(([nome, dias, total, pix, pago]) => (
              <div key={nome} className={`grid grid-cols-2 md:grid-cols-12 gap-1 md:gap-2 px-4 py-2 border-t border-gray-50 text-sm ${pago ? 'opacity-40' : ''}`}>
                <div className="col-span-2 md:col-span-3 font-medium text-gray-900">{nome}</div>
                <div className="col-span-1 md:col-span-2 text-gray-500">{dias} dias</div>
                <div className="col-span-2 md:col-span-2 font-semibold text-green-700">{total}</div>
                <div className="col-span-3 md:col-span-3 text-xs text-gray-500 truncate">{pix}</div>
                <div className="col-span-2 md:col-span-2 text-right">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${pago ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {pago ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARA QUEM É */}
      <section id="para-quem" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Para quem é o Korvo RH?</h2>
          <p className="text-gray-600 text-center mt-2 max-w-xl mx-auto">
            Sistema de controle interno de pagamentos — sem vínculo com órgãos governamentais, feito para o dia a dia corrido.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {paraQuem.map((c) => (
              <div key={c.titulo} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="text-3xl mb-3">{c.icone}</div>
                <h3 className="font-bold text-lg">{c.titulo}</h3>
                <p className="text-sm text-gray-600 mt-2">{c.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Como funciona</h2>
          <p className="text-gray-600 text-center mt-2">Do cadastro ao pagamento em 4 passos simples.</p>
          <div className="grid md:grid-cols-4 gap-6 mt-10">
            {passos.map((p) => (
              <div key={p.num} className="relative bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white font-extrabold flex items-center justify-center mb-4">{p.num}</div>
                <h3 className="font-bold">{p.titulo}</h3>
                <p className="text-sm text-gray-600 mt-2">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Tudo o que você precisa para pagar certo</h2>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {recursos.map((r) => (
              <div key={r.titulo} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div className="text-3xl mb-3">{r.icone}</div>
                <h3 className="font-bold">{r.titulo}</h3>
                <p className="text-sm text-gray-600 mt-2">{r.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center">Planos simples, preço justo</h2>
          <p className="text-gray-600 text-center mt-2">Comece grátis. Quando crescer, escolha o plano.</p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {planos.map((p) => (
              <div
                key={p.nome}
                className={`relative rounded-2xl border p-6 shadow-sm flex flex-col ${
                  p.destaque ? 'border-green-600 ring-2 ring-green-600 bg-white' : 'border-gray-200 bg-white'
                }`}
              >
                {p.destaque && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MAIS POPULAR
                  </span>
                )}
                <h3 className="font-bold text-lg">{p.nome}</h3>
                <div className="mt-2">
                  <span className="text-3xl font-extrabold">{p.preco}</span>
                  <span className="text-gray-500 text-sm">{p.periodo}</span>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-gray-600 flex-1">
                  {p.itens.map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span> {i}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={`mt-6 text-center font-semibold py-2.5 rounded-xl transition ${
                    p.destaque ? 'bg-green-600 text-white hover:bg-green-700' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {p.botao}
                </Link>
                {p.emBreve && (
                  <p className="text-center text-xs text-gray-400 mt-2">Pagamento online chegando em breve</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">
            Por enquanto, o plano Grátis está liberado para todos — sem cartão de crédito.
          </p>
        </div>
      </section>

      {/* DEPOIMENTO */}
      <section className="bg-green-50 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-4xl mb-4">💬</div>
          <blockquote className="text-xl font-medium text-gray-800">
            &ldquo;Antes eu anotava tudo no caderno e no fim do mês era um sufoco. Agora abro o relatório,
            vejo a chave PIX de cada um e pago em minutos.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm font-semibold text-gray-600">Maria — dona de um mercadinho</p>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold">Comece a organizar sua folha hoje</h2>
          <p className="text-gray-600 mt-3">Grátis para começar. Leva menos de 2 minutos para criar a conta.</p>
          <Link href="/login" className="inline-block mt-6 bg-green-600 text-white font-semibold px-10 py-3.5 rounded-xl hover:bg-green-700 transition text-lg">
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-xl font-extrabold text-white">Korvo RH</div>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Sistema de controle interno de pagamentos — sem vínculo com órgãos governamentais.
          </p>
          <p className="text-xs mt-4">© 2026 Korvo RH. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
