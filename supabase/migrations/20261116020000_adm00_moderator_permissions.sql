-- ADM00 · Decisões de permissão do moderador (2026-11-16)
--   S3 sim: moderador gerencia Igrejas (UPDATE já permitido; libera INSERT)
--   S4 sim: moderador só altera suspended_until em perfis de outras pessoas
--   S6 sim: moderador vê e-mails (get_users_admin) na tela de Feedback
--   S7 não: dono NÃO reativa pedido banido/em revisão nem restaura pedido removido
--   S9 não: moderador NÃO acessa user_xp_overrides (só admin)
-- APLICADA MANUALMENTE em produção (fszltwvhbdasqoznnors) em 2026-11-16.
-- Rollback: docs/admin/sql/05_rollback_moderador.sql

begin;

-- ───────────── S3 · churches ─────────────
drop policy if exists "churches_insert_admin" on public.churches;
drop policy if exists "churches_insert_mod" on public.churches;
create policy "churches_insert_mod"
  on public.churches for insert
  to authenticated
  with check (public.is_moderator_or_admin());
-- (churches_insert_user continua: qualquer usuário sugere igreja como pending_review)

-- ───────────── S4 + S8 · profiles ─────────────
create or replace function public.protect_profile_moderation_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  -- Só vale para chamadas diretas da API. Funções SECURITY DEFINER e
  -- service_role (edge functions) não são afetadas.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if not public.is_moderator_or_admin() then
    -- S8: usuário comum não mexe em suspensão/remoção (nem do próprio perfil)
    if new.suspended_until is distinct from old.suspended_until
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by then
      raise exception 'Somente moderadores podem alterar suspensão ou remoção de perfil'
        using errcode = '42501';
    end if;
  elsif not public.is_admin() and new.id <> auth.uid() then
    -- S4: moderador, no perfil de outra pessoa, só altera suspended_until
    if (to_jsonb(new) - 'suspended_until') is distinct from (to_jsonb(old) - 'suspended_until') then
      raise exception 'Moderadores só podem alterar a suspensão de outros perfis'
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

-- ───────────── S6 · get_users_admin ─────────────
create or replace function public.get_users_admin()
returns table(id uuid, email text, last_sign_in_at timestamptz)
language plpgsql
stable security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_moderator_or_admin() then
    raise exception 'Access denied: moderator or admin role required'
      using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, u.last_sign_in_at
    from auth.users u;
end;
$$;
revoke all on function public.get_users_admin() from public, anon;
grant execute on function public.get_users_admin() to authenticated;

-- ───────────── S7 · prayer_requests ─────────────
create or replace function public.protect_prayer_moderation_state()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_moderator_or_admin() then
    return new;
  end if;

  -- Pedido barrado pela moderação: só mod/admin mudam o status.
  if old.status in ('banned', 'policy_violation', 'pending_review')
     and new.status is distinct from old.status then
    raise exception 'Este pedido está em moderação e não pode ter o status alterado'
      using errcode = '42501';
  end if;

  -- Pedido removido: só mod/admin restauram.
  if old.deleted_at is not null
     and (new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by) then
    raise exception 'Somente moderadores podem restaurar um pedido removido'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_prayer_moderation_state on public.prayer_requests;
create trigger protect_prayer_moderation_state
  before update on public.prayer_requests
  for each row execute function public.protect_prayer_moderation_state();

-- ───────────── S9 · user_xp_overrides ─────────────
drop policy if exists "Admin acessa overrides" on public.user_xp_overrides;
drop policy if exists "user_xp_overrides_admin" on public.user_xp_overrides;
create policy "user_xp_overrides_admin"
  on public.user_xp_overrides for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
