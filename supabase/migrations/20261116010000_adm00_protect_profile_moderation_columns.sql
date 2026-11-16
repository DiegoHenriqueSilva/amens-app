-- ADM00 · S8: usuário comum conseguia remover a própria suspensão
-- (policy "Users can update own profile." não restringe colunas).
-- APLICADA MANUALMENTE em produção (fszltwvhbdasqoznnors) em 2026-11-16.
-- Rollback: drop trigger protect_profile_moderation_columns on public.profiles;
--           drop function public.protect_profile_moderation_columns();

begin;

create or replace function public.protect_profile_moderation_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Só vale para chamadas diretas da API (papéis authenticated/anon).
  -- Funções SECURITY DEFINER e service_role (edge functions) não são afetadas.
  if current_user in ('authenticated', 'anon') and not public.is_moderator_or_admin() then
    if new.suspended_until is distinct from old.suspended_until
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by then
      raise exception 'Somente moderadores podem alterar suspensão ou remoção de perfil'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_moderation_columns on public.profiles;
create trigger protect_profile_moderation_columns
  before update on public.profiles
  for each row execute function public.protect_profile_moderation_columns();

commit;
