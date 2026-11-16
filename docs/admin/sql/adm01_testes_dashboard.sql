-- ADM01 · Testes T01–T03 do dashboard (admin_dashboard_period)
-- Roda TUDO numa transação desfeita no final (raise exception): nada é gravado.
-- Substitua <UUID_ADMIN> pelo id de um admin.
-- Uso: npx supabase db query --linked -f docs/admin/sql/adm01_testes_dashboard.sql

do $$
declare
  v_admin uuid := '<UUID_ADMIN>';
  v_tz    text := 'America/Sao_Paulo';
  r text[] := '{}';
  w jsonb; w2 jsonb; t jsonb; t2 jsonb;
  v_since_week timestamptz; v_since_today timestamptz;
  ref_new int; ref_appr int; ref_users int; ref_reports int; ref_logs int; ref_active int;
  s_pr int; s_mod int; n_days int;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- ───── T01 · consulta de referência (formulação independente) ─────
  w := public.admin_dashboard_period('week');
  v_since_week  := (date_trunc('day', now() at time zone v_tz) - interval '6 days') at time zone v_tz;
  v_since_today := date_trunc('day', now() at time zone v_tz) at time zone v_tz;

  select count(*), count(*) filter (where status = any(array['active','completed']) and deleted_at is null)
    into ref_new, ref_appr from prayer_requests where created_at >= v_since_week;
  select count(*) into ref_users   from profiles        where created_at >= v_since_week;
  select count(*) into ref_reports from prayer_reports  where created_at >= v_since_week;
  select count(*) into ref_logs    from moderation_logs where created_at >= v_since_week;
  select count(*) into ref_active from (
    select user_id from prayer_requests where created_at >= v_since_week and user_id is not null
    union select user_id from prayer_contributions where created_at >= v_since_week and user_id is not null) x;
  select count(*), sum((e->>'prayers')::int), sum((e->>'mod_actions')::int)
    into n_days, s_pr, s_mod from jsonb_array_elements(w->'series') e;

  r := r || format('T01 since: rpc=%s ref=%s %s', w->>'since', v_since_week, case when (w->>'since')::timestamptz = v_since_week then 'OK' else 'FALHA' end);
  r := r || format('T01 novos pedidos: rpc=%s ref=%s %s', w->>'new_prayers', ref_new, case when (w->>'new_prayers')::int = ref_new then 'OK' else 'FALHA' end);
  r := r || format('T01 aprovados: rpc=%s ref=%s %s', w->>'approved_prayers', ref_appr, case when (w->>'approved_prayers')::int = ref_appr then 'OK' else 'FALHA' end);
  r := r || format('T01 novos usuarios: rpc=%s ref=%s %s', w->>'new_users', ref_users, case when (w->>'new_users')::int = ref_users then 'OK' else 'FALHA' end);
  r := r || format('T01 novos reports: rpc=%s ref=%s %s', w->>'new_reports', ref_reports, case when (w->>'new_reports')::int = ref_reports then 'OK' else 'FALHA' end);
  r := r || format('T01 acoes moderacao: rpc=%s ref=%s %s', w->>'mod_actions', ref_logs, case when (w->>'mod_actions')::int = ref_logs then 'OK' else 'FALHA' end);
  r := r || format('T01 usuarios ativos: rpc=%s ref=%s %s', w->>'active_users', ref_active, case when (w->>'active_users')::int = ref_active then 'OK' else 'FALHA' end);
  r := r || format('T01 grafico: dias=%s soma_pedidos=%s soma_mod=%s %s', n_days, s_pr, s_mod,
                   case when n_days = 7 and s_pr = ref_new and s_mod = ref_logs then 'OK' else 'FALHA' end);

  -- ───── T02 · acima dos limites antigos (1000 logs / 1000 pedidos) ─────
  t := public.admin_dashboard_period('today');
  insert into moderation_logs(moderator_id, action, target_type, target_id)
    select v_admin, 'adm01_test', 'prayer_request', gen_random_uuid() from generate_series(1, 1200);
  insert into prayer_requests(content, title, user_id, status)
    select 'ADM01 teste', 'ADM01 teste', v_admin, 'active' from generate_series(1, 1100);
  t2 := public.admin_dashboard_period('today');
  r := r || format('T02 +1200 logs: antes=%s depois=%s %s', t->>'mod_actions', t2->>'mod_actions',
                   case when (t2->>'mod_actions')::int - (t->>'mod_actions')::int = 1200 then 'OK' else 'FALHA' end);
  r := r || format('T02 +1100 pedidos: antes=%s depois=%s %s', t->>'new_prayers', t2->>'new_prayers',
                   case when (t2->>'new_prayers')::int - (t->>'new_prayers')::int = 1100 then 'OK' else 'FALHA' end);
  r := r || format('T02 grafico hoje: pedidos=%s %s', t2->'series'->0->>'prayers',
                   case when (t2->'series'->0->>'prayers')::int = (t2->>'new_prayers')::int then 'OK' else 'FALHA' end);

  -- ───── T03 · limites de período (fuso de Brasília) ─────
  w := public.admin_dashboard_period('week');
  insert into prayer_requests(content, title, user_id, status, created_at) values
    ('ADM01 borda', 'dentro',  v_admin, 'active', v_since_week),                       -- 00:00:00 do 1º dia: entra
    ('ADM01 borda', 'fora',    v_admin, 'active', v_since_week - interval '1 second'); -- 23:59:59 da véspera: não entra
  w2 := public.admin_dashboard_period('week');
  r := r || format('T03 semana: delta=%s (esperado 1) %s', (w2->>'new_prayers')::int - (w->>'new_prayers')::int,
                   case when (w2->>'new_prayers')::int - (w->>'new_prayers')::int = 1 then 'OK' else 'FALHA' end);
  r := r || format('T03 1o dia do grafico: antes=%s depois=%s %s', w->'series'->0->>'prayers', w2->'series'->0->>'prayers',
                   case when (w2->'series'->0->>'prayers')::int - (w->'series'->0->>'prayers')::int = 1 then 'OK' else 'FALHA' end);

  t := public.admin_dashboard_period('today');
  insert into prayer_requests(content, title, user_id, status, created_at) values
    ('ADM01 borda', 'hoje 00:00', v_admin, 'active', v_since_today),
    ('ADM01 borda', 'ontem 23:59:59', v_admin, 'active', v_since_today - interval '1 second');
  t2 := public.admin_dashboard_period('today');
  r := r || format('T03 hoje: delta=%s (esperado 1) %s', (t2->>'new_prayers')::int - (t->>'new_prayers')::int,
                   case when (t2->>'new_prayers')::int - (t->>'new_prayers')::int = 1 then 'OK' else 'FALHA' end);

  -- ───── Acesso: não-admin é negado ─────
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  begin
    perform public.admin_dashboard_period('week');
    r := r || 'ACESSO nao-admin: PERMITIDO FALHA'::text;
  exception when insufficient_privilege then
    r := r || 'ACESSO nao-admin: negado 42501 OK'::text;
  end;

  raise exception 'RESULTADOS>>%<<', array_to_string(r, ' ;; ');
end $$;
