-- ADM02 · Usuários: comandos administrativos no servidor + efeito real de suspensão/banimento
-- Decisões aprovadas em 2026-11-16 (docs/admin/ADM02-usuarios.md):
--   F04: ninguém suspende, bane ou muda o próprio papel; o sistema nunca fica sem admin.
--   F02: conta suspensa ou removida continua lendo, mas o banco recusa interações.
-- Cada comando valida alvo, ator, motivo e intervalo e grava a ação e o log de
-- moderação na MESMA transação (sem falso sucesso nem ação sem auditoria).
-- Rollback: docs/admin/sql/adm02_rollback.sql

begin;

-- ════════════════════ 1. Estado da conta ════════════════════

create or replace function public.is_user_restricted(p_user uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
     where id = p_user
       and (deleted_at is not null or (suspended_until is not null and suspended_until > now()))
  );
$$;
revoke all on function public.is_user_restricted(uuid) from public, anon;
grant execute on function public.is_user_restricted(uuid) to authenticated;

-- Para o app mostrar o aviso (a própria pessoa não lê o próprio perfil removido via RLS).
create or replace function public.my_account_status()
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'removed',         p.deleted_at is not null,
    'suspended_until', case when p.suspended_until > now() then p.suspended_until end,
    'restricted',      p.deleted_at is not null or coalesce(p.suspended_until > now(), false)
  )
  from public.profiles p
  where p.id = auth.uid();
$$;
revoke all on function public.my_account_status() from public, anon;
grant execute on function public.my_account_status() to authenticated;

-- ════════════════════ 2. Efeito real (F02) ════════════════════

create or replace function public.enforce_account_not_restricted()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_until timestamptz;
  v_removed boolean;
begin
  -- Sem usuário (service_role, cron, webhook) ou moderação agindo: não se aplica.
  if v_uid is null or public.is_moderator_or_admin() then
    return new;
  end if;
  -- Em UPDATE de pedido, só a edição feita pelo próprio dono é interação dele
  -- (ex.: a escalada automática de reports atualiza o pedido em nome do denunciante).
  -- (IF aninhado: o PL/pgSQL não garante curto-circuito no AND, e tabelas como
  --  prayer_reactions/friend_requests não têm a coluna user_id.)
  if tg_op = 'UPDATE' then
    if old.user_id is distinct from v_uid then
      return new;
    end if;
  end if;

  select deleted_at is not null, case when suspended_until > now() then suspended_until end
    into v_removed, v_until
    from public.profiles where id = v_uid;

  if v_removed then
    raise exception 'Sua conta foi removida pela moderação e não pode realizar esta ação.'
      using errcode = '42501', hint = 'account_removed';
  elsif v_until is not null then
    raise exception 'Sua conta está suspensa até % (horário de Brasília).',
      to_char(v_until at time zone 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI')
      using errcode = '42501', hint = 'account_suspended';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['prayer_requests','prayer_intercessions','prayer_reactions',
                           'prayer_contributions','prayer_intentions','friend_requests','notifications']
  loop
    execute format('drop trigger if exists enforce_account_not_restricted on public.%I', t);
    execute format('create trigger enforce_account_not_restricted before insert on public.%I
                    for each row execute function public.enforce_account_not_restricted()', t);
  end loop;
end $$;

-- Edição do próprio pedido também é interação.
drop trigger if exists enforce_account_not_restricted_update on public.prayer_requests;
create trigger enforce_account_not_restricted_update
  before update on public.prayer_requests
  for each row execute function public.enforce_account_not_restricted();

-- ════════════════════ 3. Proteções que valem para QUALQUER caminho (F04) ════════════════════

-- Perfis: S8 + S4 (já em produção) + ninguém suspende/remove a si mesmo.
create or replace function public.protect_profile_moderation_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if new.suspended_until is distinct from old.suspended_until
     or new.deleted_at is distinct from old.deleted_at
     or new.deleted_by is distinct from old.deleted_by then
    if not public.is_moderator_or_admin() then
      raise exception 'Somente moderadores podem alterar suspensão ou remoção de perfil'
        using errcode = '42501';
    end if;
    if new.id = auth.uid() then
      raise exception 'Você não pode suspender ou remover a sua própria conta'
        using errcode = '42501', hint = 'self_action';
    end if;
  end if;

  if public.is_moderator_or_admin() and not public.is_admin() and new.id <> auth.uid() then
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

-- Papéis: ninguém altera o próprio papel; nunca remover o último admin.
-- SECURITY INVOKER de propósito: o teste de "self" usa current_user, que numa
-- função SECURITY DEFINER seria sempre o dono (postgres) e nunca bloquearia.
create or replace function public.protect_user_roles()
returns trigger
language plpgsql security invoker
set search_path = public, pg_temp
as $$
declare
  v_admin_role uuid := (select id from public.roles where name = 'admin');
begin
  if current_user in ('authenticated', 'anon') and auth.uid() is not null
     and coalesce(new.user_id, old.user_id) = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio papel'
      using errcode = '42501', hint = 'self_action';
  end if;

  if tg_op in ('DELETE', 'UPDATE') and old.role_id = v_admin_role
     and (tg_op = 'DELETE' or new.role_id is distinct from v_admin_role) then
    if not exists (select 1 from public.user_roles
                    where role_id = v_admin_role and id <> old.id) then
      raise exception 'Não é possível remover o último administrador'
        using errcode = '42501', hint = 'last_admin';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists protect_user_roles on public.user_roles;
create trigger protect_user_roles
  before insert or update or delete on public.user_roles
  for each row execute function public.protect_user_roles();

-- ════════════════════ 4. Comandos administrativos (F01, F03) ════════════════════

create or replace function public._admin_check_target(p_user uuid, p_reason text, p_require_admin boolean)
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if p_require_admin and not public.is_admin() then
    raise exception 'Somente administradores podem executar esta ação' using errcode = '42501';
  end if;
  if not p_require_admin and not public.is_moderator_or_admin() then
    raise exception 'Somente moderadores podem executar esta ação' using errcode = '42501';
  end if;
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Usuário não encontrado' using errcode = 'P0002';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 3 then
    raise exception 'Informe o motivo (mínimo 3 caracteres)' using errcode = '22023', hint = 'reason_required';
  end if;
end;
$$;
revoke all on function public._admin_check_target(uuid, text, boolean) from public, anon, authenticated;

create or replace function public._admin_log(p_user uuid, p_action text, p_reason text, p_meta jsonb)
returns void
language sql security definer
set search_path = public, pg_temp
as $$
  insert into public.moderation_logs(moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'user', p_user, p_action, btrim(p_reason), p_meta);
$$;
revoke all on function public._admin_log(uuid, text, text, jsonb) from public, anon, authenticated;

-- Suspender: moderador ou admin. 1 a 365 dias.
create or replace function public.admin_suspend_user(p_user uuid, p_days integer, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_until timestamptz;
begin
  perform public._admin_check_target(p_user, p_reason, false);
  if p_user = auth.uid() then
    raise exception 'Você não pode suspender a sua própria conta' using errcode = '42501', hint = 'self_action';
  end if;
  if p_days is null or p_days < 1 or p_days > 365 then
    raise exception 'Duração inválida: informe de 1 a 365 dias' using errcode = '22023', hint = 'invalid_days';
  end if;
  if exists (select 1 from public.profiles where id = p_user and deleted_at is not null) then
    raise exception 'Conta removida: restaure antes de suspender' using errcode = '22023';
  end if;

  v_until := now() + make_interval(days => p_days);
  update public.profiles set suspended_until = v_until where id = p_user;
  perform public._admin_log(p_user, 'suspend', p_reason, jsonb_build_object('days', p_days, 'until', v_until));
  return jsonb_build_object('user_id', p_user, 'suspended_until', v_until);
end;
$$;

create or replace function public.admin_unsuspend_user(p_user uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_prev timestamptz;
begin
  perform public._admin_check_target(p_user, p_reason, false);
  select suspended_until into v_prev from public.profiles where id = p_user;
  if v_prev is null or v_prev <= now() then
    raise exception 'Este usuário não está suspenso' using errcode = '22023', hint = 'not_suspended';
  end if;
  update public.profiles set suspended_until = null where id = p_user;
  perform public._admin_log(p_user, 'unsuspend', p_reason, jsonb_build_object('previous_until', v_prev));
  return jsonb_build_object('user_id', p_user, 'suspended_until', null);
end;
$$;

-- Remover (banir) / restaurar: só admin.
create or replace function public.admin_set_user_removed(p_user uuid, p_removed boolean, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_is_removed boolean;
begin
  perform public._admin_check_target(p_user, p_reason, true);
  if p_user = auth.uid() then
    raise exception 'Você não pode remover a sua própria conta' using errcode = '42501', hint = 'self_action';
  end if;
  select deleted_at is not null into v_is_removed from public.profiles where id = p_user;
  if v_is_removed = p_removed then
    raise exception '%', case when p_removed then 'A conta já está removida' else 'A conta não está removida' end
      using errcode = '22023', hint = 'no_change';
  end if;

  if p_removed then
    if exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                where ur.user_id = p_user and r.name = 'admin') then
      raise exception 'Retire o papel de admin antes de remover esta conta' using errcode = '42501', hint = 'target_is_admin';
    end if;
    update public.profiles set deleted_at = now(), deleted_by = auth.uid() where id = p_user;
    perform public._admin_log(p_user, 'soft_delete', p_reason, null);
  else
    update public.profiles set deleted_at = null, deleted_by = null where id = p_user;
    perform public._admin_log(p_user, 'restore', p_reason, null);
  end if;
  return jsonb_build_object('user_id', p_user, 'removed', p_removed);
end;
$$;

-- Papel: só admin, atômico. Last-admin/self também protegidos pelo trigger.
create or replace function public.admin_set_user_role(p_user uuid, p_role text, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_role_id uuid;
  v_prev text;
begin
  perform public._admin_check_target(p_user, p_reason, true);
  if p_user = auth.uid() then
    raise exception 'Você não pode alterar o seu próprio papel' using errcode = '42501', hint = 'self_action';
  end if;
  if p_role not in ('user', 'moderator', 'admin') then
    raise exception 'Papel inválido: %', p_role using errcode = '22023';
  end if;

  select coalesce(max(case r.name when 'admin' then 'admin' when 'moderator' then 'moderator' end), 'user')
    into v_prev
    from public.user_roles ur join public.roles r on r.id = ur.role_id
   where ur.user_id = p_user;
  if v_prev = p_role then
    raise exception 'O usuário já tem o papel %', p_role using errcode = '22023', hint = 'no_change';
  end if;

  -- Insere o novo papel ANTES de remover o antigo (nunca fica sem papel no meio).
  if p_role <> 'user' then
    select id into v_role_id from public.roles where name = p_role;
    insert into public.user_roles(user_id, role_id, assigned_by) values (p_user, v_role_id, auth.uid())
      on conflict (user_id, role_id) do nothing;
  end if;
  delete from public.user_roles ur
   using public.roles r
   where r.id = ur.role_id and ur.user_id = p_user and r.name <> p_role;

  perform public._admin_log(p_user, 'role_assign', p_reason, jsonb_build_object('from', v_prev, 'to', p_role));
  return jsonb_build_object('user_id', p_user, 'role', p_role, 'previous', v_prev);
end;
$$;

-- XP total: só admin. 0 a 10.000.000.
create or replace function public.admin_set_user_xp(p_user uuid, p_xp integer, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_prev integer;
begin
  perform public._admin_check_target(p_user, p_reason, true);
  if p_xp is null or p_xp < 0 or p_xp > 10000000 then
    raise exception 'XP inválido: informe de 0 a 10.000.000' using errcode = '22023', hint = 'invalid_xp';
  end if;
  select total_xp into v_prev from public.user_xp where user_id = p_user;
  insert into public.user_xp(user_id, total_xp, updated_at) values (p_user, p_xp, now())
    on conflict (user_id) do update set total_xp = excluded.total_xp, updated_at = now();
  perform public._admin_log(p_user, 'xp_override', p_reason, jsonb_build_object('from', coalesce(v_prev, 0), 'to', p_xp));
  return jsonb_build_object('user_id', p_user, 'total_xp', p_xp, 'previous', coalesce(v_prev, 0));
end;
$$;

-- Multiplicador: só admin. 0,1 a 10.
create or replace function public.admin_set_xp_multiplier(p_user uuid, p_multiplier numeric, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_prev double precision;
begin
  perform public._admin_check_target(p_user, p_reason, true);
  if p_multiplier is null or p_multiplier < 0.1 or p_multiplier > 10 then
    raise exception 'Multiplicador inválido: informe de 0,1 a 10' using errcode = '22023', hint = 'invalid_multiplier';
  end if;
  select xp_multiplier into v_prev from public.user_xp_overrides where user_id = p_user;
  insert into public.user_xp_overrides(user_id, xp_multiplier, updated_at, updated_by)
    values (p_user, p_multiplier, now(), auth.uid())
    on conflict (user_id) do update set xp_multiplier = excluded.xp_multiplier,
      updated_at = now(), updated_by = auth.uid();
  perform public._admin_log(p_user, 'xp_multiplier', p_reason,
    jsonb_build_object('from', coalesce(v_prev, 1.0), 'to', p_multiplier));
  return jsonb_build_object('user_id', p_user, 'xp_multiplier', p_multiplier, 'previous', coalesce(v_prev, 1.0));
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'admin_suspend_user(uuid,integer,text)', 'admin_unsuspend_user(uuid,text)',
    'admin_set_user_removed(uuid,boolean,text)', 'admin_set_user_role(uuid,text,text)',
    'admin_set_user_xp(uuid,integer,text)', 'admin_set_xp_multiplier(uuid,numeric,text)']
  loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

commit;
