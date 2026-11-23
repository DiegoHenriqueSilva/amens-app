-- ADM06 — Feedback e respostas ao usuário
--
-- Decisões aprovadas (22/11/2026):
--   * Resposta por comando único no servidor: aviso ao usuário + histórico + estado + log na mesma transação;
--     conflito (PT409) quando outra pessoa respondeu antes. Nunca "sucesso" sem a gravação real.
--   * Todas as respostas ficam no histórico (user_feedback_replies); reply_text guarda a última, por compatibilidade.
--   * Papel: moderador e admin (ADM00: user_feedback mod/admin; S6: moderador vê e-mails). A lista traz o e-mail
--     só de quem enviou cada feedback, em vez de baixar o e-mail de todos os usuários.
--
-- Idempotente. A retirada da escrita direta fica em 20261122030000 (aplicar só depois do deploy).

-- ---------------------------------------------------------------------------
-- 1. Histórico de respostas
-- ---------------------------------------------------------------------------
create table if not exists public.user_feedback_replies (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid not null references public.user_feedback(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  body text not null check (char_length(btrim(body)) between 2 and 2000),
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists user_feedback_replies_feedback_idx on public.user_feedback_replies (feedback_id, created_at);
alter table public.user_feedback_replies enable row level security;
drop policy if exists user_feedback_replies_select_mod on public.user_feedback_replies;
create policy user_feedback_replies_select_mod on public.user_feedback_replies
  for select to authenticated using (public.is_moderator_or_admin());
revoke insert, update, delete, truncate on public.user_feedback_replies from anon, authenticated;

-- Respostas antigas (reply_text) entram no histórico uma vez.
insert into public.user_feedback_replies (feedback_id, author_id, body, created_at)
select f.id, f.replied_by, f.reply_text, coalesce(f.replied_at, f.created_at)
from public.user_feedback f
where f.reply_text is not null and char_length(btrim(f.reply_text)) >= 2
  and not exists (select 1 from public.user_feedback_replies r where r.feedback_id = f.id);

create index if not exists user_feedback_status_created_idx on public.user_feedback (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Envio pelo app: quem envia não escolhe situação nem campos de resposta
-- ---------------------------------------------------------------------------
-- Contagem para o limite de envios: quem envia não lê user_feedback (RLS), então conta como definer.
create or replace function public._feedback_recent_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.user_feedback f where f.user_id = auth.uid() and f.created_at > now() - interval '1 hour'
$$;

create or replace function public.user_feedback_before_write()
returns trigger
language plpgsql
security invoker -- precisa do papel real de quem grava (as funções do painel rodam como postgres)
set search_path = public
as $$
declare
  v_staff boolean := current_user in ('postgres', 'service_role', 'supabase_admin') or coalesce(public.is_moderator_or_admin(), false);
begin
  if tg_op = 'INSERT' and not v_staff then
    new.user_id := auth.uid();
    new.status := 'unread';
    new.reply_text := null;
    new.replied_by := null;
    new.replied_at := null;
    new.created_at := now();
    new.message := btrim(new.message);
    if public._feedback_recent_count() >= 10 then
      raise exception 'Você já enviou vários feedbacks na última hora. Tente de novo mais tarde.'
        using errcode = '22023', hint = 'too_many';
    end if;
  elsif tg_op = 'UPDATE' and not v_staff then
    raise exception 'Sem permissão para alterar feedback.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists user_feedback_before_write on public.user_feedback;
create trigger user_feedback_before_write
  before insert or update on public.user_feedback
  for each row execute function public.user_feedback_before_write();

-- Conta suspensa ou removida não envia feedback (mesma regra das outras interações, ADM02).
drop trigger if exists user_feedback_enforce_not_restricted on public.user_feedback;
create trigger user_feedback_enforce_not_restricted
  before insert on public.user_feedback
  for each row execute function public.enforce_account_not_restricted();

-- ---------------------------------------------------------------------------
-- 3. Painel
-- ---------------------------------------------------------------------------
create or replace function public._feedback_require_staff()
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not coalesce(public.is_moderator_or_admin(), false) then
    raise exception 'Só a moderação pode tratar feedback.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_list_feedback(
  p_tab text default 'unread', p_category text default null, p_search text default null,
  p_offset int default 0, p_limit int default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_like text := case when nullif(btrim(coalesce(p_search, '')), '') is null then null
                      else '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  v_counts jsonb;
  v_rows jsonb;
begin
  perform public._feedback_require_staff();
  if p_tab not in ('all', 'unread', 'read', 'replied', 'archived') then
    raise exception 'Aba inválida.' using errcode = '22023';
  end if;

  with base as (
    select f.* from public.user_feedback f
    left join public.profiles p on p.id = f.user_id
    left join auth.users u on u.id = f.user_id
    where (p_category is null or f.category = p_category)
      and (v_like is null or f.message ilike v_like or p.display_name ilike v_like or p.full_name ilike v_like
           or u.email ilike v_like
           or exists (select 1 from public.user_feedback_replies r where r.feedback_id = f.id and r.body ilike v_like))
  )
  select jsonb_build_object(
      'all', count(*),
      'unread', count(*) filter (where status = 'unread'),
      'read', count(*) filter (where status = 'read'),
      'replied', count(*) filter (where status = 'replied'),
      'archived', count(*) filter (where status = 'archived')),
    coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc, x.id)
      from (
        select b.id, b.category, b.message, b.status, b.created_at,
          b.user_id is not null as has_author,
          (select nullif(coalesce(p.display_name, p.full_name), '') from public.profiles p where p.id = b.user_id) as author_name,
          (select u.email::text from auth.users u where u.id = b.user_id) as author_email,
          (select p.deleted_at is not null from public.profiles p where p.id = b.user_id) as author_removed,
          coalesce((select jsonb_agg(jsonb_build_object(
              'id', r.id, 'body', r.body, 'created_at', r.created_at,
              'author_name', coalesce((select nullif(coalesce(p.display_name, p.full_name), '') from public.profiles p where p.id = r.author_id), 'Equipe'))
              order by r.created_at)
            from public.user_feedback_replies r where r.feedback_id = b.id), '[]'::jsonb) as replies
        from base b
        where p_tab = 'all' or b.status = p_tab
        order by b.created_at desc, b.id
        offset greatest(coalesce(p_offset, 0), 0)
        limit least(greatest(coalesce(p_limit, 20), 1), 100)
      ) x), '[]'::jsonb)
  into v_counts, v_rows
  from base;

  return jsonb_build_object('counts', v_counts, 'total', (v_counts ->> p_tab)::int, 'rows', v_rows);
end;
$$;

-- Lido, não lido e arquivado. Respondido só pelo comando de resposta.
create or replace function public.admin_set_feedback_status(p_id uuid, p_status text, p_expected_status text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.user_feedback;
begin
  perform public._feedback_require_staff();
  if p_status not in ('unread', 'read', 'archived') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  select * into f from public.user_feedback where id = p_id for update;
  if not found or (p_expected_status is not null and f.status <> p_expected_status) then
    raise exception 'Outra pessoa já mudou este feedback. A lista foi atualizada: confira antes de continuar.'
      using errcode = 'PT409', hint = 'stale';
  end if;
  if f.status = p_status then
    return jsonb_build_object('id', f.id, 'status', f.status);
  end if;
  update public.user_feedback set status = p_status where id = p_id;
  if p_status = 'archived' or f.status = 'archived' then
    insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
    values (auth.uid(), 'feedback', p_id, case when p_status = 'archived' then 'archive' else 'unarchive' end, null,
            jsonb_build_object('from', f.status, 'to', p_status));
  end if;
  return jsonb_build_object('id', p_id, 'status', p_status);
end;
$$;

-- Comando único da resposta: aviso + histórico + estado + log, ou nada.
create or replace function public.admin_reply_feedback(p_id uuid, p_body text, p_expected_replies int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  f public.user_feedback;
  v_body text := btrim(coalesce(p_body, ''));
  v_count int;
  v_preview text;
  v_notif uuid;
  v_reply uuid;
begin
  perform public._feedback_require_staff();
  if char_length(v_body) < 2 then
    raise exception 'Escreva a resposta.' using errcode = '22023', hint = 'empty';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Resposta longa demais (máximo 2.000 caracteres).' using errcode = '22023';
  end if;

  select * into f from public.user_feedback where id = p_id for update;
  if not found then
    raise exception 'Este feedback não existe mais.' using errcode = 'PT409', hint = 'stale';
  end if;
  select count(*) into v_count from public.user_feedback_replies where feedback_id = p_id;
  if p_expected_replies is null or v_count <> p_expected_replies then
    raise exception 'Outra pessoa respondeu este feedback enquanto você escrevia. Seu texto foi mantido: confira a resposta dela antes de enviar.'
      using errcode = 'PT409', hint = 'stale';
  end if;
  if f.user_id is null or not exists (select 1 from auth.users u where u.id = f.user_id) then
    raise exception 'Quem enviou este feedback não tem mais conta. Não há para quem responder.'
      using errcode = '22023', hint = 'no_recipient';
  end if;

  v_preview := left(regexp_replace(f.message, '\s+', ' ', 'g'), 80) || case when char_length(f.message) > 80 then '…' else '' end;
  insert into public.notifications (user_id, message, type, is_read, sender_id)
  values (f.user_id,
          format(E'A equipe do Améns respondeu ao seu feedback "%s":\n\n%s', v_preview, v_body),
          'feedback_reply', false, null)
  returning id into v_notif;

  insert into public.user_feedback_replies (feedback_id, author_id, body, notification_id)
  values (p_id, auth.uid(), v_body, v_notif)
  returning id into v_reply;

  update public.user_feedback
  set status = 'replied', reply_text = v_body, replied_by = auth.uid(), replied_at = now()
  where id = p_id;

  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (auth.uid(), 'feedback', p_id, 'reply', null,
          jsonb_build_object('reply_id', v_reply, 'notification_id', v_notif, 'reply_number', v_count + 1, 'previous_status', f.status));

  return jsonb_build_object('id', p_id, 'replies', v_count + 1, 'notification_id', v_notif);
end;
$$;

do $$
declare
  f text;
begin
  execute 'revoke all on function public._feedback_require_staff() from public, anon, authenticated';
  execute 'revoke all on function public.user_feedback_before_write() from public, anon, authenticated';
  execute 'revoke all on function public._feedback_recent_count() from public, anon';
  execute 'grant execute on function public._feedback_recent_count() to authenticated';
  foreach f in array array[
    'public.admin_list_feedback(text, text, text, int, int)',
    'public.admin_set_feedback_status(uuid, text, text)',
    'public.admin_reply_feedback(uuid, text, int)'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
