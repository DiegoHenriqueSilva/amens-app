-- ADM03 · Correção: "pedido alterado por outra pessoa" na edição travava a chamada
--
-- Problema encontrado no teste de tela com dois moderadores (18/11/2026): o erro
-- de conflito usava o SQLSTATE 40001 (serialization_failure). O PostgREST repete
-- automaticamente transações que falham com 40001; como o pedido continua
-- alterado, a repetição nunca terminava, a tela ficava em "Salvando…" e a
-- conexão do banco seguia ocupada em loop.
--
-- Correção: o conflito passa a usar PT409, que o PostgREST devolve como HTTP 409
-- sem repetir. Mensagem e hint ('stale') continuam iguais.
-- Em admin_moderate_prayers o 40001 é capturado por item dentro da função e
-- nunca chega ao PostgREST, por isso não muda (o retorno por item segue igual).

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
      using errcode = 'PT409', hint = 'stale';
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
