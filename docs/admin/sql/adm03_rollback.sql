-- Rollback de supabase/migrations/20261117000000_adm03_prayer_moderation_commands.sql
-- A tela da branch ADM03 depende destes comandos: reverta o front junto.
begin;
drop function if exists public.admin_list_prayers(text, text, integer, integer);
drop function if exists public.admin_moderate_prayers(jsonb, text, text);
drop function if exists public.admin_edit_prayer(uuid, text, text, text, text);
drop function if exists public._notify_prayer_author(uuid, uuid, text, text);
commit;
