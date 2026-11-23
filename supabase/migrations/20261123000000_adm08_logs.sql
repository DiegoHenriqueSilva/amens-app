-- ADM08 — Logs de moderação e auditoria
--
-- Decisões aprovadas (23/11/2026):
--   * Consulta paginada no servidor, só admin (rota /admin/logs é de admin, ADM00), com alvo legível
--     (pedido, pessoa, igreja, denúncia, participação, feedback, configuração) e alvo removido sinalizado.
--   * Texto anterior de pedido editado (ADM03) fica fora da lista; só sob demanda (admin_log_previous_text).
--   * Reconhecimento de apoiadores (supporter_recognition_audit) aparece como tipo "Apoiadores", sem valores.
--   * Integridade: registro não é alterado nem apagado pela API; quem grava pela API não escolhe a data
--     nem o ator (o INSERT direto ainda existe só para a Corrente, até a ADM09).
-- Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Integridade
-- ---------------------------------------------------------------------------
create or replace function public.moderation_logs_before_insert()
returns trigger
language plpgsql
security invoker -- precisa do papel real (os comandos do servidor rodam como postgres)
set search_path = public
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    -- Pela API: o ator é quem está logado e o instante é o do servidor (sem antedatar).
    new.moderator_id := auth.uid();
    new.created_at := now();
  end if;
  new.created_at := coalesce(new.created_at, now());
  return new;
end;
$$;
drop trigger if exists moderation_logs_before_insert on public.moderation_logs;
create trigger moderation_logs_before_insert
  before insert on public.moderation_logs
  for each row execute function public.moderation_logs_before_insert();

revoke update, delete, truncate, references, trigger on public.moderation_logs from anon, authenticated;
revoke insert, select on public.moderation_logs from anon;

-- ---------------------------------------------------------------------------
-- 2. Rótulo legível do alvo
-- ---------------------------------------------------------------------------
create or replace function public._log_target_label(p_type text, p_id uuid, p_meta jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_label text;
  v_removed boolean := false;
  v_missing boolean := false;
begin
  if p_id is null then
    return jsonb_build_object('label', null, 'removed', false, 'missing', true);
  end if;
  case p_type
    when 'prayer_request' then
      select left(regexp_replace(coalesce(nullif(btrim(title), ''), left(content, 60)), '\s+', ' ', 'g'), 60), deleted_at is not null
        into v_label, v_removed from public.prayer_requests where id = p_id;
      v_missing := not found;
    when 'user', 'supporter' then
      select coalesce(nullif(display_name, ''), nullif(full_name, ''), 'Sem nome'), deleted_at is not null
        into v_label, v_removed from public.profiles where id = p_id;
      v_missing := not found;
    when 'church' then
      select name || coalesce(' · ' || city || '/' || state, ''), deleted_at is not null
        into v_label, v_removed from public.churches where id = p_id;
      if not found and p_meta ? 'file' then
        v_label := 'Lote de importação: ' || coalesce(nullif(p_meta ->> 'file', ''), 'arquivo sem nome');
      else
        v_missing := not found;
      end if;
    when 'report' then
      select 'Denúncia · ' || case category when 'spam' then 'spam' when 'inappropriate' then 'conteúdo impróprio'
               when 'fake' then 'falso' when 'off_topic' then 'fora do tema' when 'hate' then 'discurso de ódio'
               when 'harassment' then 'assédio' when 'misinformation' then 'desinformação' else 'outro motivo' end
        into v_label from public.prayer_reports where id = p_id;
      v_missing := not found;
    when 'contribution' then
      select 'Participação de ' || coalesce(nullif(author_name, ''), 'sem nome'), deleted_at is not null
        into v_label, v_removed from public.prayer_contributions where id = p_id;
      v_missing := not found;
    when 'feedback' then
      select left(regexp_replace(message, '\s+', ' ', 'g'), 60) into v_label from public.user_feedback where id = p_id;
      v_missing := not found;
    when 'setting' then
      v_label := case p_meta ->> 'key' when 'xp_global_multiplier' then 'Multiplicador de XP'
                   when 'auto_escalate_threshold' then 'Revisão automática por denúncias' else p_meta ->> 'key' end;
    else
      v_missing := true;
  end case;
  return jsonb_build_object('label', v_label, 'removed', coalesce(v_removed, false), 'missing', coalesce(v_missing, false));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Consulta
-- ---------------------------------------------------------------------------
create or replace function public._log_require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(), false) then
    raise exception 'Só administradores consultam os logs.' using errcode = '42501';
  end if;
end;
$$;

-- p_actor: uuid de quem fez, 'auto' para ações automáticas, null para todos.
create or replace function public.admin_list_logs(
  p_target_type text default null, p_action text default null, p_actor text default null,
  p_search text default null, p_from date default null, p_to date default null,
  p_offset int default 0, p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_like text := case when nullif(btrim(coalesce(p_search, '')), '') is null then null
                      else '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  v_from timestamptz := case when p_from is null then null else (p_from::timestamp at time zone 'America/Sao_Paulo') end;
  v_to timestamptz := case when p_to is null then null else ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo') end;
  v_res jsonb;
begin
  perform public._log_require_admin();
  if p_actor is not null and p_actor <> 'auto' and p_actor !~ '^[0-9a-f-]{36}$' then
    raise exception 'Filtro de pessoa inválido.' using errcode = '22023';
  end if;
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'A data final é anterior à inicial.' using errcode = '22023', hint = 'invalid_range';
  end if;

  with src as (
    select l.id::text as id, 'moderation' as source, l.created_at, l.moderator_id as actor_id, l.target_type, l.target_id,
           l.action, l.reason, coalesce(l.metadata, '{}'::jsonb) as meta
    from public.moderation_logs l
    union all
    select 'sra:' || a.id, 'supporter', a.recorded_at, a.actor_id, 'supporter', a.user_id,
           case when a.active then 'supporter_on' else 'supporter_off' end, null, '{}'::jsonb
    from public.supporter_recognition_audit a
  ),
  f as (
    select s.* from src s
    where (p_target_type is null or s.target_type = p_target_type)
      and (p_action is null or s.action = p_action)
      and (p_actor is null or (p_actor = 'auto' and s.actor_id is null) or (p_actor <> 'auto' and s.actor_id::text = p_actor))
      and (v_from is null or s.created_at >= v_from)
      and (v_to is null or s.created_at < v_to)
  ),
  lab as (
    select f.*, public._log_target_label(f.target_type, f.target_id, f.meta) as target,
           (select coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), 'Sem nome') from public.profiles p where p.id = f.actor_id) as actor_name,
           (select u.email::text from auth.users u where u.id = f.actor_id) as actor_email
    from f
  ),
  s as (
    select * from lab
    where v_like is null or reason ilike v_like or action ilike v_like or (target ->> 'label') ilike v_like
       or actor_name ilike v_like or actor_email ilike v_like or target_id::text ilike v_like
  )
  select jsonb_build_object(
    'total', (select count(*) from s),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', x.id, 'source', x.source, 'created_at', x.created_at, 'action', x.action, 'reason', x.reason,
          'automatic', x.actor_id is null and x.source = 'moderation',
          'actor_id', x.actor_id, 'actor_name', x.actor_name, 'actor_email', x.actor_email,
          'target_type', x.target_type, 'target_id', x.target_id,
          'target_label', x.target ->> 'label', 'target_removed', (x.target ->> 'removed')::boolean,
          'target_missing', (x.target ->> 'missing')::boolean,
          -- Texto íntimo fora da lista: só a indicação de que existe.
          'details', x.meta - 'previous_title' - 'previous_content',
          'has_previous_text', x.meta ? 'previous_content' or x.meta ? 'previous_title')
        order by x.created_at desc, x.id)
      from (select * from s order by created_at desc, id
            offset greatest(coalesce(p_offset, 0), 0) limit least(greatest(coalesce(p_limit, 50), 1), 100)) x), '[]'::jsonb)
  ) into v_res;
  return v_res;
end;
$$;

-- Quem já agiu (para o filtro "Quem fez").
create or replace function public.admin_log_actors()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public._log_require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object('id', a.actor_id,
             'name', coalesce((select coalesce(nullif(p.display_name, ''), nullif(p.full_name, '')) from public.profiles p where p.id = a.actor_id), 'Sem nome'),
             'count', a.n) order by a.n desc)
    from (select actor_id, count(*) n from (
            select moderator_id as actor_id from public.moderation_logs where moderator_id is not null
            union all select actor_id from public.supporter_recognition_audit where actor_id is not null) z
          group by actor_id) a), '[]'::jsonb);
end;
$$;

-- Texto anterior de um pedido editado, sob demanda.
create or replace function public.admin_log_previous_text(p_log_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_meta jsonb;
begin
  perform public._log_require_admin();
  select metadata into v_meta from public.moderation_logs where id = p_log_id;
  if v_meta is null or not (v_meta ? 'previous_content' or v_meta ? 'previous_title') then
    raise exception 'Este registro não guarda texto anterior.' using errcode = '22023', hint = 'no_text';
  end if;
  return jsonb_build_object('title', v_meta ->> 'previous_title', 'content', v_meta ->> 'previous_content');
end;
$$;

do $$
declare f text;
begin
  execute 'revoke all on function public._log_target_label(text, uuid, jsonb) from public, anon, authenticated';
  execute 'revoke all on function public._log_require_admin() from public, anon, authenticated';
  execute 'revoke all on function public.moderation_logs_before_insert() from public, anon, authenticated';
  foreach f in array array[
    'public.admin_list_logs(text, text, text, text, date, date, int, int)',
    'public.admin_log_actors()', 'public.admin_log_previous_text(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
