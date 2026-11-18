-- ADM03 — Pedidos de oração e moderação
--
-- Fecha o ciclo pedido → decisão → auditoria → retorno ao autor no servidor:
--   * admin_list_prayers: lista paginada com total real por aba (sem corte de 300)
--     e erros propagados; a aba "Banidos" agora é calculada no banco.
--   * admin_moderate_prayers: decisão em lote com resultado POR ITEM. Cada item
--     roda numa subtransação: falha de um não desfaz os outros e não vira
--     "sucesso". Detecta conflito entre dois moderadores (estado visto ≠ atual).
--   * admin_edit_prayer: edição com motivo, volta para revisão e avisa o autor.
-- Decisão, log e aviso ao autor acontecem na mesma transação do item.
--
-- Decisões do time (17/11/2026): aviso ao autor em TODA decisão; motivo
-- obrigatório (≥ 3) nas ações restritivas e opcional em Aprovar; seleção em lote.
-- Avisos de violação e remoção continuam vindo dos triggers já existentes
-- (notify_prayer_policy_violation / notify_moderation_action), sem duplicar.

-- ════════════════════ 1. Aviso ao autor ════════════════════

create or replace function public._notify_prayer_author(p_prayer uuid, p_user uuid, p_type text, p_message text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, prayer_request_id, message, type, is_read)
  values (p_user, p_prayer, p_message, p_type, false);
end;
$$;
revoke all on function public._notify_prayer_author(uuid, uuid, text, text) from public, anon, authenticated;

-- ════════════════════ 2. Listagem ════════════════════

create or replace function public.admin_list_prayers(
  p_tab text default 'all',
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
  if p_tab not in ('all', 'pending', 'active', 'completed', 'banned_users') then
    raise exception 'Aba inválida: %', p_tab using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'Paginação inválida' using errcode = '22023';
  end if;
  if v_q is not null then
    v_like := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  with base as (
    select pr.*,
           (p.deleted_at is not null) as author_removed
      from public.prayer_requests pr
      left join public.profiles p on p.id = pr.user_id
  ),
  filtered as (
    select * from base b
     where case p_tab
             when 'all' then true
             when 'pending' then b.status = 'pending_review' and b.deleted_at is null
             when 'active' then b.status = 'active' and b.deleted_at is null
             when 'completed' then b.status = 'completed' and b.deleted_at is null
             when 'banned_users' then b.status in ('policy_violation', 'banned') or b.author_removed
           end
       and (v_like is null
            or b.title ilike v_like or b.content ilike v_like or b.author_name ilike v_like)
  )
  select (select count(*) from filtered),
         coalesce((
           select jsonb_agg(row_to_json(x) order by
                    case when p_tab = 'pending' then extract(epoch from x.created_at) else -extract(epoch from x.created_at) end)
             from (
               select f.id, f.title, f.content, f.author_name, f.is_anonymous, f.status,
                      f.created_at, f.updated_at, f.deleted_at, f.user_id, f.prayer_count,
                      f.author_removed,
                      (select count(*) from public.prayer_reports r
                        where r.prayer_request_id = f.id and r.deleted_at is null
                          and r.status not in ('resolved', 'dismissed')) as open_reports
                 from filtered f
                order by case when p_tab = 'pending' then f.created_at end asc,
                         f.created_at desc
                offset p_offset limit p_limit
             ) x
         ), '[]'::jsonb)
    into v_total, v_rows;

  select jsonb_build_object(
           'all', count(*),
           'pending', count(*) filter (where status = 'pending_review' and deleted_at is null),
           'active', count(*) filter (where status = 'active' and deleted_at is null),
           'completed', count(*) filter (where status = 'completed' and deleted_at is null),
           'banned_users', count(*) filter (where status in ('policy_violation', 'banned')
                                              or exists (select 1 from public.profiles p
                                                          where p.id = pr.user_id and p.deleted_at is not null)))
    into v_counts
    from public.prayer_requests pr;

  return jsonb_build_object('total', v_total, 'rows', v_rows, 'counts', v_counts);
end;
$$;
revoke all on function public.admin_list_prayers(text, text, integer, integer) from public, anon;
grant execute on function public.admin_list_prayers(text, text, integer, integer) to authenticated;

-- ════════════════════ 3. Decisão (unitária ou em lote) ════════════════════

-- p_items: [{"id": uuid, "status": "<status visto>", "deleted": <bool visto>}, ...]
-- Retorno: [{"id", "ok": true} | {"id", "ok": false, "code", "hint", "message"}]
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
          update public.prayer_reports
             set status = 'open', resolved_by = null, resolved_at = null,
                 resolution_notes = null, moderator_id = null
           where prayer_request_id = v_id and status = 'resolved'
             and (resolution_notes ilike '%editado%' or resolution_notes ilike '%banido%'
                  or resolution_notes ilike '%violação%');
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

-- ════════════════════ 4. Edição de conteúdo ════════════════════

create or replace function public.admin_edit_prayer(
  p_id uuid, p_title text, p_content text, p_reason text, p_expected_content text default null
)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
  v_content text := btrim(coalesce(p_content, ''));
  r public.prayer_requests%rowtype;
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
  if length(v_content) = 0 or length(v_content) > 1000 then
    raise exception 'O conteúdo precisa ter de 1 a 1000 caracteres' using errcode = '22023', hint = 'invalid_content';
  end if;
  if length(coalesce(v_title, '')) > 150 then
    raise exception 'O título pode ter no máximo 150 caracteres' using errcode = '22023', hint = 'invalid_title';
  end if;

  select * into r from public.prayer_requests where id = p_id for update;
  if not found then
    raise exception 'Pedido não encontrado' using errcode = 'P0002', hint = 'not_found';
  end if;
  if r.deleted_at is not null then
    raise exception 'Pedido removido: restaure antes de editar' using errcode = '22023', hint = 'removed';
  end if;
  if p_expected_content is not null and r.content is distinct from p_expected_content then
    raise exception 'Este pedido foi alterado por outra pessoa. Atualize a lista e tente de novo.'
      using errcode = '40001', hint = 'stale';
  end if;
  if r.title is not distinct from v_title and r.content = v_content then
    raise exception 'Nada foi alterado no pedido' using errcode = '22023', hint = 'no_change';
  end if;

  update public.prayer_requests
     set title = v_title, content = v_content, status = 'pending_review'
   where id = p_id;

  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (v_uid, 'prayer_request', p_id, 'edit_content', v_reason,
          jsonb_build_object('from_status', r.status, 'to_status', 'pending_review',
                             'previous_title', r.title, 'previous_content', r.content));

  delete from public.notifications where prayer_request_id = p_id and type = 'prayer_edit_mod';
  perform public._notify_prayer_author(p_id, r.user_id, 'prayer_edit_mod',
    'Seu pedido de oração recebeu um ajuste da moderação e passará por uma nova revisão antes de voltar à comunidade.');
end;
$$;
revoke all on function public.admin_edit_prayer(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_edit_prayer(uuid, text, text, text, text) to authenticated;
