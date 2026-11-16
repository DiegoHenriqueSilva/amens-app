-- ADM00 · Passo 1 — VERIFICAÇÃO (somente leitura, pode rodar em produção)
-- Rode cada bloco separadamente no SQL Editor do Supabase e guarde o resultado.

-- 1A. Policies atuais das tabelas usadas pelo painel
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('prayer_requests','notifications','profiles','churches','app_settings',
                    'user_feedback','prayer_reports','prayer_contributions','moderation_logs',
                    'user_roles','user_xp','user_xp_overrides','supporter_recognitions')
order by tablename, cmd, policyname;

-- 1B. Funções usadas pelo app: são SECURITY DEFINER? (security_definer = true)
select p.proname, p.prosecdef as security_definer, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('increment_prayer_count','join_prayer_chain','get_users_admin','admin_supporter',
                    'get_church_cities','get_duplicate_churches','add_xp','auto_escalate_prayer_reports');

-- 1C. Funções que ALTERAM prayer_requests e NÃO são SECURITY DEFINER.
--     Se aparecer alguma além de update_updated_at_column, me envie o nome:
--     ela pararia de funcionar com a correção do passo 3.
select p.proname, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosrc ilike '%update%prayer_requests%'
  and not p.prosecdef;

-- 1D. Tipos de notificação existentes (para a lista de tipos "oficiais")
select type, count(*) as total, max(created_at) as ultima
from public.notifications
group by type
order by total desc;

-- 1E. Valor padrão da coluna type em notifications (precisa ser NULL)
select column_name, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'notifications';

-- 1F. RLS ligado nas tabelas? (rowsecurity precisa ser true)
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('prayer_requests','notifications','profiles','churches','app_settings',
                    'user_feedback','prayer_reports','user_xp_overrides')
order by tablename;
