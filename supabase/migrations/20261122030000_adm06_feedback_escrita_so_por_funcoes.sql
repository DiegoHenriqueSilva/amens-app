-- ADM06 — aplicar SÓ DEPOIS do deploy do front da ADM06.
-- O painel publicado antes da ADM06 atualiza user_feedback direto (status, reply_text...). Depois do deploy,
-- o painel usa admin_set_feedback_status e admin_reply_feedback (20261122020000).
-- Mantém: envio pelo app (INSERT, saneado pelo trigger) e leitura pela moderação (lista e contador do menu).

drop policy if exists user_feedback_update_mod on public.user_feedback;
revoke update, delete, truncate, references, trigger on public.user_feedback from anon, authenticated;
revoke insert on public.user_feedback from anon;
