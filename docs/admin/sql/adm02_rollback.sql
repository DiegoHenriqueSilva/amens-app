-- Rollback de supabase/migrations/20261116040000_adm02_user_admin_commands.sql
-- Volta ao estado das migrations ADM00 (S4 + S8). As telas da branch ADM02
-- dependem destes comandos: reverta o front junto.

begin;

do $$
declare t text;
begin
  foreach t in array array['prayer_requests','prayer_intercessions','prayer_reactions',
                           'prayer_contributions','prayer_intentions','friend_requests','notifications']
  loop
    execute format('drop trigger if exists enforce_account_not_restricted on public.%I', t);
  end loop;
end $$;
drop trigger if exists enforce_account_not_restricted_update on public.prayer_requests;
drop function if exists public.enforce_account_not_restricted();

drop trigger if exists protect_user_roles on public.user_roles;
drop function if exists public.protect_user_roles();

drop function if exists public.admin_suspend_user(uuid, integer, text);
drop function if exists public.admin_unsuspend_user(uuid, text);
drop function if exists public.admin_set_user_removed(uuid, boolean, text);
drop function if exists public.admin_set_user_role(uuid, text, text);
drop function if exists public.admin_set_user_xp(uuid, integer, text);
drop function if exists public.admin_set_xp_multiplier(uuid, numeric, text);
drop function if exists public._admin_check_target(uuid, text, boolean);
drop function if exists public._admin_log(uuid, text, text, jsonb);
drop function if exists public.my_account_status();
drop function if exists public.is_user_restricted(uuid);

-- Versão ADM00 (S8 + S4), sem a regra de "não em si mesmo"
create or replace function public.protect_profile_moderation_columns()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not public.is_moderator_or_admin() then
    if new.suspended_until is distinct from old.suspended_until
       or new.deleted_at is distinct from old.deleted_at
       or new.deleted_by is distinct from old.deleted_by then
      raise exception 'Somente moderadores podem alterar suspensão ou remoção de perfil' using errcode = '42501';
    end if;
  elsif not public.is_admin() and new.id <> auth.uid() then
    if (to_jsonb(new) - 'suspended_until') is distinct from (to_jsonb(old) - 'suspended_until') then
      raise exception 'Moderadores só podem alterar a suspensão de outros perfis' using errcode = '42501';
    end if;
  end if;
  return new;
end; $$;

commit;
