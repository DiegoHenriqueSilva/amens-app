-- ADM05 — aplicar SÓ DEPOIS do deploy do front da ADM05.
-- O painel publicado antes da ADM05 grava direto na tabela churches e no moderation_logs, e chama
-- get_duplicate_churches. Depois do deploy, toda escrita do painel passa por admin_* (20261122000000).
--
-- Mantém: leitura pública das ativas, leitura completa para moderação/admin (logs) e a sugestão do app
-- (INSERT em revisão, saneado pelo trigger churches_before_write).

drop policy if exists churches_update_admin on public.churches;
drop policy if exists churches_insert_mod on public.churches;

revoke insert, update, delete, truncate, references, trigger on public.churches from anon;
revoke update, delete, truncate, references, trigger on public.churches from authenticated;

drop function if exists public.get_duplicate_churches();
