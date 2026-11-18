-- ADM04 · Reports e tratamento de denúncias
--
-- Decisões do time (18/11/2026):
--   * escalada automática por 3 PESSOAS distintas (1 denúncia aberta por pessoa
--     e alvo); só tira de 'active'; com log e aviso; volta sozinho ao estado
--     anterior se todas as denúncias forem encerradas como sem fundamento;
--   * decisão POR ALVO: encerra todas as denúncias abertas daquele alvo;
--   * suspender pessoa/remetente usa admin_suspend_user (ADM02);
--   * layout "fila por alvo".
-- Conflitos usam PT409 (HTTP 409). Nunca 40001: o PostgREST repete a transação.

-- ════════════════════ 1. Dados e restrições ════════════════════

-- B13: o padrão era 'pending', que o painel não conhece.
update public.prayer_reports set status = 'open' where status = 'pending';
alter table public.prayer_reports alter column status set default 'open';
alter table public.prayer_reports alter column status set not null;
alter table public.prayer_reports alter column target_type set not null;

alter table public.prayer_reports add column if not exists decision text;
alter table public.prayer_reports add column if not exists decision_meta jsonb;

alter table public.prayer_reports drop constraint if exists prayer_reports_status_check;
alter table public.prayer_reports add constraint prayer_reports_status_check
  check (status in ('open', 'resolved', 'dismissed'));
alter table public.prayer_reports drop constraint if exists prayer_reports_target_type_check;
alter table public.prayer_reports add constraint prayer_reports_target_type_check
  check (target_type in ('prayer_request', 'user', 'message', 'contribution'));
alter table public.prayer_reports drop constraint if exists prayer_reports_category_check;
alter table public.prayer_reports add constraint prayer_reports_category_check
  check (category in ('inappropriate', 'fake', 'spam', 'off_topic', 'hate', 'harassment', 'misinformation', 'other'));
alter table public.prayer_reports drop constraint if exists prayer_reports_text_length_check;
alter table public.prayer_reports add constraint prayer_reports_text_length_check
  check (coalesce(char_length(description), 0) <= 1000 and coalesce(char_length(custom_reason), 0) <= 300);
alter table public.prayer_reports drop constraint if exists prayer_reports_decision_check;
alter table public.prayer_reports add constraint prayer_reports_decision_check
  check (decision is null or decision in ('dismiss', 'resolve', 'violation', 'edit', 'remove', 'suspend'));

-- Uma denúncia aberta por pessoa e alvo (o trigger ignora a 2ª; o índice cobre a corrida).
create unique index if not exists prayer_reports_one_open_per_reporter
  on public.prayer_reports (reporter_user_id, target_type, coalesce(prayer_request_id, target_contribution_id, target_user_id))
  where status = 'open' and deleted_at is null;

-- Ações automáticas (escalada) não têm moderador.
alter table public.moderation_logs alter column moderator_id drop not null;

-- Privacidade das colunas de decisão: ver 20261118020000 (aplicar só depois do
-- deploy do front da ADM04, porque o painel antigo lê essas colunas direto).

-- ════════════════════ 2. Entrada da denúncia ════════════════════

create or replace function public.prayer_reports_before_insert()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid;
begin
  -- Sem usuário (SQL direto, service_role): não se aplica.
  if v_uid is null then
    return new;
  end if;

  -- Quem denuncia não escolhe situação nem campos de moderação.
  new.reporter_user_id := v_uid;
  new.status := 'open';
  new.moderator_id := null; new.resolved_by := null; new.resolved_at := null;
  new.resolution_notes := null; new.deleted_at := null;
  new.decision := null; new.decision_meta := null;
  new.created_at := now();
  new.target_type := coalesce(new.target_type, 'prayer_request');

  if new.target_type = 'prayer_request' then
    if new.prayer_request_id is null
       or not exists (select 1 from public.prayer_requests where id = new.prayer_request_id and deleted_at is null) then
      raise exception 'Este conteúdo não está mais disponível para denúncia.' using errcode = 'P0002', hint = 'not_found';
    end if;
    if new.category = 'other' and nullif(btrim(coalesce(new.custom_reason, '')), '') is null then
      raise exception 'Conte em poucas palavras o motivo da denúncia.' using errcode = '22023', hint = 'reason_required';
    end if;
    new.target_user_id := null; new.target_contribution_id := null;
  elsif new.target_type in ('user', 'message') then
    if new.target_user_id is null or not exists (select 1 from public.profiles where id = new.target_user_id) then
      raise exception 'Este conteúdo não está mais disponível para denúncia.' using errcode = 'P0002', hint = 'not_found';
    end if;
    if new.target_user_id = v_uid then
      raise exception 'Você não pode denunciar a si mesmo.' using errcode = '22023', hint = 'self_report';
    end if;
    new.prayer_request_id := null; new.target_contribution_id := null;
  elsif new.target_type = 'contribution' then
    if new.target_contribution_id is null
       or not exists (select 1 from public.prayer_contributions where id = new.target_contribution_id and deleted_at is null) then
      raise exception 'Este conteúdo não está mais disponível para denúncia.' using errcode = 'P0002', hint = 'not_found';
    end if;
    new.prayer_request_id := null; new.target_user_id := null;
  end if;

  -- 2ª denúncia aberta da mesma pessoa para o mesmo alvo: ignora em silêncio.
  v_target := coalesce(new.prayer_request_id, new.target_contribution_id, new.target_user_id);
  if exists (
    select 1 from public.prayer_reports r
     where r.reporter_user_id = v_uid and r.target_type = new.target_type
       and coalesce(r.prayer_request_id, r.target_contribution_id, r.target_user_id) = v_target
       and r.status = 'open' and r.deleted_at is null
  ) then
    return null;
  end if;
  return new;
end;
$$;

drop trigger if exists prayer_reports_before_insert on public.prayer_reports;
create trigger prayer_reports_before_insert
  before insert on public.prayer_reports
  for each row execute function public.prayer_reports_before_insert();

-- Conta suspensa ou desativada não denuncia (mesma regra das interações, ADM02).
drop trigger if exists enforce_account_not_restricted on public.prayer_reports;
create trigger enforce_account_not_restricted
  before insert on public.prayer_reports
  for each row execute function public.enforce_account_not_restricted();

-- ════════════════════ 3. Escalada automática ════════════════════

drop trigger if exists auto_escalate_prayer_reports_trigger on public.prayer_reports;
drop trigger if exists trg_auto_escalate_prayer_reports on public.prayer_reports;

create or replace function public.auto_escalate_prayer_reports()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_setting text;
  v_threshold integer;
  v_people integer;
  r public.prayer_requests%rowtype;
begin
  if new.target_type <> 'prayer_request' or new.prayer_request_id is null
     or new.status <> 'open' or new.deleted_at is not null then
    return new;
  end if;

  select value into v_setting from public.app_settings where key = 'auto_escalate_threshold';
  v_threshold := case when btrim(coalesce(v_setting, '')) ~ '^[0-9]+$' then greatest(btrim(v_setting)::integer, 1) else 3 end;

  -- Pessoas distintas, não denúncias.
  select count(distinct reporter_user_id) into v_people
    from public.prayer_reports
   where target_type = 'prayer_request' and prayer_request_id = new.prayer_request_id
     and status = 'open' and deleted_at is null;
  if v_people < v_threshold then
    return new;
  end if;

  select * into r from public.prayer_requests where id = new.prayer_request_id for update;
  -- Só pedidos visíveis: concluído, em violação ou removido não mudam.
  if not found or r.status <> 'active' or r.deleted_at is not null then
    return new;
  end if;

  update public.prayer_requests set status = 'pending_review' where id = r.id;
  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (null, 'prayer_request', r.id, 'auto_escalate',
          format('Denúncias de %s pessoas (limiar %s)', v_people, v_threshold),
          jsonb_build_object('from_status', r.status, 'to_status', 'pending_review',
                             'distinct_reporters', v_people, 'threshold', v_threshold));
  perform public._notify_prayer_author(r.id, r.user_id, 'prayer_in_review',
    'Seu pedido de oração está em revisão pela moderação. Enquanto isso, ele não aparece para a comunidade.');
  return new;
end;
$$;

drop trigger if exists auto_escalate_prayer_reports on public.prayer_reports;
create trigger auto_escalate_prayer_reports
  after insert on public.prayer_reports
  for each row execute function public.auto_escalate_prayer_reports();

-- ════════════════════ 4. Auxiliares ════════════════════

-- Pedido está oculto pela escalada automática (e ninguém decidiu depois)?
create or replace function public._prayer_auto_escalated(p_prayer uuid)
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select case when l.action = 'auto_escalate' then l.metadata end
    from public.prayer_requests p
    cross join lateral (
      select action, metadata from public.moderation_logs
       where target_type = 'prayer_request' and target_id = p.id
       order by created_at desc limit 1
    ) l
   where p.id = p_prayer and p.status = 'pending_review' and p.deleted_at is null;
$$;
revoke all on function public._prayer_auto_escalated(uuid) from public, anon, authenticated;

-- ════════════════════ 5. Listagem por alvo ════════════════════

create or replace function public.admin_list_reports(
  p_tab text default 'open',
  p_search text default null,
  p_offset integer default 0,
  p_limit integer default 50
)
returns jsonb
language plpgsql security definer stable
set search_path = public, pg_temp
as $$
declare
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_like text;
  v_total bigint;
  v_rows jsonb;
  v_counts jsonb;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if not public.is_moderator_or_admin() then
    raise exception 'Somente moderadores podem executar esta ação' using errcode = '42501';
  end if;
  if p_tab not in ('open', 'resolved', 'dismissed', 'all') then
    raise exception 'Aba inválida: %', p_tab using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'Paginação inválida' using errcode = '22023';
  end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with rep as (
    select r.*, coalesce(r.prayer_request_id, r.target_contribution_id, r.target_user_id) as tid
      from public.prayer_reports r
     where r.deleted_at is null
  ),
  tgt as (
    select target_type, tid,
           count(*) filter (where status = 'open') as open_count,
           count(*) filter (where status = 'resolved') as resolved_count,
           count(*) filter (where status = 'dismissed') as dismissed_count,
           count(distinct reporter_user_id) filter (where status = 'open') as open_people,
           min(created_at) filter (where status = 'open') as first_open_at,
           max(coalesce(resolved_at, created_at)) as last_at
      from rep group by target_type, tid
  ),
  info as (
    select t.*,
           case t.target_type
             when 'prayer_request' then (
               select jsonb_build_object(
                 'title', p.title, 'content', p.content, 'status', p.status, 'deleted_at', p.deleted_at,
                 'is_anonymous', p.is_anonymous, 'author_id', p.user_id,
                 'author_name', coalesce(pf.display_name, pf.full_name, p.author_name),
                 'author_removed', pf.deleted_at is not null, 'author_suspended_until', pf.suspended_until,
                 'auto_escalated', public._prayer_auto_escalated(p.id) is not null)
                 from public.prayer_requests p left join public.profiles pf on pf.id = p.user_id
                where p.id = t.tid)
             when 'contribution' then (
               select jsonb_build_object(
                 'author_name', c.author_name, 'author_city', c.author_city, 'deleted_at', c.deleted_at,
                 'author_id', c.user_id, 'created_at', c.created_at,
                 'author_suspended_until', pf.suspended_until)
                 from public.prayer_contributions c left join public.profiles pf on pf.id = c.user_id
                where c.id = t.tid)
             else (
               select jsonb_build_object(
                 'name', coalesce(pf.display_name, pf.full_name), 'full_name', pf.full_name,
                 'city', pf.city, 'deleted_at', pf.deleted_at, 'suspended_until', pf.suspended_until)
                 from public.profiles pf where pf.id = t.tid)
           end as target
      from tgt t
  ),
  filtered as (
    select i.* from info i
     where case p_tab when 'open' then i.open_count > 0
                      when 'resolved' then i.resolved_count > 0
                      when 'dismissed' then i.dismissed_count > 0
                      else true end
       and (v_like is null
            or i.target ->> 'title' ilike v_like or i.target ->> 'content' ilike v_like
            or i.target ->> 'author_name' ilike v_like or i.target ->> 'name' ilike v_like
            or i.target ->> 'full_name' ilike v_like
            or exists (select 1 from rep x
                        where x.target_type = i.target_type and x.tid = i.tid
                          and (x.description ilike v_like or x.custom_reason ilike v_like or x.category ilike v_like)))
  )
  select (select count(*) from filtered),
         coalesce((
           select jsonb_agg(row_obj order by ord1, ord2)
             from (
               select f.*,
                      case when p_tab = 'open' then extract(epoch from f.first_open_at) else -extract(epoch from f.last_at) end as ord1,
                      f.tid as ord2,
                      jsonb_build_object(
                        'target_type', f.target_type, 'target_id', f.tid, 'target', f.target,
                        'open_count', f.open_count, 'resolved_count', f.resolved_count, 'dismissed_count', f.dismissed_count,
                        'open_people', f.open_people, 'first_open_at', f.first_open_at, 'last_at', f.last_at,
                        'reports', (
                          select coalesce(jsonb_agg(jsonb_build_object(
                                   'id', x.id, 'category', x.category, 'custom_reason', x.custom_reason,
                                   'description', x.description, 'status', x.status, 'created_at', x.created_at,
                                   'resolved_at', x.resolved_at, 'resolution_notes', x.resolution_notes,
                                   'decision', x.decision, 'person', x.person) order by x.created_at), '[]'::jsonb)
                            from (
                              select y.*, dense_rank() over (order by y.reporter_user_id) as person
                                from rep y where y.target_type = f.target_type and y.tid = f.tid
                            ) x
                           where p_tab = 'all' or x.status = case p_tab when 'open' then 'open' when 'resolved' then 'resolved' else 'dismissed' end)
                      ) as row_obj
                 from filtered f
                order by ord1, ord2
                offset p_offset limit p_limit
             ) page
         ), '[]'::jsonb)
    into v_total, v_rows;

  select jsonb_build_object(
           'open', count(*) filter (where open_count > 0),
           'resolved', count(*) filter (where resolved_count > 0),
           'dismissed', count(*) filter (where dismissed_count > 0),
           'all', count(*))
    into v_counts
    from (select coalesce(prayer_request_id, target_contribution_id, target_user_id) as tid, target_type,
                 count(*) filter (where status = 'open') as open_count,
                 count(*) filter (where status = 'resolved') as resolved_count,
                 count(*) filter (where status = 'dismissed') as dismissed_count
            from public.prayer_reports where deleted_at is null
           group by 1, 2) c;

  return jsonb_build_object('total', v_total, 'rows', v_rows, 'counts', v_counts);
end;
$$;
revoke all on function public.admin_list_reports(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_reports(text, text, integer, integer) to authenticated;

-- ════════════════════ 6. Aprovar na ADM03 reabre pela decisão (B16) ════════════════════
-- Mesma função da migration 20261117000000; muda só o trecho que reabre as denúncias.

create or replace function public.admin_moderate_prayers(p_items jsonb, p_action text, p_reason text default null)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_n integer;
  v_item jsonb;
  v_id uuid;
  r public.prayer_requests%rowtype;
  v_to text;
  v_log_action text;
  v_results jsonb := '[]'::jsonb;
  v_state text; v_msg text; v_hint text;
begin
  if v_uid is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if not public.is_moderator_or_admin() then
    raise exception 'Somente moderadores podem executar esta ação' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'review', 'violation', 'remove', 'restore') then
    raise exception 'Ação inválida: %', p_action using errcode = '22023';
  end if;
  if (p_action <> 'approve' or v_reason is not null) and coalesce(length(v_reason), 0) < 3 then
    raise exception 'Informe o motivo (mínimo 3 caracteres)' using errcode = '22023', hint = 'reason_required';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Selecione ao menos um pedido' using errcode = '22023', hint = 'empty';
  end if;
  v_n := jsonb_array_length(p_items);
  if v_n > 100 then
    raise exception 'Selecione no máximo 100 pedidos por vez' using errcode = '22023', hint = 'too_many';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_id := (v_item ->> 'id')::uuid;
      select * into r from public.prayer_requests where id = v_id for update;
      if not found then
        raise exception 'Pedido não encontrado' using errcode = 'P0002', hint = 'not_found';
      end if;

      -- Conflito: outra pessoa mudou o estado de moderação depois que a lista foi carregada.
      if v_item ? 'status' then
        if r.status is distinct from (v_item ->> 'status')
           or (r.deleted_at is not null) is distinct from coalesce((v_item ->> 'deleted')::boolean, false) then
          raise exception 'Este pedido foi alterado por outra pessoa. Atualize a lista e tente de novo.'
            using errcode = '40001', hint = 'stale';
        end if;
      end if;

      if p_action = 'remove' then
        if r.deleted_at is not null then
          raise exception 'O pedido já está removido' using errcode = '22023', hint = 'no_change';
        end if;
        update public.prayer_requests set deleted_at = now(), deleted_by = v_uid where id = v_id;
        v_log_action := 'soft_delete';
        -- aviso ao autor: trigger notify_moderation_action

      elsif p_action = 'restore' then
        if r.deleted_at is null then
          raise exception 'O pedido não está removido' using errcode = '22023', hint = 'no_change';
        end if;
        update public.prayer_requests set deleted_at = null, deleted_by = null where id = v_id;
        v_log_action := 'restore';
        perform public._notify_prayer_author(v_id, r.user_id, 'prayer_restored',
          'Seu pedido de oração foi restaurado pela moderação e voltou ao seu histórico.');

      else
        if r.deleted_at is not null then
          raise exception 'Pedido removido: restaure antes de mudar o status' using errcode = '22023', hint = 'removed';
        end if;
        v_to := case p_action when 'approve' then 'active'
                              when 'review' then 'pending_review'
                              else 'policy_violation' end;
        if r.status = v_to then
          raise exception 'O pedido já está nesse status' using errcode = '22023', hint = 'no_change';
        end if;
        update public.prayer_requests set status = v_to where id = v_id;

        if p_action = 'approve' then
          v_log_action := 'approve';
          -- Comportamento preservado de 0063610: ao aprovar, reabre os reports que
          -- tinham sido encerrados por uma decisão restritiva (contrato com ADM04).
          -- ADM04 (B16): pela decisão registrada, não mais pelo texto da nota. O texto
          -- só vale para denúncias antigas, decididas antes da ADM04 (decision nula).
          -- (apelido "rep": "r" já é a variável do pedido nesta função)
          update public.prayer_reports rep
             set status = 'open', resolved_by = null, resolved_at = null,
                 resolution_notes = null, moderator_id = null, decision = null, decision_meta = null
           where rep.prayer_request_id = v_id and rep.status = 'resolved' and rep.deleted_at is null
             and (rep.decision in ('violation', 'edit')
                  or (rep.decision is null and (rep.resolution_notes ilike '%editado%' or rep.resolution_notes ilike '%banido%'
                                                or rep.resolution_notes ilike '%violação%')))
             and not exists (select 1 from public.prayer_reports o
                              where o.status = 'open' and o.deleted_at is null and o.id <> rep.id
                                and o.reporter_user_id = rep.reporter_user_id and o.target_type = rep.target_type
                                and o.prayer_request_id = v_id);
          -- O aviso "editado, aguarda aprovação" deixa de valer.
          delete from public.notifications where prayer_request_id = v_id and type = 'prayer_edit_mod';
          perform public._notify_prayer_author(v_id, r.user_id, 'prayer_approved',
            'Seu pedido de oração foi revisado e está visível para a comunidade, que poderá rezar com você.');
        elsif p_action = 'review' then
          v_log_action := 'send_to_review';
          perform public._notify_prayer_author(v_id, r.user_id, 'prayer_in_review',
            'Seu pedido de oração está em revisão pela moderação. Enquanto isso, ele não aparece para a comunidade.');
        else
          v_log_action := 'reject';
          -- aviso ao autor: trigger notify_prayer_policy_violation
        end if;
      end if;

      insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
      values (v_uid, 'prayer_request', v_id, v_log_action, v_reason,
              jsonb_build_object('from_status', r.status,
                                 'to_status', coalesce(v_to, r.status),
                                 'was_deleted', r.deleted_at is not null,
                                 'batch_size', v_n));

      v_results := v_results || jsonb_build_array(jsonb_build_object('id', v_id, 'ok', true));
    exception when others then
      get stacked diagnostics v_state = returned_sqlstate, v_msg = message_text, v_hint = pg_exception_hint;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'id', v_item ->> 'id', 'ok', false, 'code', v_state, 'hint', nullif(v_hint, ''), 'message', v_msg));
    end;
  end loop;

  return v_results;
end;
$$;
revoke all on function public.admin_moderate_prayers(jsonb, text, text) from public, anon;
grant execute on function public.admin_moderate_prayers(jsonb, text, text) to authenticated;

-- ════════════════════ 7. Decisão por alvo ════════════════════

create or replace function public.admin_decide_reports(
  p_target_type text,
  p_target_id uuid,
  p_action text,
  p_reason text default null,
  p_report_ids uuid[] default null,
  p_days integer default null,
  p_title text default null,
  p_content text default null,
  p_expected_content text default null
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ids uuid[];
  v_n integer;
  v_meta jsonb := '{}'::jsonb;
  v_res jsonb;
  v_esc jsonb;
  v_status text;
  v_deleted boolean;
  v_contrib public.prayer_contributions%rowtype;
  v_prof public.profiles%rowtype;
  v_reporters uuid[];
  v_rep uuid;
  v_auto_restored boolean := false;
begin
  if v_uid is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if not public.is_moderator_or_admin() then
    raise exception 'Somente moderadores podem executar esta ação' using errcode = '42501';
  end if;
  if p_target_type not in ('prayer_request', 'user', 'message', 'contribution') then
    raise exception 'Tipo de alvo inválido: %', p_target_type using errcode = '22023';
  end if;
  -- Ações válidas por tipo de alvo
  if not (p_action in ('dismiss', 'resolve')
          or (p_target_type = 'prayer_request' and p_action in ('violation', 'edit'))
          or (p_target_type = 'contribution' and p_action = 'remove')
          or (p_target_type in ('user', 'message') and p_action = 'suspend')) then
    raise exception 'Ação inválida para este tipo de denúncia' using errcode = '22023', hint = 'invalid_action';
  end if;
  if (p_action <> 'dismiss' or v_reason is not null) and coalesce(length(v_reason), 0) < 3 then
    raise exception 'Informe o motivo (mínimo 3 caracteres)' using errcode = '22023', hint = 'reason_required';
  end if;

  -- Denúncias abertas do alvo, travadas até o fim da decisão
  select array_agg(id order by id) into v_ids
    from (select id from public.prayer_reports
           where target_type = p_target_type
             and coalesce(prayer_request_id, target_contribution_id, target_user_id) = p_target_id
             and status = 'open' and deleted_at is null
           for update) s;
  if v_ids is null then
    raise exception 'Estas denúncias já foram tratadas por outra pessoa. Atualize a lista.'
      using errcode = 'PT409', hint = 'stale';
  end if;
  if p_report_ids is not null
     and v_ids is distinct from (select array_agg(distinct x order by x) from unnest(p_report_ids) x) then
    raise exception 'Chegaram novas denúncias ou outra pessoa já tratou parte delas. A lista foi atualizada: confira antes de decidir.'
      using errcode = 'PT409', hint = 'stale';
  end if;
  v_n := array_length(v_ids, 1);

  -- Efeito sobre o alvo
  if p_action in ('violation', 'edit') then
    select status, deleted_at is not null into v_status, v_deleted
      from public.prayer_requests where id = p_target_id for update;
    if not found then
      raise exception 'O pedido não existe mais' using errcode = 'P0002', hint = 'not_found';
    end if;
    v_meta := jsonb_build_object('prayer_from_status', v_status);
    if p_action = 'violation' then
      v_res := public.admin_moderate_prayers(
        jsonb_build_array(jsonb_build_object('id', p_target_id, 'status', v_status, 'deleted', v_deleted)),
        'violation', v_reason) -> 0;
      if not coalesce((v_res ->> 'ok')::boolean, false) then
        raise exception '%', coalesce(v_res ->> 'message', 'Não foi possível concluir a ação')
          using errcode = case when v_res ->> 'hint' = 'stale' then 'PT409' else '22023' end,
                hint = coalesce(v_res ->> 'hint', '');
      end if;
    else
      perform public.admin_edit_prayer(p_target_id, p_title, p_content, v_reason, p_expected_content);
    end if;

  elsif p_action = 'remove' then
    select * into v_contrib from public.prayer_contributions where id = p_target_id for update;
    if not found then
      raise exception 'A participação não existe mais' using errcode = 'P0002', hint = 'not_found';
    end if;
    if v_contrib.deleted_at is not null then
      raise exception 'A participação já foi retirada' using errcode = '22023', hint = 'no_change';
    end if;
    update public.prayer_contributions set deleted_at = now(), deleted_by = v_uid where id = p_target_id;
    insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
    values (v_uid, 'contribution', p_target_id, 'soft_delete', v_reason,
            jsonb_build_object('via', 'reports', 'reports', v_n));
    if v_contrib.user_id is not null then
      insert into public.notifications (user_id, message, type, is_read)
      values (v_contrib.user_id,
              'Sua participação em uma corrente de oração foi retirada pela moderação por não seguir as diretrizes do Améns.',
              'contribution_removed', false);
    end if;

  elsif p_action = 'suspend' then
    select * into v_prof from public.profiles where id = p_target_id;
    v_meta := jsonb_build_object('suspended_until_before', v_prof.suspended_until);
    v_res := public.admin_suspend_user(p_target_id, p_days, v_reason);
    v_meta := v_meta || jsonb_build_object('suspended_until', v_res -> 'suspended_until');

  elsif p_action = 'dismiss' and p_target_type = 'prayer_request' then
    -- Pedido oculto só pela escalada: volta ao estado anterior
    v_esc := public._prayer_auto_escalated(p_target_id);
    if v_esc is not null then
      select status into v_status from public.prayer_requests where id = p_target_id for update;
      update public.prayer_requests set status = coalesce(v_esc ->> 'from_status', 'active') where id = p_target_id;
      insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
      values (v_uid, 'prayer_request', p_target_id, 'approve', v_reason,
              jsonb_build_object('via', 'dismiss_reports', 'from_status', v_status,
                                 'to_status', coalesce(v_esc ->> 'from_status', 'active')));
      perform public._notify_prayer_author(p_target_id,
        (select user_id from public.prayer_requests where id = p_target_id), 'prayer_approved',
        'Seu pedido de oração foi revisado e está visível para a comunidade, que poderá rezar com você.');
      v_auto_restored := true;
      v_meta := jsonb_build_object('auto_restored', true, 'restored_to', coalesce(v_esc ->> 'from_status', 'active'));
    end if;
  end if;

  -- Encerra as denúncias do alvo
  update public.prayer_reports
     set status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
         resolved_by = v_uid, resolved_at = now(), moderator_id = v_uid,
         resolution_notes = coalesce(v_reason, 'Sem fundamento'),
         decision = p_action, decision_meta = v_meta
   where id = any (v_ids);

  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  select v_uid, 'report', id, case when p_action = 'dismiss' then 'dismiss_report' else 'resolve_report' end, v_reason,
         jsonb_build_object('decision', p_action, 'target_type', p_target_type, 'target_id', p_target_id, 'reports', v_n)
    from unnest(v_ids) id;

  -- Um aviso por pessoa que denunciou, sem revelar a sanção
  select array_agg(distinct reporter_user_id) into v_reporters
    from public.prayer_reports where id = any (v_ids) and reporter_user_id is not null;
  if v_reporters is not null then
    foreach v_rep in array v_reporters loop
      insert into public.notifications (user_id, message, type, is_read)
      values (v_rep,
              case when p_action = 'dismiss'
                then 'Analisamos sua denúncia com cuidado. O conteúdo está dentro das diretrizes do Améns, por isso ela foi encerrada. Obrigado por ajudar a cuidar da comunidade.'
                else 'Analisamos sua denúncia e tomamos as providências necessárias. Obrigado por ajudar a cuidar da comunidade.'
              end,
              'report_feedback', false);
    end loop;
  end if;

  return jsonb_build_object('decision', p_action, 'reports', v_n,
                            'people_notified', coalesce(array_length(v_reporters, 1), 0),
                            'auto_restored', v_auto_restored);
end;
$$;
revoke all on function public.admin_decide_reports(text, uuid, text, text, uuid[], integer, text, text, text) from public, anon;
grant execute on function public.admin_decide_reports(text, uuid, text, text, uuid[], integer, text, text, text) to authenticated;

-- ════════════════════ 8. Reabrir e reverter ════════════════════

create or replace function public.admin_reopen_reports(
  p_target_type text,
  p_target_id uuid,
  p_report_ids uuid[],
  p_reason text
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_ids uuid[];
  v_decisions text[];
  v_decision text;
  v_meta jsonb;
  v_resolved_at timestamptz;
  v_reverted boolean := false;
  v_note text := null;
  v_status text;
  v_from text;
  v_log record;
  p public.prayer_requests%rowtype;
  v_contrib public.prayer_contributions%rowtype;
  v_reopened integer;
begin
  if v_uid is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if not public.is_moderator_or_admin() then
    raise exception 'Somente moderadores podem executar esta ação' using errcode = '42501';
  end if;
  if coalesce(length(v_reason), 0) < 3 then
    raise exception 'Informe o motivo (mínimo 3 caracteres)' using errcode = '22023', hint = 'reason_required';
  end if;
  if p_report_ids is null or array_length(p_report_ids, 1) is null then
    raise exception 'Nenhuma denúncia indicada' using errcode = '22023', hint = 'empty';
  end if;

  select array_agg(id order by id), array_agg(distinct decision), max(resolved_at), (array_agg(decision_meta))[1]
    into v_ids, v_decisions, v_resolved_at, v_meta
    from (select id, decision, decision_meta, resolved_at from public.prayer_reports
           where id = any (p_report_ids) and target_type = p_target_type
             and coalesce(prayer_request_id, target_contribution_id, target_user_id) = p_target_id
             and status in ('resolved', 'dismissed') and deleted_at is null
           for update) s;
  if v_ids is null or array_length(v_ids, 1) <> (select count(distinct x) from unnest(p_report_ids) x) then
    raise exception 'Estas denúncias já foram reabertas ou mudaram. Atualize a lista.'
      using errcode = 'PT409', hint = 'stale';
  end if;
  if array_length(v_decisions, 1) > 1 then
    raise exception 'Reabra uma decisão por vez' using errcode = '22023', hint = 'mixed';
  end if;
  v_decision := v_decisions[1];

  -- Desfaz o efeito só se o alvo ainda estiver como a decisão deixou
  if v_decision in ('violation', 'edit') then
    select * into p from public.prayer_requests where id = p_target_id for update;
    if found and p.deleted_at is null then
      v_from := coalesce(v_meta ->> 'prayer_from_status', 'active');
      if v_decision = 'violation' and p.status = 'policy_violation' then
        update public.prayer_requests set status = v_from where id = p.id;
        insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
        values (v_uid, 'prayer_request', p.id, 'approve', v_reason,
                jsonb_build_object('via', 'reopen_reports', 'from_status', p.status, 'to_status', v_from));
        if v_from = 'active' then
          perform public._notify_prayer_author(p.id, p.user_id, 'prayer_approved',
            'Seu pedido de oração foi revisado e está visível para a comunidade, que poderá rezar com você.');
        end if;
        v_reverted := true;
      elsif v_decision = 'edit' then
        select metadata into v_log from public.moderation_logs
         where target_type = 'prayer_request' and target_id = p.id and action = 'edit_content'
           and created_at <= v_resolved_at
         order by created_at desc limit 1;
        if v_log.metadata is not null and p.status = 'pending_review' then
          update public.prayer_requests
             set title = v_log.metadata ->> 'previous_title', content = v_log.metadata ->> 'previous_content',
                 status = v_from
           where id = p.id;
          delete from public.notifications where prayer_request_id = p.id and type = 'prayer_edit_mod';
          insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
          values (v_uid, 'prayer_request', p.id, 'restore', v_reason,
                  jsonb_build_object('via', 'reopen_reports', 'reverted', 'edit', 'from_status', p.status, 'to_status', v_from));
          v_reverted := true;
        end if;
      end if;
    end if;
    if not v_reverted then
      v_note := 'O pedido mudou depois da decisão; a situação dele foi mantida.';
    end if;

  elsif v_decision = 'remove' then
    select * into v_contrib from public.prayer_contributions where id = p_target_id for update;
    if found and v_contrib.deleted_at is not null then
      update public.prayer_contributions set deleted_at = null, deleted_by = null where id = p_target_id;
      insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
      values (v_uid, 'contribution', p_target_id, 'restore', v_reason, jsonb_build_object('via', 'reopen_reports'));
      if v_contrib.user_id is not null then
        insert into public.notifications (user_id, message, type, is_read)
        values (v_contrib.user_id, 'Sua participação em uma corrente de oração foi restaurada pela moderação.',
                'contribution_restored', false);
      end if;
      v_reverted := true;
    else
      v_note := 'A participação já estava visível; nada a desfazer.';
    end if;

  elsif v_decision = 'suspend' then
    if exists (select 1 from public.profiles where id = p_target_id and suspended_until > now()) then
      perform public.admin_unsuspend_user(p_target_id, v_reason);
      v_reverted := true;
    else
      v_note := 'A suspensão já tinha terminado; nada a desfazer.';
    end if;
  end if;

  -- Reabre (sem duplicar denúncia aberta da mesma pessoa para o alvo)
  update public.prayer_reports r
     set status = 'open', resolved_by = null, resolved_at = null, resolution_notes = null,
         moderator_id = null, decision = null, decision_meta = null
   where r.id = any (v_ids)
     and not exists (select 1 from public.prayer_reports o
                      where o.status = 'open' and o.deleted_at is null and o.id <> r.id
                        and o.reporter_user_id = r.reporter_user_id and o.target_type = r.target_type
                        and coalesce(o.prayer_request_id, o.target_contribution_id, o.target_user_id) = p_target_id);
  get diagnostics v_reopened = row_count;

  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  select v_uid, 'report', id, 'reopen_report', v_reason,
         jsonb_build_object('decision', v_decision, 'reverted', v_reverted, 'target_type', p_target_type, 'target_id', p_target_id)
    from unnest(v_ids) id;

  return jsonb_build_object('reopened', v_reopened, 'reverted', v_reverted, 'decision', v_decision, 'note', v_note);
end;
$$;
revoke all on function public.admin_reopen_reports(text, uuid, uuid[], text) from public, anon;
grant execute on function public.admin_reopen_reports(text, uuid, uuid[], text) to authenticated;

-- ════════════════════ 9. Excluir denúncia (só admin) ════════════════════

create or replace function public.admin_delete_report(p_id uuid, p_reason text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida' using errcode = '42501';
  end if;
  if not public.is_admin() then
    raise exception 'Somente administradores podem excluir denúncias' using errcode = '42501';
  end if;
  if coalesce(length(v_reason), 0) < 3 then
    raise exception 'Informe o motivo (mínimo 3 caracteres)' using errcode = '22023', hint = 'reason_required';
  end if;
  update public.prayer_reports set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Esta denúncia já foi excluída ou não existe' using errcode = 'PT409', hint = 'stale';
  end if;
  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason)
  values (auth.uid(), 'report', p_id, 'delete_report', v_reason);
end;
$$;
revoke all on function public.admin_delete_report(uuid, text) from public, anon;
grant execute on function public.admin_delete_report(uuid, text) to authenticated;
