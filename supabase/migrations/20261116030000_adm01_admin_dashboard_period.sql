-- ADM01 · Métricas por período do dashboard agregadas no servidor.
-- Substitui as consultas no cliente que truncavam em 500/1000 linhas.
--
-- Definições (aprovadas em 2026-11-16, ver docs/admin/ADM01-dashboard.md):
--   * Fuso fixo America/Sao_Paulo; períodos em DIAS CORRIDOS incluindo hoje:
--       today = hoje desde 00:00 · week = hoje + 6 dias anteriores · month = hoje + 29
--   * Métricas de período contam EVENTOS: um registro criado no período conta
--     mesmo que depois tenha sido removido (os números do passado não mudam).
--   * Taxa de aprovação = pedidos do período hoje 'active' ou 'completed' e não
--     removidos ÷ todos os pedidos criados no período (inclusive removidos).
--
-- Acesso: somente admin (o Dashboard é tela exclusiva de admin).

create or replace function public.admin_dashboard_period(p_period text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz    constant text := 'America/Sao_Paulo';
  v_days  int;
  v_today date;
  v_first date;
  v_since timestamptz;
  v_new_prayers int;
  v_approved int;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Access denied: admin role required' using errcode = '42501';
  end if;

  v_days := case p_period when 'today' then 1 when 'week' then 7 when 'month' then 30 end;
  if v_days is null then
    raise exception 'Período inválido: %', p_period using errcode = '22023';
  end if;

  v_today := (now() at time zone v_tz)::date;
  v_first := v_today - (v_days - 1);
  v_since := v_first::timestamp at time zone v_tz;   -- 00:00 de Brasília do 1º dia

  select count(*),
         count(*) filter (where status in ('active', 'completed') and deleted_at is null)
    into v_new_prayers, v_approved
    from prayer_requests
   where created_at >= v_since;

  select jsonb_build_object(
    'period',        p_period,
    'timezone',      v_tz,
    'first_day',     v_first,
    'last_day',      v_today,
    'since',         v_since,
    'generated_at',  now(),
    'new_users',     (select count(*) from profiles where created_at >= v_since),
    'new_prayers',   v_new_prayers,
    'approved_prayers', v_approved,
    'approval_rate', case when v_new_prayers > 0
                          then round(v_approved::numeric * 100 / v_new_prayers, 1) end,
    'new_reports',   (select count(*) from prayer_reports where created_at >= v_since),
    'mod_actions',   (select count(*) from moderation_logs where created_at >= v_since),
    'active_users',  (select count(distinct uid) from (
                        select user_id as uid from prayer_requests
                         where created_at >= v_since and user_id is not null
                        union
                        select user_id from prayer_contributions
                         where created_at >= v_since and user_id is not null) a),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d.day,
               'prayers', coalesce(p.n, 0),
               'mod_actions', coalesce(m.n, 0)) order by d.day), '[]'::jsonb)
        from (select gs::date as day
                from generate_series(v_first::timestamp, v_today::timestamp, interval '1 day') gs) d
        left join (select (created_at at time zone v_tz)::date as day, count(*) n
                     from prayer_requests where created_at >= v_since group by 1) p using (day)
        left join (select (created_at at time zone v_tz)::date as day, count(*) n
                     from moderation_logs where created_at >= v_since group by 1) m using (day)
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.admin_dashboard_period(text) from public, anon;
grant execute on function public.admin_dashboard_period(text) to authenticated;
