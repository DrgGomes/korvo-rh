-- ============================================
-- KORVO RH - Ajuste 02: cadastro de empresa e perfil
-- Este arquivo fica salvo no repositório.
-- Vamos executá-lo no SQL Editor do Supabase no Bloco 3.
-- ============================================

-- 1) Cria o perfil automaticamente quando alguém cria uma conta
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, perfil)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'master'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) Função que cria a empresa e vincula o dono como Master
create or replace function public.criar_empresa_e_perfil(
  empresa_nome text,
  usuario_nome text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  nova_empresa_id uuid;
begin
  insert into public.empresas (nome, plano)
  values (empresa_nome, 'gratis')
  returning id into nova_empresa_id;

  insert into public.profiles (id, empresa_id, nome, perfil)
  values (auth.uid(), nova_empresa_id, usuario_nome, 'master')
  on conflict (id) do update
    set empresa_id = excluded.empresa_id,
        nome = excluded.nome,
        perfil = excluded.perfil;

  return nova_empresa_id;
end;
$$;
