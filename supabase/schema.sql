-- ============================================
-- KORVO RH - Banco de dados (Supabase)
-- Execute este script inteiro no SQL Editor
-- ============================================

create extension if not exists "uuid-ossp";

-- Plano da empresa: gratis / essencial / ilimitado
create type public.plano_tipo as enum ('gratis', 'essencial', 'ilimitado');

-- Empresas que usam o sistema
create table public.empresas (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  cnpj text,
  telefone text,
  endereco text,
  plano public.plano_tipo not null default 'gratis',
  ativo boolean not null default true,
  dia_pagamento_padrao int not null default 5,
  percentual_hora_extra numeric not null default 50,
  criado_em timestamptz not null default now()
);

-- Perfis de usuário (ligado ao login do Supabase)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  empresa_id uuid references public.empresas(id) on delete cascade,
  nome text not null,
  perfil text not null check (perfil in ('master','gerente','financeiro'))
);

-- Funcionários
create table public.funcionarios (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  nome text not null,
  cpf text,
  telefone text,
  cargo text,
  forma_pagamento text not null check (forma_pagamento in ('diaria','hora')),
  valor numeric not null default 0,
  modo_calculo text not null default 'somente_valor' check (modo_calculo in ('somente_valor','direitos_fora')),
  chave_pix text,
  tipo_chave_pix text check (tipo_chave_pix in ('cpf','cnpj','email','telefone','aleatoria')),
  status text not null default 'ativo' check (status in ('ativo','inativo')),
  dia_pagamento int not null default 5,
  criado_em timestamptz not null default now()
);

-- Controle de ponto
create table public.ponto (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada','saida','falta','hora_extra')),
  horas numeric default 0,
  observacao text
);

-- Folha de pagamento
create table public.folhas (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  funcionario_id uuid not null references public.funcionarios(id) on delete cascade,
  mes_ano text not null,
  dias_trabalhados numeric not null default 0,
  faltas numeric not null default 0,
  horas_extras numeric not null default 0,
  valor_base numeric not null default 0,
  valor_hora_extra numeric not null default 0,
  desconto_faltas numeric not null default 0,
  direitos_por_fora numeric not null default 0,
  total numeric not null default 0,
  pago boolean not null default false,
  incluido boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (funcionario_id, mes_ano)
);

-- Holerites gerados
create table public.holerites (
  id uuid primary key default uuid_generate_v4(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  folha_id uuid not null references public.folhas(id) on delete cascade,
  vias int not null default 1 check (vias in (1,2)),
  gerado_em timestamptz not null default now()
);

-- ============================================
-- SEGURANÇA: cada empresa só enxerga os dados dela
-- ============================================

create or replace function public.minha_empresa()
returns uuid
language sql stable security definer set search_path = public
as $$
  select empresa_id from public.profiles where id = auth.uid()
$$;

alter table public.empresas enable row level security;
alter table public.profiles enable row level security;
alter table public.funcionarios enable row level security;
alter table public.ponto enable row level security;
alter table public.folhas enable row level security;
alter table public.holerites enable row level security;

create policy "ver propria empresa" on public.empresas
  for select using (id = public.minha_empresa());

create policy "ver proprio perfil" on public.profiles
  for select using (id = auth.uid() or empresa_id = public.minha_empresa());

create policy "ver funcionarios" on public.funcionarios
  for select using (empresa_id = public.minha_empresa());
create policy "criar funcionarios" on public.funcionarios
  for insert with check (empresa_id = public.minha_empresa());
create policy "editar funcionarios" on public.funcionarios
  for update using (empresa_id = public.minha_empresa());
create policy "apagar funcionarios" on public.funcionarios
  for delete using (empresa_id = public.minha_empresa());

create policy "ver ponto" on public.ponto
  for select using (empresa_id = public.minha_empresa());
create policy "criar ponto" on public.ponto
  for insert with check (empresa_id = public.minha_empresa());
create policy "editar ponto" on public.ponto
  for update using (empresa_id = public.minha_empresa());
create policy "apagar ponto" on public.ponto
  for delete using (empresa_id = public.minha_empresa());

create policy "ver folhas" on public.folhas
  for select using (empresa_id = public.minha_empresa());
create policy "criar folhas" on public.folhas
  for insert with check (empresa_id = public.minha_empresa());
create policy "editar folhas" on public.folhas
  for update using (empresa_id = public.minha_empresa());
create policy "apagar folhas" on public.folhas
  for delete using (empresa_id = public.minha_empresa());

create policy "ver holerites" on public.holerites
  for select using (empresa_id = public.minha_empresa());
create policy "criar holerites" on public.holerites
  for insert with check (empresa_id = public.minha_empresa());
create policy "apagar holerites" on public.holerites
  for delete using (empresa_id = public.minha_empresa());
