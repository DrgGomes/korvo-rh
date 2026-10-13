'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [modo, setModo] = useState('entrar');
  const [nome, setNome] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro('E-mail ou senha incorretos. Confira e tente novamente.');
      return;
    }
    router.push('/dashboard');
  }

  async function criarConta(e) {
    e.preventDefault();
    setErro('');
    if (!empresa.trim() || !nome.trim() || !email.trim() || senha.length < 6) {
      setErro('Preencha todos os campos. A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    setCarregando(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) {
      setCarregando(false);
      setErro('Não foi possível criar a conta: ' + error.message);
      return;
    }
    if (data?.user) {
      await supabase.rpc('criar_empresa_e_perfil', {
        empresa_nome: empresa.trim(),
        usuario_nome: nome.trim(),
      });
    }
    const { data: sessao } = await supabase.auth.getSession();
    setCarregando(false);
    if (sessao?.session) {
      router.push('/dashboard');
    } else {
      setErro('Conta criada! Confirme seu e-mail (veja a caixa de entrada) e depois entre.');
      setModo('entrar');
    }
  }

  const campo = 'w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500';
  const botao = 'w-full bg-green-600 text-white font-semibold py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-green-700">Korvo RH</div>
          <p className="text-sm text-gray-500 mt-1">Controle interno de pagamentos — sem burocracia.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
            <button
              onClick={() => { setModo('entrar'); setErro(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold ${modo === 'entrar' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setModo('criar'); setErro(''); }}
              className={`flex-1 py-2 rounded-md text-sm font-semibold ${modo === 'criar' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Criar conta grátis
            </button>
          </div>

          <form onSubmit={modo === 'entrar' ? entrar : criarConta} className="space-y-4">
            {modo === 'criar' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da sua empresa</label>
                  <input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Mercadinho do João" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seu nome</label>
                  <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João Silva" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input type="email" className={campo} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" className={campo} value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
            </div>

            {erro && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

            <button type="submit" disabled={carregando} className={botao}>
              {carregando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Criar conta grátis'}
            </button>
          </form>

          {modo === 'criar' && (
            <p className="text-xs text-gray-400 mt-4 text-center">
              Plano Grátis: até 3 funcionários, sem cartão de crédito.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Sistema de controle interno — não possui integração com INSS, Receita Federal ou bancos.
        </p>
      </div>
    </div>
  );
}
