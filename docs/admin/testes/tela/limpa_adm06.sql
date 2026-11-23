-- Limpeza dos dados de teste da ADM06 (fase 6). Só toca em feedback "[TESTE ADM06]…" e no que ele gerou.
do $$
declare
  ids uuid[];
  notifs uuid[];
begin
  select array_agg(id) into ids from public.user_feedback where message like '[TESTE ADM06]%';
  select array_agg(notification_id) into notifs from public.user_feedback_replies where feedback_id = any(ids);
  delete from public.notifications where id = any(notifs);
  delete from public.moderation_logs where target_type = 'feedback' and target_id = any(ids);
  delete from public.user_feedback where id = any(ids); -- respostas saem em cascata
end $$;
select count(*) as restantes from public.user_feedback where message like '[TESTE ADM06]%';
