-- Rollback de supabase/migrations/20261116020000_adm00_moderator_permissions.sql
-- Restaura o estado anterior (mantém a correção S8 da migration 20261116010000).

begin;

-- S3
drop policy if exists "churches_insert_mod" on public.churches;
drop policy if exists "churches_insert_admin" on public.churches;
create policy "churches_insert_admin" on public.churches for insert to authenticated
  with check (public.is_admin());

-- S4 (volta à versão só com S8)
create or replace function public.protect_profile_moderation_columns()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_moderator_or_admin() then
    if new.suspended_until is distinct from old.suspended_until
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by then
      raise exception 'Somente moderadores podem alterar suspensão ou remoção de perfil' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

-- S6
create or replace function public.get_users_admin()
returns table(id uuid, email text, last_sign_in_at timestamptz)
language plpgsql stable security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin role required';
  end if;
  return query select u.id, u.email::text, u.last_sign_in_at from auth.users u;
end; $$;

-- S7
drop trigger if exists protect_prayer_moderation_state on public.prayer_requests;
drop function if exists public.protect_prayer_moderation_state();

-- S9
drop policy if exists "user_xp_overrides_admin" on public.user_xp_overrides;
create policy "Admin acessa overrides" on public.user_xp_overrides for all to authenticated
  using (exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                 where ur.user_id = auth.uid() and r.name = any (array['admin','moderator'])));

commit;
