-- Dados da fase 8 (ADM08): um pedido de teste e um log de edição com texto anterior guardado (como a ADM03 grava).
do $$
declare
  aut uuid := (select id from auth.users where email = 'adm-teste-autor@amens.test');
  adm uuid := (select id from auth.users where email = 'adm-teste-admin@amens.test');
  pr uuid := gen_random_uuid();
begin
  insert into public.prayer_requests (id, user_id, title, content, author_name, status)
  values (pr, aut, '[TESTE ADM08] Pedido editado', 'Texto depois da edição', 'Autor', 'pending_review');
  insert into public.moderation_logs (moderator_id, target_type, target_id, action, reason, metadata)
  values (adm, 'prayer_request', pr, 'edit_content', '[TESTE ADM08] ajuste de texto',
          jsonb_build_object('from_status', 'active', 'to_status', 'pending_review',
                             'previous_title', '[TESTE ADM08] Título antes', 'previous_content', '[TESTE ADM08] Texto pessoal antes da edição'));
end $$;
